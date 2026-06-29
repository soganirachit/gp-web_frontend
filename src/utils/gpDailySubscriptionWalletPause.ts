import type { Subscription } from "../services/subscription.service";

export function isSubscriptionPausedForInsufficientWallet(
  sub: Subscription | Record<string, unknown> | null | undefined,
): boolean {
  if (!sub) return false;
  const rec = sub as Record<string, unknown>;
  if (rec.paused_by_insufficient_wallet === true) return true;
  const reason = String(rec.pause_reason ?? rec.pauseReason ?? "")
    .trim()
    .toLowerCase();
  return reason === "insufficient_wallet" || reason.includes("insufficient");
}
