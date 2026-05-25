/**
 * Persists GP Daily subscription intent when the user is sent to recharge wallet.
 * Cleared after a successful auto-checkout or when the user cancels.
 */

export type GpDailyPendingCheckoutKind =
  | "subscription_cart_checkout"
  | "product_address_flow"
  | "address_confirm";

export type SubscriptionCartCheckoutPending = {
  kind: "subscription_cart_checkout";
  requiredAmount: number;
  cartAmount: number;
  addressId: number;
  deliveryDayInts: number[];
  deliveryFrequency: "Daily" | "Mon-Sat" | "Customize";
  activeDeliveryDays: string[];
};

export type ProductAddressFlowPending = {
  kind: "product_address_flow";
  requiredAmount: number;
  returnPath: string;
  subscriptionDetails: Record<string, unknown>;
};

export type AddressConfirmPending = {
  kind: "address_confirm";
  requiredAmount: number;
  returnPath: string;
  confirmPayload: {
    basePackId: string;
    deliveryAddressId: string;
    type: "DAILY" | "CUSTOM";
    startDate: string;
    selectedDays: string[];
    quantity: number;
  };
  packDetails?: Record<string, unknown>;
  subscriptionType?: string;
  deliveryCount?: number;
  sellingPrice?: number;
};

export type GpDailyPendingSubscriptionCheckout =
  | SubscriptionCartCheckoutPending
  | ProductAddressFlowPending
  | AddressConfirmPending;

const STORAGE_KEY = "gp_daily_pending_subscription_checkout";

export function setGpDailyPendingSubscriptionCheckout(
  payload: GpDailyPendingSubscriptionCheckout,
): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function getGpDailyPendingSubscriptionCheckout(): GpDailyPendingSubscriptionCheckout | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GpDailyPendingSubscriptionCheckout;
  } catch {
    return null;
  }
}

export function clearGpDailyPendingSubscriptionCheckout(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
