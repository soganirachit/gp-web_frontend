/** Minimum subscription wallet top-up covers this many delivery days. */
export const MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS = 3;

/** Default pre-filled recharge covers this many delivery days. */
export const DEFAULT_SUBSCRIPTION_WALLET_RECHARGE_DAYS = 30;

export function normalizePerDeliveryAmount(requiredAmount: number): number {
  return Math.max(1, Math.ceil(Math.max(0, requiredAmount)));
}

export function computeSubscriptionRechargeBounds(perDeliveryAmount: number) {
  const perDay = normalizePerDeliveryAmount(perDeliveryAmount);
  return {
    perDeliveryAmount: perDay,
    minimumAmount: perDay * MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS,
    defaultAmount: perDay * DEFAULT_SUBSCRIPTION_WALLET_RECHARGE_DAYS,
  };
}

export function computeMinimumSubscriptionWalletRecharge(
  requiredAmount: number,
  _currentBalance = 0,
): { threeDayRequiredAmount: number; rechargeAmount: number } {
  const { minimumAmount, defaultAmount } =
    computeSubscriptionRechargeBounds(requiredAmount);
  return {
    threeDayRequiredAmount: minimumAmount,
    /** Legacy default — modal overrides with user-selected amount. */
    rechargeAmount: Math.max(1, defaultAmount),
  };
}

export function computeSubscriptionDaysFromAmount(
  amount: number,
  perDeliveryAmount: number,
): number {
  const perDay = normalizePerDeliveryAmount(perDeliveryAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / perDay);
}

export function parseRupeeInput(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateSubscriptionRechargeAmount(
  amount: number,
  perDeliveryAmount: number,
): { valid: boolean; minimumAmount: number; error?: string } {
  const { minimumAmount } = computeSubscriptionRechargeBounds(perDeliveryAmount);
  if (!Number.isFinite(amount) || amount < minimumAmount) {
    return {
      valid: false,
      minimumAmount,
      error: `Minimum subscription period is ${MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS} days. Please enter an amount of at least ₹${minimumAmount.toLocaleString("en-IN")}.`,
    };
  }
  return { valid: true, minimumAmount };
}
