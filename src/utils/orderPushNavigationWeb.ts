let spaNavigate: ((to: string, replace?: boolean) => void) | null = null;

/** Call once from a component under the router (e.g. Layout) with `useNavigate()`. */
export function registerWebOrderPushNavigate(
  fn: (to: string, replace?: boolean) => void,
): void {
  spaNavigate = fn;
}

function notificationTypeFromData(data: Record<string, unknown>): string {
  const raw =
    (typeof data.type === "string" && data.type) ||
    (typeof data.notification_type === "string" && data.notification_type) ||
    (typeof data.event === "string" && data.event) ||
    "";
  return raw.toLowerCase().trim();
}

function isOrderConfirmedOrDeliveredPush(t: string): boolean {
  return (
    t === "order_confirmed" ||
    t.includes("order_confirmed") ||
    t === "order_delivered" ||
    t.includes("order_delivered")
  );
}

function ordersListPathForPayload(data: Record<string, unknown>): string {
  const daily =
    String(data.order_type ?? "").toLowerCase() === "subscription" ||
    String(data.channel ?? "").toLowerCase() === "daily" ||
    String(data.app ?? data.app_feature ?? "")
      .toLowerCase()
      .includes("daily");
  return daily ? "/gp-daily/orders" : "/gp-store/orders";
}

/**
 * When the user opens an order status push, send them to My Orders (list), matching mobile.
 * Sources: service worker `message`, `window` custom event `gp-order-push` (detail = data), or URL `?notification_type=`.
 */
export function handleWebOrderPushData(
  data: Record<string, unknown> | undefined,
): boolean {
  if (!data || typeof data !== "object") return false;
  const t = notificationTypeFromData(data);
  if (!isOrderConfirmedOrDeliveredPush(t)) return false;
  const path = ordersListPathForPayload(data);
  if (spaNavigate) spaNavigate(path, true);
  else window.location.assign(path);
  return true;
}
