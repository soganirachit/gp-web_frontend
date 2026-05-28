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
import { IoAlertCircle, IoWarningOutline } from "react-icons/io5";
import { useNetworkRecovery } from "../../../hooks/useNetworkRecovery";
import { IoMdArrowDown, IoMdArrowUp } from "react-icons/io";
import walletImage from "../../../assets/icon/Wallet.png";
import profileImage from "../../../assets/icon/Profile.png";
import { TransactionType } from "@/interfaces";
import lowbalanceIcon from "../../../assets/svg/gp_daily svg/lowbalance.svg";
import enableIcon from "../../../assets/svg/gp_daily svg/enable.svg";
import Spinner from "../../common/Spinner";
import { WalletPageSkeleton } from "../../common/PageSkeletons";
import { orderService } from "../../../services/order.service";
import {
  extractFirstItemNameFromOrderRaw,
  formatOrderListProductLabel,
  resolveOrderItemsCount,
} from "../../../utils/orderListDisplay";
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
import { tryCompleteGpDailyPendingSubscriptionAfterRecharge } from "../../../utils/resumeGpDailySubscriptionCheckout";

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

/** Match mobile `WalletScreen` `formatTxnTime`. */
function formatTxnTimeAppStyle(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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

/**
 * Backend writes order-related wallet transactions with descriptions like:
 *   "Payment for order GP-20260513-53027"
 *   "Refund for order GP_IPU-20260518-DLY0000001"
 *   "Refund for cancelled order GP-20260513-53027"
 *   "Subscription delivery — Order GP-20260513-53027"
 * Non-order rows (e.g. "Wallet recharge", "Wallet top-up") return null.
 */
function extractOrderNumberFromTxnDescription(
  description: string | null | undefined,
): string | null {
  if (!description) return null;
  const m = description.match(/[Oo]rder\s+([A-Z0-9][A-Z0-9_\-]+)/);
  return m && m[1] ? m[1].trim() : null;
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
  const [customAmount, setCustomAmount] = useState<string>("1000");
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [, setSelectedCoupon] = useState<CouponType | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentFieldMessage, setPaymentFieldMessage] = useState<string | null>(null);
  const [gpDailyActiveSubs, setGpDailyActiveSubs] = useState<Subscription[]>([]);
  const [gpDailyHasSubscription, setGpDailyHasSubscription] = useState(false);
  const [gpDailySubExtra, setGpDailySubExtra] = useState<Record<
    string,
    unknown
  > | null>(null);
  /** Same as app `WalletScreen`: toggle between all txns and credits-only. */
  const [showDepositHistoryOnly, setShowDepositHistoryOnly] = useState(false);

  /**
   * Cache of fetched order details keyed by `order_number`. Recent Transactions
   * card titles use the first product name instead of the bare order ID, and
   * the whole row links to the corresponding order details page. `null` means
   * we tried but the order lookup failed — used to avoid retry loops.
   */
  const [orderLabelByNumber, setOrderLabelByNumber] = useState<
    Record<string, string | null>
  >({});

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
      toast.error("Failed to fetch wallet balance");
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (feature !== "gpDaily" || !isLoggedIn) {
      setGpDailyActiveSubs([]);
      setGpDailyHasSubscription(false);
      setGpDailySubExtra(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await subscriptionService.getCustomerSubscriptions();
        if (cancelled) return;
        setGpDailyHasSubscription((list || []).length > 0);
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
          setGpDailyHasSubscription(false);
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

  /** Recharge shortcut from subscribe / basket — prefill amount and return path. */
  useEffect(() => {
    const st = location.state as {
      returnUrl?: string;
      requiredAmount?: number;
      shortageAmount?: number;
      currentBalance?: number;
      totalRequired?: number;
    } | null;
    if (!st) return;

    if (typeof st.returnUrl === "string" && st.returnUrl.trim()) {
      setReturnUrl(st.returnUrl.trim());
    }

    const shortage =
      typeof st.requiredAmount === "number" && st.requiredAmount > 0
        ? st.requiredAmount
        : typeof st.shortageAmount === "number" && st.shortageAmount > 0
          ? st.shortageAmount
          : typeof st.totalRequired === "number" &&
              typeof st.currentBalance === "number" &&
              st.totalRequired > st.currentBalance
            ? st.totalRequired - st.currentBalance
            : null;

    if (shortage != null && Number.isFinite(shortage)) {
      setCustomAmount(String(Math.max(MIN_AMOUNT, Math.ceil(shortage))));
    }
  }, [location.state]);

  // Fetch wallet balance on mount (auth is enforced by ProtectedRoute + BottomNav)
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem("access_token")) {
      return;
    }
    if (!localStorage.getItem("phoneNumber")) {
      navigate(`${basePath}/login`, {
        state: {
          returnUrl: location.pathname,
          ...location.state,
        },
        replace: true,
      });
      return;
    }
    fetchWalletBalance();
  }, [
    fetchWalletBalance,
    navigate,
    location.pathname,
    location.state,
    isLoggedIn,
    basePath,
  ]);

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

  const isQuickAmountActive = (amount: number) => {
    const parsed = parseInt(customAmount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;
    return parsed === amount;
  };

  const handleCouponSelect = (coupon: CouponType) => {
    setSelectedCoupon(coupon);
    setShowCoupons(false);
    toast.success(`Coupon ${coupon.code} applied successfully!`);
  };

  /**
   * For every order-linked wallet transaction we have not seen yet, fetch the
   * order detail once and remember the first product label. Listed under
   * “Recent Transactions” instead of the raw order ID. We tolerate failures so
   * the wallet keeps rendering even if the orders API is unavailable.
   */
  useEffect(() => {
    const orderNumbers = new Set<string>();
    transactions.forEach((t) => {
      const orderNumber = extractOrderNumberFromTxnDescription(t.description);
      if (orderNumber && !(orderNumber in orderLabelByNumber)) {
        orderNumbers.add(orderNumber);
      }
    });
    if (orderNumbers.size === 0) return;

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        Array.from(orderNumbers).map(async (num) => {
          try {
            const detail = await orderService.getOrderByOrderNumber(num);
            if (!detail || typeof detail !== "object") {
              return [num, null] as const;
            }
            const rec = detail as Record<string, unknown>;
            const firstItem = extractFirstItemNameFromOrderRaw(rec);
            const count = resolveOrderItemsCount(rec);
            const label = formatOrderListProductLabel(firstItem, count);
            return [num, label || null] as const;
          } catch {
            return [num, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setOrderLabelByNumber((prev) => {
        const next = { ...prev };
        for (const [num, label] of entries) {
          next[num] = label;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [transactions, orderLabelByNumber]);

  const filteredWalletRows = useMemo(() => {
    const all = [...transactions, ...(transactionLogs || [])];
    if (showDepositHistoryOnly) {
      return transactions.filter((t) => t.type === "CREDIT");
    }
    if (feature === "gpDaily") {
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
      await tryCompleteGpDailyPendingSubscriptionAfterRecharge(
        (path, opts) => navigate(path, opts),
        feature,
      );
    }
  };

  // Handle network reconnection
  useEffect(() => {
    if (isOnline && !isRecovering) {
      const pendingPayments = getPendingPayments();
      if (pendingPayments.length > 0) {
        void recoverPendingPayments();
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

  const pagePad = "px-4";

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
          className="sticky top-0 z-10"
        />

        <div className={`${pagePad} flex flex-col gap-6 pb-20`}>
        <div className="flex w-full flex-col gap-4">
        {/* Balance card — match mobile `WalletScreen` gradient, radius, type scale */}
        <div
          className="w-full shrink-0 text-white rounded-[34px] p-[22px] shadow-sm relative overflow-hidden"
          style={{
            background:
              "linear-gradient(280.14deg, rgba(2, 133, 50, 0.85) 5.56%, rgba(22, 163, 74, 0.85) 129.06%)",
          }}
        >
          <div className="mb-0 flex min-h-0 items-center">
            <span className="text-[10px] font-serif font-bold tracking-wide text-white uppercase leading-none">
              Available Balance
            </span>
          </div>

          <div className="mt-2 text-[42px] font-serif font-bold leading-[1.1] text-white">
            {isLoadingBalance ? (
              <Spinner size={48} variant="light" className="flex-shrink-0" />
            ) : (
              `₹${balance?.toLocaleString()}`
            )}
          </div>

          <div className="mt-2 border-t border-white/30 pt-1.5 text-[12px] font-serif font-normal text-white/[0.92]">
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
          gpDailyHasSubscription &&
          gpDailyOrderHold.show && (
            <div className="w-full shrink-0 rounded-[24px] bg-[#ff4d4f] px-3 py-2.5 text-white">
              <div className="flex items-start gap-2">
                <img
                  src={lowbalanceIcon}
                  alt=""
                  className="h-7 w-7 shrink-0 mt-0.5"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-serif text-sm font-bold leading-5 text-white">Order in hold</h3>
                  <p className="font-sans text-sm leading-5 text-white/90">
                    {gpDailyOrderHold.lowBalanceForSubscription
                      ? `Your wallet balance is below 3-day subscription amount (₹${gpDailyOrderHold.threshold3Day}). Recharge now to continue deliveries.`
                      : "Your wallet balance is low. Recharge now to continue your daily deliveries."}
                  </p>
                </div>
              </div>
            </div>
          )}

        {!isLoadingBalance &&
          feature === "gpDaily" &&
          isLoggedIn &&
          !gpDailyOrderHold.show &&
          balance < 500 && (
            <div className="w-full shrink-0 flex flex-row items-start gap-2 rounded-[40px] bg-[#ff4d4f] px-3 py-2.5 text-white">
              <IoAlertCircle className="h-[18px] w-[18px] shrink-0 text-white" style={{ marginTop: 1 }} aria-hidden />
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-sm font-bold leading-5 text-white">Low Balance</h3>
                <p className="mt-1 font-sans text-sm leading-5 text-white/90">
                  Your wallet balance is low. Recharge now
                </p>
              </div>
            </div>
          )}

        {!isLoadingBalance && feature === "gpStore" && balance < 500 && (
          <div className="w-full shrink-0 flex flex-row items-start gap-2 rounded-[40px] bg-[#ff4d4f] px-3 py-2.5 text-white">
            <IoAlertCircle className="h-[18px] w-[18px] shrink-0 text-white" style={{ marginTop: 1 }} aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-[13px] font-bold leading-[18px] text-white">Low Balance</h3>
              <p className="mt-1 font-serif text-xs leading-4 text-white">
                Your wallet balance is low. Recharge now
              </p>
            </div>
          </div>
        )}
        </div>

        {/* Add Money — match mobile `WalletScreen` chips, labels, field, CTA */}
        <section className="w-full">
          <h2 className="mb-3 text-[22px] font-serif font-bold text-[#222222]">
            Add Money to Wallet
          </h2>

          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickAmount(amount)}
                className={`min-w-0 rounded-[10px] border px-3.5 py-2 text-xs font-sans font-semibold transition-colors ${
                  isQuickAmountActive(amount)
                    ? "border-[#FFB043] bg-[#FFB043] text-[#222222]"
                    : "border-[#e5e7eb] bg-white text-[#808080]"
                }`}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          <div className="mb-2.5">
            <label className="mb-1.5 mt-2.5 block text-sm font-serif font-normal text-[#222222]">
              Enter Amount
            </label>
            <input
              type="text"
              value={customAmount}
              onChange={handleAmountChange}
              className={`h-[46px] w-full rounded-[10px] border bg-white px-3 font-sans text-base text-[#111827] placeholder:text-[#9CA3AF] ${
                customAmount && parseInt(customAmount) < MIN_AMOUNT
                  ? "border-red-300 bg-red-50"
                  : "border-[#d1d5db]"
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
                setPaymentFieldMessage(null);
                await walletService.verifyPayment({
                  razorpay_payment_id: data.razorpay_payment_id,
                  razorpay_order_id: data.razorpay_order_id,
                  razorpay_signature: data.razorpay_signature,
                  amount,
                });

                // Payment verified successfully, remove from pending
                removePendingPayment(pendingPaymentId);

                setPaymentFieldMessage("Payment successful");
                await fetchWalletBalance();
                const completed = await tryCompleteGpDailyPendingSubscriptionAfterRecharge(
                  (path, opts) => navigate(path, opts),
                  feature,
                );
                if (completed) return;
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
            className="mt-2.5 block w-full rounded-[12px] bg-[#FFB043] py-3 text-center text-sm font-sans font-semibold text-[#222222] transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
            buttonText={
              isProcessingPayment ? "Processing..." : `Proceed to Pay ₹${customAmount}`
            }
            disabled={
              isProcessingPayment ||
              !customAmount ||
              parseInt(customAmount) < MIN_AMOUNT
            }
          />
          {paymentFieldMessage ? (
            <p className="mt-2 text-xs font-medium text-green-700">
              {paymentFieldMessage}
            </p>
          ) : null}
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
        </section>

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
        <section className="w-full">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[22px] font-serif font-bold text-[#222222]">
              Recent Transactions
            </h2>
            <button
              type="button"
              onClick={() => setShowDepositHistoryOnly((p) => !p)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[20px] border border-[#d1d5db] bg-white px-2.5 py-1.5 text-[10px] font-sans font-semibold text-[#374151] hover:bg-gray-50"
            >
              <DepositHistoryGlyph className="text-[#374151]" />
              {showDepositHistoryOnly ? "All Transactions" : "Deposit History"}
            </button>
          </div>

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
                    Wallet transactions will appear here after your first top-up or cashback.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[...filteredWalletRows]
                .sort((a, b) => rowCreatedMs(b) - rowCreatedMs(a))
                .map((item, idx) => {
                  const isTransaction = isWalletTransactionRow(item);
                  const isDailyWallet = feature === "gpDaily";

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

                  const orderNumber = isTransaction
                    ? extractOrderNumberFromTxnDescription(item.description)
                    : null;
                  const orderProductLabel = orderNumber
                    ? orderLabelByNumber[orderNumber] ?? null
                    : null;

                  // Show the product (e.g. "Premium Marigold + 2 more") in place
                  // of the raw order number; fall back to the description prefix
                  // ("Payment for order", "Refund for order", etc.) when the
                  // order lookup is still loading or unavailable.
                  let titleLine: string;
                  if (isTransaction) {
                    if (orderNumber) {
                      if (orderProductLabel) {
                        titleLine = orderProductLabel;
                      } else {
                        const cleaned = (item.description || "")
                          .replace(orderNumber, "")
                          .replace(/\s*[—-]?\s*$/, "")
                          .trim();
                        titleLine =
                          cleaned ||
                          (item.type === "CREDIT"
                            ? "Refund"
                            : "Order payment");
                      }
                    } else {
                      titleLine =
                        item.description ||
                        `${item.type === "CREDIT" ? "Credit" : "Debit"} - Transaction`;
                    }
                  } else {
                    titleLine = "Wallet Recharge";
                  }

                  const isClickable = Boolean(orderNumber);
                  const handleRowClick = () => {
                    if (!orderNumber) return;
                    navigate(`${basePath}/orders/${orderNumber}`);
                  };

                  return (
                    <div
                      key={`txn-${idx}`}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={isClickable ? handleRowClick : undefined}
                      onKeyDown={
                        isClickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleRowClick();
                              }
                            }
                          : undefined
                      }
                      className={`mb-2 flex min-h-[64px] w-full items-center gap-2 rounded-[12px] border border-[#f3f4f6] bg-white px-3 py-2.5 last:mb-0 ${
                        isClickable
                          ? "cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FAA222]/50"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isPending
                              ? "bg-yellow-50"
                              : isCredit
                                ? "bg-[#ecfdf3]"
                                : "bg-[#fef2f2]"
                          }`}
                        >
                          {isPending ? (
                            <IoWarningOutline className="h-3.5 w-3.5 text-yellow-500" />
                          ) : isCredit ? (
                            <IoMdArrowUp className="-rotate-[135deg] h-3.5 w-3.5 text-[#16a34a]" />
                          ) : (
                            <IoMdArrowDown className="-rotate-[135deg] h-3.5 w-3.5 text-[#ef4444]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="line-clamp-2 break-words text-xs font-sans font-medium leading-4 text-[#222222]">
                            {titleLine}
                          </p>
                          <div className="mt-0.5 text-[11px] font-sans font-normal text-[#808080]">
                            {formatTxnTimeAppStyle(createdRaw)}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-right">
                        <div
                          className={`text-xs font-sans font-semibold ${
                            isPending
                              ? "text-yellow-600"
                              : isCredit
                                ? "text-[rgb(0,113,42)]"
                                : "text-[rgb(205,21,24)]"
                          }`}
                        >
                          {!isPending
                            ? `${isCredit ? "+" : "-"}₹${amount.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}`
                            : null}
                        </div>
                        {!isTransaction && (
                          <div
                            className={`text-xs ${
                              isPending
                                ? "text-yellow-600"
                                : isCredit
                                  ? "text-[rgb(0,113,42)]"
                                  : "text-gray-600"
                            }`}
                          >
                            {`${(item as { status?: string }).status?.charAt(0).toUpperCase() ?? ""}${(item as { status?: string }).status?.slice(1).toLowerCase() ?? ""}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
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
