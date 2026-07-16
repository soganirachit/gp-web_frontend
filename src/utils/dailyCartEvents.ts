/** Fired when GP Daily subscription cart changes (add/remove/checkout). */
export const DAILY_CART_UPDATED_EVENT = "dailyCartUpdated";

export type DailyCartUpdatedDetail = {
  count?: number;
  cart?: unknown;
};

export function countDailyCartItems(cart: unknown): number {
  if (!cart || typeof cart !== "object") return 0;
  const c = cart as Record<string, unknown>;
  if (typeof c.items_count === "number") {
    return Math.max(0, c.items_count);
  }
  if (Array.isArray(c.items)) {
    return c.items.length;
  }
  return 0;
}

export function notifyDailyCartUpdated(cart?: unknown): void {
  const count = cart != null ? countDailyCartItems(cart) : undefined;
  window.dispatchEvent(
    new CustomEvent<DailyCartUpdatedDetail>(DAILY_CART_UPDATED_EVENT, {
      detail: { count, cart },
    }),
  );
}
