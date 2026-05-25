import type { Address } from "../services/address.service";

/** Synthetic id for the live GPS row on choose-location (not a backend address). */
export const LIVE_DEVICE_ADDRESS_ID = "__gf_live_device__";

export function parseAddressCoordinates(
  coordinates?: string,
): { lat: number; lng: number } | null {
  if (!coordinates?.trim()) return null;
  const parts = coordinates.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  return { lat: parts[0], lng: parts[1] };
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Match GPS pin to a saved address when within ~120m (same building / pin drop). */
export function findSavedAddressAtCoordinates(
  lat: number,
  lng: number,
  addresses: Address[],
  maxMeters = 120,
): Address | null {
  let best: Address | null = null;
  let bestDist = maxMeters;
  for (const addr of addresses) {
    const c = parseAddressCoordinates(addr.coordinates);
    if (!c) continue;
    const d = distanceMeters({ lat, lng }, c);
    if (d <= bestDist) {
      bestDist = d;
      best = addr;
    }
  }
  return best;
}

/** If live GPS matches a saved address, use the saved row (real delivery_address_id). */
export function resolveLiveDeviceToSavedAddress(
  address: Address,
  savedAddresses: Address[],
): Address {
  if (String(address.id) !== LIVE_DEVICE_ADDRESS_ID) return address;
  const coords = parseAddressCoordinates(address.coordinates);
  if (!coords) return address;
  return (
    findSavedAddressAtCoordinates(coords.lat, coords.lng, savedAddresses) ??
    address
  );
}
