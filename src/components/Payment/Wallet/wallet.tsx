import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoWalletOutline, IoArrowBack, IoTimeOutline, IoRefresh } from "react-icons/io5";

import { motion, AnimatePresence } from "framer-motion";
import { walletService } from "../../../services/wallet.service";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useFeatureTheme } from "../../../context/FeatureThemeContext";
import { useCart, CartItem, CartDeliveryInfo } from "../../../context/CartContext";
import RazorpayPayment from "../../Payment/Rezorpay/RezorpayPayment";
import { IoWarningOutline } from "react-icons/io5";
import { useNetworkRecovery } from "../../../hooks/useNetworkRecovery";
import { IoMdArrowDown, IoMdArrowUp } from "react-icons/io";
import walletImage from "../../../assets/icon/Wallet.png";
import profileImage from "../../../assets/icon/Profile.png";
import { TransactionType } from "@/interfaces";
import { format, parseISO } from "date-fns";
import { INR } from "@/components/constants";
import lowbalanceIcon from "../../../assets/svg/gp_daily svg/lowbalance.svg";
import depositIcon from "../../../assets/svg/gp_daily svg/deposit.svg";
import enableIcon from "../../../assets/svg/gp_daily svg/enable.svg";
import Spinner from "../../common/Spinner";
import { WalletPageSkeleton } from "../../common/PageSkeletons";
import { orderService } from "../../../services/order.service";
import { addressService, Address } from "../../../services/address.service";

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
  const { feature } = useFeatureTheme();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";
  const [customAmount, setCustomAmount] = useState<string>("500");
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);
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

  // Add useCallback to memoize fetchWalletBalance
  const fetchWalletBalance = useCallback(async () => {
    try {
      setIsLoadingBalance(true);
      const response = await walletService.getWalletBalance();


      const { balance = 0, transactions = [], transactionLogs = [] } = response || {};

      setBalance(balance);
      setTransactions(transactions);
      setTransactionLogs(transactionLogs);


    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      if (error.message.includes("Session expired")) {
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
  }, [navigate, location.pathname, location.state]);

  // Fetch wallet balance on component mount and when fetchWalletBalance changes
  useEffect(() => {
    if (!localStorage.getItem("phoneNumber")) {
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
  }, [fetchWalletBalance, navigate, location.pathname, location.state]);

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

  if (isLoadingBalance) {
    return <WalletPageSkeleton />;
  }

  /** One horizontal gutter for all cards (Pixel / iPhone / narrow Android). */
  const pagePad = "px-4 sm:px-5 md:px-6";

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom overflow-x-clip">
      <div className="mx-auto w-full max-w-[min(800px,100vw)]">
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

        {/* Header — same inset as body cards */}
        <div className={`sticky top-0 bg-[#f8f6f1] z-10 border-b border-gray-200 ${pagePad} pt-6 pb-4`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/account`)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-xl font-semibold font-serif text-gray-900">My Wallet</h1>
          </div>
        </div>

        <div className={`${pagePad} space-y-4 pb-20`}>
        {/* Balance Card */}
        <div className="w-full bg-[#27A155] text-white rounded-[28px] sm:rounded-[32px] px-5 py-4 sm:px-6 sm:py-5 md:px-7 md:py-5 shadow-sm relative overflow-hidden">

          <div className="flex justify-between items-center gap-3 mb-3 min-h-[2.25rem]">
            <span className="text-[11px] font-semibold tracking-wider opacity-90 uppercase leading-none">
              Available Balance
            </span>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 shrink-0 px-3 py-1.5 bg-transparent rounded-2xl text-[11px] font-semibold border-2 border-white/90 text-white hover:bg-white/10 transition-colors"
            >
              <img src={depositIcon} alt="" className="w-4 h-4 sm:w-5 sm:h-5 opacity-95" aria-hidden />
              <span className="whitespace-nowrap">Deposit History</span>
            </button>
          </div>

          <div className="text-4xl sm:text-5xl md:text-5xl font-semibold mb-4">
            {isLoadingBalance ? (
              <Spinner size={48} variant="light" className="flex-shrink-0" />
            ) : (
              `₹${balance?.toLocaleString()}`
            )}
          </div>

          <div className="w-full h-[1px] bg-white/40 mb-3"></div>

          <div className="text-[12px] font-normal opacity-90">
            Last deposit ₹1,000
          </div>
        </div>

        {/* Low Balance Alert */}
        {!isLoadingBalance && balance < 100000 && (
          <div className="w-full bg-[#FE5053] rounded-2xl px-4 py-3 text-white flex items-center">
            <div className="flex items-center gap-3 w-full min-h-[3rem]">
              <img src={lowbalanceIcon} alt="" className="w-7 h-7 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight">Low Balance</h3>
                <p className="text-[11px] font-normal text-white/95 mt-0.5 leading-snug">
                  Your wallet balance is low. Recharge Now!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Money Section */}
        <div className="w-full">
          <h2 className="text-xl font-serif font-semibold text-gray-900">Add Money To Wallet</h2>

          {/* Quick Amount Buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2 xs:grid-cols-4 xs:gap-3 md:gap-4 mb-5">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAmount(amount)}
                className={`py-2 rounded-2xl border-2 text-sm xs:text-base font-medium ${customAmount === amount.toString()
                  ? "border-[#FAA222] text-black bg-[#FAA222]"
                  : "border-gray-200 text-gray-600 bg-white "
                  }`}
              >
                ₹{amount}
              </button>
            ))}
          </div>



          <div className="mb-4">
            <label className="block text-gray-900 font-medium mb-2">
              Enter Amount
            </label>
            <input
              type="text"
              value={customAmount}
              onChange={handleAmountChange}
              className={`w-full p-3 border-2 rounded-2xl text-base ${customAmount && parseInt(customAmount) < MIN_AMOUNT
                ? "border-red-300 bg-red-50"
                : "border-gray-400"
                }`}
              placeholder="Enter Amount"
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
                await walletService.verifyPayment({
                  razorpay_payment_id: data.razorpay_payment_id,
                  razorpay_order_id: data.razorpay_order_id,
                  razorpay_signature: data.razorpay_signature,
                  amount,
                });

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
            className="block w-full py-2.5 bg-[#FAA222] text-black rounded-2xl text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            buttonText={
              isProcessingPayment ? "Processing..." : `Proceed to Pay ₹${customAmount}`
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

        {/* Enable Auto-Pay — single row (reference): icon | copy | Disable, same width as sections above */}
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-row items-center gap-2.5 sm:gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f5ec] sm:h-11 sm:w-11"
              aria-hidden
            >
              <img src={enableIcon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[12px] font-semibold leading-snug text-gray-900 sm:text-[13px]">
                Enable Auto-Pay for Subscription Payments
              </h3>
              <p className="mt-0.5 text-[11px] font-normal leading-snug text-gray-500">
                Your subscription payments will auto-deduct from wallet.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-2xl bg-[#FAA222] px-3 py-2 text-center text-xs font-semibold text-black shadow-sm hover:bg-[#E5931F]"
            >
              Disable
            </button>
          </div>
        </div>

        {/* Combined Transactions & Payment History */}
        <div className="w-full pt-4">
          <h2 className="mb-4 font-serif text-xl font-semibold text-gray-900">
            Recent Transactions
          </h2>

          {/* Show loading state */}
          {isLoadingBalance ? (
            <div className="text-center text-gray-600">Loading transactions...</div>
          ) : transactions.length === 0 && (!transactionLogs || transactionLogs.length === 0) ? (
            <div className="text-center text-gray-600">No transactions yet.</div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {/* Map through all transactions */}
              {[...transactions, ...(transactionLogs || [])]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((item, idx) => {
                  const isTransaction = 'type' in item;

                  // Determine if it's a credit transaction
                  let isCredit = false;
                  if (isTransaction) {
                    // For regular transactions, check the type
                    isCredit = item.type === 'CREDIT';
                  } else {
                    // For transactionLogs, check status only
                    const status = (item as any).status?.toLowerCase();
                    isCredit =
                      status === 'wallet_recharged' ||
                      status === 'captured' ||
                      status === 'completed' ||
                      status === 'paid';
                  }

                  const status = !isTransaction ? (item as any).status?.toLowerCase() : null;
                  const isPending = !isTransaction && (status === 'created' || status === 'pending');

                  // Get absolute amount value
                  const amount = Math.abs(isTransaction ? item.amount : (item as any).amount);

                  return (
                    <div key={`txn-${idx}`} className="bg-white p-4 md:p-5 rounded-2xl border-2 border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`p-2 md:p-3 rounded-full ${isPending ? 'bg-yellow-50' : isCredit ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                            {isPending ? (
                              <IoWarningOutline className="text-yellow-500 md:text-xl" />
                            ) : isCredit ? (
                              <IoMdArrowUp className="text-green-500 md:text-xl -rotate-[135deg]" />
                            ) : (
                              <IoMdArrowDown className="text-red-500 md:text-xl -rotate-[135deg]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-gray-900">
                              {isTransaction
                                ? `${item.type === 'CREDIT' ? 'Credit' : 'Debit'} - ${item.description}`
                                : 'Wallet Recharge'}
                            </div>
                            {/* {isTransaction && item.referenceId && (
                              <div className="text-xs md:text-sm text-gray-400">
                                Txn ID: {item.referenceId}
                              </div>
                            )} */}
                            {!isTransaction && (item as any).razorpayOrderId && (
                              <div className="truncate text-xs text-gray-400 md:text-sm">
                                Order ID: {(item as any).razorpayOrderId}
                              </div>
                            )}
                            <div className="text-[11px] font-normal text-gray-500">
                              {format(
                                new Date(item.createdAt),
                                "dd MMM yyyy • h:mm a"
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 whitespace-nowrap">
                          <div className={`font-semibold md:text-xl ${isPending ? 'text-yellow-600' :
                            isCredit ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {isPending ? '' : (isCredit ? '+' : '')}{INR} {amount}
                          </div>
                          {!isTransaction && (
                            <div className={`text-xs md:text-sm ${isPending ? 'text-yellow-600' :
                              isCredit ? 'text-green-600' :
                                'text-gray-600'
                              }`}>
                              {((item as any).status?.charAt(0).toUpperCase() || '') + ((item as any).status?.slice(1).toLowerCase() || '')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
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

      </div>
    </div>
  );
};

export default Wallet;
