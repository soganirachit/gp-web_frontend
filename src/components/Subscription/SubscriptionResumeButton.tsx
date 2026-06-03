import React from "react";
import { HiMiniPlay } from "react-icons/hi2";
import Spinner from "../common/Spinner";
import { gpDailyHome } from "../../utils/gpDailyHomeDesignSystem";

export interface SubscriptionResumeButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  className?: string;
  compact?: boolean;
  variant?: "default" | "bottleGreen" | "olive";
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
  const olive = variant === "olive";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Resume subscription"
      className={`transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
        compact
          ? `${gpDailyHome.namasteActionChip} shadow-none`
          : "inline-flex min-w-[5.75rem] shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold shadow-sm"
      } ${
        olive
          ? "bg-[#C9BC4A] text-[#222222] hover:bg-[#BFB14A]"
          : green
            ? "bg-[#19411F] text-white hover:bg-[#143318]"
            : "bg-[#222222] text-white hover:bg-[#111111]"
      } ${className}`}
    >
      {loading ? (
        <Spinner
          size={18}
          variant={olive ? "default" : "light"}
          className="!inline-flex"
        />
      ) : (
        <>
          <HiMiniPlay
            className={`shrink-0 ${compact ? "h-3 w-3" : "h-4 w-4"}`}
            aria-hidden
          />
          Resume
        </>
      )}
    </button>
  );
};
