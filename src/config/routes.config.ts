import type { Feature } from "./features";

/** Canonical customer-app paths — keep marketing, backend share URLs, and navigate() in sync. */
export const GP_STORE = "/gp-store";
export const GP_DAILY = "/gp-daily";

export const ROUTES = {
  hub: "/home",
  productDeepLink: (slug: string) =>
    `/products/${encodeURIComponent(slug.trim())}`,
  store: {
    home: GP_STORE,
    products: `${GP_STORE}/products`,
    product: (slug: string) =>
      `${GP_STORE}/product/${encodeURIComponent(slug.trim())}`,
    login: `${GP_STORE}/login`,
    otp: `${GP_STORE}/otp-verification`,
    nameInput: `${GP_STORE}/name-input`,
    allset: `${GP_STORE}/allset`,
    /** @deprecated Wallet is GP Daily only — use `DAILY_WALLET_PATH`. */
    wallet: `${GP_DAILY}/wallet`,
    basket: `${GP_STORE}/basket`,
    account: `${GP_STORE}/account`,
    addresses: `${GP_STORE}/addresses`,
    addressSelection: `${GP_STORE}/address-selection`,
    faq: `${GP_STORE}/faq`,
    refer: `${GP_STORE}/refer`,
    paymentSuccess: `${GP_STORE}/payment-success`,
  },
  daily: {
    home: GP_DAILY,
    products: `${GP_DAILY}/products`,
    product: (slug: string) =>
      `${GP_DAILY}/product/${encodeURIComponent(slug.trim())}`,
    login: `${GP_DAILY}/login`,
    otp: `${GP_DAILY}/otp-verification`,
    nameInput: `${GP_DAILY}/name-input`,
    allset: `${GP_DAILY}/allset`,
    wallet: `${GP_DAILY}/wallet`,
    basket: `${GP_DAILY}/basket`,
    account: `${GP_DAILY}/account`,
    addresses: `${GP_DAILY}/addresses`,
    addressSelection: `${GP_DAILY}/address-selection`,
    modifySubscription: `${GP_DAILY}/modify-subscription`,
    cancelSubscription: `${GP_DAILY}/cancel-subscription`,
    manageSubscription: `${GP_DAILY}/manage-subscription`,
    faq: `${GP_DAILY}/faq`,
    refer: `${GP_DAILY}/refer`,
  },
} as const;

/** Canonical wallet route (subscriptions / top-up — not used for GP Store checkout). */
export const DAILY_WALLET_PATH = ROUTES.daily.wallet;

export function basePathForFeature(feature: Feature): string {
  return feature === "gpStore" ? GP_STORE : GP_DAILY;
}

export function walletPathForFeature(_feature?: Feature): string {
  return DAILY_WALLET_PATH;
}

export function loginPathForFeature(feature: Feature): string {
  return `${basePathForFeature(feature)}/login`;
}

export function productsListPath(
  feature: Feature = "gpStore",
  query?: { category?: string },
): string {
  const base =
    feature === "gpDaily" ? ROUTES.daily.products : ROUTES.store.products;
  if (!query?.category?.trim()) return base;
  const params = new URLSearchParams();
  params.set("category", query.category.trim());
  return `${base}?${params.toString()}`;
}

export function featureFromPathPrefix(pathname: string): Feature | null {
  if (pathname.startsWith(GP_STORE)) return "gpStore";
  if (pathname.startsWith(GP_DAILY)) return "gpDaily";
  return null;
}

export function defaultFeatureWhenAmbiguous(): Feature {
  const envValue = import.meta.env.VITE_GP_DAILY_ENABLED;
  const gpDailyEnabled =
    String(envValue).toLowerCase() === "true" || String(envValue) === "1";
  return gpDailyEnabled ? "gpDaily" : "gpStore";
}

type AuthLocationState = {
  returnUrl?: string;
  fromCart?: boolean;
  from?: { pathname?: string; search?: string };
};

/** Resolve post-login / post-signup destination from router location state. */
export function resolveAuthReturnUrl(
  state: unknown,
  basePath: string,
): string {
  const s = (state ?? {}) as AuthLocationState;
  const direct = s.returnUrl?.trim();
  if (direct && direct !== basePath) return direct;

  const from = s.from;
  if (from?.pathname) {
    const combined = `${from.pathname}${from.search ?? ""}`;
    if (combined.trim() && combined !== basePath) return combined;
  }
  return ROUTES.hub;
}
