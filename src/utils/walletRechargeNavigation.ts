import { getGpDailyPendingSubscriptionCheckout } from "./gpDailyPendingSubscriptionCheckout";

/**
 * After a voluntary wallet top-up, stay on Wallet unless the user explicitly
 * came from subscription recharge (prompt or persisted checkout intent).
 */
export function shouldResumeGpDailyCheckoutAfterWalletRecharge(
  subscriptionRechargePrompt: boolean,
): boolean {
  if (subscriptionRechargePrompt) return true;
  return getGpDailyPendingSubscriptionCheckout() != null;
}
