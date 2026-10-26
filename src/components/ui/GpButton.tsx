import React from "react";
import Spinner from "../common/Spinner";

type Variant = "primary" | "secondary" | "ghost";

export type GpButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  variant?: Variant;
  fullWidth?: boolean;
  "aria-label"?: string;
  style?: React.CSSProperties;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#19411F] text-white hover:bg-[#1e5a1c] disabled:bg-gray-300 disabled:text-gray-500",
  secondary:
    "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60",
  ghost:
    "bg-transparent text-[#19411f] hover:bg-black/5 disabled:opacity-60",
};

/**
 * Primary action button with visible loading + press feedback (no layout shift).
 */
export const GpButton: React.FC<GpButtonProps> = ({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  loadingLabel,
  className = "",
  variant = "primary",
  fullWidth = false,
  "aria-label": ariaLabel,
  style,
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      style={style}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold",
        "transition-[transform,opacity,background-color] duration-150 ease-out",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19411f]",
        fullWidth ? "w-full" : "",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <>
          <Spinner size={22} variant={variant === "primary" ? "light" : "default"} />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
