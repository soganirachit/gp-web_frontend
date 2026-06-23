import {
  extractFirstItemNameFromOrderRaw,
  formatOrderListProductLabel,
  resolveOrderItemsCount,
} from "./orderListDisplay";

export type NamasteTodayOrderSlide = {
  id: string;
  kind: "out_for_delivery" | "delivered";
  heading: string;
  packNames: string[];
};

function normalizeApiStatusKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isOutForDeliveryApiStatus(raw: unknown): boolean {
  const k = normalizeApiStatusKey(raw);
  return (
    k === "out_for_delivery" ||
    k === "outfordelivery" ||
    k.startsWith("out_for_delivery") ||
    k === "shipping" ||
    k === "shipped" ||
    k === "in_transit" ||
    k === "intransit"
  );
}

function isDeliveredApiStatus(raw: unknown): boolean {
  const k = normalizeApiStatusKey(raw);
  return (
    k === "delivered" ||
    k === "completed" ||
    k === "fulfilled" ||
    k === "success"
  );
}

function parseOrderDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  const dt = new Date(String(raw));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function resolveOrderDay(order: Record<string, unknown>): Date | null {
  return (
    parseOrderDate(order.delivery_date) ||
    parseOrderDate(order.deliveryDate) ||
    parseOrderDate(order.scheduled_delivery_date) ||
    parseOrderDate(order.delivered_at) ||
    parseOrderDate(order.status_updated_at) ||
    parseOrderDate(order.created_at) ||
    parseOrderDate(order.createdAt) ||
    null
  );
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSubscriptionOrderRow(order: Record<string, unknown>): boolean {
  const orderType = String(order.order_type ?? "").toLowerCase();
  const hasSubscriptionRef = Boolean(
    order.subscription_id || order.subscription || order.subscription_info,
  );
  return orderType === "subscription" || hasSubscriptionRef;
}

function resolvePackLabel(order: Record<string, unknown>): string | null {
  const fromList =
    (typeof order.product_list_label === "string" &&
      order.product_list_label.trim()) ||
    null;
  if (fromList) return fromList;
  const firstName = extractFirstItemNameFromOrderRaw(order);
  const count = resolveOrderItemsCount(order);
  const label = formatOrderListProductLabel(firstName, count);
  return label || firstName || null;
}

export function formatNamastePackNamesLine(packNames: string[]): string {
  return packNames.map((name) => name.trim()).filter(Boolean).join(", ");
}

export function buildNamasteTodayOrderSlides(
  orders: Record<string, unknown>[],
): NamasteTodayOrderSlide[] {
  const today = new Date();
  const outForDeliveryNames: string[] = [];
  const deliveredNames: string[] = [];

  for (const order of orders) {
    if (!isSubscriptionOrderRow(order)) continue;
    const day = resolveOrderDay(order);
    if (!day || !isSameCalendarDay(day, today)) continue;

    const packName = resolvePackLabel(order);
    if (!packName) continue;

    const status = order.status;
    if (isOutForDeliveryApiStatus(status)) {
      outForDeliveryNames.push(packName);
    } else if (isDeliveredApiStatus(status)) {
      deliveredNames.push(packName);
    }
  }

  const slides: NamasteTodayOrderSlide[] = [];
  if (outForDeliveryNames.length > 0) {
    slides.push({
      id: "namaste-ofd-today",
      kind: "out_for_delivery",
      heading: "Out for delivery orders",
      packNames: outForDeliveryNames,
    });
  }
  if (deliveredNames.length > 0) {
    slides.push({
      id: "namaste-delivered-today",
      kind: "delivered",
      heading: "Order delivered today",
      packNames: deliveredNames,
    });
  }
  return slides;
}
