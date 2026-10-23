import type { Address } from "../services/address.service";
import {
  pickSavedAddressNearGps,
  SAVED_ADDRESS_MATCH_METERS,
} from "./pickSavedAddressNearGps";

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

/** Match GPS pin to a saved address when within ~120m (closest, default tie, A–Z). */
export function findSavedAddressAtCoordinates(
  lat: number,
  lng: number,
  addresses: Address[],
  maxMeters = SAVED_ADDRESS_MATCH_METERS,
): Address | null {
  return pickSavedAddressNearGps(lat, lng, addresses, maxMeters);
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
