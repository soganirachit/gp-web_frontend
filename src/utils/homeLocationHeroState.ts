import {
  normalizeCityLabel,
  storeService,
  type Store,
} from "../services/store.service";
import { reverseGeocodeCityOnlyForGuest } from "./guestHeaderLocation";
import type { HomeHeroStatusVariant } from "../config/homeHeroStatusCopy";

export type HomeHeroStatus = HomeHeroStatusVariant | "default";

function storeIsOfflineWeb(store: Store): boolean {
  return store.is_online === false;
}

async function fetchStoreSnapshot(storeId: number): Promise<Store | null> {
  try {
    const stores = await storeService.getAllStores();
    return stores.find((s) => Number(s.id) === Number(storeId)) ?? null;
  } catch {
    return null;
  }
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

export async function resolveHomeHeroStatus(opts: {
  storeId: number | null;
  inServiceArea: boolean;
  deviceLat: number | null;
  deviceLng: number | null;
}): Promise<HomeHeroStatus> {
  const { storeId, inServiceArea, deviceLat, deviceLng } = opts;

  if (storeId != null) {
    const store = await fetchStoreSnapshot(storeId);
    if (store && storeIsOfflineWeb(store)) {
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
