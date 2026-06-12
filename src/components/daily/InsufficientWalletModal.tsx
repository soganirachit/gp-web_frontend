import { motion, AnimatePresence } from "framer-motion";
import { featureThemes } from "../../config/features";

/** Minimum subscription wallet top-up covers this many delivery days. */
export const MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS = 3;

export function computeMinimumSubscriptionWalletRecharge(
  requiredAmount: number,
  currentBalance = 0,
): { threeDayRequiredAmount: number; rechargeAmount: number } {
  const threeDayRequiredAmount = Math.ceil(
    Math.max(0, requiredAmount) * MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS,
  );
  const rechargeAmount = Math.max(
    1,
    Math.ceil(threeDayRequiredAmount - Math.max(0, currentBalance)),
  );
  return { threeDayRequiredAmount, rechargeAmount };
}

export type InsufficientWalletDetails = {
  currentBalance: number;
  requiredAmount: number;
  shortageAmount: number;
  /** Optional subtitle, e.g. "7 days of daily delivery" */
  contextLabel?: string;
};

type Props = {
  open: boolean;
  details: InsufficientWalletDetails | null;
  onClose: () => void;
  onRecharge: (amount: number) => void | Promise<void>;
  recharging?: boolean;
};

export function InsufficientWalletModal({
  open,
  details,
  onClose,
  onRecharge,
  recharging = false,
}: Props) {
  if (!details) return null;

  const { threeDayRequiredAmount, rechargeAmount } =
    computeMinimumSubscriptionWalletRecharge(
      details.requiredAmount,
      details.currentBalance,
    );

  const dailyTheme = featureThemes.gpDaily;
  const rechargeBtnClass = `${dailyTheme.classes.primaryButton} ${dailyTheme.classes.primaryButtonHover}`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="insufficient-wallet-title"
        >
          <motion.div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 text-center">
              <h3
                id="insufficient-wallet-title"
                className="mb-2 text-xl font-semibold text-gray-800"
              >
                Insufficient wallet balance
              </h3>
              <p className="text-sm text-gray-600">
                {details.contextLabel ??
                  "Please recharge your wallet first to place a subscription order."}
              </p>
            </div>

            <div className="mb-6 space-y-3">
              {/* <div className="flex items-center justify-between border-b py-2">
                <span className="text-gray-600">Current balance</span>
                <span className="font-semibold">
                  ₹{details.currentBalance.toLocaleString("en-IN")}
                </span>
              </div> */}
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-gray-600">Required amount</span>
                <span className="font-semibold">
                  ₹{threeDayRequiredAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-center text-sm leading-relaxed text-gray-600">
                Minimum wallet recharge must cover at least{" "}
                {MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS} days of deliveries.
              </p>
              {/* <div className="flex items-center justify-between rounded bg-red-50 px-2 py-2">
                <span className="text-red-600">Add at least</span>
                <span className="font-semibold text-red-600">
                  ₹{Math.ceil(details.shortageAmount).toLocaleString("en-IN")}
                </span>
              </div> */}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging}
                onClick={() => {
                  const amount = rechargeAmount;
                  void onRecharge(amount);
                }}
                className={`flex-1 rounded-lg px-4 py-2.5 font-semibold transition-colors disabled:opacity-65 ${rechargeBtnClass}`}
              >
                {recharging ? "Processing…" : "Recharge Now"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
