import type { Subscription } from "../services/subscription.service";
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

/** User-facing pause-reason label (title case). */
export const INSUFFICIENT_WALLET_BALANCE_LABEL = "Insufficient Wallet Balance";

const STORE_OFFLINE_PAUSE_LABEL = "Store temporarily offline";

export function normalizeSubscriptionStatus(status: unknown): string {
  return String(status ?? "").toUpperCase();
}

export function isOnHoldStatus(status: unknown): boolean {
  return normalizeSubscriptionStatus(status) === "ON_HOLD";
}

export function isUserPausedStatus(status: unknown): boolean {
  const s = normalizeSubscriptionStatus(status);
  return s === "PAUSED" || s === "INACTIVE";
}

export function isPausedOrOnHoldStatus(status: unknown): boolean {
  return isOnHoldStatus(status) || isUserPausedStatus(status);
}

export function isInsufficientWalletPauseReason(reason?: string | null): boolean {
  const lower = String(reason ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  if (!lower) return false;
  return (
    lower === "insufficient wallet" ||
    (lower.includes("insufficient") && lower.includes("wallet"))
  );
}

export function formatInsufficientWalletPauseReasonLabel(
  reason?: string | null,
): string {
  if (isInsufficientWalletPauseReason(reason)) {
    return INSUFFICIENT_WALLET_BALANCE_LABEL;
  }
  return String(reason ?? "").trim();
}

export function isSubscriptionPausedForInsufficientWallet(
  sub: Subscription | Record<string, unknown> | null | undefined,
): boolean {
  if (!sub) return false;
  const rec = sub as Record<string, unknown>;
  const pauseSource = String(
    rec.pause_source ?? rec.pauseSource ?? "",
  )
    .trim()
    .toLowerCase();
  if (pauseSource === "insufficient_wallet") {
    return true;
  }
  if (
    rec.paused_by_insufficient_wallet === true ||
    rec.pausedByInsufficientWallet === true
  ) {
    return true;
  }
  const reason = String(
    rec.pause_reason_display ??
      rec.pauseReasonDisplay ??
      rec.pause_reason ??
      rec.pauseReason ??
      "",
  );
  return isInsufficientWalletPauseReason(reason);
}

/** Customer-facing pause reason for list/detail cards (null when not paused or unknown). */
export function getSubscriptionPauseReasonLabel(
  sub: Subscription | null | undefined,
): string | null {
  if (!sub) return null;
  const status = String(sub.status ?? "").toUpperCase();
  if (status !== "PAUSED" && status !== "INACTIVE" && status !== "ON_HOLD") {
    return null;
  }

  if (isSubscriptionPausedForInsufficientWallet(sub)) {
    return INSUFFICIENT_WALLET_BALANCE_LABEL;
  }

  const pauseSource = String(sub.pauseSource ?? "").trim().toLowerCase();
  if (pauseSource === "store_offline") {
    return STORE_OFFLINE_PAUSE_LABEL;
  }

  const fromApi = String(sub.pauseReason ?? "").trim();
  if (fromApi) {
    const wallet = formatInsufficientWalletPauseReasonLabel(fromApi);
    if (wallet === INSUFFICIENT_WALLET_BALANCE_LABEL) {
      return wallet;
    }
    return fromApi.replace(/_/g, " ");
  }

  return null;
}

export function isSubscriptionPausedForStoreOffline(
  sub: Subscription | Record<string, unknown> | null | undefined,
): boolean {
  if (!sub) return false;
  const rec = sub as Record<string, unknown>;
  const pauseSource = String(rec.pause_source ?? rec.pauseSource ?? "")
    .trim()
    .toLowerCase();
  if (pauseSource === "store_offline") return true;
  if (
    rec.paused_by_store_offline === true ||
    rec.pausedByStoreOffline === true
  ) {
    return true;
  }
  const reason = String(
    rec.pause_reason_display ??
      rec.pauseReasonDisplay ??
      rec.pause_reason ??
      rec.pauseReason ??
      "",
  )
    .trim()
    .toLowerCase();
  return reason.includes("store") && reason.includes("offline");
}

function isPausedStatus(sub: Subscription | Record<string, unknown>): boolean {
  return isPausedOrOnHoldStatus(
    (sub as Subscription).status ?? (sub as Record<string, unknown>).status,
  );
}

/** Toast when a paused customer tries to change days/quantity. Null if update may proceed. */
export function pausedSubscriptionUpdateToast(
  sub: Subscription | Record<string, unknown> | null | undefined,
): string | null {
  if (!sub) return null;
  const status = String(
    (sub as Subscription).status ?? (sub as Record<string, unknown>).status ?? "",
  ).toUpperCase();
  if (status === "ACTIVE") return null;
  if (status === "CANCELLED") return "Cancelled subscriptions cannot be updated";
  if (!isPausedStatus(sub)) return null;
  if (isSubscriptionPausedForInsufficientWallet(sub)) {
    return REQUIRED_TOAST.SUBSCRIPTION_RECHARGE_WALLET_FIRST;
  }
  if (isSubscriptionPausedForStoreOffline(sub)) {
    return REQUIRED_TOAST.SUBSCRIPTION_UPDATE_STORE_OFFLINE;
  }
  return REQUIRED_TOAST.SUBSCRIPTION_RESUME_FIRST;
}

/**
 * Resume always hits the API so wallet/store conditions are re-checked.
 * Client-side blocks are informational only — return null.
 */
export function pausedSubscriptionResumeBlockToast(
  _sub: Subscription | Record<string, unknown> | null | undefined,
): string | null {
  return null;
}
