import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { DAILY_PACK_CATEGORY_ALERT_TITLE } from "../../utils/dailyPackCartRules";

type DailyPackCategoryAlertModalProps = {
  open: boolean;
  message: string | null;
  onClose: () => void;
};

export const DailyPackCategoryAlertModal: React.FC<
  DailyPackCategoryAlertModalProps
> = ({ open, message, onClose }) => {
  const { theme } = useFeatureTheme();

  if (typeof document === "undefined" || !message) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-pack-category-alert-title"
        >
          <motion.div
            className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="daily-pack-category-alert-title"
              className="mb-3 text-center text-lg font-semibold text-gray-900"
            >
              {DAILY_PACK_CATEGORY_ALERT_TITLE}
            </h3>
            <p className="mb-6 whitespace-pre-wrap text-center text-sm leading-relaxed text-gray-600">
              {message}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg py-3 text-base font-medium text-black transition-colors"
              style={{ backgroundColor: theme.colors.primary }}
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
