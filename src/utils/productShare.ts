import toast from "react-hot-toast";
import { buildProductShareDeepLink, normalizeProductShareUrl } from "../config/customerAppOrigin";
import { sanitizeProductRouteSlug } from "./productSlug";

export function resolveProductShareUrl(
  product: { share_url?: string | null; slug?: string | null } | null | undefined,
  slugFallback?: string,
): string | null {
  const slug = sanitizeProductRouteSlug(product?.slug ?? slugFallback ?? "");
  if (slug) {
    return buildProductShareDeepLink(slug);
  }
  return normalizeProductShareUrl(product?.share_url, slugFallback);
}

export async function shareProductLink(options: {
  name: string;
  shareUrl: string;
  description?: string;
}): Promise<void> {
  const { name, shareUrl, description } = options;
  try {
    if (navigator.share) {
      await navigator.share({
        title: name,
        text: description?.trim() || undefined,
        url: shareUrl,
      });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    toast.error("Could not share this product");
  }
}
