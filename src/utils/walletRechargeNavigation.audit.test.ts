/**
 * Voluntary wallet top-up must not auto-open basket.
 * Run: npx tsx src/utils/walletRechargeNavigation.audit.test.ts
 */
import {
  clearGpDailyPendingSubscriptionCheckout,
  setGpDailyPendingSubscriptionCheckout,
} from "./gpDailyPendingSubscriptionCheckout";
import { shouldResumeGpDailyCheckoutAfterWalletRecharge } from "./walletRechargeNavigation";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

clearGpDailyPendingSubscriptionCheckout();
assert(
  !shouldResumeGpDailyCheckoutAfterWalletRecharge(false),
  "no prompt, no pending → do not resume checkout",
);

if (typeof sessionStorage !== "undefined") {
  setGpDailyPendingSubscriptionCheckout({
    kind: "subscription_cart_checkout",
    requiredAmount: 10,
    cartAmount: 10,
    addressId: 1,
    deliveryDayInts: [1],
    deliveryFrequency: "Daily",
    activeDeliveryDays: ["Mon"],
  });
  assert(
    shouldResumeGpDailyCheckoutAfterWalletRecharge(false),
    "pending checkout in session → may resume",
  );
  clearGpDailyPendingSubscriptionCheckout();
}

assert(
  shouldResumeGpDailyCheckoutAfterWalletRecharge(true),
  "subscription recharge prompt → may resume",
);

if (failed > 0) {
  console.error(`\n${failed} audit case(s) failed`);
  process.exit(1);
}
console.log("walletRechargeNavigation audit: all cases passed");
