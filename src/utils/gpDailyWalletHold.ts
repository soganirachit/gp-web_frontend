import {
  subscriptionLineItemsFromApiRaw,
  type Subscription,
  type SubscriptionLineItem,
} from "../services/subscription.service";
import { getDeliveryDayInts } from "./subscriptionNextDelivery";

function sumDailyProductFromLineItems(items: SubscriptionLineItem[]): number {
  let productTotal = 0;
  for (const li of items) {
    const subtot = Number(li.subtotal);
    if (Number.isFinite(subtot) && subtot > 0) {
      productTotal += subtot;
      continue;
    }
    const q = Number(li.quantity);
    const u = Number(li.unitPrice);
    if (Number.isFinite(q) && Number.isFinite(u) && q > 0 && u > 0) {
      productTotal += q * u;
    }
  }
  return productTotal;
}

function resolveDeliveryFeeRupees(
  sub: Subscription | null | undefined,
  mergedExtra?: Record<string, unknown> | null,
): number {
  const fromSub = sub?.deliveryFee;
  if (fromSub != null && Number.isFinite(Number(fromSub)) && Number(fromSub) > 0) {
    return Math.max(0, Number(fromSub));
  }
  const ex = mergedExtra?.delivery_fee ?? mergedExtra?.deliveryFee;
  const n = Number(ex);
  return Number.isFinite(n) && n > 0 ? Math.max(0, n) : 0;
}

/**
 * Prefer summed line items over scalar `amount` / `price` — list APIs often set those from one product only (e.g. ₹20)
 * while GET-by-id `items` has every line (₹20 + ₹50 = ₹70/day).
 */
function pickLineItemsForDailyTotal(
  sub: Subscription | null | undefined,
  mergedExtra?: Record<string, unknown> | null,
): SubscriptionLineItem[] {
  const listLines = sub?.lineItems ?? [];
  const detailLines = subscriptionLineItemsFromApiRaw(mergedExtra ?? undefined);
  if (detailLines.length > listLines.length) return detailLines;
  if (listLines.length > 0) return listLines;
  return detailLines;
}

/** Per-day subscription unit (₹) for GP Daily low-balance / “order on hold” rules — mirrors mobile `GpDailyHomeScreen`. */
export function pickActiveSubscriptionDailyUnitRupees(
  sub: Subscription | null | undefined,
  mergedExtra?: Record<string, unknown> | null,
): number {
  const lineItems = pickLineItemsForDailyTotal(sub, mergedExtra);
  if (lineItems.length > 0) {
    const productTotal = sumDailyProductFromLineItems(lineItems);
    if (productTotal > 0) {
      const fee = resolveDeliveryFeeRupees(sub, mergedExtra);
      return fee > 0 ? productTotal + fee : productTotal;
    }
  }

  const m: Record<string, unknown> = {
    ...((sub ?? {}) as unknown as Record<string, unknown>),
    ...(mergedExtra ?? {}),
  };
  const plan = m.plan as Record<string, unknown> | undefined;
  const candidates: unknown[] = [
    m.daily_amount,
    m.amount_per_day,
    m.price_per_day,
    m.amount,
    m.price,
    plan?.daily_amount,
    plan?.amount_per_day,
    plan?.price_per_day,
    plan?.amount,
    plan?.price,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const amt = sub?.amount;
  if (typeof amt === "number" && Number.isFinite(amt) && amt > 0) return amt;
  return 0;
}

export type GpDailyWalletBannerKind = "none" | "running_low" | "on_hold";

export const WALLET_WARNING_DAYS = 3;
/** Recommended one-shot wallet top-up window on the wallet page. */
export const WALLET_RECOMMEND_RECHARGE_DAYS = 30;
export const PAUSE_REASON_INSUFFICIENT_WALLET = "insufficient_wallet";
export const GP_DAILY_WALLET_PAUSE_SCHEDULE_KEY = "gp-daily-wallet-pause-schedule-ymd";

export type GpDailyWalletBannerState = {
  kind: GpDailyWalletBannerKind;
  threeDayTotal: number;
  oneDayTotal: number;
  pauseDate: Date | null;
  pauseDateLabel: string;
  requiredRecharge: number;
  hasWalletHoldPause: boolean;
  runwayLastCoveredDate: Date | null;
};

const SAME_DAY_DELIVERY_CUTOFF_HOUR = 12;

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addCalendarDays(from: Date, days: number): Date {
  const d = startOfDay(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatWalletPauseDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isActiveSubscriptionStatus(status: unknown): boolean {
  const s = String(status ?? "").toUpperCase();
  return s === "ACTIVE" || s === "RUNNING";
}

function isWalletHoldPause(sub: Record<string, unknown>): boolean {
  const st = String(sub.status ?? "").toUpperCase();
  if (st !== "PAUSED") return false;
  const reason = String(sub.pause_reason ?? sub.pauseReason ?? "").toLowerCase();
  return reason.includes("wallet") || reason.includes("insufficient");
}

function jsWeekdayToDeliveryInt(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function isPastSameDayDeliveryCutoff(now: Date): boolean {
  const todayMidnight = startOfDay(now);
  const cutoff = new Date(todayMidnight);
  cutoff.setHours(SAME_DAY_DELIVERY_CUTOFF_HOUR, 0, 0, 0);
  return now.getTime() >= cutoff.getTime();
}

type SubWalletCtx = {
  dailyUnit: number;
  deliveryDayInts: number[];
};

function buildSubWalletContexts(
  subscriptions: Array<{
    sub: Subscription | Record<string, unknown>;
    extra?: Record<string, unknown> | null;
  }>,
): SubWalletCtx[] {
  const ctxs: SubWalletCtx[] = [];
  for (const { sub, extra } of subscriptions) {
    const rec = sub as Record<string, unknown>;
    if (!isActiveSubscriptionStatus(rec.status)) continue;
    const dailyUnit = pickActiveSubscriptionDailyUnitRupees(
      sub as Subscription,
      extra ?? undefined,
    );
    if (dailyUnit <= 0) continue;
    const mergedSub = {
      ...(sub as Subscription),
      ...(extra ?? {}),
    } as Subscription;
    let deliveryDayInts = getDeliveryDayInts(mergedSub);
    if (deliveryDayInts.length === 0) {
      deliveryDayInts = [0, 1, 2, 3, 4, 5, 6];
    }
    ctxs.push({ dailyUnit, deliveryDayInts });
  }
  return ctxs;
}

function costForCalendarDay(ctxs: SubWalletCtx[], date: Date): number {
  const dayInt = jsWeekdayToDeliveryInt(date.getDay());
  let sum = 0;
  for (const ctx of ctxs) {
    if (ctx.deliveryDayInts.includes(dayInt)) {
      sum += ctx.dailyUnit;
    }
  }
  return Math.round(sum);
}

function sumActiveSubscriptionsOneDayTotal(ctxs: SubWalletCtx[]): number {
  return Math.round(ctxs.reduce((acc, c) => acc + c.dailyUnit, 0));
}

function computeRequiredForNextDeliveryDays(
  ctxs: SubWalletCtx[],
  from: Date,
  deliveryDayCount: number,
  skipTodayIfPastCutoff: boolean,
): number {
  let total = 0;
  let counted = 0;
  for (let add = 0; add < 366 && counted < deliveryDayCount; add++) {
    const d = addCalendarDays(from, add);
    if (add === 0 && skipTodayIfPastCutoff) continue;
    const cost = costForCalendarDay(ctxs, d);
    if (cost <= 0) continue;
    total += cost;
    counted++;
  }
  return total;
}

type RunwayResult = {
  lastCoveredDate: Date | null;
  firstUncoveredDeliveryDate: Date | null;
};

function computeWalletRunway(
  balance: number,
  ctxs: SubWalletCtx[],
  from: Date,
  skipTodayIfPastCutoff: boolean,
): RunwayResult {
  let remaining = balance;
  let lastCoveredDate: Date | null = null;
  let firstUncoveredDeliveryDate: Date | null = null;

  for (let add = 0; add < 366; add++) {
    const d = addCalendarDays(from, add);
    if (add === 0 && skipTodayIfPastCutoff) continue;
    const cost = costForCalendarDay(ctxs, d);
    if (cost <= 0) continue;

    if (remaining >= cost) {
      remaining -= cost;
      lastCoveredDate = d;
    } else {
      firstUncoveredDeliveryDate = d;
      break;
    }
  }

  return { lastCoveredDate, firstUncoveredDeliveryDate };
}

export function sumActiveSubscriptionsThreeDayTotal(
  subscriptions: Array<{
    sub: Subscription | Record<string, unknown>;
    extra?: Record<string, unknown> | null;
  }>,
): number {
  const ctxs = buildSubWalletContexts(subscriptions);
  return computeRequiredForNextDeliveryDays(
    ctxs,
    startOfDay(),
    WALLET_WARNING_DAYS,
    isPastSameDayDeliveryCutoff(new Date()),
  );
}

export function sumActiveSubscriptionsThirtyDayTotal(
  subscriptions: Array<{
    sub: Subscription | Record<string, unknown>;
    extra?: Record<string, unknown> | null;
  }>,
): number {
  const ctxs = buildSubWalletContexts(subscriptions);
  return computeRequiredForNextDeliveryDays(
    ctxs,
    startOfDay(),
    WALLET_RECOMMEND_RECHARGE_DAYS,
    isPastSameDayDeliveryCutoff(new Date()),
  );
}

export type ComputeGpDailyWalletBannerInput = {
  isLoggedIn: boolean;
  walletLoading: boolean;
  walletBalance: number;
  subscriptions: Array<Subscription | Record<string, unknown>>;
  extrasBySubId?: Record<string, Record<string, unknown>>;
  storedPauseScheduleYmd?: string | null;
  today?: Date;
};

export type ComputeGpDailyWalletBannerResult = GpDailyWalletBannerState & {
  nextStoredPauseScheduleYmd: string | null;
  shouldAutoPauseActiveSubs: boolean;
};

const emptyBanner = (): ComputeGpDailyWalletBannerResult => ({
  kind: "none",
  threeDayTotal: 0,
  oneDayTotal: 0,
  pauseDate: null,
  pauseDateLabel: "",
  requiredRecharge: 0,
  hasWalletHoldPause: false,
  runwayLastCoveredDate: null,
  nextStoredPauseScheduleYmd: null,
  shouldAutoPauseActiveSubs: false,
});

export function shouldShowGpDailyOrderInHoldCard(
  banner: Pick<GpDailyWalletBannerState, "kind" | "hasWalletHoldPause">,
): boolean {
  return banner.kind === "on_hold";
}

export function shouldShowGpDailyRunningLowCard(
  banner: Pick<GpDailyWalletBannerState, "kind">,
): boolean {
  return banner.kind === "running_low";
}

export function shouldShowGpDailyWalletAlertCard(
  banner: Pick<
    GpDailyWalletBannerState,
    "kind" | "hasWalletHoldPause"
  >,
): boolean {
  return (
    shouldShowGpDailyOrderInHoldCard(banner) ||
    shouldShowGpDailyRunningLowCard(banner)
  );
}

export function computeGpDailyWalletBanner(
  input: ComputeGpDailyWalletBannerInput,
): ComputeGpDailyWalletBannerResult {
  if (!input.isLoggedIn || input.walletLoading) return emptyBanner();

  const today = startOfDay(input.today);
  const now = input.today ?? new Date();
  const skipToday = isPastSameDayDeliveryCutoff(now);
  const subs = input.subscriptions ?? [];
  const activeSubs = subs.filter((s) =>
    isActiveSubscriptionStatus((s as Record<string, unknown>).status),
  );
  const pausedForWallet = subs.some((s) =>
    isWalletHoldPause(s as Record<string, unknown>),
  );
  const hasAnySubscription = subs.some((s) => {
    const st = String((s as Record<string, unknown>).status ?? "").toUpperCase();
    return st !== "CANCELLED" && st !== "CANCELED" && st !== "INACTIVE";
  });

  if (!hasAnySubscription && !pausedForWallet) return emptyBanner();

  const subEntries = activeSubs.map((sub) => {
    const rec = sub as Record<string, unknown>;
    const id = String(rec.id ?? rec.subscription_id ?? "");
    return {
      sub: sub as Subscription,
      extra: input.extrasBySubId?.[id] ?? null,
    };
  });
  const ctxs = buildSubWalletContexts(subEntries);
  const oneDayTotal = sumActiveSubscriptionsOneDayTotal(ctxs);
  const threeDayTotal = computeRequiredForNextDeliveryDays(
    ctxs,
    today,
    WALLET_WARNING_DAYS,
    skipToday,
  );
  const fallbackThreshold = 100;
  const balance = input.walletBalance;

  if (pausedForWallet) {
    return {
      kind: "on_hold",
      threeDayTotal,
      oneDayTotal,
      pauseDate: null,
      pauseDateLabel: "",
      requiredRecharge: Math.max(
        threeDayTotal > 0 ? threeDayTotal - balance : oneDayTotal - balance,
        fallbackThreshold,
      ),
      hasWalletHoldPause: true,
      runwayLastCoveredDate: null,
      nextStoredPauseScheduleYmd: input.storedPauseScheduleYmd ?? null,
      shouldAutoPauseActiveSubs: false,
    };
  }

  if (activeSubs.length === 0 || (oneDayTotal <= 0 && threeDayTotal <= 0)) {
    return emptyBanner();
  }

  const todayCost = skipToday ? 0 : costForCalendarDay(ctxs, today);
  const cannotCoverToday = todayCost > 0 && balance < todayCost;
  const belowOneDayTotal = oneDayTotal > 0 && balance < oneDayTotal;

  const { lastCoveredDate, firstUncoveredDeliveryDate } = computeWalletRunway(
    balance,
    ctxs,
    today,
    skipToday,
  );

  const storedPauseYmd = input.storedPauseScheduleYmd ?? null;
  let pauseScheduleDate: Date | null = firstUncoveredDeliveryDate;
  if (storedPauseYmd) {
    const stored = startOfDay(new Date(`${storedPauseYmd}T00:00:00`));
    if (!Number.isNaN(stored.getTime())) {
      pauseScheduleDate = stored;
    }
  } else if (firstUncoveredDeliveryDate) {
    pauseScheduleDate = firstUncoveredDeliveryDate;
  }

  const requiredForComfort = Math.max(
    threeDayTotal > 0 ? threeDayTotal - balance : 0,
    oneDayTotal > 0 ? oneDayTotal - balance : 0,
    fallbackThreshold,
  );

  if (cannotCoverToday || belowOneDayTotal) {
    return {
      kind: "on_hold",
      threeDayTotal,
      oneDayTotal,
      pauseDate: pauseScheduleDate,
      pauseDateLabel: pauseScheduleDate
        ? formatWalletPauseDate(pauseScheduleDate)
        : "",
      requiredRecharge: Math.max(requiredForComfort, fallbackThreshold),
      hasWalletHoldPause: false,
      runwayLastCoveredDate: lastCoveredDate,
      nextStoredPauseScheduleYmd: pauseScheduleDate
        ? ymd(pauseScheduleDate)
        : storedPauseYmd,
      shouldAutoPauseActiveSubs: activeSubs.length > 0,
    };
  }

  if (threeDayTotal > 0 && balance >= threeDayTotal) {
    return { ...emptyBanner(), nextStoredPauseScheduleYmd: null };
  }

  const onPauseDay =
    pauseScheduleDate != null &&
    today.getTime() >= pauseScheduleDate.getTime();

  if (onPauseDay) {
    return {
      kind: "on_hold",
      threeDayTotal,
      oneDayTotal,
      pauseDate: pauseScheduleDate,
      pauseDateLabel: pauseScheduleDate
        ? formatWalletPauseDate(pauseScheduleDate)
        : "",
      requiredRecharge: Math.max(requiredForComfort, fallbackThreshold),
      hasWalletHoldPause: false,
      runwayLastCoveredDate: lastCoveredDate,
      nextStoredPauseScheduleYmd: pauseScheduleDate
        ? ymd(pauseScheduleDate)
        : storedPauseYmd,
      shouldAutoPauseActiveSubs: activeSubs.length > 0,
    };
  }

  const runwayLabel = lastCoveredDate
    ? formatWalletPauseDate(lastCoveredDate)
    : formatWalletPauseDate(today);

  return {
    kind: "running_low",
    threeDayTotal,
    oneDayTotal,
    pauseDate: lastCoveredDate ?? today,
    pauseDateLabel: runwayLabel,
    requiredRecharge: Math.max(requiredForComfort, fallbackThreshold),
    hasWalletHoldPause: false,
    runwayLastCoveredDate: lastCoveredDate,
    nextStoredPauseScheduleYmd:
      storedPauseYmd ??
      (firstUncoveredDeliveryDate
        ? ymd(firstUncoveredDeliveryDate)
        : null),
    shouldAutoPauseActiveSubs: false,
  };
}

export type GpDailyOrderHoldState = {
  show: boolean;
  lowBalanceForSubscription: boolean;
  threshold3Day: number;
  kind: GpDailyWalletBannerKind;
  pauseDateLabel: string;
  requiredRecharge: number;
  hasWalletHoldPause: boolean;
};

export function computeGpDailyOrderOnHold(
  isLoggedIn: boolean,
  walletLoading: boolean,
  walletBalance: number,
  dailyUnitRupees: number,
  subscriptions: Array<Subscription | Record<string, unknown>> = [],
  storedPauseScheduleYmd?: string | null,
): GpDailyOrderHoldState {
  const banner = computeGpDailyWalletBanner({
    isLoggedIn,
    walletLoading,
    walletBalance,
    subscriptions:
      subscriptions.length > 0
        ? subscriptions
        : dailyUnitRupees > 0
          ? [{ status: "ACTIVE", amount: dailyUnitRupees } as Subscription]
          : [],
    storedPauseScheduleYmd,
  });
  return {
    show: shouldShowGpDailyWalletAlertCard(banner),
    lowBalanceForSubscription: banner.kind !== "none" && banner.threeDayTotal > 0,
    threshold3Day: banner.threeDayTotal,
    kind: banner.kind,
    pauseDateLabel: banner.pauseDateLabel,
    requiredRecharge: banner.requiredRecharge,
    hasWalletHoldPause: banner.hasWalletHoldPause,
  };
}
