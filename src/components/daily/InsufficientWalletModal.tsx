import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { featureThemes } from "../../config/features";
import {
  computeSubscriptionDaysFromAmount,
  computeSubscriptionRechargeBounds,
  MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS,
  parseRupeeInput,
  validateSubscriptionRechargeAmount,
} from "../../utils/subscriptionWalletRecharge";

export {
  computeMinimumSubscriptionWalletRecharge,
  MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS,
} from "../../utils/subscriptionWalletRecharge";

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
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [amountText, setAmountText] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const bounds = details
    ? computeSubscriptionRechargeBounds(details.requiredAmount)
    : null;
  const perDeliveryAmount = bounds?.perDeliveryAmount ?? 0;
  const minimumAmount = bounds?.minimumAmount ?? 0;
  const parsedAmount = parseRupeeInput(amountText);
  const subscriptionDays = computeSubscriptionDaysFromAmount(
    parsedAmount,
    perDeliveryAmount,
  );
  const validation = validateSubscriptionRechargeAmount(
    parsedAmount,
    perDeliveryAmount,
  );

  useEffect(() => {
    if (!open || !details) return;
    const nextDefault = computeSubscriptionRechargeBounds(
      details.requiredAmount,
    ).defaultAmount;
    setAmountText(String(nextDefault));
    setShowValidation(false);
  }, [open, details?.requiredAmount]);

  if (!details || !bounds) return null;

  const dailyTheme = featureThemes.gpDaily;
  const rechargeBtnClass = `${dailyTheme.classes.primaryButton} ${dailyTheme.classes.primaryButtonHover}`;

  const handleRecharge = () => {
    setShowValidation(true);
    if (!validation.valid) return;
    void onRecharge(Math.ceil(parsedAmount));
  };

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
            className="w-full max-w-[min(340px,calc(100vw-2rem))] rounded-xl bg-white p-4 shadow-xl min-[590px]:max-w-[min(380px,calc(100%-2rem))]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-center">
              <h3
                id="insufficient-wallet-title"
                className="mb-1 font-ibm-plex-serif text-lg font-bold text-gray-900"
              >
                Insufficient wallet balance
              </h3>
              <p className="text-xs leading-snug text-gray-600">
                {details.contextLabel ??
                  "Please recharge your wallet first to place a subscription order."}
              </p>
            </div>

            <div className="mb-4">
              <div className="space-y-2 rounded-xl border border-[#ebe6dc] bg-[#f8f6f1] px-3 py-2.5">
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
                  <span className="text-xs text-gray-500">Per delivery</span>
                  <span className="text-right text-sm font-sans font-semibold text-gray-900">
                    ₹{perDeliveryAmount.toLocaleString("en-IN")}
                  </span>

                  <label
                    htmlFor="insufficient-wallet-amount"
                    className="text-xs text-gray-500"
                  >
                    Amount
                  </label>
                  <div className="inline-flex items-center justify-end gap-0.5 rounded-lg border border-gray-200 bg-white py-1.5 pl-2 pr-1">
                    <span className="text-sm font-semibold leading-none text-gray-900">
                      ₹
                    </span>
                    <input
                      ref={amountInputRef}
                      id="insufficient-wallet-amount"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={amountText}
                      onChange={(e) => {
                        setShowValidation(true);
                        setAmountText(e.target.value.replace(/[^\d]/g, ""));
                      }}
                      className="w-[min(5.75rem,28vw)] border-0 bg-transparent p-0 text-left text-base font-semibold leading-none text-gray-900 outline-none ring-0 focus:outline-none focus:ring-0"
                      aria-describedby={
                        showValidation && validation.error
                          ? "insufficient-wallet-amount-error"
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => amountInputRef.current?.focus()}
                      className="rounded-md p-1 text-gray-500 hover:bg-gray-50"
                      aria-label="Edit recharge amount"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {parsedAmount > 0 ? (
                  <p className="text-xs font-medium text-gray-700">
                    ≈ {subscriptionDays} subscription day
                    {subscriptionDays === 1 ? "" : "s"}
                  </p>
                ) : null}
                {showValidation && validation.error ? (
                  <p
                    id="insufficient-wallet-amount-error"
                    className="text-xs leading-relaxed text-red-600"
                    role="alert"
                  >
                    {validation.error}
                  </p>
                ) : null}

                <div className="h-px bg-gray-200" />
                <p className="text-[11px] leading-snug text-gray-400">
                  Minimum amount: ₹{minimumAmount.toLocaleString("en-IN")} (
                  {MIN_SUBSCRIPTION_WALLET_RECHARGE_DAYS} days)
                </p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging || (showValidation && !validation.valid)}
                onClick={handleRecharge}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-65 ${rechargeBtnClass}`}
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
