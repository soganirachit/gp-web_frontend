/**
 * On Hold vs user Paused — status, copy, resume, auto-resume.
 * Run: npx tsx src/utils/gpDailyOnHold.cases.test.ts
 */
import {
  isOnHoldStatus,
  isPausedOrOnHoldStatus,
  isUserPausedStatus,
  pausedSubscriptionResumeBlockToast,
  pausedSubscriptionUpdateToast,
  isSubscriptionPausedForInsufficientWallet,
} from "./gpDailySubscriptionWalletPause";
import {
  formatPausedDeliveryLine,
  formatNamasteSubscriptionStatusLine,
} from "./subscriptionNextDelivery";
import { shouldAutoResumeSubscription } from "./subscriptionAutoResume";
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

type MiniSub = {
  id: string;
  status: string;
  dailyAmount?: number;
  pauseSource?: string;
  pausedByInsufficientWallet?: boolean;
  pausedByStoreOffline?: boolean;
  pauseReason?: string;
  pausedUntilDate?: Date;
};

function sub(partial: MiniSub): MiniSub {
  return partial;
}

assert(isOnHoldStatus("ON_HOLD"), "ON_HOLD detected");
assert(isOnHoldStatus("on_hold"), "on_hold lowercase detected");
assert(!isOnHoldStatus("PAUSED"), "user paused is not on hold");
assert(isUserPausedStatus("PAUSED"), "PAUSED is user pause");
assert(isPausedOrOnHoldStatus("ON_HOLD") && isPausedOrOnHoldStatus("PAUSED"), "union includes both");

assert(
  pausedSubscriptionResumeBlockToast(sub({ id: "1", status: "ON_HOLD" })) === null,
  "Resume is never blocked client-side — API re-checks",
);

assert(
  pausedSubscriptionUpdateToast(
    sub({
      id: "1",
      status: "ON_HOLD",
      pauseSource: "insufficient_wallet",
      pausedByInsufficientWallet: true,
    }),
  ) === REQUIRED_TOAST.SUBSCRIPTION_RECHARGE_WALLET_FIRST,
  "on-hold wallet blocks modify until resume",
);
assert(
  pausedSubscriptionUpdateToast(sub({ id: "2", status: "PAUSED" })) ===
    REQUIRED_TOAST.SUBSCRIPTION_RESUME_FIRST,
  "user pause blocks modify until resume",
);

const activeA = sub({ id: "a", status: "ACTIVE", dailyAmount: 40 });
const activeB = sub({ id: "b", status: "ACTIVE", dailyAmount: 50 });
const held = sub({
  id: "h",
  status: "ON_HOLD",
  dailyAmount: 90,
  pausedByInsufficientWallet: true,
  pauseSource: "insufficient_wallet",
});
const userPaused = sub({
  id: "p",
  status: "PAUSED",
  dailyAmount: 70,
  pausedUntilDate: new Date("2099-01-01"),
});

const costing = [activeA, activeB, held, userPaused].filter(
  (s) => String(s.status).toUpperCase() === "ACTIVE",
);
assert(costing.length === 2, `costing uses active only, got ${costing.length}`);
assert(
  costing.reduce((n, s) => n + (s.dailyAmount ?? 0), 0) === 90,
  "on-hold 90 and paused 70 must not inflate the 40+50 active total",
);

assert(
  isSubscriptionPausedForInsufficientWallet(held),
  "on-hold wallet flag is detected",
);
assert(
  !isSubscriptionPausedForInsufficientWallet(userPaused),
  "user pause is not a wallet hold",
);

assert(
  formatPausedDeliveryLine(held as never).toLowerCase().includes("on hold"),
  `on-hold delivery line mentions on hold: ${formatPausedDeliveryLine(held as never)}`,
);
assert(
  formatNamasteSubscriptionStatusLine(held as never) === "On hold",
  `namaste status On hold, got ${formatNamasteSubscriptionStatusLine(held as never)}`,
);
assert(
  formatNamasteSubscriptionStatusLine(userPaused as never) === "Paused",
  "user pause still reads Paused",
);

assert(
  !shouldAutoResumeSubscription(held as unknown as Record<string, unknown>),
  "on-hold never auto-resumes",
);
assert(
  !shouldAutoResumeSubscription({
    id: "p",
    status: "paused",
    paused_by_insufficient_wallet: true,
  }),
  "legacy wallet-paused never auto-resumes",
);
assert(
  !shouldAutoResumeSubscription({
    id: "p",
    status: "on_hold",
    paused_until_date: "2020-01-01",
  }),
  "on_hold with old until-date still does not auto-resume",
);

if (failed) {
  console.error(`\n${failed} failing case(s)`);
  process.exit(1);
}
console.log("gpDailyOnHold.cases.test.ts: all cases passed");
