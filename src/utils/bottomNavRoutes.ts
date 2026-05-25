/** GP Store tab: home hub, product list, PDP, explore. */
export function isGpStoreHubRoute(pathname: string): boolean {
  return (
    pathname === '/gp-store' ||
    pathname === '/gp-store/products' ||
    pathname.startsWith('/gp-store/product/') ||
    pathname.startsWith('/gp-store/explore-more')
  );
}

/** GP Daily tab: home hub, product list, PDP, explore. */
export function isGpDailyHubRoute(pathname: string): boolean {
  return (
    pathname === '/gp-daily' ||
    pathname === '/gp-daily/Products' ||
    pathname.startsWith('/gp-daily/product/') ||
    pathname.startsWith('/gp-daily/explore-more')
  );
}

/** Account tab: settings root, profile, subscriptions, address book, refer, support, FAQ. */
export function isAccountSectionRoute(pathname: string, basePath: string): boolean {
  const prefixes = [
    `${basePath}/account`,
    `${basePath}/profile`,
    `${basePath}/faq`,
    `${basePath}/addresses`,
    `${basePath}/refer`,
    `${basePath}/customer-support`,
    `${basePath}/manage-my-subscription`,
    `${basePath}/manage-subscription`,
    `${basePath}/manage-my-storeProducts`,
    `${basePath}/pause-subscription`,
    `${basePath}/subscription-paused`,
    `${basePath}/Cancel-Subscription`,
    `${basePath}/cancel-subscription`,
    `${basePath}/modify-Subscription`,
  ];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
