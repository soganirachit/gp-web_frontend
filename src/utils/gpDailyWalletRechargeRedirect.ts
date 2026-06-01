import type { NavigateFunction } from "react-router-dom";

/** Shown under Proceed to Pay when wallet was opened from a subscription recharge flow. */
export const GP_DAILY_SUBSCRIPTION_WALLET_RECHARGE_HINT =
  "Please recharge the wallet to place an order";

/** Open wallet with recharge amount prefilled (call after insufficient-balance modal). */
export function navigateToGpDailyWalletForRecharge(
  navigate: NavigateFunction,
  basePath: string,
  options: {
    shortageAmount: number;
    currentBalance: number;
    totalRequired: number;
    returnUrl?: string;
    subscriptionRechargePrompt?: boolean;
  },
): void {
  const shortage = Math.max(0, Math.ceil(options.shortageAmount));
  navigate(`${basePath}/wallet`, {
    state: {
      returnUrl: options.returnUrl ?? `${basePath}/basket`,
      requiredAmount: shortage,
      currentBalance: options.currentBalance,
      totalRequired: options.totalRequired,
      subscriptionRechargePrompt: options.subscriptionRechargePrompt ?? true,
    },
  });
}
