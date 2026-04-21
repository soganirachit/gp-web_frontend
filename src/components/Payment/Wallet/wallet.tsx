import React, { useState, useEffect, useCallback, useMemo, useId } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoWalletOutline, IoTimeOutline, IoRefresh } from "react-icons/io5";

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
import enableIcon from "../../../assets/svg/gp_daily svg/enable.svg";
import Spinner from "../../common/Spinner";
import { WalletPageSkeleton } from "../../common/PageSkeletons";
import { orderService } from "../../../services/order.service";
import { addressService, Address } from "../../../services/address.service";
import {
  subscriptionService,
  type Subscription,
} from "../../../services/subscription.service";
import {
  pickActiveSubscriptionDailyUnitRupees,
  computeGpDailyOrderOnHold,
} from "../../../utils/gpDailyWalletHold";
import { UniformPageHeader } from "../../layout/UniformPageHeader";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50000;

/** Same path as mobile `WalletScreen` `DepositHistoryGlyph` (react-native-svg → web SVG). */
const DEPOSIT_HISTORY_PATH =
  "M8 2.20727V8.00039C8 8.133 7.94732 8.26018 7.85355 8.35395C7.75979 8.44772 7.63261 8.50039 7.5 8.50039C7.36739 8.50039 7.24021 8.44772 7.14645 8.35395C7.05268 8.26018 7 8.133 7 8.00039V2.20727L5.85375 3.35414C5.75993 3.44796 5.63268 3.50067 5.5 3.50067C5.36732 3.50067 5.24007 3.44796 5.14625 3.35414C5.05243 3.26032 4.99972 3.13308 4.99972 3.00039C4.99972 2.86771 5.05243 2.74046 5.14625 2.64664L7.14625 0.646643C7.19269 0.600155 7.24783 0.563276 7.30853 0.538113C7.36923 0.512951 7.43429 0.5 7.5 0.5C7.56571 0.5 7.63077 0.512951 7.69147 0.538113C7.75217 0.563276 7.80731 0.600155 7.85375 0.646643L9.85375 2.64664C9.94757 2.74046 10.0003 2.86771 10.0003 3.00039C10.0003 3.13308 9.94757 3.26032 9.85375 3.35414C9.75993 3.44796 9.63268 3.50067 9.5 3.50067C9.36732 3.50067 9.24007 3.44796 9.14625 3.35414L8 2.20727ZM12 7.72664V6.00039C12 5.73518 11.8946 5.48082 11.7071 5.29329C11.5196 5.10575 11.2652 5.00039 11 5.00039H10C9.86739 5.00039 9.74021 5.05307 9.64645 5.14684C9.55268 5.24061 9.5 5.36778 9.5 5.50039C9.5 5.633 9.55268 5.76018 9.64645 5.85395C9.74021 5.94771 9.86739 6.00039 10 6.00039H11V11.0254C10.7018 10.7208 10.3027 10.5355 9.87762 10.5043C9.45251 10.4731 9.03062 10.5981 8.69115 10.8558C8.35167 11.1136 8.11795 11.4864 8.03384 11.9043C7.94974 12.3222 8.02105 12.7564 8.23438 13.1254L8.24938 13.1491L9.64062 15.2741C9.71323 15.3851 9.82694 15.4627 9.95675 15.4898C10.0866 15.517 10.2218 15.4914 10.3328 15.4188C10.4438 15.3462 10.5214 15.2325 10.5485 15.1027C10.5756 14.9729 10.5501 14.8376 10.4775 14.7266L9.09437 12.6148C8.99633 12.4416 8.97107 12.2366 9.02417 12.0449C9.07727 11.8531 9.20436 11.6903 9.3775 11.5923C9.55064 11.4942 9.75563 11.469 9.94739 11.5221C10.1391 11.5752 10.302 11.7023 10.4 11.8754C10.4044 11.8835 10.4094 11.8916 10.4144 11.8991L11.0819 12.9185C11.1409 13.0085 11.2273 13.077 11.3284 13.114C11.4295 13.1509 11.5398 13.1542 11.6429 13.1235C11.746 13.0928 11.8364 13.0296 11.9008 12.9433C11.9651 12.8571 11.9999 12.7524 12 12.6448V9.00039C12.4713 9.43665 12.8477 9.96527 13.1057 10.5533C13.3638 11.1414 13.498 11.7763 13.5 12.4185V15.0004C13.5 15.133 13.5527 15.2602 13.6464 15.3539C13.7402 15.4477 13.8674 15.5004 14 15.5004C14.1326 15.5004 14.2598 15.4477 14.3536 15.3539C14.4473 15.2602 14.5 15.133 14.5 15.0004V12.416C14.4972 11.4898 14.2679 10.5783 13.8322 9.76097C13.3964 8.94363 12.7674 8.24524 12 7.72664ZM5 5.00039H4C3.73478 5.00039 3.48043 5.10575 3.29289 5.29329C3.10536 5.48082 3 5.73518 3 6.00039V12.5004C3 12.633 3.05268 12.7602 3.14645 12.8539C3.24021 12.9477 3.36739 13.0004 3.5 13.0004C3.63261 13.0004 3.75979 12.9477 3.85355 12.8539C3.94732 12.7602 4 12.633 4 12.5004V6.00039H5C5.13261 6.00039 5.25979 5.94771 5.35355 5.85395C5.44732 5.76018 5.5 5.633 5.5 5.50039C5.5 5.36778 5.44732 5.24061 5.35355 5.14684C5.25979 5.05307 5.13261 5.00039 5 5.00039Z";

function DepositHistoryGlyph({ className }: { className?: string }) {
  const rawId = useId();
  const clipId = `wallet-deposit-history-${rawId.replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-3.5 w-3.5 shrink-0 opacity-95 ${className ?? ""}`}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={16} height={16} fill="#fff" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={DEPOSIT_HISTORY_PATH} fill="currentColor" />
      </g>
    </svg>
  );
}

function isWalletTransactionRow(item: unknown): item is TransactionType {
  if (typeof item !== "object" || item === null || !("type" in item)) {
    return false;
  }
  const t = (item as TransactionType).type;
  return t === "CREDIT" || t === "DEBIT";
}

function rowCreatedMs(item: unknown): number {
  const o = item as Record<string, unknown>;
  const raw = String(o.createdAt ?? o.created_at ?? "");
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

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
  const [gpDailyActiveSubs, setGpDailyActiveSubs] = useState<Subscription[]>([]);
  const [gpDailySubExtra, setGpDailySubExtra] = useState<Record<
    string,
    unknown
  > | null>(null);
  /** Same as app `WalletScreen`: toggle between all txns and credits-only. */
  const [showDepositHistoryOnly, setShowDepositHistoryOnly] = useState(false);

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

  useEffect(() => {
    if (feature !== "gpDaily" || !isLoggedIn) {
      setGpDailyActiveSubs([]);
      setGpDailySubExtra(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await subscriptionService.getCustomerSubscriptions();
        if (cancelled) return;
        const active = (list || []).filter((s) => s.status === "ACTIVE");
        setGpDailyActiveSubs(active);
        const first = active[0];
        if (first?.id) {
          const detail = await subscriptionService.getSubscriptionById(first.id);
          if (!cancelled) {
            setGpDailySubExtra(
              detail && Object.keys(detail).length > 0 ? detail : null,
            );
          }
        } else if (!cancelled) {
          setGpDailySubExtra(null);
        }
      } catch {
        if (!cancelled) {
          setGpDailyActiveSubs([]);
          setGpDailySubExtra(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feature, isLoggedIn]);

  const gpDailyOrderHold = useMemo(() => {
    if (feature !== "gpDaily" || !isLoggedIn) {
      return { show: false, lowBalanceForSubscription: false, threshold3Day: 0 };
    }
    const unit = pickActiveSubscriptionDailyUnitRupees(
      gpDailyActiveSubs[0] ?? null,
      gpDailySubExtra,
    );
    return computeGpDailyOrderOnHold(true, false, balance, unit);
  }, [feature, isLoggedIn, balance, gpDailyActiveSubs, gpDailySubExtra]);

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

  const filteredWalletRows = useMemo(() => {
    const all = [...transactions, ...(transactionLogs || [])];
    if (feature === "gpDaily") {
      if (showDepositHistoryOnly) {
        return transactions.filter((t) => t.type === "CREDIT");
      }
      return transactions;
    }
    return all;
  }, [transactions, transactionLogs, feature, showDepositHistoryOnly]);

  /** Most recent credit (app: last successful deposit from `transaction_type` / type). */
  const latestWalletRechargeAmount = useMemo(() => {
    const credits = transactions.filter((t) => t.type === "CREDIT");
    if (!credits.length) return null;
    const sorted = [...credits].sort((a, b) => rowCreatedMs(b) - rowCreatedMs(a));
    return sorted[0]?.amount ?? null;
  }, [transactions]);

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

        <UniformPageHeader
          title="My Wallet"
          onBack={() => navigate(`${basePath}/account`)}
          padXClassName={pagePad}
          padYClassName="py-4"
          className="sticky top-0 z-10 border-b border-gray-200"
        />

        <div className={`${pagePad} space-y-4 pb-20`}>
        {/* Balance Card */}
        <div className="w-full bg-[#27A155] text-white rounded-[28px] sm:rounded-[32px] px-5 py-4 sm:px-6 sm:py-5 md:px-7 md:py-5 shadow-sm relative overflow-hidden">

          <div className="mb-3 flex min-h-[2.25rem] items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider opacity-90 uppercase leading-none">
              Available Balance
            </span>
            {feature === "gpDaily" ? (
              <button
                type="button"
                onClick={() => setShowDepositHistoryOnly((p) => !p)}
                className="inline-flex shrink-0 items-center gap-1 text-[11px]  border-2 border-white/95 rounded-full px-2 py-1 font-semibold text-white/95 underline decoration-white  hover:text-white"
              >
                <DepositHistoryGlyph />
                {showDepositHistoryOnly ? "All Transactions" : "Deposit History"}
              </button>
            ) : null}
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
            {latestWalletRechargeAmount != null ? (
              <>
                Last deposit ₹
                {Number(latestWalletRechargeAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </>
            ) : (
              "No deposits yet"
            )}
          </div>
        </div>

        {/* GP Daily — same Order in hold rule as homepage (wallet under ₹100 or under 3× daily subscription unit). */}
        {!isLoadingBalance &&
          feature === "gpDaily" &&
          isLoggedIn &&
          gpDailyOrderHold.show && (
            <div className="w-full bg-[#FE5053] rounded-2xl px-4 py-4 text-white">
              <div className="flex items-start gap-3">
                <img
                  src={lowbalanceIcon}
                  alt=""
                  className="w-7 h-7 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base mb-1">Order in hold</h3>
                  <p className="text-sm text-white/90 leading-snug">
                    {gpDailyOrderHold.lowBalanceForSubscription
                      ? `Your wallet balance is below 3-day subscription amount (₹${gpDailyOrderHold.threshold3Day}). Recharge now to continue deliveries.`
                      : "Your wallet balance is low. Recharge now to continue your daily deliveries."}
                  </p>
                </div>
              </div>
            </div>
          )}

        {!isLoadingBalance && feature === "gpStore" && balance < 100 && (
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
        {/* <div className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm">
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
        </div> */}

        {/* Combined Transactions & Payment History */}
        <div className="w-full pt-4">
          <h2 className="mb-4 font-serif text-xl font-semibold text-gray-900">
            Recent Transactions
          </h2>

          {/* Show loading state */}
          {isLoadingBalance ? (
            <div className="text-center text-gray-600">Loading transactions...</div>
          ) : filteredWalletRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 px-4 py-8 text-center text-sm text-gray-600">
              {feature === "gpDaily" && showDepositHistoryOnly ? (
                <>
                  <p className="font-semibold text-gray-800">No deposits yet</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Only successful wallet deposits are shown here.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">No transactions</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Wallet transactions will appear here after your first top-up or activity.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {[...filteredWalletRows]
                .sort((a, b) => rowCreatedMs(b) - rowCreatedMs(a))
                .map((item, idx) => {
                  const isTransaction = isWalletTransactionRow(item);

                  let isCredit = false;
                  if (isTransaction) {
                    isCredit = item.type === "CREDIT";
                  } else {
                    const status = (item as { status?: string }).status?.toLowerCase();
                    isCredit =
                      status === "wallet_recharged" ||
                      status === "captured" ||
                      status === "completed" ||
                      status === "paid";
                  }

                  const status = !isTransaction
                    ? (item as { status?: string }).status?.toLowerCase()
                    : null;
                  const isPending =
                    !isTransaction && (status === "created" || status === "pending");

                  const amount = Math.abs(
                    isTransaction ? item.amount : (item as { amount?: number }).amount ?? 0,
                  );

                  const createdRaw =
                    (item as { createdAt?: string; created_at?: string }).createdAt ??
                    (item as { created_at?: string }).created_at ??
                    new Date().toISOString();

                  const titleLine = isTransaction
                    ? item.description ||
                      `${item.type === "CREDIT" ? "Credit" : "Debit"} - Transaction`
                    : "Wallet Recharge";

                  return (
                    <div key={`txn-${idx}`} className="bg-white p-4 md:p-5 rounded-2xl border-2 border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                          <div
                            className={`shrink-0 p-2 md:p-3 rounded-full ${
                              isPending
                                ? "bg-yellow-50"
                                : isCredit
                                  ? "bg-green-50"
                                  : "bg-red-50"
                            }`}
                          >
                            {isPending ? (
                              <IoWarningOutline className="text-yellow-500 md:text-xl" />
                            ) : isCredit ? (
                              <IoMdArrowUp className="text-green-500 md:text-xl -rotate-[135deg]" />
                            ) : (
                              <IoMdArrowDown className="text-red-500 md:text-xl -rotate-[135deg]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="break-words text-[13px] font-medium leading-snug text-gray-900">
                              {titleLine}
                            </p>
                            {feature !== "gpDaily" &&
                              !isTransaction &&
                              (item as { razorpayOrderId?: string }).razorpayOrderId && (
                                <div className="mt-0.5 truncate text-xs text-gray-400 md:text-sm">
                                  Order ID:{" "}
                                  {(item as { razorpayOrderId?: string }).razorpayOrderId}
                                </div>
                              )}
                            <div className="mt-1 text-[11px] font-normal text-gray-500">
                              {format(new Date(createdRaw), "dd MMM yyyy • h:mm a")}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-right">
                          <div
                            className={`font-semibold md:text-xl ${
                              isPending
                                ? "text-yellow-600"
                                : isCredit
                                  ? "text-green-600"
                                  : "text-red-600"
                            }`}
                          >
                            {isPending ? "" : isCredit ? "+" : "-"}
                            {INR} {amount}
                          </div>
                          {!isTransaction && (
                            <div
                              className={`text-xs md:text-sm ${
                                isPending
                                  ? "text-yellow-600"
                                  : isCredit
                                    ? "text-green-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {`${(item as { status?: string }).status?.charAt(0).toUpperCase() ?? ""}${(item as { status?: string }).status?.slice(1).toLowerCase() ?? ""}`}
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
