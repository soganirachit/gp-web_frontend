/** Passed via React Router `location.state` through the support flow. */
export type SupportNavState = {
  returnTo?: string;
};

export function resolveSupportBackNavigation(options: {
  returnTo?: string | null;
  orderNumber?: string | null;
  basePath: string;
  /** When true, use `replace` so the user cannot return to a closed chat / question form. */
  replace?: boolean;
  /** Closed ticket — always return to Support & Requests hub, not the order page. */
  ticketClosed?: boolean;
}): { path: string; replace: boolean } {
  if (options.ticketClosed) {
    return {
      path: `${options.basePath}/customer-support`,
      replace: true,
    };
  }
  const trimmedReturn = (options.returnTo ?? '').trim();
  if (trimmedReturn) {
    return { path: trimmedReturn, replace: Boolean(options.replace) };
  }
  const orderNum = (options.orderNumber ?? '').trim();
  if (orderNum) {
    return {
      path: `${options.basePath}/orders/${encodeURIComponent(orderNum)}`,
      replace: Boolean(options.replace),
    };
  }
  return { path: `${options.basePath}/customer-support`, replace: false };
}
