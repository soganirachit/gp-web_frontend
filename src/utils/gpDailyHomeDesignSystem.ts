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

  sectionToHeading: 24,

  headingToContent: 16,

  blockGap: 32,

} as const;



export function gpDailyTitleCase(value: string): string {

  const trimmed = value.trim();

  if (!trimmed) return trimmed;

  return trimmed

    .toLowerCase()

    .replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));

}



export const gpDailyHome = {

  blockGap: "mt-8",

  headingToContent: "mb-4",

  sectionHeading:

    "font-ibm-plex-serif text-[1.125rem] leading-6 font-semibold tracking-normal text-[#222222] md:text-[1rem] md:leading-7",

  sectionHeadingWithGap:

    "font-ibm-plex-serif text-[1.125rem] leading-6 font-semibold tracking-normal text-[#222222] mb-4 md:text-[1rem] md:leading-7",

  greeting:

    "font-ibm-plex-serif text-[1.4375rem] font-bold leading-[1.3] text-[#222222] min-w-0 flex-1 pl-3 [overflow-wrap:anywhere] md:text-[1.5rem]",

  managePill:

    "shrink-0 rounded-sm bg-[#FF2629CC] px-2.5 py-1 text-xs text-white hover:opacity-90",

  namasteHeroInset: "pl-3",

  exploreMore: "text-[10px] font-medium leading-none text-[#808080]",

  namasteDetail:

    "font-ibm-plex-serif min-w-0 flex-1 text-sm font-normal leading-5 text-[#222222] md:text-[0.9375rem] [overflow-wrap:anywhere]",

  namasteIcon: "h-3.5 w-3.5 shrink-0",

  namastePlayIcon: "h-3.5 w-3.5 shrink-0 text-[#222222]",

  holdCard: "rounded-[2rem] px-4 py-3 text-white",

  walletHoldText: "font-sans text-xs font-semibold leading-4 text-white",

  holdCardBody: "font-sans text-xs leading-4 text-white",

  walletRechargeBtn:

    "inline-flex min-h-[34px] items-center justify-center self-start rounded-sm border border-white bg-transparent px-3 py-1 text-sm  text-white transition-opacity hover:bg-white/10",

  namastePagination:

    "mt-1 flex w-full items-center justify-center gap-0.5 text-[#222222]",

  namastePaginationArrow:

    "flex h-6 w-6 shrink-0 items-center justify-center text-[#222222] hover:opacity-80",

  namastePaginationDot:

    "h-1.5 w-1.5 rounded-full bg-[#222222]/35 transition-all duration-300",

  namastePaginationDotActive:

    "h-2 w-5 rounded-full bg-[#222222]",

  productStrip:

    "flex snap-x snap-mandatory overflow-x-auto gap-3 no-scrollbar pb-4 -mx-1 px-1",

  productCol: "w-[min(44vw,10.25rem)] xs:w-[10.5rem] flex-shrink-0 snap-start",

  viewAllCta:

    "w-full max-w-none rounded-xl min-h-[40px] px-3.5 py-2.5 text-base font-medium text-[#222222] bg-[#FFB343] transition-opacity hover:opacity-95",

  marketingTagline:

    "mb-1.5 text-xs font-normal leading-[1.35] text-[#19411F] [overflow-wrap:anywhere]",

  marketingLine: "text-xs font-medium leading-snug text-[#19411F]",

  /** Store/Daily hero greeting when parent already has `namasteHeroInset`. */
  storeHeroGreeting:
    "font-ibm-plex-serif text-[1.4375rem] font-bold leading-[1.3] text-[#222222] mb-2 md:text-[1.5rem]",

} as const;



export const GP_DAILY_SCOOTER_HERO_IMG_CLASS =

  "h-[5.75rem] w-[11rem] object-contain object-right sm:h-[8rem] sm:w-[13.5rem]";



/** Wrapper for Daily homepage scooter (offline hero + marketing hero). */

export const GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS =

  "pointer-events-none absolute -right-10 top-1/2 z-0 -translate-y-1/2 translate-x-5";



/** GP Store default hero truck — fixed size; 5px above marketing overlap anchor. */
export const GP_STORE_HERO_TRUCK_IMG_CLASS =

  "pointer-events-none absolute -right-[20px] top-[calc(64%-5px)] z-[2] h-[5.75rem] w-[11rem] -translate-y-[32%] translate-x-[10px] object-contain object-right sm:h-[8rem] sm:w-[13.5rem]";


