import React from "react";
import { HiArrowPath } from "react-icons/hi2";
import Spinner from "../common/Spinner";

export interface SubscriptionResumeButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  className?: string;
  compact?: boolean;
  variant?: "default" | "bottleGreen";
}

/** GP Daily resume CTA — charcoal or bottle green fill. */
export const SubscriptionResumeButton: React.FC<
  SubscriptionResumeButtonProps
> = ({
  onClick,
  loading = false,
  className = "",
  compact = false,
  variant = "default",
}) => {
  const green = variant === "bottleGreen";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Resume subscription"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-white shadow-sm transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? "min-w-[4.75rem] rounded-lg px-2.5 py-1 text-xs" : "min-w-[5.75rem] text-[13px]"
      } ${
        green
          ? "bg-[#19411F] hover:bg-[#143318]"
          : "bg-[#222222] hover:bg-[#111111]"
      } ${className}`}
    >
      {loading ? (
        <Spinner size={18} variant="light" className="!inline-flex" />
      ) : (
        <>
          <HiArrowPath className="h-4 w-4 shrink-0" aria-hidden />
          Resume
        </>
      )}
    </button>
  );
};
