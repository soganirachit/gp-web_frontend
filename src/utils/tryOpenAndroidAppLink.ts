const ANDROID_PACKAGE = "com.customer.gendaphoolmobile";

/**
 * On Android, try to open the installed app when Universal/App Links are not verified yet.
 * No-op on iOS (relies on apple-app-site-association) and desktop.
 */
export function tryOpenAndroidAppForProductPath(slug: string): void {
  if (typeof window === "undefined") return;
  if (!/Android/i.test(navigator.userAgent)) return;

  const trimmed = slug.trim();
  if (!trimmed) return;

  const path = `products/${encodeURIComponent(trimmed)}`;
  const httpsUrl = `${window.location.origin}/${path}`;
  const intent = `intent://${window.location.host}/${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`;
  window.location.href = intent;
}
