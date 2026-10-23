import React from "react";
import { IoLocationOutline } from "react-icons/io5";
import { OPTIMIZED_ILLUSTRATIONS } from "../../config/optimizedIllustrations";
import {
  AREA_COMING_SOON_HINT,
  AREA_COMING_SOON_MESSAGE,
  comingSoonGreeting,
} from "../../config/homeHeroStatusCopy";
import {
  GP_DAILY_OFFLINE_HINT,
  GP_DAILY_OFFLINE_MESSAGE,
  gpDailyOfflineGreeting,
} from "../../config/gpDailyOfflineHeroCopy";
import {
  gpDailyHome,
  GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS,
  GP_DAILY_SCOOTER_HERO_IMG_CLASS,
  GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS,
  GP_STORE_HERO_TRUCK_COPY_PAD_CLASS,
  GP_STORE_HERO_TRUCK_IMG_CLASS,
  GP_STORE_HERO_TRUCK_WRAPPER_CLASS,
} from "../../utils/gpDailyHomeDesignSystem";
import type { HomeHeroStatusVariant } from "../../config/homeHeroStatusCopy";

type Props = {
  variant: HomeHeroStatusVariant;
  onChangeLocation?: () => void;
  className?: string;
  /** Match GP Daily home scooter hero; Store uses the truck. */
  typography?: "default" | "daily";
  userFirstName?: string;
  isLoggedIn?: boolean;
};

function ScooterGroundLines() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 right-1 flex items-end gap-2.5"
      aria-hidden
    >
      <span className="h-0.5 w-9 rounded-full bg-[#E8985E]/85" />
      <span className="mb-0.5 h-0.5 w-[3.25rem] rounded-full bg-[#E8985E]/85" />
    </div>
  );
}

export const HomeHeroStatusBanner: React.FC<Props> = ({
  variant,
  onChangeLocation,
  className = "",
  typography = "default",
  userFirstName = "",
  isLoggedIn = false,
}) => {
  const isDaily = typography === "daily";
  const isOffline = variant === "store_offline";
  const title = isOffline
    ? gpDailyOfflineGreeting(userFirstName)
    : comingSoonGreeting(userFirstName);
  const message = isOffline ? GP_DAILY_OFFLINE_MESSAGE : AREA_COMING_SOON_MESSAGE;
  const hint = isOffline ? GP_DAILY_OFFLINE_HINT : AREA_COMING_SOON_HINT;
  const clickable = !isOffline && !!onChangeLocation;

  const inner = (
    <div className={`relative mt-4 sm:mt-5 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2 pl-3 pr-1">
        <h2
          className={
            isLoggedIn ? gpDailyHome.greeting : gpDailyHome.storeHeroGreeting
          }
        >
          {title}
        </h2>
      </div>

      <div
        className={
          isDaily
            ? "relative min-h-[6rem] pb-1 sm:min-h-[6.5rem]"
            : "relative min-h-[5.5rem] sm:min-h-[6rem]"
        }
      >
        <div
          className={`relative z-10 min-w-0 ${
            isDaily
              ? GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS
              : GP_STORE_HERO_TRUCK_COPY_PAD_CLASS
          } ${gpDailyHome.namasteHeroInset}`}
        >
          <div className="flex min-h-7 items-start gap-2.5 text-[#222222]">
            <IoLocationOutline
              className={`${gpDailyHome.namasteIcon} mt-0.5 text-[#222222]`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className={gpDailyHome.namasteDetail}>{message}</p>
              <div
                className="my-2 h-px w-1/2 max-w-[50%] bg-[#222222]"
                aria-hidden
              />
              <p className="text-xs font-normal leading-4 text-[#808080]">
                {hint}
                {clickable ? (
                  <span className="ml-1 text-[#222222]/45" aria-hidden>
                    {" "}
                    ›
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        {isDaily ? (
          <div className={GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS}>
            <img
              src={OPTIMIZED_ILLUSTRATIONS.dailyScooter}
              alt=""
              aria-hidden
              className={GP_DAILY_SCOOTER_HERO_IMG_CLASS}
            />
            <ScooterGroundLines />
          </div>
        ) : (
          <div className={GP_STORE_HERO_TRUCK_WRAPPER_CLASS}>
            <img
              src={OPTIMIZED_ILLUSTRATIONS.truckHome}
              alt=""
              aria-hidden
              className={GP_STORE_HERO_TRUCK_IMG_CLASS}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onChangeLocation}
        className="w-full text-left transition-opacity hover:opacity-80"
      >
        {inner}
      </button>
    );
  }

  return inner;
};
