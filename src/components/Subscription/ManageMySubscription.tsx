import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  subscriptionService,
  type Subscription,
} from "../../services/subscription.service";
import { orderService } from "../../services/order.service";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import walletImage from "../../assets/icon/Wallet.png";
import profileImage from "../../assets/icon/Profile.png";
import Low_Balance from "../../assets/icon/LowBalance.png";
import {
  IoArrowBack,
  IoChevronDown,
  IoChevronUp,
  IoCreateOutline,
  IoCubeOutline,
  IoPlay,
} from "react-icons/io5";
import modifySubIcon from "../../assets/svg/cancelpage/modify.svg";
import pauseSubIcon from "../../assets/svg/cancelpage/pause.svg";
import cancelSubIcon from "../../assets/svg/cancelpage/cancel..svg";
import Spinner from "../../components/common/Spinner";
import { SubscriptionFlowSkeleton } from "../common/PageSkeletons";
import { format } from "date-fns";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

const WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayStringToApiInt(day: string): number | undefined {
  const s = String(day).trim().toLowerCase();
  if (s.startsWith("mon")) return 0;
  if (s.startsWith("tue")) return 1;
  if (s.startsWith("wed")) return 2;
  if (s.startsWith("thu")) return 3;
  if (s.startsWith("fri")) return 4;
  if (s.startsWith("sat")) return 5;
  if (s.startsWith("sun")) return 6;
  return undefined;
}

function selectedDaysToApiInts(days: string[]): number[] {
  const map: Record<string, number> = {
    MONDAY: 0,
    MON: 0,
    TUESDAY: 1,
    TUE: 1,
    WEDNESDAY: 2,
    WED: 2,
    THURSDAY: 3,
    THU: 3,
    FRIDAY: 4,
    FRI: 4,
    SATURDAY: 5,
    SAT: 5,
    SUNDAY: 6,
    SUN: 6,
  };
  const out: number[] = [];
  for (const d of days) {
    const key = String(d).trim().toUpperCase().replace(/\.$/, "");
    const n = map[key] ?? dayStringToApiInt(d);
    if (n != null) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function getDeliveryDayInts(subscription: Subscription): number[] {
  if (subscription.deliveryDayInts?.length) {
    return subscription.deliveryDayInts;
  }
  const fromSelected = selectedDaysToApiInts(subscription.selectedDays || []);
  if (fromSelected.length) return fromSelected;
  if (
    subscription.deliveryPreference === "DAILY" ||
    subscription.type === "DAILY"
  ) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return [];
}

/** JS `Date.getDay()`: 0 Sun … 6 Sat → delivery int 0 Mon … 6 Sun (same as `WEEK_SHORT` index). */
function jsWeekdayToDeliveryInt(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Local hour (0–23) after which today's subscribed day no longer counts as "next delivery"
 * (same-day ordering / morning route is assumed closed).
 */
const SAME_DAY_NEXT_DELIVERY_CUTOFF_HOUR = 12;

/**
 * Next calendar day on a subscribed weekday (`getDeliveryDayInts`), from today onward.
 * If today is a delivery day but {@link SAME_DAY_NEXT_DELIVERY_CUTOFF_HOUR} has passed, today is skipped.
 */
function computeNextDeliveryFromSubscribedDays(
  subscription: Subscription,
): Date | null {
  if (
    subscription.status === "PAUSED" ||
    subscription.status === "INACTIVE" ||
    subscription.status === "CANCELLED"
  ) {
    return null;
  }
  const ints = getDeliveryDayInts(subscription);
  if (!ints.length) return null;

  const allowed = new Set(ints);
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const cutoffToday = new Date(todayMidnight);
  cutoffToday.setHours(SAME_DAY_NEXT_DELIVERY_CUTOFF_HOUR, 0, 0, 0);
  const skipTodayBecauseSlotPassed = now.getTime() >= cutoffToday.getTime();

  for (let add = 0; add <= 28; add++) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() + add);
    const ui = jsWeekdayToDeliveryInt(d.getDay());
    if (!allowed.has(ui)) continue;
    if (add === 0 && skipTodayBecauseSlotPassed) continue;
    return d;
  }
  return null;
}

const GP_DAILY_BASE = "/gp-daily";

function subscriptionOrderListTitle(o: Record<string, unknown>): string {
  const items = o.items as unknown[] | undefined;
  if (Array.isArray(items) && items.length > 0) {
    const p = (items[0] as Record<string, unknown>)?.product as
      | Record<string, unknown>
      | undefined;
    const name = p?.name;
    if (typeof name === "string" && name.trim()) return name;
  }
  const num = o.order_number;
  if (typeof num === "string" && num.trim()) return num;
  return "Subscription order";
}

/** Delivery history row — time line aligned with mobile `mapDeliveryHistoryFromOrders`. */
function subscriptionOrderListTimeLabel(o: Record<string, unknown>): string {
  const raw =
    (o.delivery_date as string) ||
    (o.deliveryDate as string) ||
    (o.delivered_at as string) ||
    (o.created_at as string) ||
    (o.createdAt as string);
  if (!raw || typeof raw !== "string") return "—";
  try {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "—";
    const now = new Date();
    const isToday = now.toDateString() === dt.toDateString();
    if (isToday) {
      return `Today, ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
    }
    return `${dt.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}, ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

function historyOrderDelivered(o: Record<string, unknown>): boolean {
  const st = String(o.status ?? "").toLowerCase();
  return (
    st === "delivered" ||
    st === "completed" ||
    st === "fulfilled" ||
    st === "success"
  );
}

function historyOrderCancelled(o: Record<string, unknown>): boolean {
  const st = String(o.status ?? "").toLowerCase();
  return st === "cancelled" || st === "canceled";
}

const DELIVERY_HISTORY_PAGE_SIZE = 6;
/** Show Support link only within 4h of `delivered_at` (match mobile `SubscriptionsScreen`). */
const SUPPORT_TICKET_WINDOW_MS = 4 * 60 * 60 * 1000;

function isSupportAvailableForDelivery(
  delivered: boolean,
  deliveredAtRaw: unknown,
): boolean {
  if (!delivered || !deliveredAtRaw) return false;
  const deliveredMs = new Date(String(deliveredAtRaw)).getTime();
  if (!Number.isFinite(deliveredMs) || deliveredMs <= 0) return false;
  return Date.now() < deliveredMs + SUPPORT_TICKET_WINDOW_MS;
}

function normalizeApiStatusKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isOutForDeliveryApiStatus(raw: string): boolean {
  const k = normalizeApiStatusKey(raw);
  return (
    k === "out_for_delivery" ||
    k === "outfordelivery" ||
    k.startsWith("out_for_delivery") ||
    k === "shipping" ||
    k === "shipped" ||
    k === "in_transit" ||
    k === "intransit"
  );
}

function isConfirmedPipelineApiStatus(raw: string): boolean {
  const k = normalizeApiStatusKey(raw);
  if (!k) return false;
  if (k === "delivered") return false;
  if (k.includes("cancel")) return false;
  if (isOutForDeliveryApiStatus(raw)) return false;
  return (
    k === "confirmed" ||
    k === "pending" ||
    k === "processing" ||
    k === "scheduled" ||
    k === "placed" ||
    k === "accepted"
  );
}

/** Match API `status` (snake_case) for delivery history rows — not a binary “undelivered”. */
function formatHistoryOrderStatusFromApi(o: Record<string, unknown>): string {
  const raw = String(o.status ?? "").trim();
  if (!raw) return "Pending";
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function isSubscriptionOrderType(o: Record<string, unknown>): boolean {
  const t = String(o.order_type ?? o.orderType ?? "")
    .trim()
    .toLowerCase();
  return t === "subscription";
}

const ManageMySubscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useFeatureTheme();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // const [showCancelModal, setShowCancelModal] = useState(false); // Removed modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessToast] = useState(false);
  const [editingDays, setEditingDays] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "history">(() =>
    new URLSearchParams(location.search).get("tab") === "history"
      ? "history"
      : "subscriptions",
  );
  const [historyOrders, setHistoryOrders] = useState<Record<string, unknown>[]>(
    [],
  );
  const [historyVisibleCount, setHistoryVisibleCount] = useState(
    DELIVERY_HISTORY_PAGE_SIZE,
  );
  const [historyLoading, setHistoryLoading] = useState(false);

  const visibleHistoryOrders = useMemo(
    () => historyOrders.slice(0, historyVisibleCount),
    [historyOrders, historyVisibleCount],
  );
  const hasMoreHistoryRows = historyVisibleCount < historyOrders.length;

  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] =
    useState(false);
  const [balanceDetails] = useState({
    currentBalance: 0,
    requiredAmount: 0,
    shortageAmount: 0,
    subscriptionType: "Daily" as "DAILY" | "CUSTOM",
    days: 7,
  });

  // const [cancellationReason, setCancellationReason] = useState("");
  // const [, setShowReasonError] = useState(false);

  const [modifyData, setModifyData] = useState({
    quantity: 1,
    selectedDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
  });

  const [validationError, setValidationError] = useState<string>("");
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);
  /** PACKS accordion per subscription; only first card expanded by default (app parity). */
  const [packsExpandedBySubId, setPacksExpandedBySubId] = useState<
    Record<string, boolean>
  >({});
  const [resumingSubId, setResumingSubId] = useState<string | null>(null);

  // Days of the week
  // const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  useEffect(() => {
    if (openActionsMenuId == null) return;
    const onPointerDown = (e: PointerEvent) => {
      const id = openActionsMenuId;
      const safe =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(id)
          : id.replace(/["\\]/g, "");
      const root = document.querySelector(`[data-subscription-actions="${safe}"]`);
      if (root && !root.contains(e.target as Node)) {
        setOpenActionsMenuId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [openActionsMenuId]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("tab");
    setActiveTab(q === "history" ? "history" : "subscriptions");
  }, [location.search]);

  useEffect(() => {
    if (activeTab !== "history") return;
    let cancelled = false;
    void (async () => {
      setHistoryLoading(true);
      try {
        const list = await orderService.getOrders({
          order_type: "subscription",
        });
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        const sorted = [...arr].sort((a: any, b: any) => {
          const ta = new Date(a.created_at || a.createdAt || 0).getTime();
          const tb = new Date(b.created_at || b.createdAt || 0).getTime();
          return tb - ta;
        });
        const asRecords = sorted.map((o) =>
          o !== null && typeof o === "object"
            ? (o as Record<string, unknown>)
            : {},
        );
        /** API may still return mixed types — keep only subscription orders */
        setHistoryOrders(asRecords.filter((row) => isSubscriptionOrderType(row)));
        setHistoryVisibleCount(DELIVERY_HISTORY_PAGE_SIZE);
      } catch {
        if (!cancelled) setHistoryOrders([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  /**
   * Card footer — matches app `getNextDeliveryLabel` / `SubscriptionsScreen`:
   * cancelled → no row (`null`); paused → "Next Delivery: Paused"; active → date or em dash.
   */
  const getNextDeliveryLine = (subscription: Subscription): string | null => {
    if (subscription.status === "CANCELLED") {
      return null;
    }
    if (
      subscription.status === "PAUSED" ||
      subscription.status === "INACTIVE"
    ) {
      return "Next Delivery: Paused";
    }
    const fromSchedule = computeNextDeliveryFromSubscribedDays(subscription);
    if (fromSchedule) {
      return `Next Delivery: ${format(fromSchedule, "EEE, d MMM")}`;
    }
    const apiNext = subscription.nextDeliveryDate;
    if (apiNext && !Number.isNaN(apiNext.getTime())) {
      return `Next Delivery: ${format(apiNext, "EEE, d MMM")}`;
    }
    return "Next delivery: —";
  };

  const fetchSubscriptionDetails = async () => {
    try {
      setIsLoading(true);
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        // Sort subscriptions: active first, then paused, then cancelled
        const sortedSubscriptions = fetchedSubscriptions.sort((a, b) => {
          if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
          if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
          if (a.status === "PAUSED" && b.status === "CANCELLED") return -1;
          if (a.status === "CANCELLED" && b.status === "PAUSED") return 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ); // Newest first
        });
        setSubscriptions(sortedSubscriptions);
        setSelectedSubscription(sortedSubscriptions[0]);
      } else {
        setSubscriptions([]);
        setSelectedSubscription(null);
        toast.success("You don't have any subscriptions");
      }
    } catch (error: any) {
      toast.error(
        error.message ||
        "Failed to fetch subscription details. Please try again later."
      );
      setSubscriptions([]);
      setSelectedSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSubscription = async (
    e: React.MouseEvent,
    subId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setResumingSubId(subId);
      await subscriptionService.toggleSubscriptionStatus(subId);
      toast.success("Subscription resumed");
      await fetchSubscriptionDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not resume";
      toast.error(msg);
    } finally {
      setResumingSubId(null);
    }
  };

  // Helper function to normalize day names to full day names
  const normalizeDayName = (day: string): string => {
    const dayMap: { [key: string]: string } = {
      'sunday': 'Sunday', 'sun': 'Sunday',
      'monday': 'Monday', 'mon': 'Monday',
      'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tues': 'Tuesday',
      'wednesday': 'Wednesday', 'wed': 'Wednesday',
      'thursday': 'Thursday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
      'friday': 'Friday', 'fri': 'Friday',
      'saturday': 'Saturday', 'sat': 'Saturday'
    };

    return dayMap[day.toLowerCase()] || day;
  };

  // Handle updating subscription days
  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;

    // Validate minimum 3 days selection
    if (editingDays.length < 3) {
      setValidationError("Please select at least 3 days for your subscription");
      return;
    }

    try {
      setIsUpdating(true);

      // Determine the subscription type based on number of days selected
      const subscriptionType = editingDays.length === 7 ? "DAILY" : "CUSTOM";

      await subscriptionService.updateSubscription(selectedSubscription.id, {
        type: subscriptionType,
        selectedDays: editingDays,
        status: selectedSubscription.status,
      });

      // Refresh subscriptions
      await fetchSubscriptionDetails();
      setShowEditModal(false);
      setValidationError("");
      toast.success("Subscription updated successfully!");
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  // const handleCancel = async () => {
  //   if (!cancellationReason.trim()) {
  //     setShowReasonError(true);
  //     return;
  //   }
  //   try {
  //     // Pass cancellation reason in the correct format
  //     await subscriptionService.cancelSubscription(
  //       selectedSubscription!.id,
  //       cancellationReason
  //     );
  //     setShowCancelModal(false);
  //     setCancellationReason("");
  //     // Navigate to cancel landing page instead of fetching subscriptions
  //     navigate("/cancel-subscription");
  //   } catch (error: any) {
  //     toast.error(error.message || "Failed to cancel subscription");
  //   }
  // };

  const handleRechargeWallet = () => {
    setShowInsufficientBalanceModal(false);
    navigate("/gp-daily/wallet", {
      state: {
        requiredAmount: balanceDetails.shortageAmount,
        currentBalance: balanceDetails.currentBalance,
        returnUrl: `/product/${selectedSubscription?.id}`,
        subscriptionType: selectedSubscription?.type,
        minimumDays: 7,
        maximumDays: selectedSubscription?.type === "DAILY" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const renderSubscriptionCard = (subscription: Subscription) => {
    const isActive = subscription.status === "ACTIVE";
    const isCancelled = subscription.status === "CANCELLED";
    const isPaused =
      subscription.status === "PAUSED" || subscription.status === "INACTIVE";
    const nextDeliveryLabel = getNextDeliveryLine(subscription);

    const lineItems =
      subscription.lineItems && subscription.lineItems.length > 0
        ? subscription.lineItems
        : [
            {
              name: subscription.productDetails?.name || "Subscription",
              imageUrl: subscription.productDetails?.imagesUrl?.[0],
              quantity: 1,
              unitPrice: subscription.amount ?? 0,
              subtotal:
                subscription.totalAmount ??
                subscription.amount ??
                0,
            },
          ];

    const itemsSubtotal = lineItems.reduce((s, li) => s + li.subtotal, 0);
    const totalDisplay =
      subscription.totalAmount != null && Number.isFinite(subscription.totalAmount)
        ? subscription.totalAmount
        : itemsSubtotal;

    const formatRupees = (n: number) =>
      Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0";

    const formatQty = (q: number) => {
      if (!Number.isFinite(q)) return "1";
      return Number.isInteger(q) ? String(q) : String(q);
    };

    const deliveryInts = getDeliveryDayInts(subscription);

    const primaryLine = lineItems[0];
    const headline =
      primaryLine?.name ||
      subscription.productDetails?.name ||
      "Subscription";
    const freqLabel =
      subscription.deliveryPreference === "DAILY" ||
      subscription.type === "DAILY"
        ? "Daily"
        : "Custom";
    const totalPackQty = lineItems.reduce(
      (s, li) => s + (Number(li.quantity) || 1),
      0
    );
    const subIdKey = String(subscription.id);
    const defaultExpanded =
      subscriptions.findIndex((x) => x.id === subscription.id) === 0;
    const packsExpanded =
      packsExpandedBySubId[subIdKey] ?? defaultExpanded;

    const statusBadge = isActive ? (
      <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#166534]">
        Active
      </span>
    ) : isCancelled ? (
      <span className="shrink-0 rounded-full bg-[#FCE7F3] px-2.5 py-0.5 text-xs font-semibold text-[#DC2626]">
        Cancelled
      </span>
    ) : isPaused ? (
      <span className="shrink-0 rounded-full bg-[#FFF3CD] px-2.5 py-0.5 text-xs font-semibold text-[#664D03]">
        Paused
      </span>
    ) : (
      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
        {subscription.status}
      </span>
    );

    return (
      <div
        key={subscription.id}
        className="relative mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        {/* Card header — summary row + status / edit (design ref) */}
        <div className="flex gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {primaryLine?.imageUrl ? (
              <img
                src={primaryLine.imageUrl}
                alt={headline}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-medium text-gray-400">
                {headline.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-bold text-[#1A1A1A]">
                  {headline}
                  <span className="font-semibold text-gray-500"> · </span>
                  <span className="font-semibold text-[#1A1A1A]">{freqLabel}</span>
                </h3>
                <p className="mt-0.5 text-sm text-[#6B7280]">
                  {totalPackQty} pack{totalPackQty === 1 ? "" : "s"} in subscription
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {statusBadge}
                {isActive ? (
                  <div
                    className="relative"
                    data-subscription-actions={subscription.id}
                  >
                    <button
                      type="button"
                      aria-label="Subscription actions"
                      aria-expanded={openActionsMenuId === subscription.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionsMenuId((prev) =>
                          prev === subscription.id ? null : subscription.id
                        );
                      }}
                      className="rounded-lg p-1.5 text-[#1A1A1A] hover:bg-gray-100"
                    >
                      <IoCreateOutline className="text-xl" aria-hidden />
                    </button>
                    {openActionsMenuId === subscription.id ? (
                      <div
                        className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                        role="menu"
                        aria-orientation="vertical"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
                          onClick={() => {
                            setOpenActionsMenuId(null);
                            setSelectedSubscription(subscription);
                            navigate("/gp-daily/modify-Subscription", {
                              state: { subscription },
                            });
                          }}
                        >
                          <img
                            src={modifySubIcon}
                            alt=""
                            width={18}
                            height={18}
                            className="block h-[18px] w-[18px] shrink-0"
                            aria-hidden
                          />
                          Modify
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
                          onClick={() => {
                            setOpenActionsMenuId(null);
                            setSelectedSubscription(subscription);
                            navigate("/gp-daily/pause-subscription", {
                              state: { subscription },
                            });
                          }}
                        >
                          <img
                            src={pauseSubIcon}
                            alt=""
                            width={20}
                            height={20}
                            className="block h-5 w-5 shrink-0 object-contain"
                            aria-hidden
                          />
                          Pause
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => {
                            setOpenActionsMenuId(null);
                            setSelectedSubscription(subscription);
                            navigate("/gp-daily/cancel-subscription", {
                              state: { subscription },
                            });
                          }}
                        >
                          <img
                            src={cancelSubIcon}
                            alt=""
                            width={20}
                            height={20}
                            className="block h-5 w-5 shrink-0 object-contain"
                            aria-hidden
                          />
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* PACKS accordion — line items */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() =>
              setPacksExpandedBySubId((prev) => ({
                ...prev,
                [subIdKey]: !(
                  prev[subIdKey] ??
                  subscriptions.findIndex((x) => x.id === subscription.id) ===
                    0
                ),
              }))
            }
            className="flex w-full items-center justify-between gap-2 py-1 text-left"
            aria-expanded={packsExpanded}
          >
            <span className="text-sm font-bold tracking-wide text-[#1A1A1A]">
              PACKS ({lineItems.length})
            </span>
            {packsExpanded ? (
              <IoChevronUp className="shrink-0 text-lg text-gray-500" aria-hidden />
            ) : (
              <IoChevronDown className="shrink-0 text-lg text-gray-500" aria-hidden />
            )}
          </button>
          {packsExpanded ? (
            <div className="space-y-2 pb-1">
              {lineItems.map((li, idx) => (
                <div
                  key={`${subscription.id}-pack-${idx}`}
                  className="flex gap-3 rounded-xl bg-[#F3F4F6] p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    {li.imageUrl ? (
                      <img
                        src={li.imageUrl}
                        alt={li.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-medium text-gray-400">
                        {li.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">
                      {li.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Qty: {formatQty(li.quantity)} × ₹{formatRupees(li.unitPrice)}
                    </p>
                  </div>
                  <div className="shrink-0 self-center text-sm font-bold text-[#1A1A1A]">
                    ₹{formatRupees(li.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm text-[#4B5563]">Total Amount</span>
          <span className="text-base font-bold text-[#1A1A1A]">
            ₹{formatRupees(totalDisplay)}
          </span>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">
            Subscribed days
          </p>
          <div className="flex justify-between gap-1">
            {WEEK_SHORT.map((label, i) => {
              const on = deliveryInts.includes(i);
              return (
                <div
                  key={label}
                  className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl text-[11px] font-semibold sm:h-10 sm:rounded-xl sm:text-xs ${
                    on
                      ? "text-black"
                      : "border border-gray-300 bg-white text-gray-400"
                  }`}
                  style={
                    on
                      ? { backgroundColor: theme.colors.primary, color: "#000000" }
                      : undefined
                  }
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {nextDeliveryLabel != null ? (
          <div className="mt-4 flex flex-row items-center justify-between gap-2.5">
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-[#374151]">
              {nextDeliveryLabel}
            </p>
            {isPaused ? (
              <button
                type="button"
                onClick={(ev) => void handleResumeSubscription(ev, String(subscription.id))}
                disabled={resumingSubId === String(subscription.id)}
                className="inline-flex min-w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border-[1.5px] border-[#2563EB] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#2563EB] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resumingSubId === String(subscription.id) ? (
                  <Spinner size={18} variant="default" className="!inline-flex" />
                ) : (
                  <>
                    Resume
                    <IoPlay className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  if (isLoading) {
    return <SubscriptionFlowSkeleton />;
  }

  if (subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No Subscriptions</h2>
            <p className="text-gray-600 mb-6">
              You don't have any subscriptions. Subscribe to a base pack to get
              started.
            </p>
            <button
              onClick={() => navigate("/gp-daily/products?category=pujaflowers")}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium"
            >
              Browse Subscribe Packs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="mb-5 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-100"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="font-ibm-plex-serif min-w-0 truncate whitespace-nowrap text-xl font-bold text-gray-900 md:text-2xl">
              Your Flower Subscriptions
            </h1>
          </div>

          {/* Tabs — same chip pattern as mobile Subscriptions screen */}
          <div className="mb-6 rounded-[14px] border border-[#F1F5F9] bg-white p-1.5 shadow-sm">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("subscriptions");
                  navigate(`${GP_DAILY_BASE}/manage-my-subscription`, {
                    replace: true,
                  });
                }}
                className={`flex-1 rounded-[14px] border py-2.5 text-center text-sm font-semibold transition-colors ${
                  activeTab === "subscriptions"
                    ? "border-[#FFB043] bg-[#FFB043] text-[#222222]"
                    : "border-transparent bg-white text-[#6B7280]"
                }`}
              >
                Subscriptions
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  navigate(`${GP_DAILY_BASE}/manage-my-subscription?tab=history`, {
                    replace: true,
                  });
                }}
                className={`flex-1 rounded-[14px] border py-2.5 text-center text-sm font-semibold transition-colors ${
                  activeTab === "history"
                    ? "border-[#FFB043] bg-[#FFB043] text-[#222222]"
                    : "border-transparent bg-white text-[#6B7280]"
                }`}
              >
                Delivery History
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
          {activeTab === "subscriptions" && (
            <div className="mb-8">
              {subscriptions.map(renderSubscriptionCard)}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 pb-4">
              {historyLoading ? (
                <div className="rounded-2xl bg-white py-10 text-center text-sm text-gray-500 shadow-sm">
                  Loading orders…
                </div>
              ) : historyOrders.length > 0 ? (
                <>
                {visibleHistoryOrders.map((order, index) => {
                  const orderNumber =
                    typeof order.order_number === "string"
                      ? order.order_number
                      : "";
                  const delivered = historyOrderDelivered(order);
                  const cancelled = historyOrderCancelled(order);
                  const apiSt = String(order.status ?? "");
                  const outbound =
                    !delivered &&
                    !cancelled &&
                    isOutForDeliveryApiStatus(apiSt);
                  const confirmedPipe =
                    !delivered &&
                    !cancelled &&
                    isConfirmedPipelineApiStatus(apiSt);
                  const statusLabel = delivered
                    ? "Delivered"
                    : formatHistoryOrderStatusFromApi(order);

                  return (
                    <div
                      key={
                        (order.id != null ? String(order.id) : null) ||
                        orderNumber ||
                        index
                      }
                      className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3 sm:gap-2.5"
                    >
                      <button
                        type="button"
                        disabled={!orderNumber?.trim()}
                        onClick={() => {
                          if (orderNumber) {
                            navigate(
                              `${GP_DAILY_BASE}/orders/${encodeURIComponent(orderNumber)}`,
                              { state: { fromSubscriptionHistory: true } },
                            );
                          }
                        }}
                        className={`flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-2.5 ${
                          orderNumber?.trim()
                            ? "cursor-pointer rounded-lg hover:bg-gray-50/80"
                            : "cursor-default opacity-90"
                        }`}
                      >
                        <IoCubeOutline
                          className="h-[22px] w-[22px] shrink-0"
                          style={{
                            color: delivered
                              ? "#16A34A"
                              : cancelled
                                ? "#DC2626"
                                : outbound
                                  ? "#2563EB"
                                  : confirmedPipe
                                    ? "#B45309"
                                    : "#6B7280",
                          }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[15px] font-bold leading-snug text-[#111827]">
                            {subscriptionOrderListTitle(order)}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-[#6B7280]">
                            {subscriptionOrderListTimeLabel(order)}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold ${
                            delivered
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : cancelled
                                ? "bg-[#FEE2E2] text-[#991B1B]"
                                : outbound
                                  ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                  : confirmedPipe
                                    ? "bg-[#FEF3C7] text-[#92400E]"
                                    : "bg-[#F3F4F6] text-[#374151]"
                          }`}
                        >
                          {statusLabel}
                        </span>
                        {delivered &&
                        isSupportAvailableForDelivery(
                          true,
                          order.delivered_at,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`${GP_DAILY_BASE}/customer-support`)
                            }
                            className="text-xs font-semibold text-[#2563EB] underline decoration-1 underline-offset-2 hover:text-gray-900"
                          >
                            Support
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {hasMoreHistoryRows ? (
                  <button
                    type="button"
                    className="w-full py-4 text-center text-sm font-medium text-gray-500 underline"
                    onClick={() =>
                      setHistoryVisibleCount(
                        (c) => c + DELIVERY_HISTORY_PAGE_SIZE,
                      )
                    }
                  >
                    Load more
                  </button>
                ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                  <IoCubeOutline className="h-12 w-12 text-[#D1D5DB]" aria-hidden />
                  <p className="mt-4 text-base font-semibold text-[#374151]">
                    No delivery history yet
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B7280]">
                    Completed subscription deliveries will show here with status.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Modal - Updated to include the same functionality as edit modal */}
        {/* <AnimatePresence>
          {showDetailsModal && selectedSubscription && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium">Modify Subscription</h2>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div> */}

        {/* Quantity Section - Same as ProductDisplaypage.tsx */}
        {/* <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium">Quantity</h3>
              <div className="flex items-center gap-4">
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                  onClick={() => setModifyData(prev => ({ 
                    ...prev, 
                    quantity: Math.max(1, prev.quantity - 1) 
                  }))}
                >
                  −
                </button>
                <span className="text-lg font-medium w-4 text-center">
                  {modifyData.quantity}
                </span>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                  onClick={() => setModifyData(prev => ({ 
                    ...prev, 
                    quantity: prev.quantity + 1 
                  }))}
                >
                  +
                </button>
              </div>
            </div>
          </div> */}

        {/* Delivery Days Selection - Same as ProductDisplaypage.tsx with validation */}




        {/* <AnimatePresence> 
    {showDetailsModal && selectedSubscription && (
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-xl w-full max-w-md"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">Modify Subscription</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div> */}

        {/* Quantity Section - Same as ProductDisplaypage.tsx */}
        {/* <div className="mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-medium">Quantity</h3>
                <div className="flex items-center gap-4">
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                    onClick={() => setModifyData(prev => ({ 
                      ...prev, 
                      quantity: Math.max(1, prev.quantity - 1) 
                    }))}
                  >
                    −
                  </button>
                  <span className="text-lg font-medium w-4 text-center">
                    {modifyData.quantity}
                  </span>
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                    onClick={() => setModifyData(prev => ({ 
                      ...prev, 
                      quantity: prev.quantity + 1 
                    }))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div> */}

        {/* Delivery Days Selection - Same as ProductDisplaypage.tsx */}
        {/* <div className="mb-6">
              <h4 className="text-[15px] font-medium mb-4">
                Select delivery days
              </h4>

               {validationError && (
                <p className="text-red-500 text-sm mb-3">{validationError}</p>
              )}
              
              <div className="flex gap-2 justify-between">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
                  const dayKey = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"][index];
                  const isSelected = modifyData.selectedDays.includes(dayKey);
                  
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (isSelected) {
                          // Don't allow deselecting if only 3 days left
                          if (modifyData.selectedDays.length > 3) {
                            setModifyData(prev => ({
                              ...prev,
                              selectedDays: prev.selectedDays.filter(d => d !== dayKey)
                            }));
                          }
                        } else {
                          setModifyData(prev => ({
                            ...prev,
                            selectedDays: [...prev.selectedDays, dayKey]
                          }));
                        }
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                        ${!isSelected
                          ? "bg-white border border-gray-200 text-gray-700 hover:border-[#015D3A]"
                          : "bg-[#015D3A] text-white"
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div> */}

        {/* Subscribe Button - Same as ProductDisplaypage.tsx */}
        {/* <button
              onClick={() => { */}
        {/* // Handle subscription modification here
                console.log("Modifying subscription:", modifyData);
                // You can add API call here to update the subscription
                setShowDetailsModal(false);
                toast.success("Subscription modified successfully!");
              }}
              disabled={modifyData.selectedDays.length < 3}
              className={`w-full py-3.5 rounded-lg text-[15px] font-medium mb-3
                ${modifyData.selectedDays.length >= 3 
                  ? "bg-[#F15A22] text-white" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
            >
              {modifyData.selectedDays.length >= 3
                ? `Subscribe ${modifyData.selectedDays.length} days/wk for ₹${selectedSubscription?.amount || 0}/Pack`
                : "Select at least 3 days to subscribe"}
            </button> */}

        {/* Subscribe Daily Link - Same as ProductDisplaypage.tsx */}
        {/* <button
              onClick={() => {
                setModifyData(prev => ({
                  ...prev,
                  selectedDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
                }));
              }}
              className="w-full text-[#015D3A] text-[15px] font-medium"
            >
              Subscribe Daily
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence> */}


        {/* Details Modal */}
        {/* <AnimatePresence>
          {showDetailsModal && selectedSubscription && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium">Modify Subscription</h2>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div> */}

        {/* <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center gap-4">
                      <button className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl">
                        -
                      </button>
                      <span className="text-xl font-medium">1</span>
                      <button className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl">
                        +
                      </button>
                    </div>
                  </div> */}


        {/* <div className="mb-6">
                    <label className="block text-gray-700 mb-2">
                      Select Delivery Type
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliveryType"
                            className="w-5 h-5 text-green-600"
                          />
                          <span>Daily Delivery</span>
                        </div>
                        <span className="text-gray-600">₹50/Pack</span>
                      </label>

                      <label className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliveryType"
                            className="w-5 h-5 text-green-600"
                            checked
                          />
                          <span>Custom Days</span>
                        </div>
                        <span className="text-gray-600">₹70/Pack</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-8">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day, index) => (
                        <button
                          key={day}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                          ${
                            index < 6
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {day[0]}
                        </button>
                      )
                    )}
                  </div>

               
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-3 rounded-xl bg-[#FF5722] text-white font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence> */}



        {/* Cancel Modal Removed */}

        {/* Success Toast */}
        {/* <AnimatePresence>
          {showSuccessToast && selectedSubscription && (
            <motion.div
              className="fixed top-4 left-4 right-4 bg-white rounded-xl p-4 shadow-lg max-w-sm mx-auto"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="font-semibold text-base mb-1">
                Subscription Paused!
              </h3>
              <p className="text-sm text-gray-600">
                Your {selectedSubscription.productDetails?.name} subscription
                has been paused successfully.
              </p>
              <p className="text-green-600 font-medium mt-2 text-sm">
                Awesome!
              </p>
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Insufficient Balance Modal */}
        <AnimatePresence>
          {showInsufficientBalanceModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-xs sm:max-w-sm p-4"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <h2 className="text-lg font-semibold mb-3">
                  Insufficient Balance
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Your current balance is insufficient to subscribe. Please
                  recharge your wallet.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRechargeWallet}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium
                      hover:bg-green-700 transition-colors"
                  >
                    Recharge Wallet
                  </button>
                  <button
                    onClick={() => setShowInsufficientBalanceModal(false)}
                    className="flex-1 border-2 border-gray-300 py-2.5 rounded-xl text-sm font-medium
                      hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Subscription Modal */}
        {/* <AnimatePresence>
          {showEditModal && selectedSubscription && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Update Delivery Days</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-6 text-center">
                    Select at least 3 days you want to receive your subscription:
                  </p>

                  {validationError && (
                    <p className="text-red-500 text-sm mb-6 text-center">{validationError}</p>
                  )}

                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {['Sun', 'Mon', 'Tues', 'Wed', 'Thus', 'Fri', 'Sat'].map((day, index) => {
                      const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const fullDayName = fullDayNames[index];
                      const isSelected = editingDays.some((d) => {
                        const s = String(d ?? "");
                        return (
                          s.toLowerCase() === fullDayName.toLowerCase() ||
                          normalizeDayName(s) === fullDayName
                        );
                      });

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setEditingDays(prev => {
                              const normalizedPrev = prev.map(d => normalizeDayName(d));
                              const normalizedDay = normalizeDayName(fullDayName);

                              return normalizedPrev.includes(normalizedDay)
                                ? normalizedPrev.filter(d => d !== normalizedDay)
                                : [...normalizedPrev, normalizedDay];
                            });
                            if (validationError) setValidationError("");
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isSelected
                            ? 'bg-[#4CAF50] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                      {editingDays.length} days selected
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleUpdateSubscription}
                    disabled={isUpdating || editingDays.length < 3}
                    className={`w-full py-3 text-sm font-medium text-white rounded-xl flex items-center justify-center gap-2 ${editingDays.length >= 3
                      ? 'bg-[#4CAF50] hover:bg-[#3e8e41]'
                      : 'bg-gray-300 cursor-not-allowed'
                      }`}
                  >
                    {isUpdating ? (
                      <>
                        <Spinner size={20} variant="light" className="flex-shrink-0" />
                        Updating...
                      </>
                    ) : 'Update Subscription'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="w-full py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>*/}
      </div>
    </div>
  );
};

export default ManageMySubscription;