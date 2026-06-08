import {
  isStoreOffline,
  normalizeCityLabel,
  storeService,
  type Store,
} from "../services/store.service";
import { reverseGeocodeCityOnlyForGuest } from "./guestHeaderLocation";
import type { HomeHeroStatusVariant } from "../config/homeHeroStatusCopy";

export type HomeHeroStatus = HomeHeroStatusVariant | "default";

function uniqueStoreIds(ids: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

async function fetchStoreForHeroCheck(
  storeId: number,
  latitude?: number | null,
  longitude?: number | null,
): Promise<Store | null> {
  const targetId = Number(storeId);
  if (!Number.isFinite(targetId)) return null;

  const pick = (list: Store[]) =>
    list.find((s) => Number(s.id) === targetId) ?? null;

  const hasLoc =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  if (hasLoc) {
    const nearestRaw = await storeService.fetchNearestStoreUnfiltered(
      latitude!,
      longitude!,
    );
    if (nearestRaw && Number(nearestRaw.id) === targetId) return nearestRaw;

    const near = await storeService.getAllStores(latitude!, longitude!);
    const fromNear = pick(near);
    if (fromNear) return fromNear;

    const nearest = await storeService.findNearestStoreForCoordinates(
      latitude!,
      longitude!,
    );
    if (nearest && Number(nearest.id) === targetId) return nearest;
  }

  const all = await storeService.getAllStores();
  return pick(all);
}

async function isUserCityServed(
  lat: number,
  lng: number,
): Promise<boolean> {
  const city = (await reverseGeocodeCityOnlyForGuest(lat, lng)).trim();
  if (!city) return false;
  const served = await storeService.getUniqueCitiesFromOnlineStores();
  const target = normalizeCityLabel(city);
  return served.some((c) => normalizeCityLabel(c.name) === target);
}

async function isAnyCandidateStoreOffline(
  storeIds: number[],
  deviceLat: number | null,
  deviceLng: number | null,
): Promise<boolean> {
  for (const sid of storeIds) {
    const store = await fetchStoreForHeroCheck(sid, deviceLat, deviceLng);
    if (store && isStoreOffline(store)) return true;
  }
  return false;
}

/** True when catalog / nearest store is offline — block subscribe & checkout. */
export async function isOrderingBlockedByStoreOffline(opts: {
  storeId: number | null;
  storeIds?: number[];
  lat: number | null;
  lng: number | null;
}): Promise<boolean> {
  const status = await resolveHomeHeroStatus({
    storeId: opts.storeId,
    storeIds: opts.storeIds,
    inServiceArea: true,
    deviceLat: opts.lat,
    deviceLng: opts.lng,
  });
  return status === "store_offline";
}

export async function resolveHomeHeroStatus(opts: {
  storeId: number | null;
  /** Extra store ids (cart / catalog) checked before area_coming_soon. */
  storeIds?: number[];
  inServiceArea: boolean;
  deviceLat: number | null;
  deviceLng: number | null;
}): Promise<HomeHeroStatus> {
  const { storeId, inServiceArea, deviceLat, deviceLng } = opts;
  const candidateIds = uniqueStoreIds([...(opts.storeIds ?? []), storeId]);

  const hasCoords =
    deviceLat != null &&
    deviceLng != null &&
    !Number.isNaN(deviceLat) &&
    !Number.isNaN(deviceLng);

  if (candidateIds.length > 0) {
    if (await isAnyCandidateStoreOffline(candidateIds, deviceLat, deviceLng)) {
      return "store_offline";
    }
  }

  if (hasCoords) {
    const nearest = await storeService.fetchNearestStoreUnfiltered(
      deviceLat!,
      deviceLng!,
    );
    if (nearest && isStoreOffline(nearest)) {
      return "store_offline";
    }
  }

  if (
    !inServiceArea &&
    deviceLat != null &&
    deviceLng != null &&
    !Number.isNaN(deviceLat) &&
    !Number.isNaN(deviceLng)
  ) {
    const servedCity = await isUserCityServed(deviceLat, deviceLng);
    if (servedCity) return "area_coming_soon";
  }

  return "default";
}

/** Delivery address coordinates for hero store / offline checks (prefer over device GPS). */
export function parseDeliveryAddressCoords(
  addr: { coordinates?: string | null } | null | undefined,
): { lat: number; lng: number } | null {
  if (!addr) return null;
  const raw = addr.coordinates;
  if (!raw || !String(raw).trim()) return null;
  const parts = String(raw).split(",").map(Number);
  if (
    parts.length >= 2 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1])
  ) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}
