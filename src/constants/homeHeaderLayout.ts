/** Shared address + profile row on landing, store home, and daily home. */

export const HOME_HEADER_ADDRESS_MAX_CHARS = 30;

export const HOME_HEADER_ADDRESS_PROFILE_ROW =
  "flex items-center justify-between mb-3 pt-2 sm:pt-3";

export const HOME_HEADER_LOCATION_ROW =
  "flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0";

export const HOME_HEADER_LOCATION_ICON =
  "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0";

export const HOME_HEADER_LOCATION_CLICK =
  "flex items-center gap-1 cursor-pointer min-w-0 flex-1";

export const HOME_HEADER_ADDRESS_TYPE =
  "text-sm sm:text-base font-bold leading-tight";

/** Truncate + max width so all three pages show the same ~30-character line. */
export const HOME_HEADER_ADDRESS_LINE =
  "text-xs sm:text-sm font-medium leading-snug truncate max-w-[30ch] block";

export const HOME_HEADER_CHEVRON =
  "text-gray-600 flex-shrink-0 text-lg sm:text-xl";

export const HOME_HEADER_PROFILE_OFFSET =
  "translate-x-1 sm:translate-x-2";

export function formatHomeHeaderAddressDisplay(
  value: string,
  maxChars: number = HOME_HEADER_ADDRESS_MAX_CHARS
): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}
