/**
 * Order list card title: first product name, then "+ N more" when multiple line items.
 * List API may expose `first_item_name` / `items_preview`; otherwise detail fetch fills the gap.
 */

export function extractFirstItemNameFromOrderRaw(order: Record<string, unknown>): string | null {
  const direct =
    (typeof order.first_item_name === "string" && order.first_item_name.trim()) ||
    (typeof order.first_product_name === "string" && order.first_product_name.trim()) ||
    (typeof order.primary_item_name === "string" && order.primary_item_name.trim()) ||
    null;
  if (direct) return direct;

  const preview =
    typeof order.items_preview === "string" ? order.items_preview.trim() : "";
  if (preview) {
    const beforePlus = preview.split(/\s*\+\d+\s*more/i)[0]?.trim() ?? preview;
    const first = beforePlus.split(",")[0]?.trim();
    if (first) return first;
  }

  const items = order.items;
  if (Array.isArray(items) && items.length > 0) {
    const first = items[0] as Record<string, unknown>;
    const product = first.product as Record<string, unknown> | undefined;
    const name =
      (typeof product?.name === "string" && product.name.trim()) ||
      (typeof first.product_name === "string" && first.product_name.trim()) ||
      (typeof first.name === "string" && first.name.trim()) ||
      null;
    if (name) return name;
  }

  return null;
}

export function extractFirstItemNameFromOrderDetail(
  detail: Record<string, unknown> | null | undefined,
): string | null {
  if (!detail) return null;
  return extractFirstItemNameFromOrderRaw(detail);
}

export function resolveOrderItemsCount(order: Record<string, unknown>): number {
  const n = Number(order.items_count ?? order.itemsCount ?? order.quantity);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const items = order.items;
  if (Array.isArray(items) && items.length > 0) return items.length;
  return 1;
}

/** e.g. "Premium Marigold + 2 more" or single name only */
export function formatOrderListProductLabel(
  firstItemName: string | null | undefined,
  itemsCount: number,
): string {
  const count = Math.max(1, itemsCount || 1);
  const name = (firstItemName ?? "").trim();
  if (!name) return "";
  if (count <= 1) return name;
  return `${name} + ${count - 1} more`;
}

/** True when a list title string is an order id, not a product / pack name. */
export function looksLikeOrderNumberLabel(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (/^GP[_-]/i.test(s)) return true;
  if (/^ORD[-_]/i.test(s)) return true;
  if (/POS\d{5,}/i.test(s) && /\d{4}-\d{2}-\d{2}/.test(s)) return true;
  return /^[A-Z]{2,}[_-][A-Z0-9]+-\d{8}-/i.test(s);
}

/** Card title for My Orders — pack / product name only, never bare order numbers. */
export function resolveOrderListCardTitle(order: {
  productListLabel?: string | null;
  product?: { name?: string | null } | null;
  quantity?: number;
  items_count?: number;
}): string {
  const count = order.items_count ?? order.quantity ?? 1;
  const enriched = (order.productListLabel ?? "").trim();
  if (enriched && !looksLikeOrderNumberLabel(enriched)) return enriched;

  const fromProduct = (order.product?.name ?? "").trim();
  if (fromProduct && !looksLikeOrderNumberLabel(fromProduct)) {
    const formatted = formatOrderListProductLabel(fromProduct, count);
    if (formatted && !looksLikeOrderNumberLabel(formatted)) return formatted;
    return fromProduct;
  }

  return "Pack";
}

function imageFromProductRecord(
  product: Record<string, unknown> | undefined,
): string | null {
  if (!product) return null;
  const thumb =
    (typeof product.primary_image_thumb === "string" &&
      product.primary_image_thumb.trim()) ||
    (typeof product.primary_image === "string" && product.primary_image.trim()) ||
    (typeof product.image === "string" && product.image.trim()) ||
    null;
  return thumb;
}

function imageFromLineItem(line: Record<string, unknown>): string | null {
  const direct =
    (typeof line.image_url === "string" && line.image_url.trim()) ||
    (typeof line.preview_image === "string" && line.preview_image.trim()) ||
    null;
  if (direct) return direct;
  return imageFromProductRecord(line.product as Record<string, unknown> | undefined);
}

/** First line-item / list preview image for order rows. */
export function extractPrimaryImageFromOrderRaw(
  order: Record<string, unknown>,
): string | null {
  const direct =
    (typeof order.preview_image === "string" && order.preview_image.trim()) ||
    (typeof order.previewImage === "string" && order.previewImage.trim()) ||
    null;
  if (direct) return direct;

  const items = order.items;
  if (Array.isArray(items) && items.length > 0) {
    return imageFromLineItem(items[0] as Record<string, unknown>);
  }
  return null;
}

/** “Rose Bouquet + 2 more” from eligible-order `items_preview` (comma-separated list). */
export function formatItemsPreviewAsProductLabel(preview: string | null | undefined): string {
  const trimmed = (preview ?? "").trim();
  if (!trimmed) return "";

  const plusMatch = trimmed.match(/\s*\+(\d+)\s*more\s*$/i);
  const additionalFromPlus = plusMatch ? parseInt(plusMatch[1], 10) : 0;
  const withoutPlus = trimmed.replace(/\s*\+\d+\s*more\s*$/i, "").trim();
  const parts = withoutPlus
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const firstName = parts[0] ?? withoutPlus;
  const count =
    parts.length > 1
      ? parts.length + additionalFromPlus
      : 1 + additionalFromPlus;
  return formatOrderListProductLabel(firstName, count);
}

/** Second line-item image for order list “+” overlay (when list includes `items`). */
export function extractSecondItemImageFromOrderRaw(
  order: Record<string, unknown>,
): string | null {
  const items = order.items;
  if (!Array.isArray(items) || items.length < 2) return null;
  return imageFromLineItem(items[1] as Record<string, unknown>);
}

/** Variant label from an order line — same fallbacks as cart / subscription cart. */
export function extractVariantNameFromOrderLineItem(
  line: Record<string, unknown>,
): string | null {
  const variant = line.variant as Record<string, unknown> | undefined;
  const productVariant = line.product_variant as
    | Record<string, unknown>
    | undefined;
  const candidates = [
    line.variant_name,
    line.product_variant_name,
    variant?.name,
    productVariant?.name,
  ];
  for (const raw of candidates) {
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

/** Order detail row title — variant before pack name when present. */
export function formatOrderItemPackDisplayName(
  packName: string | null | undefined,
  variantName?: string | null,
): string {
  const pack = String(packName ?? "").trim();
  const variant = String(variantName ?? "").trim();
  if (!pack) return variant || "Item";
  if (!variant) return pack;
  return `${variant} ${pack}`;
}

/** Strip leading/trailing “Daily” frequency suffix from product titles in subscription UI. */
export function cleanSubscriptionProductDisplayName(name: string): string {
  let s = name.trim();
  s = s.replace(/^\s*daily\s*[·.\-|:\s]+\s*/i, "");
  s = s.replace(/^\s*daily\s+/i, "");
  s = s.replace(/\s*[·.\-|]\s*daily\s*$/i, "");
  s = s.replace(/\s*\+\s*\d+\s*more\s*$/i, "").trim();
  return s || name.trim();
}

/** Delivery history row — primary pack name only (no “+ N more”, no order number). */
export function resolveOrderListHistoryTitle(order: Record<string, unknown>): string {
  const first = extractFirstItemNameFromOrderRaw(order);
  if (first) return cleanSubscriptionProductDisplayName(first);

  const preset =
    (typeof order.product_list_label === "string" &&
      order.product_list_label.trim()) ||
    null;
  if (preset) {
    const primary = preset.split(/\s*\+\s*\d+\s*more/i)[0]?.trim() ?? preset;
    return cleanSubscriptionProductDisplayName(primary);
  }

  return "Subscription delivery";
}

/** Card title for lists that may include “+ N more”. */
export function resolveOrderListTitle(order: Record<string, unknown>): string {
  const preset =
    (typeof order.product_list_label === "string" &&
      order.product_list_label.trim()) ||
    null;
  if (preset) {
    const primary = preset.split(/\s*\+\s*\d+\s*more/i)[0]?.trim() ?? preset;
    return cleanSubscriptionProductDisplayName(primary);
  }

  const count = resolveOrderItemsCount(order);
  const label = formatOrderListProductLabel(
    extractFirstItemNameFromOrderRaw(order),
    count,
  );
  if (label) {
    const primary = label.split(/\s*\+\s*\d+\s*more/i)[0]?.trim() ?? label;
    return cleanSubscriptionProductDisplayName(primary);
  }

  return "Subscription delivery";
}
