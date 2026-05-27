import React from "react";
import sajawatLogoSvg from "../../assets/svg/sajawat_logo.svg";
import { SAJAWAT_HERO } from "./sajawatContent";

const HERO_BG = "/sajawat/sajawat_hero_bg.png";

export const SajawatHero: React.FC = () => (
  <section className="bg-white">
    <div className="relative min-h-[17.5rem] w-full overflow-hidden sm:min-h-[20rem]">
      <img
        src={HERO_BG}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/60 to-white/80"
        aria-hidden
      />
      <div className="relative flex min-h-[17.5rem] flex-col justify-end px-5 pb-5 pt-12 sm:min-h-[20rem] sm:px-6 sm:pb-6">
        <img
          src={sajawatLogoSvg}
          alt="Sajawat by Genda Phool"
          className="mb-2.5 h-9 w-auto max-w-[10.5rem] sm:h-10"
        />
        <h1 className="max-w-[20rem] font-serif text-[1.35rem] font-bold leading-snug text-[#9B2226] sm:max-w-md sm:text-2xl sm:leading-tight">
          {SAJAWAT_HERO.headline}
        </h1>
      </div>
    </div>
    <div className="bg-white px-5 py-5 sm:px-6">
      <p className="text-sm leading-relaxed text-[#666666] sm:text-[15px] sm:leading-7">
        {SAJAWAT_HERO.intro}
      </p>
    </div>
  </section>
);
