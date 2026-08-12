import React from "react";
import { IoMoon, IoStar } from "react-icons/io5";

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
} from "../../utils/gpDailyHomeDesignSystem";

import { OPTIMIZED_ILLUSTRATIONS } from "../../config/optimizedIllustrations";

const dailyScooterHeroImg = OPTIMIZED_ILLUSTRATIONS.dailyScooter;

type Props = {
  userFirstName: string;
  isLoggedIn: boolean;
  onManage?: () => void;
};

function MoonStarsIcon() {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0" aria-hidden>
      <IoMoon className="h-4 w-4 text-[#222222]" />
      <IoStar className="absolute -right-1 -top-0.5 h-[5px] w-[5px] text-[#222222]" />
      <IoStar className="absolute right-0 top-0.5 h-1 w-1 text-[#222222]" />
      <IoStar className="absolute right-1 top-1.5 h-[3px] w-[3px] text-[#222222]" />
    </span>
  );
}

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

export const GpDailyOfflineHero: React.FC<Props> = ({
  userFirstName,
  isLoggedIn,
  onManage,
}) => {
  return (
    <div className="relative mt-4 sm:mt-5">
      <div className="mb-2.5 flex items-center justify-between gap-2 pl-3 pr-1">
        <h2 className={isLoggedIn ? gpDailyHome.greeting : gpDailyHome.storeHeroGreeting}>
          {gpDailyOfflineGreeting(userFirstName)}
        </h2>
        {isLoggedIn && onManage ? (
          <button type="button" onClick={onManage} className={gpDailyHome.managePill}>
            Manage
          </button>
        ) : null}
      </div>

      <div className="relative min-h-[6rem] pb-1 sm:min-h-[6.5rem]">
        <div className={`relative z-10 min-w-0 ${GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS} ${gpDailyHome.namasteHeroInset}`}>
          <div className="flex min-h-7 items-start gap-2.5 text-[#222222]">
            <MoonStarsIcon />
            <div className="min-w-0 flex-1">
              <p className={gpDailyHome.namasteDetail}>{GP_DAILY_OFFLINE_MESSAGE}</p>
              <div
                className="my-2 h-px w-1/2 max-w-[50%] bg-[#222222]"
                aria-hidden
              />
              <p className="text-xs font-normal leading-4 text-[#808080]">
                {GP_DAILY_OFFLINE_HINT}
              </p>
            </div>
          </div>
        </div>
        <div className={GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS}>
          <img
            src={dailyScooterHeroImg}
            alt=""
            aria-hidden
            className={GP_DAILY_SCOOTER_HERO_IMG_CLASS}
          />
          <ScooterGroundLines />
        </div>
      </div>
    </div>
  );
};
