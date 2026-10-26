/**
 * Wallet page must not refetch GET /wallet/ in a loop while idle (low-balance
 * banner included). Poll only open CREDIT top-ups, keyed by razorpay order ids.
 *
 * Run: npx tsx src/utils/walletPageRefresh.cases.test.ts
 */
import {
  isPendingWalletTopUp,
  pendingWalletTopUpPollKey,
  sameWalletTxnList,
} from "./walletPageRefresh";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const debitHold = {
  referenceId: "d1",
  type: "DEBIT" as const,
  status: "success",
  amount: 1,
  createdAt: "2026-10-27T00:00:00Z",
  razorpayOrderId: undefined,
  description: "Order Trcd_abc",
};

const pendingTopUp = {
  referenceId: "c1",
  type: "CREDIT" as const,
  status: "pending",
  amount: 1,
  createdAt: "2026-10-27T00:01:00Z",
  razorpayOrderId: "order_pending_1",
  description: "Wallet Recharge",
};

const settledTopUp = { ...pendingTopUp, status: "success", referenceId: "c2" };

assert(!isPendingWalletTopUp(debitHold), "settled debit is not a pending top-up");
assert(
  pendingWalletTopUpPollKey([debitHold, { ...debitHold, status: "pending" }]) === "",
  "pending DEBIT must not start a Razorpay poll",
);
assert(isPendingWalletTopUp(pendingTopUp), "pending CREDIT with razorpay id is a top-up");
assert(
  pendingWalletTopUpPollKey([debitHold, pendingTopUp, pendingTopUp]) === "order_pending_1",
  "poll key is the unique pending top-up order id",
);
const pendingTopUpCopy = { ...pendingTopUp, description: "Wallet Recharge (copy)" };
assert(
  pendingWalletTopUpPollKey([pendingTopUp]) ===
    pendingWalletTopUpPollKey([pendingTopUpCopy]),
  "same pending id must keep the same poll key even if the row object is new",
);
assert(
  pendingWalletTopUpPollKey([settledTopUp]) === "",
  "settled CREDIT must stop polling",
);
assert(
  sameWalletTxnList([debitHold, pendingTopUp], [{ ...debitHold }, { ...pendingTopUp }]),
  "identical wallet rows must not count as a new list",
);
assert(
  !sameWalletTxnList([pendingTopUp], [settledTopUp]),
  "status change is a real list change so poll can stop",
);

if (failed > 0) {
  console.error(`\n${failed} walletPageRefresh case(s) failed`);
  process.exit(1);
}
console.log("walletPageRefresh: all cases passed");
