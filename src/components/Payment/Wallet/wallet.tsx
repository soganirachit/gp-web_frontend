import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoWalletOutline, IoArrowBack } from "react-icons/io5";

import { motion, AnimatePresence } from "framer-motion";
import { walletService } from "../../../services/wallet.service";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import RazorpayPayment from "../../Payment/Rezorpay/RezorpayPayment";
import { IoWarningOutline } from "react-icons/io5";
import { useNetworkRecovery } from "../../../hooks/useNetworkRecovery";
import { IoMdArrowDown, IoMdArrowUp } from "react-icons/io";
import walletImage from "../../../assets/icon/Wallet.png";
import profileImage from "../../../assets/icon/Profile.png";
import BottomNav from "../../layout/BottomNav";
import { TransactionType } from "@/interfaces";
import { format, parseISO } from "date-fns";
import { INR } from "@/components/constants";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

interface CouponType {
  code: string;
  discount: number;
  description: string;
}

const AVAILABLE_COUPONS: CouponType[] = [
  { code: "FIRST50", discount: 50, description: "₹50 off on first recharge" },
  {
    code: "SAVE100",
    discount: 100,
    description: "₹100 off on recharge above ₹1000",
  },
  {
    code: "BONUS20",
    discount: 20,
    description: "Flat ₹20 off on any recharge",
  },
];

const Wallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const [customAmount, setCustomAmount] = useState<string>("500");
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [, setSelectedCoupon] = useState<CouponType | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const {
    isOnline,
    isRecovering,
    setIsRecovering,
    storePendingPayment,
    getPendingPayments,
    removePendingPayment,
    retryWithBackoff,
  } = useNetworkRecovery();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to access your wallet");
      navigate("/login", {
        state: {
          returnUrl: location.pathname,
          ...location.state,
        },
      });
      return;
    }

    // Fetch wallet balance if we have a token
    fetchWalletBalance();

    // Check for required amount from subscription
    const state = location.state as {
      requiredAmount?: number;
      returnUrl?: string;
      currentBalance?: number;
    } | null;
    if (state?.requiredAmount) {
      setCustomAmount(state.requiredAmount.toString());
      setReturnUrl(state.returnUrl || null);

      // Show recharge required message with balance details
      if (state.currentBalance !== undefined) {
        toast(
          () => (
            <div>
              <p>Current Balance: ₹{state.currentBalance}</p>
              <p>Required Amount: ₹{state.requiredAmount}</p>
              <p>Please add ₹{state.requiredAmount} to continue</p>
            </div>
          ),
          {
            icon: "💰",
            duration: 5000,
          }
        );
      }
    }
  }, [isLoggedIn, navigate, location.state, location.pathname]);

  const fetchWalletBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const { balance, transactions: resTransactions = [] } =
        (await walletService.getWalletBalance()) || {};
      setBalance(balance);
      setTransactions(resTransactions);
    } catch (error: any) {
      if (error.message.includes("Session expired")) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        navigate("/login", {
          state: {
            returnUrl: location.pathname,
            ...location.state,
          },
        });
      } else {
        toast.error("Failed to fetch wallet balance");
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      const numValue = parseInt(value) || 0;
      if (numValue <= MAX_AMOUNT) {
        setCustomAmount(value);
      }
    }
  };

  const validateAmount = (amount: number): string | null => {
    if (amount < MIN_AMOUNT) {
      return `Minimum amount is ₹${MIN_AMOUNT}`;
    }
    if (amount > MAX_AMOUNT) {
      return `Maximum amount is ₹${MAX_AMOUNT.toLocaleString()}`;
    }
    return null;
  };

  const handleQuickAmount = (amount: number) => {
    setCustomAmount(amount.toString());
  };

  const handleCouponSelect = (coupon: CouponType) => {
    setSelectedCoupon(coupon);
    setShowCoupons(false);
    toast.success(`Coupon ${coupon.code} applied successfully!`);
  };

  // Recovery mechanism for pending payments
  const recoverPendingPayments = async () => {
    const pendingPayments = getPendingPayments();
    if (pendingPayments.length === 0) return;

    setIsRecovering(true);
    let recoveredCount = 0;

    for (const payment of pendingPayments) {
      try {
        const success = await retryWithBackoff(async () => {
          return await walletService.recoverPendingPayment({
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_signature: payment.razorpay_signature,
            amount: payment.amount,
          });
        });

        if (success) {
          removePendingPayment(payment.id);
          recoveredCount++;
        }
      } catch (error) {
        console.error(
          "Failed to recover payment:",
          payment.razorpay_payment_id,
          error
        );
      }
    }

    setIsRecovering(false);

    if (recoveredCount > 0) {
      toast.success(
        `${recoveredCount} pending payment(s) recovered successfully!`
      );
      await fetchWalletBalance();
    }
  };

  // Handle network reconnection
  useEffect(() => {
    if (isOnline && !isRecovering) {
      const pendingPayments = getPendingPayments();
      if (pendingPayments.length > 0) {
        toast(
          (t) => (
            <div>
              <p>
                Network restored! Found {pendingPayments.length} pending
                payment(s).
              </p>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  recoverPendingPayments();
                }}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Recover Now
              </button>
            </div>
          ),
          {
            duration: 10000,
            icon: "🔄",
          }
        );
      }
    }
  }, [isOnline]);

  // Auto-recover on component mount
  useEffect(() => {
    if (isOnline) {
      setTimeout(() => {
        recoverPendingPayments();
      }, 1000); // Delay to let wallet balance load first
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Network Status & Header */}
        {!isOnline && (
          <div className="bg-red-500 text-white p-2 text-center text-sm">
            ⚠️ No internet connection. Payments will be verified when connection
            is restored.
          </div>
        )}

        {isRecovering && (
          <div className="bg-blue-500 text-white p-2 text-center text-sm">
            🔄 Recovering pending payments...
          </div>
        )}

        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">Wallet</h1>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={walletImage}
              alt="Wallet"
              className="w-10 h-10 md:w-10 md:h-10"
              onClick={() => navigate("/wallet")}
            />
            <img
              src={profileImage}
              alt="Profile"
              className="w-6 h-6 md:w-8 md:h-8"
              onClick={() => navigate("/account")}
            />
          </div>
        </div>

        {/* Balance Card */}
        <div className="mx-4 md:mx-6 bg-[#16A34A] text-white rounded-lg p-6 md:p-8 flex items-center gap-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg">
            <IoWalletOutline className="text-2xl md:text-3xl" />
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-semibold">
              ₹{isLoadingBalance ? "..." : balance}
            </div>
            <div className="text-sm md:text-base opacity-80">
              Available Balance
            </div>
          </div>
        </div>

        {/* Low Balance Alert */}
        {balance < 100 && (
          <div className="mx-4 md:mx-6 mt-4 bg-[#FFFFFF] p-4 md:p-5 rounded-lg flex items-start gap-3">
            <IoWarningOutline className="text-[#FF5722] text-xl md:text-2xl flex-shrink-0 mt-1" />
            <div className="text-sm md:text-base">
              <div className="text-[#FF5722] font-medium">
                Low Balance Alert
              </div>
              <div className="text-gray-600">
                Your wallet balance is below ₹100. Your subscription will stop
                after 3 deliveries
              </div>
            </div>
          </div>
        )}

        {/* Add Money Section */}
        <div className="mx-4 md:mx-6 mt-6">
          <h2 className="text-xl md:text-2xl font-medium mb-4">Add Money</h2>
          <div className="bg-white rounded-lg p-4 md:p-6">
            <div className="mb-4">
              <label className="block text-gray-600 mb-2 md:text-lg">
                Enter Amount
              </label>
              <input
                type="text"
                value={customAmount}
                onChange={handleAmountChange}
                className={`w-full p-3 md:p-4 border rounded-lg text-lg md:text-xl ${
                  customAmount && parseInt(customAmount) < MIN_AMOUNT
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200"
                }`}
                placeholder="1000"
              />
              {customAmount && parseInt(customAmount) < MIN_AMOUNT && (
                <p className="text-red-500 text-sm mt-1">
                  Minimum amount is ₹{MIN_AMOUNT}
                </p>
              )}
              {customAmount && parseInt(customAmount) > MAX_AMOUNT && (
                <p className="text-red-500 text-sm mt-1">
                  Maximum amount is ₹{MAX_AMOUNT.toLocaleString()}
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 mb-6">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className={`py-2 md:py-3 rounded-lg border ${
                    customAmount === amount.toString()
                      ? "border-[#FF5722] text-[#FF5722]"
                      : "border-gray-200 text-gray-600"
                  } md:text-lg`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            {/* Proceed Button */}
            <RazorpayPayment
              amount={parseInt(customAmount)}
              onSuccess={async (data) => {
                const amount = parseInt(customAmount);
                const validationError = validateAmount(amount);

                if (validationError) {
                  toast.error(validationError);
                  return;
                }

                setIsProcessingPayment(true);

                // Store payment as pending in case of network failure
                const pendingPaymentId = storePendingPayment({
                  razorpay_payment_id: data.razorpay_payment_id,
                  razorpay_order_id: data.razorpay_order_id,
                  razorpay_signature: data.razorpay_signature,
                  amount: amount,
                });

                try {
                  // Call the add-to-payment endpoint to verify and update wallet
                  // await walletService.verifyPayment({
                  //   razorpay_payment_id: data.razorpay_payment_id,
                  //   razorpay_order_id: data.razorpay_order_id,
                  //   razorpay_signature: data.razorpay_signature,
                  //   amount: amount,
                  // });

                  // Payment verified successfully, remove from pending
                  removePendingPayment(pendingPaymentId);

                  toast.success(
                    "Payment successful! Your wallet has been updated."
                  );
                  await fetchWalletBalance();
                  if (returnUrl) {
                    navigate(returnUrl);
                  }
                } catch (error: any) {
                  console.error("Payment verification failed:", error);

                  // Better error handling based on error type
                  let errorMessage = "Payment verification failed.";
                  let shouldKeepPending = false;

                  if (error.response?.status === 402) {
                    errorMessage = "Payment failed. Please try again.";
                    removePendingPayment(pendingPaymentId); // Don't keep failed payments
                  } else if (error.response?.status >= 500) {
                    errorMessage =
                      "Server error. We'll retry when connection is restored.";
                    shouldKeepPending = true;
                  } else if (
                    !navigator.onLine ||
                    error.code === "NETWORK_ERROR"
                  ) {
                    errorMessage =
                      "Network error. Payment will be verified when connection is restored.";
                    shouldKeepPending = true;
                  } else if (error.message?.includes("timeout")) {
                    errorMessage =
                      "Payment verification timed out. We'll retry automatically.";
                    shouldKeepPending = true;
                  } else {
                    errorMessage =
                      "Payment verification failed. Please contact support.";
                    shouldKeepPending = true; // Keep for manual verification
                  }

                  if (!shouldKeepPending) {
                    removePendingPayment(pendingPaymentId);
                  }

                  toast.error(errorMessage);
                } finally {
                  setIsProcessingPayment(false);
                }
              }}
              onError={(error) => {
                toast.error(
                  error.message || "Payment failed. Please try again."
                );
              }}
              className="w-full py-3.5 md:py-4 bg-[#FF5722] text-white rounded-full font-medium md:text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              buttonText={
                isProcessingPayment ? "Processing..." : "Proceed to Pay"
              }
              disabled={
                isProcessingPayment ||
                !customAmount ||
                parseInt(customAmount) < MIN_AMOUNT
              }
            />
            {/* <button
              className="w-full py-3.5 md:py-4 bg-[#FF5722] text-white rounded-full font-medium md:text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={
                isProcessingPayment ||
                !customAmount ||
                parseInt(customAmount) < MIN_AMOUNT
              }
              onClick={async () => {
                const amount = parseInt(customAmount);
                const validationError = validateAmount(amount);

                if (validationError) {
                  toast.error(validationError);
                  return;
                }

                setIsProcessingPayment(true);
                try {
                  await walletService.addAmountDirect(amount);
                  toast.success(
                    "Amount added successfully! Your wallet has been updated."
                  );
                  await fetchWalletBalance();
                  if (returnUrl) {
                    navigate(returnUrl);
                  }
                } catch (error: any) {
                  console.error("Direct payment failed:", error);

                  let errorMessage = "Failed to add amount. Please try again.";

                  if (error.response?.status >= 500) {
                    errorMessage = "Server error. Please try again later.";
                  } else if (!navigator.onLine) {
                    errorMessage =
                      "Network error. Please check your connection.";
                  }

                  toast.error(errorMessage);
                } finally {
                  setIsProcessingPayment(false);
                }
              }}
            >
              {isProcessingPayment ? "Processing..." : "Proceed to Pay"}
            </button> */}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mx-4 md:mx-6 mt-8 mb-20">
          <h2 className="text-xl md:text-2xl font-medium mb-4">
            Recent Transactions
          </h2>
          {transactions.map((transaction: TransactionType, tdx) => {
            return (
              <div className="space-y-3 md:space-y-4" key={`trans+${tdx}`}>
                <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-[#FFF3E0] rounded-full">
                      {transaction.type === "CREDIT" ? (
                        <IoMdArrowDown className="text-[#4CAF50] md:text-xl" />
                      ) : (
                        <IoMdArrowUp className="text-[#FF5722] md:text-xl" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium md:text-lg">
                        {transaction.description}
                      </div>
                      <div className="text-sm md:text-base text-gray-500">
                        {format(
                          parseISO(transaction.createdAt),
                          "dd MMM yyyy  h:mm a"
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`${
                      transaction.type === "CREDIT"
                        ? "text-[#4CAF50]"
                        : "text-[#FF5722]"
                    } font-medium md:text-lg`}
                  >
                    {transaction.type === "CREDIT"
                      ? `+${INR} ${transaction.amount}`
                      : `-${INR} ${transaction.amount}`}
                  </div>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="text-center text-gray-600">
              No transactions yet.
            </div>
          )}
          {/* <div className="space-y-3 md:space-y-4">
            

            <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-[#FFF3E0] rounded-full">
                  <IoMdArrowUp className="text-[#FF5722] md:text-xl" />
                </div>
                <div>
                  <div className="font-medium md:text-lg">
                    Brahma Pack Subscription
                  </div>
                  <div className="text-sm md:text-base text-gray-500">
                    9 May 2023 • 7:00 AM
                  </div>
                </div>
              </div>
              <div className="text-[#FF5722] font-medium md:text-lg">-₹299</div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-[#E8F5E9] rounded-full">
                  <IoMdArrowDown className="text-[#4CAF50] md:text-xl" />
                </div>
                <div>
                  <div className="font-medium md:text-lg">
                    Cashback Credited
                  </div>
                  <div className="text-sm md:text-base text-gray-500">
                    5 May 2023 • 11:45 AM
                  </div>
                </div>
              </div>
              <div className="text-[#4CAF50] font-medium md:text-lg">+₹500</div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {showCoupons && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCoupons(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 md:p-8 m-4 w-full max-w-md"
            >
              <h3 className="text-lg md:text-xl font-medium mb-4">
                Available Coupons
              </h3>
              <div className="space-y-3 md:space-y-4">
                {AVAILABLE_COUPONS.map((coupon) => (
                  <motion.div
                    key={coupon.code}
                    whileHover={{ scale: 1.02 }}
                    className="border rounded-lg p-4 md:p-5 cursor-pointer hover:border-green-500"
                    onClick={() => handleCouponSelect(coupon)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-green-600 md:text-lg">
                          {coupon.code}
                        </div>
                        <div className="text-sm md:text-base text-gray-600">
                          {coupon.description}
                        </div>
                      </div>
                      <div className="text-lg md:text-xl font-bold text-green-600">
                        ₹{coupon.discount}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <BottomNav />
      </div>
    </div>
  );
};

export default Wallet;
