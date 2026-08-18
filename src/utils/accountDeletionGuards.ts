import {
  extractFirstItemNameFromOrderRaw,
  formatOrderListProductLabel,
  resolveOrderItemsCount,
} from "./orderListDisplay";

/** Order statuses that block account deletion until resolved. */
const ACTIVE_ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
]);

export type AccountDeletionBlock = {
  blocked: true;
  message: string;
};

export type AccountDeletionAllow = { blocked: false };

export type AccountDeletionCheck = AccountDeletionBlock | AccountDeletionAllow;

function localTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function orderDeliveryDateYmd(order: Record<string, unknown>): string | null {
  const raw = order.delivery_date;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.slice(0, 10);
}

function orderStatus(order: Record<string, unknown>): string {
  return String(order.status ?? "").trim().toLowerCase();
}

function orderPackLabel(order: Record<string, unknown>): string {
  const first = extractFirstItemNameFromOrderRaw(order);
  const count = resolveOrderItemsCount(order);
  const label = formatOrderListProductLabel(first, count);
  return label || "your order";
}

function isActiveOrder(order: Record<string, unknown>): boolean {
  return ACTIVE_ORDER_STATUSES.has(orderStatus(order));
}

/**
 * Returns whether the customer may delete their account based on open orders.
 * Daily subscription: today's in-flight delivery must finish (delivered/cancelled) first.
 */
export function checkAccountDeletionAllowed(
  orders: Array<Record<string, unknown>>,
): AccountDeletionCheck {
  const today = localTodayYmd();
  const active = orders.filter(isActiveOrder);
  if (active.length === 0) return { blocked: false };

  const todayDaily = active.find((o) => {
    const type = String(o.order_type ?? "").toLowerCase();
    if (type !== "subscription") return false;
    const date = orderDeliveryDateYmd(o);
    return date === today;
  });

  if (todayDaily) {
    const packLabel = orderPackLabel(todayDaily);
    return {
      blocked: true,
      message: `Your GP Daily delivery for today (${packLabel}) is still active. Please wait until it is delivered, or contact support to cancel the order before deleting your account.`,
    };
  }

  const first = active[0];
  return {
    blocked: true,
    message:
      "You have an active order. Please wait until it is delivered or cancelled, or contact support to request cancellation before deleting your account.",
  };
}
