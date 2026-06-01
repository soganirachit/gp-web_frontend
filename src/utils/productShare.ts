import toast from "react-hot-toast";

const PRODUCT_SHARE_BASE = "https://customerapp.mygendaphool.com/products";

export function resolveProductShareUrl(
  product: { share_url?: string | null; slug?: string | null } | null | undefined,
  slugFallback?: string,
): string | null {
  const fromApi = product?.share_url?.trim();
  if (fromApi) return fromApi;
  const slug = (product?.slug ?? slugFallback ?? "").trim();
  if (!slug) return null;
  return `${PRODUCT_SHARE_BASE}/${encodeURIComponent(slug)}`;
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
