import {
  subscriptionLineItemsFromApiRaw,
  type Subscription,
  type SubscriptionLineItem,
} from "../services/subscription.service";

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
