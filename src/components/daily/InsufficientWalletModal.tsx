import { motion, AnimatePresence } from "framer-motion";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

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
  onRecharge: () => void;
};

export function InsufficientWalletModal({
  open,
  details,
  onClose,
  onRecharge,
}: Props) {
  const { theme, feature } = useFeatureTheme();
  if (!details) return null;

  const rechargeBtnClass =
    feature === "gpStore"
      ? "bg-[#19411F] text-white hover:bg-[#143318]"
      : `${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`;

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
                  "Recharge your wallet to complete your subscription."}
              </p>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-gray-600">Current balance</span>
                <span className="font-semibold">
                  ₹{details.currentBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-gray-600">Required amount</span>
                <span className="font-semibold">
                  ₹{details.requiredAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-red-50 px-2 py-2">
                <span className="text-red-600">Add at least</span>
                <span className="font-semibold text-red-600">
                  ₹{Math.ceil(details.shortageAmount).toLocaleString("en-IN")}
                </span>
              </div>
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
                onClick={onRecharge}
                className={`flex-1 rounded-lg px-4 py-2.5 font-semibold transition-colors ${rechargeBtnClass}`}
              >
                Recharge wallet
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
