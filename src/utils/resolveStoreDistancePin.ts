import type { Address } from "../services/address.service";
import { coordsFromAddress, getSessionPin } from "./locationSession";
import { readStoredUserCoordinates } from "./requestBrowserGeolocation";

export type StoreDistancePinSource = "session" | "gps_sample" | "saved_address";

export type StoreDistancePin = {
  lat: number;
  lng: number;
  source: StoreDistancePinSource;
};

function finitePin(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } | null {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { lat: a, lng: b };
}

/** Last GPS sample in localStorage (JSON or "lat,lng"). */
export function parseStoredUserCoordinates(): { lat: number; lng: number } | null {
  const fromJson = readStoredUserCoordinates();
  if (fromJson) return fromJson;
  try {
    const raw = localStorage.getItem("userCoordinates");
    if (!raw?.trim() || raw.trim().startsWith("{")) return null;
    const parts = raw.split(",").map((s) => parseFloat(s.trim()));
    return finitePin(parts[0], parts[1]);
  } catch {
    return null;
  }
}

/** Default saved address pin, then the first address that has coordinates. */
export function defaultSavedAddressPin(
  addresses: Address[],
): { lat: number; lng: number } | null {
  const ordered = [...addresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
  for (const addr of ordered) {
    const p = coordsFromAddress(addr);
    if (p) return p;
  }
  return null;
}

/**
 * Lat/lng sent to GET /stores/?lat=&lng= so distance_km is vs the visit pin.
 *
 * 1. Location session pin (GPS after Home, or a picked address)
 * 2. Last GPS sample in userCoordinates
 * 3. Saved default address — last resort only
 */
export function resolveStoreDistancePin(
  addresses: Address[] = [],
): StoreDistancePin | null {
  const session = getSessionPin();
  if (session) return { ...session, source: "session" };
  const gps = parseStoredUserCoordinates();
  if (gps) return { ...gps, source: "gps_sample" };
  const saved = defaultSavedAddressPin(addresses);
  if (saved) return { ...saved, source: "saved_address" };
  return null;
}
