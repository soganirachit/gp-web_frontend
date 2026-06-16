import React from "react";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

type CartConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  titleId?: string;
};

/** Centered confirm dialog — same layout as gp-store basket “Switch Store?” modal. */
export const CartConfirmModal: React.FC<CartConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
  titleId = "cart-confirm-modal-title",
}) => {
  const { theme, feature } = useFeatureTheme();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99997] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3
          id={titleId}
          className="mb-3 text-center text-lg font-semibold text-gray-900"
        >
          {title}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
          {message}
        </p>
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="w-full rounded-lg py-3 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: theme.colors.primary,
              color: feature === "gpStore" ? "white" : "black",
            }}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full rounded-lg py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
