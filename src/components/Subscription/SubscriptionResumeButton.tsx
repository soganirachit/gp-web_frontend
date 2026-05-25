import React from "react";
import { HiArrowPath } from "react-icons/hi2";
import Spinner from "../common/Spinner";

export interface SubscriptionResumeButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  className?: string;
}

/** GP Daily resume CTA — charcoal fill, refresh icon (home + Your Subscriptions). */
export const SubscriptionResumeButton: React.FC<
  SubscriptionResumeButtonProps
> = ({ onClick, loading = false, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Resume subscription"
      className={`inline-flex min-w-[5.75rem] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#222222] px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#111111] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
