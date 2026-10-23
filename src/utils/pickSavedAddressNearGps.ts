import type { Address } from "../services/address.service";
import { haversineMeters, roundMeters } from "./geoMeters";

function coordsOf(address: Address): { lat: number; lng: number } | null {
  const parts = String(address.coordinates || "")
    .split(",")
    .map((s) => parseFloat(s.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  return { lat: parts[0], lng: parts[1] };
}

/** Same-building window used to attach GPS to a saved address. */
export const SAVED_ADDRESS_MATCH_METERS = 120;

export type RankedSavedAddress = {
  address: Address;
  metres: number;
  label: string;
};

export function addressSortLabel(address: Address): string {
  const type = String(address.type || "").trim();
  const line = [address.houseNo, address.streetName, address.city]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(" ");
  return `${type} ${line}`.trim();
}

/**
 * Saved addresses inside `maxMeters` of GPS, closest first.
 * Equal metres → default wins. Still tied → alphabetical (type + address line).
 */
export function rankSavedAddressesNearGps(
  lat: number,
  lng: number,
  addresses: Address[],
  maxMeters = SAVED_ADDRESS_MATCH_METERS,
): RankedSavedAddress[] {
  const here = { lat, lng };
  const rows: RankedSavedAddress[] = [];
  for (const address of addresses) {
    const c = coordsOf(address);
    if (!c) continue;
    const metres = roundMeters(haversineMeters(here, c));
    if (metres > maxMeters) continue;
    rows.push({ address, metres, label: addressSortLabel(address) });
  }
  rows.sort((a, b) => {
    if (a.metres !== b.metres) return a.metres - b.metres;
    if (a.address.isDefault !== b.address.isDefault) {
      return a.address.isDefault ? -1 : 1;
    }
    return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
  });
  return rows;
}

export function pickSavedAddressNearGps(
  lat: number,
  lng: number,
  addresses: Address[],
  maxMeters = SAVED_ADDRESS_MATCH_METERS,
): Address | null {
  return rankSavedAddressesNearGps(lat, lng, addresses, maxMeters)[0]?.address ?? null;
}
