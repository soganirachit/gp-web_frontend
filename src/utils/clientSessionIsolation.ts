import { resetLocationSession } from "./locationSession";
import { clearSelectedDeliveryAddress } from "./selectedDeliveryAddressStorage";

/** Legacy unscoped order remember list — must not leak across accounts. */
const LEGACY_ORDER_NUMBERS_KEY = "gp_customer_order_numbers_v1";

/** Clears device-local state that is not keyed by user id. */
export function clearCrossUserClientCaches(): void {
  if (typeof localStorage === "undefined") return;
  clearSelectedDeliveryAddress();
  localStorage.removeItem("userLocation");
  localStorage.removeItem("userCoordinates");
  localStorage.removeItem("gp_daily_cart_delivery_days");
  localStorage.removeItem("currentSubscription");
  localStorage.removeItem(LEGACY_ORDER_NUMBERS_KEY);
  localStorage.removeItem("gp_store_temp_cart");
  resetLocationSession();
}

/**
 * Persist authenticated user id and wipe cross-account caches when the account changes.
 * Backend never merges users; this prevents two phones on one browser from looking merged.
 */
export function adoptAuthenticatedUserId(nextUserId: string | number): void {
  if (typeof localStorage === "undefined") return;
  const next = String(nextUserId).trim();
  if (!next) return;
  const prev = localStorage.getItem("userId");
  if (prev && prev !== next) {
    clearCrossUserClientCaches();
  }
  localStorage.setItem("userId", next);
}
