import { sanitizeProductRouteSlug } from "../utils/productSlug";

const PROD_CUSTOMER_ORIGIN = "https://customerapp.mygendaphool.com";
const DEV_CUSTOMER_ORIGIN = "https://customerappdev.mygendaphool.com";

/**
 * Origin for universal product deep links (/products/:slug).
 * In the browser, always matches the SPA the user is on (dev vs prod).
 */
export function getCustomerAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const env =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env
      : (process.env as Record<string, string | undefined>);
  const explicit = String(env.VITE_CUSTOMER_APP_ORIGIN ?? "").trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const apiBase = String(env.VITE_API_BASE_URL ?? "").toLowerCase();
  if (apiBase.includes("apigpdev") || apiBase.includes("dev.mygendaphool")) {
    return DEV_CUSTOMER_ORIGIN;
  }
  return PROD_CUSTOMER_ORIGIN;
}

export function buildProductShareDeepLink(slug: string): string {
  const trimmed = sanitizeProductRouteSlug(slug);
  if (!trimmed) return getCustomerAppOrigin();
  return `${getCustomerAppOrigin()}/products/${encodeURIComponent(trimmed)}`;
}

/** Rewrite API share_url host to the current customer app environment. */
export function normalizeProductShareUrl(
  shareUrl: string | null | undefined,
  slugFallback?: string,
): string | null {
  const slug = (slugFallback ?? "").trim();
  if (slug) return buildProductShareDeepLink(slug);

  const raw = shareUrl?.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const pathMatch = u.pathname.match(/\/products\/([^/]+)\/?$/i);
    if (pathMatch?.[1]) {
      return buildProductShareDeepLink(pathMatch[1]);
    }
  } catch {
    /* fall through */
  }
  return raw;
}
