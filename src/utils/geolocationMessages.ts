/**
 * User-facing copy for browser geolocation + map flows (web vs device GPS).
 */

import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

export const GEO_MSG_PERMISSION = REQUIRED_TOAST.LOCATION_PERMISSION_DENIED_STILL_MANUAL;
export const GEO_MSG_PERMISSION_SHORT = REQUIRED_TOAST.LOCATION_PERMISSION_DENIED_MANUAL;
export const GEO_MSG_TURN_ON = REQUIRED_TOAST.TURN_ON_LOCATION;
export const GEO_MSG_COULD_NOT_USE = REQUIRED_TOAST.COULD_NOT_USE_CURRENT_LOCATION;

export const GEO_MSG_TIMEOUT =
  "Location timed out (often a weak network). Try again, or search for your address on the map.";

export const GEO_MSG_UNAVAILABLE =
  "Your device couldn't fix a precise location. Search and select your address on the map to continue.";

export const GEO_MSG_UNSUPPORTED =
  "This browser doesn't support GPS. Search for your address on the map.";

export const GEO_MSG_NETWORK =
  "Couldn't load address details (network issue). Check your connection and try again, or search for your address.";

export const GEO_MSG_GEOCODE_EMPTY =
  "We couldn't resolve that spot to an address. Move the pin or search for your address — web location can be inaccurate.";

export function messageFromGeolocationPositionError(
  err: Pick<GeolocationPositionError, "code"> | null | undefined,
  variant: "address_form" | "choose_location" = "address_form",
): string {
  if (err == null) return REQUIRED_TOAST.FAILED_GET_LOCATION;
  switch (err.code) {
    case 1:
      return variant === "choose_location"
        ? REQUIRED_TOAST.TURN_ON_LOCATION
        : REQUIRED_TOAST.LOCATION_PERMISSION_DENIED_STILL_MANUAL;
    case 2:
      return REQUIRED_TOAST.FAILED_GET_LOCATION;
    case 3:
      return REQUIRED_TOAST.FAILED_GET_LOCATION;
    default:
      return REQUIRED_TOAST.FAILED_GET_LOCATION;
  }
}

export function isLikelyNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const m = msg.toLowerCase();
  return (
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("failed to fetch") ||
    m.includes("timeout") ||
    m.includes("econnrefused") ||
    m.includes("aborted") ||
    m.includes("load failed")
  );
}
