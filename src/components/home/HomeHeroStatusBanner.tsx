import React from "react";
import { IoChevronForward, IoLocationOutline } from "react-icons/io5";
import { OPTIMIZED_ILLUSTRATIONS } from "../../config/optimizedIllustrations";
import {
  AREA_COMING_SOON_HERO_SUBTITLE,
  AREA_COMING_SOON_HERO_TITLE,
  STORE_OFFLINE_HERO_SUBTITLE,
  STORE_OFFLINE_HERO_TITLE,
  type HomeHeroStatusVariant,
} from "../../config/homeHeroStatusCopy";

type Props = {
  variant: HomeHeroStatusVariant;
  onChangeLocation?: () => void;
  className?: string;
  /** Match GP Daily home `font-serif` headings. */
  typography?: "default" | "daily";
};

export const HomeHeroStatusBanner: React.FC<Props> = ({
  variant,
  onChangeLocation,
  className = "",
  typography = "default",
}) => {
  const isDailyTypography = typography === "daily";
  const isOffline = variant === "store_offline";
  const title = isOffline ? STORE_OFFLINE_HERO_TITLE : AREA_COMING_SOON_HERO_TITLE;
  const subtitle = isOffline
    ? STORE_OFFLINE_HERO_SUBTITLE
    : AREA_COMING_SOON_HERO_SUBTITLE;

  const inner = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          isOffline ? "bg-[#19411f]/15" : "bg-red-500/10"
        }`}
        aria-hidden
      >
        {isOffline ? (
          <img
            src={OPTIMIZED_ILLUSTRATIONS.truckHome}
            alt=""
            className="h-6 w-10 object-contain object-center"
          />
        ) : (
          <IoLocationOutline className="h-6 w-6 text-red-600" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={
            isDailyTypography
              ? "font-serif text-[1.75rem] font-semibold leading-8 tracking-tight text-[#222222]"
              : "text-[24px] font-bold leading-snug tracking-tight text-gray-900/95"
          }
        >
          {title}
        </p>
        <p
          className={
            isDailyTypography
              ? "mt-1 font-serif text-lg font-medium leading-[1.35] text-[#374151]"
              : "mt-1 text-lg font-medium leading-[1.35] text-gray-600/90"
          }
        >
          {subtitle}
        </p>
      </div>
      {!isOffline && onChangeLocation ? (
        <IoChevronForward
          className="h-[18px] w-[18px] shrink-0 text-gray-800/45"
          aria-hidden
        />
      ) : null}
    </>
  );

  const stripClass = `mt-3.5 flex items-center gap-2.5 py-0.5 ${className}`;

  if (!isOffline && onChangeLocation) {
    return (
      <button
        type="button"
        onClick={onChangeLocation}
        className={`${stripClass} w-full text-left transition-opacity hover:opacity-80`}
      >
        {inner}
      </button>
    );
  }

  return <div className={stripClass}>{inner}</div>;
};
