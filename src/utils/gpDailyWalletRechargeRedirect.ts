import type { NavigateFunction } from "react-router-dom";

/** Send user straight to wallet with recharge amount prefilled (no intermediate modal). */
export function navigateToGpDailyWalletForRecharge(
  navigate: NavigateFunction,
  basePath: string,
  options: {
    shortageAmount: number;
    currentBalance: number;
    totalRequired: number;
    returnUrl?: string;
  },
): void {
  const shortage = Math.max(0, Math.ceil(options.shortageAmount));
  navigate(`${basePath}/wallet`, {
    state: {
      returnUrl: options.returnUrl ?? `${basePath}/basket`,
      requiredAmount: shortage,
      currentBalance: options.currentBalance,
      totalRequired: options.totalRequired,
    },
  });
}
