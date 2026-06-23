/** Static legal HTML shipped in `public/` (same origin as the SPA). */
export const GENDA_PHOOL_PRIVACY_POLICY_PATH = "/privacy-policy.html";
export const GENDA_PHOOL_TERMS_OF_SERVICE_PATH = "/terms_of_service.html";

const CUSTOMER_APP_ORIGIN = "https://customerapp.mygendaphool.com";

/** Same-origin in browser; production fallback for SSR/build. */
export function resolveLegalDocumentUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${CUSTOMER_APP_ORIGIN}${path}`;
}

/** @deprecated Prefer paths + resolveLegalDocumentUrl — kept for mobile parity imports. */
export const GENDA_PHOOL_PRIVACY_POLICY_URL = `${CUSTOMER_APP_ORIGIN}${GENDA_PHOOL_PRIVACY_POLICY_PATH}`;
/** @deprecated Prefer paths + resolveLegalDocumentUrl — kept for mobile parity imports. */
export const GENDA_PHOOL_TERMS_OF_SERVICE_URL = `${CUSTOMER_APP_ORIGIN}${GENDA_PHOOL_TERMS_OF_SERVICE_PATH}`;
