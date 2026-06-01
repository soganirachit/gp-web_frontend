export type NotificationModule =
  | "orders"
  | "delivery"
  | "subscriptions"
  | "payments"
  | "support"
  | "marketing"
  | "campaigns"
  | "cart"
  | "loyalty"
  | "general";

export type NotificationFilterStatus = "all" | "unread" | "read";

export interface NotificationPayload {
  type?: string;
  notification_type?: string;
  event?: string;
  order_number?: string;
  orderNumber?: string;
  ticket_number?: string;
  ticketNumber?: string;
  subscription_id?: string;
  subscriptionId?: string;
  channel?: string;
  order_type?: string;
  app?: string;
  app_feature?: string;
  [key: string]: unknown;
}

export function notificationTypeFromPayload(
  data: NotificationPayload | undefined,
): string {
  if (!data) return "";
  const raw =
    (typeof data.type === "string" && data.type) ||
    (typeof data.notification_type === "string" && data.notification_type) ||
    (typeof data.event === "string" && data.event) ||
    "";
  return raw.toLowerCase().trim();
}

export function classifyNotificationModule(type: string): NotificationModule {
  const t = type.toLowerCase();
  if (
    t.includes("subscription") ||
    t.includes("pause") ||
    t.includes("resume") ||
    t.includes("renew") ||
    t.includes("expir")
  ) {
    return "subscriptions";
  }
  if (
    t.includes("wallet") ||
    t.includes("payment") ||
    t.includes("recharge") ||
    t.includes("credit")
  ) {
    return "payments";
  }
  if (t.includes("support") || t.includes("ticket")) return "support";
  if (t.includes("cart") || t.includes("abandon") || t.includes("basket")) {
    return "cart";
  }
  if (t.includes("loyalty") || t.includes("refer") || t.includes("reward")) {
    return "loyalty";
  }
  if (t.includes("promo") || t.includes("campaign") || t.includes("marketing")) {
    return t.includes("campaign") ? "campaigns" : "marketing";
  }
  if (t.includes("deliver") || t.includes("out_for") || t.includes("shipped")) {
    return "delivery";
  }
  if (t.includes("order")) return "orders";
  return "general";
}

function isDailyPayload(data: NotificationPayload): boolean {
  return (
    String(data.order_type ?? "").toLowerCase() === "subscription" ||
    String(data.channel ?? "").toLowerCase() === "daily" ||
    String(data.app ?? data.app_feature ?? "")
      .toLowerCase()
      .includes("daily")
  );
}

function basePath(data: NotificationPayload): "/gp-daily" | "/gp-store" {
  return isDailyPayload(data) ? "/gp-daily" : "/gp-store";
}

let spaNavigate: ((to: string, replace?: boolean) => void) | null = null;

export function registerNotificationNavigate(
  fn: (to: string, replace?: boolean) => void,
): void {
  spaNavigate = fn;
}

function go(path: string, replace = true) {
  if (spaNavigate) spaNavigate(path, replace);
  else window.location.assign(path);
}

export function routeNotificationDeepLink(
  data: NotificationPayload | undefined,
): boolean {
  if (!data || typeof data !== "object") return false;
  const t = notificationTypeFromPayload(data);
  const module = classifyNotificationModule(t);
  const root = basePath(data);

  const orderNumber =
    (typeof data.order_number === "string" && data.order_number) ||
    (typeof data.orderNumber === "string" && data.orderNumber);
  const ticketNumber =
    (typeof data.ticket_number === "string" && data.ticket_number) ||
    (typeof data.ticketNumber === "string" && data.ticketNumber);

  if (module === "support") {
    go(
      ticketNumber
        ? `${root}/customer-support/chat?ticket=${encodeURIComponent(ticketNumber)}`
        : `${root}/customer-support`,
    );
    return true;
  }

  if (module === "payments" || t.includes("wallet")) {
    go(`${root}/wallet`);
    return true;
  }

  if (module === "cart") {
    go(`${root}/basket`);
    return true;
  }

  if (module === "subscriptions") {
    go(`${root}/manage-my-subscription`);
    return true;
  }

  if (
    t === "order_confirmed" ||
    t.includes("order_confirmed") ||
    t === "order_delivered" ||
    t.includes("order_delivered")
  ) {
    go(`${root}/orders`);
    return true;
  }

  if (orderNumber && (module === "orders" || module === "delivery")) {
    go(`${root}/orders/${encodeURIComponent(orderNumber)}`);
    return true;
  }

  if (module === "loyalty") {
    go(`${root}/refer`);
    return true;
  }

  if (module === "marketing" || module === "campaigns") {
    go(root);
    return true;
  }

  return false;
}

/** Back-compat alias used by existing bridge. */
export function handleWebOrderPushData(
  data: Record<string, unknown> | undefined,
): boolean {
  return routeNotificationDeepLink(data as NotificationPayload);
}

export function registerWebOrderPushNavigate(
  fn: (to: string, replace?: boolean) => void,
): void {
  registerNotificationNavigate(fn);
}
