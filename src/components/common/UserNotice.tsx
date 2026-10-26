import React from "react";
import { Link } from "react-router-dom";

export type UserNoticeVariant = "info" | "warning" | "error" | "success";

const variantStyles: Record<
  UserNoticeVariant,
  { box: string; title: string; body: string }
> = {
  info: {
    box: "border-[#19411f]/20 bg-[#E6F4EA]",
    title: "text-[#19411f]",
    body: "text-gray-700",
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    title: "text-amber-900",
    body: "text-amber-800",
  },
  error: {
    box: "border-red-200 bg-red-50",
    title: "text-red-800",
    body: "text-red-700",
  },
  success: {
    box: "border-[#19411f]/20 bg-[#E6F4EA]",
    title: "text-[#19411f]",
    body: "text-gray-700",
  },
};

export type UserNoticeAction = {
  label: string;
  onClick?: () => void;
  to?: string;
};

type Props = {
  variant?: UserNoticeVariant;
  title?: string;
  children: React.ReactNode;
  actions?: UserNoticeAction[];
  className?: string;
  role?: "alert" | "status";
};

/**
 * Inline customer-facing notice — use for errors users must understand and act on.
 */
export function UserNotice({
  variant = "info",
  title,
  children,
  actions,
  className = "",
  role = "status",
}: Props) {
  const v = variantStyles[variant];
  return (
    <div
      role={role}
      className={`rounded-xl border px-4 py-3 text-sm ${v.box} ${className}`}
    >
      {title ? (
        <p className={`mb-1 font-semibold ${v.title}`}>{title}</p>
      ) : null}
      <div className={`${v.body} leading-snug`}>{children}</div>
      {actions && actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) =>
            a.to ? (
              <Link
                key={a.label}
                to={a.to}
                className="rounded-lg bg-[#19411F] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 active:scale-[0.99]"
              >
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="rounded-lg bg-[#19411F] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 active:scale-[0.99]"
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
