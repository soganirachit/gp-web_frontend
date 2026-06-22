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

const ORDERING_OFFLINE_CACHE_TTL_MS = 90_000;
const STORES_LIST_CACHE_TTL_MS = 90_000;

type OrderingOfflineCacheEntry = {
  blocked: boolean;
  expiresAt: number;
};

let orderingOfflineCache: {
  key: string;
  entry: OrderingOfflineCacheEntry;
} | null = null;

let storesListCache: {
  key: string;
  list: Store[];
  expiresAt: number;
} | null = null;

function orderingOfflineCacheKey(
  storeIds: number[],
  lat: number | null,
  lng: number | null,
): string {
  const ids = [...storeIds].sort((a, b) => a - b).join(",");
  const loc =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `${lat.toFixed(4)},${lng.toFixed(4)}`
      : "no-loc";
  return `${ids}|${loc}`;
}

/** Clear after guest store / address changes (see useOrderingStoreOffline). */
export function invalidateOrderingOfflineCache(): void {
  orderingOfflineCache = null;
  storesListCache = null;
}

async function getStoresListCached(
  latitude?: number | null,
  longitude?: number | null,
): Promise<Store[]> {
  const hasLoc =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);
  const key = hasLoc
    ? `loc:${latitude!.toFixed(4)},${longitude!.toFixed(4)}`
    : "all";

  if (
    storesListCache &&
    storesListCache.key === key &&
    Date.now() < storesListCache.expiresAt
  ) {
    return storesListCache.list;
  }

  const list = hasLoc
    ? await storeService.getAllStores(latitude!, longitude!)
    : await storeService.getAllStores();
  storesListCache = {
    key,
    list,
    expiresAt: Date.now() + STORES_LIST_CACHE_TTL_MS,
  };
  return list;
}

function findStoreInList(list: Store[], storeId: number): Store | null {
  return list.find((s) => Number(s.id) === storeId) ?? null;
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

async function areKnownStoresOffline(
  storeIds: number[],
  deviceLat: number | null,
  deviceLng: number | null,
): Promise<boolean> {
  const hasLoc =
    deviceLat != null &&
    deviceLng != null &&
    !Number.isNaN(deviceLat) &&
    !Number.isNaN(deviceLng);

  const nearList = hasLoc
    ? await getStoresListCached(deviceLat, deviceLng)
    : null;
  let allList: Store[] | null = null;

  for (const sid of storeIds) {
    let store = nearList ? findStoreInList(nearList, sid) : null;
    if (!store) {
      allList ??= await getStoresListCached();
      store = findStoreInList(allList, sid);
    }
    if (store && isStoreOffline(store)) return true;
  }
  return false;
}

async function isAnyCandidateStoreOffline(
  storeIds: number[],
  deviceLat: number | null,
  deviceLng: number | null,
  opts?: { knownStoreOnly?: boolean },
): Promise<boolean> {
  if (opts?.knownStoreOnly) {
    return areKnownStoresOffline(storeIds, deviceLat, deviceLng);
  }

  for (const sid of storeIds) {
    const store = await fetchStoreForHeroCheck(sid, deviceLat, deviceLng);
    if (store && isStoreOffline(store)) return true;
  }
  return false;
}

async function isNearestStoreOffline(
  deviceLat: number | null,
  deviceLng: number | null,
): Promise<boolean> {
  const hasCoords =
    deviceLat != null &&
    deviceLng != null &&
    !Number.isNaN(deviceLat) &&
    !Number.isNaN(deviceLng);
  if (!hasCoords) return false;

  const nearest = await storeService.fetchNearestStoreUnfiltered(
    deviceLat!,
    deviceLng!,
  );
  return !!(nearest && isStoreOffline(nearest));
}

/** True when catalog / nearest store is offline — block subscribe & checkout. */
export async function isOrderingBlockedByStoreOffline(opts: {
  storeId: number | null;
  storeIds?: number[];
  lat: number | null;
  lng: number | null;
}): Promise<boolean> {
  const candidateIds = uniqueStoreIds([...(opts.storeIds ?? []), opts.storeId]);
  const cacheKey = orderingOfflineCacheKey(candidateIds, opts.lat, opts.lng);
  if (
    orderingOfflineCache &&
    orderingOfflineCache.key === cacheKey &&
    Date.now() < orderingOfflineCache.entry.expiresAt
  ) {
    return orderingOfflineCache.entry.blocked;
  }

  let blocked: boolean;
  if (candidateIds.length > 0) {
    blocked = await isAnyCandidateStoreOffline(
      candidateIds,
      opts.lat,
      opts.lng,
      { knownStoreOnly: true },
    );
  } else {
    blocked = await isNearestStoreOffline(opts.lat, opts.lng);
  }

  orderingOfflineCache = {
    key: cacheKey,
    entry: {
      blocked,
      expiresAt: Date.now() + ORDERING_OFFLINE_CACHE_TTL_MS,
    },
  };
  return blocked;
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
