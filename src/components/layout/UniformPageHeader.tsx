import React from "react";
import { IoArrowBack } from "react-icons/io5";

/**
 * Matches mobile `UniformHeader` + `getPageHeaderTitleTextStyle`:
 * IBM Plex Serif 600, ~22px / 28px line-height, title #111827, back icon #374151, bar #f8f6f1, vertical 16px.
 */
export const UNIFORM_PAGE_HEADER_TITLE_CLASS =
  "font-serif font-semibold text-[22px] leading-7 tracking-normal text-[#111827]";

/** Back control only — use with a matching `IoArrowBack` size={24} for app parity. */
export const UNIFORM_PAGE_HEADER_BACK_BUTTON_CLASS =
  "-ml-2 mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#374151] transition-colors hover:bg-black/5";

const TITLE_ON_BRAND_CLASS =
  "font-serif font-semibold text-[22px] leading-7 tracking-normal text-white";

const BACK_ON_BRAND_CLASS =
  "text-white hover:bg-white/15 bg-white/[0.14]";

export type UniformPageHeaderProps = {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  /** Light title + back on transparent bar (e.g. Refer hero over brand gradient). */
  variant?: "default" | "onBrandGradient";
  /** Tailwind horizontal padding (default px-4 ≈ app gutter). */
  padXClassName?: string;
  /** Tailwind vertical padding (default py-4 = 16px like app). */
  padYClassName?: string;
  /** Merged onto the root header (sticky, borders, extra vertical padding, etc.). */
  className?: string;
  /** Extra classes on the title `h1` (e.g. truncate). */
  titleClassName?: string;
  /** Optional right cluster (e.g. wallet + profile on Manage Store). */
  trailing?: React.ReactNode;
  /** Optional classes on the back button (e.g. Daily accent on icon via `text-*`). */
  backButtonClassName?: string;
};

export const UniformPageHeader: React.FC<UniformPageHeaderProps> = ({
  title,
  onBack,
  showBack = true,
  padXClassName = "px-4",
  padYClassName = "py-4",
  className = "",
  titleClassName = "",
  trailing,
  backButtonClassName = "",
  variant = "default",
}) => {
  const onBrand = variant === "onBrandGradient";
  const titleClass = onBrand ? TITLE_ON_BRAND_CLASS : UNIFORM_PAGE_HEADER_TITLE_CLASS;
  const rootBg = onBrand ? "bg-transparent" : "bg-[#f8f6f1]";
  return (
    <header
      className={[
        "flex items-center justify-between gap-3",
        rootBg,
        padXClassName,
        padYClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={[
              onBrand
                ? "-ml-2 mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
                : UNIFORM_PAGE_HEADER_BACK_BUTTON_CLASS,
              onBrand ? BACK_ON_BRAND_CLASS : "",
              backButtonClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Go back"
          >
            <IoArrowBack size={24} />
          </button>
        ) : null}
        <h1
          className={[
            titleClassName || titleClass,
            "min-w-0 flex-1",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {title}
        </h1>
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-4">{trailing}</div>
      ) : null}
    </header>
  );
};
