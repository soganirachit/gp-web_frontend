/**
 * Customer-facing order status labels and colors.
 * Internal status `ready` is mapped to preparing for customers.
 */

export type CustomerOrderStatusKey =
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export function normalizeOrderStatusKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

/** Map API order status to a customer-visible status key. */
export function toCustomerOrderStatusKey(raw: string): CustomerOrderStatusKey {
  const k = normalizeOrderStatusKey(raw);

  if (k === "delivered") return "delivered";
  if (k === "failed") return "failed";
  if (k.includes("cancel")) return "cancelled";
  if (
    k === "out_for_delivery" ||
    k === "outfordelivery" ||
    k.startsWith("out_for_delivery") ||
    k === "shipping" ||
    k === "shipped" ||
    k === "in_transit" ||
    k === "intransit"
  ) {
    return "out_for_delivery";
  }
  if (
    k === "preparing" ||
    k === "processing" ||
    k === "ready"
  ) {
    return "preparing";
  }
  if (
    k === "confirmed" ||
    k === "pending" ||
    k === "scheduled" ||
    k === "placed" ||
    k === "accepted" ||
    k === "order_confirmed"
  ) {
    return "confirmed";
  }

  return "confirmed";
}

export function getCustomerOrderStatusLabel(raw: string): string {
  switch (toCustomerOrderStatusKey(raw)) {
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    case "out_for_delivery":
      return "Out for Delivery";
    case "preparing":
      return "Preparing";
    case "confirmed":
    default:
      return "Confirmed";
  }
}

/** Badge background classes (Order details pill). */
export function getCustomerOrderStatusBadgeClass(
  raw: string,
  options?: { isDaily?: boolean },
): string {
  const key = toCustomerOrderStatusKey(raw);
  const isDaily = options?.isDaily ?? false;

  if (key === "delivered") {
    return isDaily ? "bg-[#FAA222] text-black" : "bg-[#16A249] text-white";
  }
  if (key === "cancelled" || key === "failed") return "bg-[#EF4444] text-white";
  if (key === "out_for_delivery") return "bg-[#3B82F6] text-white";
  if (key === "preparing") return "bg-amber-500 text-white";
  return "bg-gray-500 text-white";
}

/** Text color classes (order list rows). */
export function getCustomerOrderStatusTextClass(raw: string): string {
  if (normalizeOrderStatusKey(raw) === "ready") {
    return "text-[#0D9488]";
  }
  switch (toCustomerOrderStatusKey(raw)) {
    case "delivered":
      return "text-[#166534]";
    case "cancelled":
    case "failed":
      return "text-[#EF4444]";
    case "out_for_delivery":
      return "text-[#1D4ED8]";
    case "preparing":
      return "text-[#B45309]";
    case "confirmed":
    default:
      return "text-[#92400E]";
  }
}

/** History list pill (subscription delivery history). */
export function getCustomerOrderStatusHistoryPillClass(raw: string): string {
  switch (toCustomerOrderStatusKey(raw)) {
    case "delivered":
      return "bg-[#DCFCE7] text-[#166534]";
    case "cancelled":
    case "failed":
      return "bg-[#FEE2E2] text-[#991B1B]";
    case "out_for_delivery":
      return "bg-[#DBEAFE] text-[#1D4ED8]";
    case "preparing":
      return "bg-[#FFEDD5] text-[#C2410C]";
    case "confirmed":
    default:
      return "bg-[#FEF3C7] text-[#92400E]";
  }
}

export function isCustomerOutForDeliveryStatus(raw: string): boolean {
  return toCustomerOrderStatusKey(raw) === "out_for_delivery";
}

export function isCustomerPreparingStatus(raw: string): boolean {
  return toCustomerOrderStatusKey(raw) === "preparing";
}

export function isCustomerConfirmedStatus(raw: string): boolean {
  return toCustomerOrderStatusKey(raw) === "confirmed";
}

/** Timeline statuses hidden from customers (shown as preparing or omitted). */
export const CUSTOMER_HIDDEN_TIMELINE_STATUSES = new Set([
  "ready",
  "pending",
]);

const SUPPORT_TICKET_WINDOW_MS = 12 * 60 * 60 * 1000;

const TERMINAL_SUPPORT_WINDOW_STATUSES = new Set(["delivered", "cancelled"]);

function isWithinSupportTicketWindow(anchorAtIso?: string | null): boolean {
  if (!anchorAtIso) return false;
  const anchorMs = new Date(String(anchorAtIso)).getTime();
  if (!Number.isFinite(anchorMs) || anchorMs <= 0) return false;
  return Date.now() - anchorMs < SUPPORT_TICKET_WINDOW_MS;
}

/** In-progress statuses anytime; delivered / cancelled only within 12h of that update. */
export function canRaiseSupportTicketForOrder(
  rawStatus: string,
  statusAnchorAtIso?: string | null,
): boolean {
  const k = normalizeOrderStatusKey(rawStatus);
  if (TERMINAL_SUPPORT_WINDOW_STATUSES.has(k)) {
    return isWithinSupportTicketWindow(statusAnchorAtIso);
  }
  return true;
}

export function supportTicketEligibilityMessage(rawStatus: string): string {
  const k = normalizeOrderStatusKey(rawStatus);
  if (k === "delivered") {
    return "Support requests can only be raised within 12 hours after delivery.";
  }
  if (k === "cancelled") {
    return "Support requests can only be raised within 12 hours after cancellation.";
  }
  return "Need help with this order? You can raise a support ticket anytime.";
}
