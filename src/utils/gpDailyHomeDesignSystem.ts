/**

 * GP Daily homepage design tokens — Pixel 7 baseline, scales to tablet/desktop.

 */



export const GP_DAILY_HOME_COLORS = {

  textPrimary: "#222222",

  textSecondary: "#808080",

  accent: "#FFB343",

  actionButton: "#FF2629CC",

  holdCardBg: "rgba(255, 38, 41, 0.8)",

} as const;



export const GP_DAILY_HOME_RHYTHM = {

  sectionToHeading: 16,

  headingToContent: 12,

  blockGap: 24,

  /** Matches `homeSectionStackGap` (`gap-3` = 12px) between homepage sections. */
  sectionStackGap: 12,

} as const;

/** GP Daily brand orange — pagination, hero accents. */
export const GP_DAILY_PRIMARY_ORANGE = "#DD7600";



export function gpDailyTitleCase(value: string): string {

  const trimmed = value.trim();

  if (!trimmed) return trimmed;

  return trimmed

    .toLowerCase()

    .replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));

}



export const gpDailyHome = {

  // blockGap: "mt-8",

  headingToContent: "mb-3",

  sectionHeading:

    "font-sans text-[1rem] leading-6 font-semibold tracking-normal text-[#222222] md:text-[1rem] md:leading-7",

  sectionHeadingWithGap:

    "font-sans text-[1rem] leading-6 font-semibold tracking-normal text-[#222222] mb-3 md:text-[1rem] md:leading-7",

  sectionHeadingSans:

    "font-sans text-[1rem] leading-6 font-semibold tracking-normal text-[#222222] md:text-[1rem] md:leading-7",

  namasteCarouselTrack:
    "relative z-10 flex min-h-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain no-scrollbar touch-pan-x [scroll-snap-stop:always]",

  greeting:

    "font-ibm-plex-serif text-[1rem] font-bold leading-[1.3] text-[#222222] min-w-0 flex-1 [overflow-wrap:anywhere] md:text-[1.3125rem]",

  namasteHeroInset: "px-3",

  managePill:

    "shrink-0 rounded-sm bg-[#FF2629CC] px-2.5 py-1 text-xs text-white hover:opacity-90",

  /** Active badge + Resume CTA in Namaste subscription row (same size). */
  namasteActionChip:
    "shrink-0 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold leading-4",

  exploreMore: "text-[10px] font-medium leading-none text-[#808080]",

  namasteDetail:

    "font-ibm-plex-serif min-w-0 flex-1 text-xs font-normal leading-4 text-[#222222] md:text-[0.8125rem] md:leading-[1.125rem] [overflow-wrap:anywhere]",

  namasteIcon: "h-3.5 w-3.5 shrink-0",

  namastePlayIcon: "h-3.5 w-3.5 shrink-0 text-[#222222]",

  holdCard: "rounded-[2rem] px-4 py-3 text-white",

  walletHoldText: "font-sans text-xs font-semibold leading-4 text-white",

  holdCardBody: "font-sans text-xs leading-4 text-white",

  walletRechargeBtn:

    "inline-flex min-h-[28px] items-center justify-center self-start rounded-sm border border-white bg-transparent px-2.5 py-0.5 text-xs font-semibold text-white transition-opacity hover:bg-white/10",

  namastePagination:

    "mt-[5px] flex w-full items-center justify-center gap-1 text-[#DD7600]",

  /** Icon + label rows — shared column alignment in hero. */
  namasteDetailRow:
    "flex min-h-7 items-center gap-3 text-[#222222]",

  namastePackNameRow:
    "flex min-w-0 flex-1 items-center gap-[5px] overflow-hidden",

  /** Pack label beside status badge — no flex-1 so badge sits flush after name. */
  namastePackName:
    "font-ibm-plex-serif min-w-0 shrink truncate text-xs font-normal leading-4 text-[#222222] md:text-[0.8125rem] md:leading-[1.125rem]",

  /** Prev/next beside dots — laptop+ only; GP Daily primary orange. */
  namastePaginationArrow:

    "hidden lg:flex h-6 w-6 shrink-0 items-center justify-center text-[#DD7600] hover:opacity-80",

  /** Cream content below hero — equal horizontal + vertical inset. */
  homeContentArea: "bg-[#f8f6f1] p-4",

  homeSectionStackGap: "gap-3",

  namastePaginationDot:

    "h-1.5 w-1.5 rounded-full bg-[#DD7600]/35 transition-all duration-300",

  namastePaginationDotActive:

    "h-2 w-5 rounded-full bg-[#DD7600]",

  productStrip:

    "flex snap-x snap-mandatory overflow-x-auto gap-3 no-scrollbar pb-4",

  productCol: "w-[min(44vw,10.25rem)] xs:w-[10.5rem] flex-shrink-0 snap-start",

  viewAllCta:

    "w-full max-w-none rounded-xl min-h-[40px] px-3.5 py-2.5 text-base font-medium text-[#222222] bg-[#FFB343] transition-opacity hover:opacity-95",

  marketingTagline:

    "mb-1.5 text-xs font-normal leading-[1.35] text-[#19411F] [overflow-wrap:anywhere]",

  marketingLine: "text-xs font-medium leading-snug text-[#19411F]",

  /** Store hero greeting when parent already has `namasteHeroInset`. */
  storeHeroGreeting:
    "font-ibm-plex-serif text-[1.25rem] font-bold leading-[1.3] text-[#222222] mb-2 md:text-[1.3125rem]",

} as const;



/** Reserve ~30% of hero width for scooter illustration (70% text). */
export const GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS =
  "pr-[30%] sm:pr-[28%]";

export const GP_DAILY_SCOOTER_HERO_IMG_CLASS =
  "h-[5.25rem] w-[9.75rem] object-contain object-right sm:h-[6.5rem] sm:w-[11.75rem]";

/** Wrapper for Daily homepage scooter (offline hero + marketing hero). */
export const GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS =
  "pointer-events-none absolute -right-10 top-1/2 z-0 -translate-y-1/2 translate-x-8";

/** Logged-out marketing hero — scooter top aligns under Namaste / intro copy. */
export const GP_DAILY_SCOOTER_HERO_MARKETING_GUEST_WRAPPER_CLASS =
  "pointer-events-none absolute -right-10 -top-5 z-0 translate-x-8";



/** Reserve ~30% of Store hero width for truck illustration (70% text). */
export const GP_STORE_HERO_TRUCK_COPY_PAD_CLASS =
  GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS;

export const GP_STORE_HERO_TRUCK_IMG_CLASS =
  "h-[4rem] w-[9.5rem] object-contain object-right sm:h-[6rem] sm:w-[11rem]";

/** Wrapper for Store offline hero truck. */
export const GP_STORE_HERO_TRUCK_WRAPPER_CLASS =
  "pointer-events-none absolute -right-8 top-1/2 z-[1] -translate-y-1/2";

/** GP Store default hero truck — 5px above marketing overlap anchor. */
export const GP_STORE_HERO_TRUCK_ABSOLUTE_CLASS =
  "pointer-events-none absolute right-5 top-[calc(64%-5px)] z-[2] -translate-y-[32%] translate-x-10";


