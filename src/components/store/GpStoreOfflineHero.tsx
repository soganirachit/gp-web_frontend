import React from "react";
import { IoMoon, IoStar } from "react-icons/io5";

import {
  GP_DAILY_OFFLINE_HINT,
  GP_DAILY_OFFLINE_MESSAGE,
  gpDailyOfflineGreeting,
} from "../../config/gpDailyOfflineHeroCopy";
import { gpDailyHome } from "../../utils/gpDailyHomeDesignSystem";
import truckStoreIcon from "../../assets/svg/gp_store_svg/truckhome.svg";

type Props = {
  userFirstName: string;
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

export const GpStoreOfflineHero: React.FC<Props> = ({ userFirstName }) => {
  return (
    <div className="relative mt-4 sm:mt-5">
      <div className="mb-2.5 pl-3 pr-1">
        <h2 className={gpDailyHome.greeting}>
          {gpDailyOfflineGreeting(userFirstName)}
        </h2>
      </div>

      <div className="relative min-h-[5.5rem] pb-1 sm:min-h-[6rem]">
        <div className={`min-w-0 pr-[42%] ${gpDailyHome.namasteHeroInset}`}>
          <div className="flex min-h-7 items-start gap-2.5 text-[#222222]">
            <MoonStarsIcon />
            <div className="min-w-0 flex-1">
              <p className={gpDailyHome.namasteDetail}>{GP_DAILY_OFFLINE_MESSAGE}</p>
              <div className="my-2 h-px w-full bg-[#222222]" aria-hidden />
              <p className="text-xs font-normal leading-4 text-[#808080]">
                {GP_DAILY_OFFLINE_HINT}
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-3 top-1/2 z-[1] -translate-y-1/2 translate-x-1 sm:-right-4 sm:translate-x-2">
          <img
            src={truckStoreIcon}
            alt=""
            aria-hidden
            className="relative h-[5.5rem] w-[11rem] object-contain object-right sm:h-[6rem] sm:w-[11.75rem]"
          />
        </div>
      </div>
    </div>
  );
};
