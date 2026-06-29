import type { Subscription } from "../services/subscription.service";
import { pickActiveSubscriptionDailyUnitRupees } from "./gpDailyWalletHold";

const STORAGE_KEY = "gp-daily-subscription-pricing-v1";

export type SubscriptionPricingSnapshot = {
  /** Post-discount per-delivery total (matches basket checkout `total`). */
  perDeliveryTotal: number;
  preDiscountTotal?: number;
  couponDiscount?: number;
  couponCode?: string;
  savedAt: string;
};

type SnapshotStore = Record<string, SubscriptionPricingSnapshot>;

function readStore(): SnapshotStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SnapshotStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: SnapshotStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

export function saveGpDailySubscriptionPricingSnapshot(
  subscriptionId: string,
  snapshot: Omit<SubscriptionPricingSnapshot, "savedAt">,
): void {
  const id = String(subscriptionId ?? "").trim();
  if (!id) return;
  const perDeliveryTotal = Number(snapshot.perDeliveryTotal);
  if (!Number.isFinite(perDeliveryTotal) || perDeliveryTotal <= 0) return;

  const store = readStore();
  store[id] = {
    ...snapshot,
    perDeliveryTotal,
    savedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getGpDailySubscriptionPricingSnapshot(
  subscriptionId: string,
): SubscriptionPricingSnapshot | null {
  const id = String(subscriptionId ?? "").trim();
  if (!id) return null;
  const snap = readStore()[id];
  if (!snap) return null;
  const total = Number(snap.perDeliveryTotal);
  if (!Number.isFinite(total) || total <= 0) return null;
  return snap;
}

export function resolveSubscriptionPerDeliveryDisplayTotal(subscription: Subscription): {
  total: number;
  preDiscountTotal?: number;
  couponCode?: string;
} {
  const computed = pickActiveSubscriptionDailyUnitRupees(subscription);
  const apiDaily = subscription.dailyAmount ?? subscription.totalAmount;
  const apiBefore =
    subscription.dailyAmountBeforeDiscount ??
    (computed > 0 ? computed : undefined);
  const couponCode = subscription.couponCode;

  if (apiDaily != null && Number.isFinite(apiDaily) && apiDaily >= 0) {
    const pre =
      apiBefore != null && apiBefore > apiDaily + 0.009 ? apiBefore : undefined;
    return {
      total: apiDaily,
      preDiscountTotal: pre,
      couponCode,
    };
  }

  const snap = getGpDailySubscriptionPricingSnapshot(String(subscription.id));
  if (snap) {
    const pre =
      snap.preDiscountTotal != null && Number.isFinite(Number(snap.preDiscountTotal))
        ? Number(snap.preDiscountTotal)
        : computed > snap.perDeliveryTotal
          ? computed
          : undefined;
    return {
      total: snap.perDeliveryTotal,
      preDiscountTotal: pre,
      couponCode: snap.couponCode ?? couponCode,
    };
  }

  if (subscription.couponDiscount != null && subscription.couponDiscount > 0 && computed > 0) {
    const discounted = Math.max(0, computed - subscription.couponDiscount);
    return {
      total: discounted,
      preDiscountTotal: computed,
      couponCode,
    };
  }

  return { total: computed > 0 ? computed : subscription.totalAmount ?? 0, couponCode };
}
