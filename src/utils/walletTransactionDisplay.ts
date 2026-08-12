/**
 * Wallet transaction row labels — strip admin-only tags from descriptions and
 * prefer product/pack names over raw order numbers (parity with mobile wallet).
 */

/** Matches `[Admin: Name]` anywhere in the string (not only at the start). */
const ADMIN_TAG_PATTERN = /\[Admin:\s*[^\]]+\]\s*/gi;

/** Removes all `[Admin: Name]` tags; admin identity is not shown in the app. */
export function stripAdminTagFromWalletDescription(
  description: string | null | undefined,
): string {
  if (!description) return "";
  return String(description)
    .replace(ADMIN_TAG_PATTERN, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeWalletTransactionDescription(row: {
  description?: string | null;
  narration?: string | null;
  note?: string | null;
  message?: string | null;
}): string {
  const raw = [row.description, row.narration, row.note, row.message]
    .map((v) => (v != null ? String(v).trim() : ""))
    .find(Boolean);
  return stripAdminTagFromWalletDescription(raw ?? "");
}

export function extractOrderNumberFromTxnDescription(
  description: string | null | undefined,
): string | null {
  if (!description) return null;
  const m = description.match(/[Oo]rder\s+([A-Z0-9][A-Z0-9_\-]+)/);
  return m?.[1]?.trim() ?? null;
}

function packLabelFromRow(row: Record<string, unknown>): string | null {
  const candidates = [
    row.product_name,
    row.pack_name,
    row.order_product_name,
    row.product_label,
    row.item_name,
  ];
  for (const raw of candidates) {
    const t = raw != null ? String(raw).trim() : "";
    if (t) return stripAdminTagFromWalletDescription(t);
  }
  return null;
}

function fallbackTxnTypeLabel(transactionType?: string | null): string {
  const t = String(transactionType ?? "").trim().toUpperCase();
  if (t === "CREDIT") return "Credit";
  if (t === "DEBIT") return "Debit";
  return "Transaction";
}

function isWalletRechargeDescription(description: string): boolean {
  const d = description.toLowerCase();
  return (
    (d.includes("wallet") && d.includes("recharge")) ||
    d.includes("wallet top-up") ||
    d.includes("wallet topup") ||
    (d.includes("added") && d.includes("wallet")) ||
    (d.includes("razorpay") && d.includes("wallet"))
  );
}

/**
 * Title for a wallet history row — never shows admin names or raw order IDs when
 * a product label is available.
 */
export function resolveWalletTransactionTitle(opts: {
  description?: string | null;
  transactionType?: string | null;
  orderProductLabel?: string | null;
  orderNumber?: string | null;
}): string {
  const orderNum =
    opts.orderNumber?.trim() ||
    extractOrderNumberFromTxnDescription(opts.description);

  if (orderNum) {
    const pack = opts.orderProductLabel?.trim();
    if (pack) return pack;

    const raw = opts.description ?? "";
    const withoutOrder = raw
      .replace(new RegExp(orderNum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
      .replace(/[Oo]rder\s+/g, "")
      .replace(/\s*[—-]?\s*$/g, "")
      .trim();
    const cleaned = stripAdminTagFromWalletDescription(withoutOrder);
    if (cleaned) return cleaned;

    const type = String(opts.transactionType ?? "").toUpperCase();
    if (type === "CREDIT") return "Refund";
    return "Order payment";
  }

  const desc = stripAdminTagFromWalletDescription(opts.description);
  if (desc && isWalletRechargeDescription(desc)) {
    return "Wallet Recharge";
  }
  if (desc) return desc;
  return fallbackTxnTypeLabel(opts.transactionType);
}

export function resolveWalletTransactionTitleFromRow(
  row: {
    description?: string | null;
    narration?: string | null;
    note?: string | null;
    message?: string | null;
    type?: string | null;
    transaction_type?: string | null;
  } & Record<string, unknown>,
  orderProductLabel?: string | null,
): string {
  const description = normalizeWalletTransactionDescription(row);
  const orderNumber = extractOrderNumberFromTxnDescription(description);
  const inlinePack = packLabelFromRow(row);
  return resolveWalletTransactionTitle({
    description,
    transactionType: row.transaction_type ?? row.type,
    orderNumber,
    orderProductLabel: inlinePack ?? orderProductLabel,
  });
}
