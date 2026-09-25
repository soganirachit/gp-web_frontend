import { GEO_MSG_UNSUPPORTED } from "./geolocationMessages";

/** Wi‑Fi / cell / cached fix. High-accuracy GPS on desktop Safari/Chrome often loops on kCLErrorLocationUnknown. */
export const NETWORK_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 300_000,
};

const FRESH_NETWORK_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20_000,
  maximumAge: 0,
};

export function readStoredUserCoordinates(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem("userCoordinates");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  } catch {
    /* ignore */
  }
  return null;
}

function getCurrentPositionAsync(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * One-shot browser location. Prefers a cached/network fix, then retries without cache.
 * Never uses enableHighAccuracy on the first pass (that is what floods CoreLocation errors).
 */
export async function requestBrowserGeolocation(): Promise<GeolocationPosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    const err = new Error(GEO_MSG_UNSUPPORTED) as Error & { code: number };
    err.code = 0;
    throw err;
  }

  try {
    return await getCurrentPositionAsync(NETWORK_GEOLOCATION_OPTIONS);
  } catch (first) {
    const code =
      first && typeof first === "object" && "code" in first
        ? Number((first as GeolocationPositionError).code)
        : 0;
    if (code === 1) throw first;
    return getCurrentPositionAsync(FRESH_NETWORK_GEOLOCATION_OPTIONS);
  }
}
