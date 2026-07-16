import type { DailyCartItem } from "../services/subscriptionCart.service";

export type DailyPackCategory = "PUJA" | "EXOTIC";

export const DAILY_PACK_CATEGORY_ALERT_TITLE = "Checkout first";

export const DAILY_PACK_MIX_BLOCKED_MESSAGE =
  "Puja and Exotic packs can't be ordered together. Please checkout your basket first.";

type PackCategorySource = {
  category?: string | number | null;
  categoryName?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  categorySlug?: string | null;
};

function categoryFromSlug(slug: string): DailyPackCategory | null {
  const s = slug.toLowerCase();
  if (s.includes("exotic")) return "EXOTIC";
  if (s.includes("puja") || s.includes("pooja")) return "PUJA";
  return null;
}

function categoryFromName(name: string): DailyPackCategory | null {
  const n = name.toLowerCase();
  if (n.includes("exotic")) return "EXOTIC";
  if (n.includes("puja") || n.includes("pooja")) return "PUJA";
  return null;
}

/** Resolve Puja vs Exotic from product or cart line fields. Returns null for other categories. */
export function resolveDailyPackCategory(
  source: PackCategorySource | null | undefined,
): DailyPackCategory | null {
  if (!source) return null;

  const slug = String(source.category_slug ?? source.categorySlug ?? "").trim();
  const fromSlug = categoryFromSlug(slug);
  if (fromSlug) return fromSlug;

  const name = String(
    source.categoryName ?? source.category_name ?? "",
  ).trim();
  const fromName = categoryFromName(name);
  if (fromName) return fromName;

  const cat = String(source.category ?? "").trim().toUpperCase();
  if (cat === "EXOTIC") return "EXOTIC";
  if (cat === "PUJA") return "PUJA";

  return null;
}

/** Raw product row from GET /products/{slug}/ or mapped {@link Product}. */
export function resolveDailyPackCategoryFromProduct(
  product: Record<string, unknown> | null | undefined,
): DailyPackCategory | null {
  if (!product) return null;
  return resolveDailyPackCategory({
    category: product.category != null ? String(product.category) : undefined,
    categoryName:
      product.categoryName != null ? String(product.categoryName) : undefined,
    category_name:
      product.category_name != null ? String(product.category_name) : undefined,
    category_slug:
      product.category_slug != null ? String(product.category_slug) : undefined,
    categorySlug:
      product.category_slug != null ? String(product.category_slug) : undefined,
  });
}

export function isDailyPackMixBlockedMessage(message: string): boolean {
  const m = String(message ?? "").toLowerCase();
  if (!m.trim()) return false;
  return (
    m.includes("cannot be added to the same subscription") ||
    (m.includes("puja pack") && m.includes("exotic pack"))
  );
}

function resolveDailyPackCategoryFromCartItem(
  item: DailyCartItem | Record<string, unknown>,
): DailyPackCategory | null {
  const anyItem = item as Record<string, unknown>;
  const product = (anyItem.product ?? null) as Record<string, unknown> | null;
  if (product) {
    const fromProduct = resolveDailyPackCategory({
      category: product.category != null ? String(product.category) : undefined,
      categoryName:
        product.category_name != null ? String(product.category_name) : undefined,
      category_slug:
        product.category_slug != null ? String(product.category_slug) : undefined,
    });
    if (fromProduct) return fromProduct;
  }
  return resolveDailyPackCategory({
    categoryName:
      anyItem.category_name != null ? String(anyItem.category_name) : undefined,
    category_slug:
      anyItem.category_slug != null ? String(anyItem.category_slug) : undefined,
    categorySlug:
      anyItem.categorySlug != null ? String(anyItem.categorySlug) : undefined,
  });
}

/** Dominant pack type already in the daily cart (first resolvable line). */
export function getDailyCartPackCategory(
  items: Array<DailyCartItem | Record<string, unknown>> | null | undefined,
): DailyPackCategory | null {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const cat = resolveDailyPackCategoryFromCartItem(item);
    if (cat) return cat;
  }
  return null;
}

export function getDailyPackMixBlockedMessage(
  cartCategory: DailyPackCategory,
  newCategory: DailyPackCategory,
): string | null {
  if (cartCategory === newCategory) return null;
  return DAILY_PACK_MIX_BLOCKED_MESSAGE;
}

/** Minimum delivery days per week for Customize frequency. */
export function getMinWeeklySubscriptionDays(
  category: DailyPackCategory | null,
): number {
  if (category === "EXOTIC") return 1;
  if (category === "PUJA") return 3;
  return 3;
}

export function getMinWeeklySubscriptionDaysMessage(minDays: number): string {
  if (minDays <= 1) {
    return "Please select at least 1 delivery day.";
  }
  return `Please select at least ${minDays} delivery days.`;
}

export function getMinWeeklySubscriptionDaysWarning(minDays: number): string {
  if (minDays <= 1) {
    return "Please select at least 1 day for a 1-week subscription.";
  }
  return `Please select at least ${minDays} days for a 1-week subscription.`;
}
