/**
 * User-facing copy for browser geolocation + map flows (web vs device GPS).
 * Web logins often get coarse / VPN / wrong positions — guide users to search instead of crashing silently.
 */

export const GEO_MSG_PERMISSION =
  "We can't access your location. Allow location in your browser settings, or search and pick your address on the map.";

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

/** `GeolocationPositionError.code`: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT */
export function messageFromGeolocationPositionError(
  err: Pick<GeolocationPositionError, "code"> | null | undefined,
): string {
  if (err == null) return GEO_MSG_UNAVAILABLE;
  switch (err.code) {
    case 1:
      return GEO_MSG_PERMISSION;
    case 2:
      return GEO_MSG_UNAVAILABLE;
    case 3:
      return GEO_MSG_TIMEOUT;
    default:
      return GEO_MSG_UNAVAILABLE;
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
