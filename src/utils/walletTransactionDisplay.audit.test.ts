/**
 * Failed wallet top-ups must show in history (status=failed).
 * Run: npx tsx src/utils/walletTransactionDisplay.audit.test.ts
 */
import { resolveWalletTransactionTitleFromRow } from "./walletTransactionDisplay";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const title = resolveWalletTransactionTitleFromRow(
  {
    description: "[topup:249] Wallet top-up failed — Razorpay payment.failed webhook",
    type: "CREDIT",
    status: "failed",
  },
  null,
);
assert(title.toLowerCase().includes("wallet"), "failed top-up row still titled as wallet activity");

if (failed > 0) {
  console.error(`\n${failed} audit case(s) failed`);
  process.exit(1);
}
console.log("walletTransactionDisplay audit: all cases passed");
