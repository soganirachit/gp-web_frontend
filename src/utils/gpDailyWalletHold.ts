import type { Subscription } from "../services/subscription.service";

/** Per-day subscription unit (₹) for GP Daily low-balance / “order on hold” rules — mirrors mobile `GpDailyHomeScreen`. */
export function pickActiveSubscriptionDailyUnitRupees(
  sub: Subscription | null | undefined,
  mergedExtra?: Record<string, unknown> | null,
): number {
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
  const li = sub?.lineItems?.[0];
  if (li && Number.isFinite(li.unitPrice) && li.unitPrice > 0) return li.unitPrice;
  const amt = sub?.amount;
  if (typeof amt === "number" && Number.isFinite(amt) && amt > 0) return amt;
  return 0;
}

export type GpDailyOrderHoldState = {
  show: boolean;
  lowBalanceForSubscription: boolean;
  threshold3Day: number;
};

/** Same as mobile: logged-in only; show when wallet &lt; ₹100 or wallet &lt; 3× daily unit (when unit known). */
export function computeGpDailyOrderOnHold(
  isLoggedIn: boolean,
  walletLoading: boolean,
  walletBalance: number,
  dailyUnitRupees: number,
): GpDailyOrderHoldState {
  if (!isLoggedIn || walletLoading) {
    return { show: false, lowBalanceForSubscription: false, threshold3Day: 0 };
  }
  const lowBalance = walletBalance < 100;
  const threshold3Day =
    dailyUnitRupees > 0 ? Math.round(dailyUnitRupees * 3) : 0;
  const lowBalanceForSubscription =
    dailyUnitRupees > 0 && walletBalance < threshold3Day;
  return {
    show: lowBalance || lowBalanceForSubscription,
    lowBalanceForSubscription,
    threshold3Day,
  };
}
