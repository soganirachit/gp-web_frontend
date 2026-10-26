import { sanitizeProductRouteSlug } from "./productSlug";

const ANDROID_PACKAGE = "com.customer.gendaphoolmobile";

/** Query param: skip Android intent and render the web deep-link page (breaks intent↔browser loops). */
export const PRODUCT_DEEPLINK_WEB_PARAM = "openInWeb";

export function shouldSkipAndroidProductIntent(search: string): boolean {
  return new URLSearchParams(search).get(PRODUCT_DEEPLINK_WEB_PARAM) === "1";
}

export function buildProductDeepLinkFallbackUrl(origin: string, slug: string): string {
  const trimmed = sanitizeProductRouteSlug(slug);
  return `${origin}/products/${encodeURIComponent(trimmed)}?${PRODUCT_DEEPLINK_WEB_PARAM}=1`;
}

/**
 * On Android, try to open the installed app when Universal/App Links are not verified yet.
 * No-op on iOS (relies on apple-app-site-association) and desktop.
 *
 * Fallback URL uses `?openInWeb=1` so the browser does not re-trigger the intent forever
 * when the native app is not installed (common from WhatsApp in-app browser).
 */
export function tryOpenAndroidAppForProductPath(slug: string): void {
  if (typeof window === "undefined") return;
  if (!/Android/i.test(navigator.userAgent)) return;

  const trimmed = sanitizeProductRouteSlug(slug);
  if (!trimmed) return;

  if (shouldSkipAndroidProductIntent(window.location.search)) return;

  const sessionKey = `gp_android_product_intent:${trimmed}`;
  try {
    if (sessionStorage.getItem(sessionKey) === "1") return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // sessionStorage blocked — still try intent once
  }

  const path = `products/${encodeURIComponent(trimmed)}`;
  const httpsUrl = buildProductDeepLinkFallbackUrl(window.location.origin, trimmed);
  const intent = `intent://${window.location.host}/${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`;
  window.location.href = intent;
}
