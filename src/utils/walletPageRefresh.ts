import type { TransactionType } from "@/interfaces";

/**
 * Wallet page refresh rules.
 *
 * A pending Razorpay top-up may be polled, but the poll key must be the set of
 * open top-up order ids — not the `transactions` array identity. Rebuilding
 * that array after every GET /wallet/ must not restart the interval (that
 * resets attempt counts and flashes a full-page skeleton forever).
 */

export const WALLET_PENDING_POLL_MAX_ATTEMPTS = 12;
export const WALLET_PENDING_POLL_INTERVAL_MS = 4000;

export function isPendingWalletTopUp(
  t: Pick<TransactionType, "type" | "status" | "razorpayOrderId">,
): boolean {
  if (t.type !== "CREDIT") return false;
  if (String(t.status ?? "").toLowerCase() !== "pending") return false;
  return Boolean(String(t.razorpayOrderId ?? "").trim());
}

export function pendingWalletTopUpOrderIds(
  transactions: Array<Pick<TransactionType, "type" | "status" | "razorpayOrderId">>,
): string[] {
  const ids = new Set<string>();
  for (const t of transactions) {
    if (!isPendingWalletTopUp(t)) continue;
    ids.add(String(t.razorpayOrderId).trim());
  }
  return [...ids].sort();
}

/** Stable effect dependency: empty string means do not poll. */
export function pendingWalletTopUpPollKey(
  transactions: Array<Pick<TransactionType, "type" | "status" | "razorpayOrderId">>,
): string {
  return pendingWalletTopUpOrderIds(transactions).join("|");
}

export function walletTxnListFingerprint(
  transactions: Array<
    Pick<
      TransactionType,
      | "referenceId"
      | "type"
      | "status"
      | "amount"
      | "createdAt"
      | "razorpayOrderId"
      | "description"
    >
  >,
): string {
  return transactions
    .map((t) =>
      [
        t.referenceId ?? "",
        t.type,
        String(t.status ?? ""),
        String(t.amount ?? ""),
        t.createdAt ?? "",
        t.razorpayOrderId ?? "",
        t.description ?? "",
      ].join("\u001f"),
    )
    .join("\u001e");
}

export function sameWalletTxnList(
  a: Parameters<typeof walletTxnListFingerprint>[0],
  b: Parameters<typeof walletTxnListFingerprint>[0],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return walletTxnListFingerprint(a) === walletTxnListFingerprint(b);
}
