export type PrimaryImageVariants = {
  thumb?: string | null;
  card?: string | null;
  full?: string | null;
};

export type ProductImageLike = {
  primary_image?: string | null;
  primary_image_variants?: PrimaryImageVariants | null;
  images_url?: string[] | null;
  imagesUrl?: string[] | null;
};

export type ProductImageVariant = "thumb" | "card" | "full";

function trimUrl(u: string | null | undefined): string {
  return String(u ?? "").trim();
}

/**
 * Resolve image URL from `primary_image_variants` + legacy fields.
 * - thumb: grids, cart, order lists
 * - card: PDP main hero (~640px)
 * - full: PDP zoom / lightbox
 */
export function pickPrimaryImageUrl(
  product: ProductImageLike | Record<string, unknown> | null | undefined,
  variant: ProductImageVariant,
): string {
  if (!product || typeof product !== "object") return "";
  const p = product as ProductImageLike;
  const v = p.primary_image_variants;
  const thumb = trimUrl(v?.thumb);
  const card = trimUrl(v?.card);
  const full = trimUrl(v?.full);
  const primary = trimUrl(p.primary_image);
  const gallery0 = trimUrl(p.images_url?.[0] ?? p.imagesUrl?.[0]);

  if (variant === "thumb") {
    if (thumb) return thumb;
    if (primary) return primary;
    if (gallery0) return gallery0;
    if (card) return card;
    return full;
  }
  if (variant === "card") {
    if (card) return card;
    if (primary) return primary;
    if (thumb) return thumb;
    if (full) return full;
    return gallery0;
  }
  if (full) return full;
  if (card) return card;
  if (primary) return primary;
  return thumb || gallery0;
}
