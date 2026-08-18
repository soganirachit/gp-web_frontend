import axios, { AxiosError, type AxiosResponse } from "axios";
import api from "./api";
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";
import { getApiUrl } from "../config/api.config";
import { addressService, type Address } from "./address.service";
import { formatSavedAddressLine } from "../utils/resolveHomeCatalogHeaderAddress";
import { cartService } from "./cart.service";
import {
  resolveGpDailyZoneAtLatLng,
} from "./subscriptionZone.service";
import { GUEST_NOT_SERVICEABLE_BODY } from "../config/guestBrowseAddressCopy";
import {
  GEO_MSG_UNSUPPORTED,
  messageFromGeolocationPositionError,
} from "../utils/geolocationMessages";
import { shouldShowStoreOfflineHero } from "../utils/storeOperatingHours";

/** Dispatched on `window` after a guest picks a store from the city picker (home / products refresh). */
export const GUEST_STORE_UPDATED_EVENT = "gp-guest-temporary-store-updated";

/** Logged-in GP Store: browse/choose-location changed (override or GPS) — home refreshes address + catalog. */
export const GPS_CATALOG_LOCATION_UPDATED_EVENT = "gp-gps-catalog-location-updated";

const GP_STORE_CATALOG_ADDRESS_OVERRIDE_ID_KEY = "gp_store_catalog_address_override_id";
const GUEST_BROWSE_ADDRESS_KEY = "gp_guest_browse_address";

export type GuestBrowseAddressSnapshot = {
  formattedLine: string;
  coordinates: string;
  label?: string;
};

export type GuestBrowseApplyResult = {
  serviceable: boolean;
  storeName?: string;
  message?: string;
};

export function notifyGuestTemporaryStoreUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GUEST_STORE_UPDATED_EVENT));
  }
}

export function notifyGpsCatalogLocationUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GPS_CATALOG_LOCATION_UPDATED_EVENT));
  }
}

/** Thrown / attached when logged-out user is outside coverage or location unavailable. */
export const GUEST_NEED_CITY_PICKER_CODE = "GUEST_NEED_CITY_PICKER";

export interface CityOption {
  id: number;
  name: string;
  state: string;
}

function storeIsOperationalWeb(s: Store): boolean {
  if (typeof s.is_online === "boolean") return s.is_online;
  return true;
}

export function isStoreOffline(store: Store): boolean {
  return store.is_online === false;
}

export function isCartStoreOffline(
  cartStoreId: number | null | undefined,
  stores: Store[],
): boolean {
  if (cartStoreId == null || !Number.isFinite(Number(cartStoreId))) {
    return false;
  }
  const row = stores.find((s) => s.id === Number(cartStoreId));
  return !!row && isStoreOffline(row);
}

function parseMaxDeliveryRadiusKm(s: Store): number | null {
  const raw = s.max_delivery_radius_km;
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

/** Same rule as mobile: `distance_km` vs `max_delivery_radius_km` from GET /stores/?lat=&lng= */
export function storeIsWithinDeliveryRadius(s: Store): boolean {
  const maxR = parseMaxDeliveryRadiusKm(s);
  const d = s.distance_km;
  if (maxR == null || d == null || Number.isNaN(Number(d))) return true;
  return Number(d) <= maxR;
}

function storeIsSelectableWeb(s: Store): boolean {
  return storeIsOperationalWeb(s) && storeIsWithinDeliveryRadius(s);
}

/** Normalize for comparing API `city` with the city the user selected. */
export function normalizeCityLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Keep only stores whose `city` matches the chosen city (API `?city=` may be broad). */
export function filterStoresBelongingToCity(
  stores: Store[],
  cityName: string,
): Store[] {
  const target = normalizeCityLabel(cityName);
  return stores.filter((s) => normalizeCityLabel(s.city ?? "") === target);
}

export interface Store {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
  /** From GET /stores/ — false means store is temporarily offline for ordering */
  is_online?: boolean;
  opening_time: string;
  closing_time: string;
  /** ₹ per km — billed as distance × rate (legacy flat `delivery_fee` may still appear on older payloads). */
  delivery_fee_per_km?: string;
  delivery_fee: string;
  free_delivery_threshold: string;
  min_order_amount: string;
  max_delivery_radius_km: string;
  distance_km?: number;
}

/** UI fallback when product + stores API do not expose a threshold. */
export const DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES = "149";

/** Format API `free_delivery_threshold` (e.g. `"999.00"`) for ₹ display. */
export function formatFreeDeliveryThresholdForDisplay(
  raw: string | number | null | undefined,
): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

class StoreService {
  private offlineStoreListCache: { rows: Store[]; ts: number } | null = null;
  private offlineStoreListInFlight: Promise<Store[]> | null = null;
  private static readonly OFFLINE_STORE_LIST_CACHE_TTL_MS = 30_000;

  clearOfflineStoreListCache(): void {
    this.offlineStoreListCache = null;
  }

  /**
   * GET /stores/ without lat/lng — includes offline rows (omitted when lat/lng sent).
   */
  async getAllStoresIncludingOffline(options?: {
    bypassCache?: boolean;
  }): Promise<Store[]> {
    if (options?.bypassCache) {
      this.clearOfflineStoreListCache();
    }
    const cached = this.offlineStoreListCache;
    if (
      !options?.bypassCache &&
      cached &&
      Date.now() - cached.ts < StoreService.OFFLINE_STORE_LIST_CACHE_TTL_MS
    ) {
      return cached.rows;
    }
    if (this.offlineStoreListInFlight) {
      return this.offlineStoreListInFlight;
    }
    const promise = this.getAllStores()
      .then((rows) => {
        this.offlineStoreListCache = { rows, ts: Date.now() };
        return rows;
      })
      .finally(() => {
        this.offlineStoreListInFlight = null;
      });
    this.offlineStoreListInFlight = promise;
    return promise;
  }

  /** Lookup a store row by id from the unscoped list (offline rows included). */
  async getStoreRowIncludingOffline(
    storeId: number,
    options?: { bypassCache?: boolean },
  ): Promise<Store | null> {
    const id = Number(storeId);
    if (!Number.isFinite(id) || id <= 0) return null;
    try {
      const all = await this.getAllStoresIncludingOffline(options);
      return all.find((s) => Number(s.id) === id) ?? null;
    } catch {
      return null;
    }
  }

  /** True when the store should show the offline hero (hours or API offline flag). */
  async isCatalogStoreOffline(
    storeId: number,
    options?: { bypassCache?: boolean },
  ): Promise<boolean> {
    const row = await this.getStoreRowIncludingOffline(storeId, options);
    return !!row && shouldShowStoreOfflineHero(row);
  }

  /**
   * List active stores. If lat/lng are omitted or invalid, the API returns all stores in default order
   * (backend does not require location). With lat/lng, results are sorted by distance.
   */
  async getAllStores(latitude?: number, longitude?: number): Promise<Store[]> {
    try {
      const hasLoc =
        latitude !== undefined &&
        longitude !== undefined &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude);
      const response = await axios.get(`${getApiUrl()}/stores/`, {
        params: hasLoc ? { lat: latitude, lng: longitude } : {},
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching stores:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch stores");
      }
      throw error;
    }
  }

  /**
   * Unique city names from online stores (GET /stores/). Guest picker — no hardcoded list.
   */
  async getUniqueCitiesFromOnlineStores(): Promise<CityOption[]> {
    const stores = await this.getAllStores();
    const operational = stores.filter(storeIsOperationalWeb);
    const byKey = new Map<string, { name: string; state: string }>();
    for (const s of operational) {
      const raw = (s.city ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, {
          name: raw,
          state: (s.state ?? "").trim(),
        });
      }
    }
    const sorted = [...byKey.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name, undefined, { sensitivity: "base" }),
    );
    return sorted.map(([, v], i) => ({
      id: i + 1,
      name: v.name,
      state: v.state,
    }));
  }

  async getNearestStore(latitude: number, longitude: number): Promise<Store | null> {
    try {
      const response = await axios.get(`${getApiUrl()}/stores/nearest/`, {
        params: {
          lat: latitude,
          lng: longitude,
        },
      });

      if (response.data.success && response.data.data) {
        const store = response.data.data as Store;
        return storeIsOperationalWeb(store) ? store : null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching nearest store:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch nearest store");
      }
      throw error;
    }
  }

  /** GET /stores/nearest/ without filtering offline — used for hero/cart offline detection. */
  async fetchNearestStoreUnfiltered(
    latitude: number,
    longitude: number,
  ): Promise<Store | null> {
    try {
      const response = await axios.get(`${getApiUrl()}/stores/nearest/`, {
        params: { lat: latitude, lng: longitude },
      });
      if (response.data.success && response.data.data) {
        return response.data.data as Store;
      }
      return null;
    } catch (error) {
      console.error("Error fetching nearest store (unfiltered):", error);
      return null;
    }
  }

  /** Closest store by distance from GET /stores/ (includes offline rows when API returns them). */
  async findNearestStoreForCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<Store | null> {
    const list = await this.getAllStores(latitude, longitude);
    if (!list.length) return null;
    const sorted = [...list].sort((a, b) => {
      const da = Number(a.distance_km);
      const db = Number(b.distance_km);
      const na = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
      const nb = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
      return na - nb;
    });
    return sorted[0] ?? null;
  }

  /**
   * Online stores in a city (guest picker). Backend: GET /stores/?city=
   */
  async getStoresInCity(cityName: string): Promise<Store[]> {
    try {
      const response = await axios.get(`${getApiUrl()}/stores/`, {
        params: { city: cityName },
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        const list = (response.data.data as Store[]).filter(storeIsOperationalWeb);
        const inCity = filterStoresBelongingToCity(list, cityName);
        return inCity.sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    } catch (error) {
      console.error("Error fetching stores by city:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch stores");
      }
      throw error;
    }
  }

  private async findFirstSelectableStoreNear(latitude: number, longitude: number): Promise<Store | null> {
    const stores = await this.getAllStores(latitude, longitude);
    if (!stores.length) return null;
    const sorted = [...stores].sort((a, b) => {
      const da = Number(a.distance_km);
      const db = Number(b.distance_km);
      const na = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
      const nb = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
      return na - nb;
    });
    return sorted.find(storeIsSelectableWeb) ?? null;
  }

  private rejectCityPicker(message?: string): never {
    const err = new Error(message || "Choose a city to browse") as Error & { code?: string };
    err.code = GUEST_NEED_CITY_PICKER_CODE;
    throw err;
  }

  /**
   * Resolve a guest store from device coordinates.
   * On `/gp-daily/*`, uses subscription check-zone (+ store-by-zone). Else store validate-coverage + nearest store.
   */
  async resolveGuestStoreFromCoordinates(latitude: number, longitude: number): Promise<number> {
    const isGpDaily =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/gp-daily");

    if (isGpDaily) {
      try {
        const zone = await resolveGpDailyZoneAtLatLng(latitude, longitude);
        if (!zone.eligible || zone.storeId == null) {
          this.clearTemporaryStoreId();
          this.rejectCityPicker(zone.message);
        }
        this.setTemporaryStoreId(zone.storeId);
        return zone.storeId;
      } catch {
        this.clearTemporaryStoreId();
        this.rejectCityPicker();
      }
    }

    let coverageOk = false;
    try {
      const cov = await addressService.validateAddressInDeliveryArea(`${latitude},${longitude}`);
      coverageOk = !!cov.isValid;
    } catch {
      coverageOk = false;
    }

    if (!coverageOk) {
      this.clearTemporaryStoreId();
      this.rejectCityPicker();
    }

    let store = await this.getNearestStore(latitude, longitude);
    if (store && !storeIsSelectableWeb(store)) {
      store = null;
    }
    if (!store) {
      store = await this.findFirstSelectableStoreNear(latitude, longitude);
    }

    if (store) {
      this.setTemporaryStoreId(store.id);
      return store.id;
    }

    this.clearTemporaryStoreId();
    this.rejectCityPicker();
  }

  async switchStore(storeId: number): Promise<void> {
    try {
      const response = await api.post(
        `${getApiUrl()}/stores/switch/`,
        { store_id: storeId }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to switch store");
      }

      // Store the selected store ID in localStorage
      localStorage.setItem("selectedStoreId", storeId.toString());
    } catch (error) {
      console.error("Error switching store:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to switch store");
      }
      throw error;
    }
  }

  getSelectedStoreId(): number | null {
    const storeId = localStorage.getItem("selectedStoreId");
    return storeId ? parseInt(storeId, 10) : null;
  }

  /**
   * Get temporary store ID for logged-out users based on location
   * This is stored separately from the logged-in user's selected store
   */
  getTemporaryStoreId(): number | null {
    const storeId = localStorage.getItem("temporaryStoreId");
    return storeId ? parseInt(storeId, 10) : null;
  }

  /**
   * Set temporary store ID for logged-out users
   */
  setTemporaryStoreId(storeId: number): void {
    const prev = this.getTemporaryStoreId();
    localStorage.setItem("temporaryStoreId", storeId.toString());
    if (prev !== storeId) {
      notifyGuestTemporaryStoreUpdated();
    }
  }

  /**
   * After POST /subscriptions/check-zone/ returns eligible + store: persist that store for
   * GP Daily catalog calls ({@link resolveGpDailyCatalogStoreId}) until the subscription cart
   * supplies its own `store_id`.
   */
  syncDailyZoneCheckStore(res: {
    eligible: boolean;
    store?: { id?: number } | null;
  }): void {
    if (!res.eligible) return;
    const sid = Number(res.store?.id);
    if (!Number.isFinite(sid) || sid <= 0) return;
    this.setTemporaryStoreId(sid);
  }

  /**
   * Clear temporary store ID (e.g., when user logs in)
   */
  clearTemporaryStoreId(): void {
    localStorage.removeItem("temporaryStoreId");
  }

  getGuestBrowseAddress(): GuestBrowseAddressSnapshot | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(GUEST_BROWSE_ADDRESS_KEY);
      if (!raw?.trim()) return null;
      const parsed = JSON.parse(raw) as GuestBrowseAddressSnapshot;
      if (!parsed?.coordinates?.trim() || !parsed?.formattedLine?.trim()) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  setGuestBrowseAddress(snapshot: GuestBrowseAddressSnapshot): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(GUEST_BROWSE_ADDRESS_KEY, JSON.stringify(snapshot));
  }

  clearGuestBrowseAddress(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(GUEST_BROWSE_ADDRESS_KEY);
  }

  async applyGuestBrowseAddress(
    snapshot: GuestBrowseAddressSnapshot,
    catalog: "store" | "daily",
  ): Promise<GuestBrowseApplyResult> {
    this.setGuestBrowseAddress(snapshot);
    const parts = snapshot.coordinates.split(",").map((s) => parseFloat(s.trim()));
    const lat = parts[0];
    const lng = parts[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { serviceable: false, message: GUEST_NOT_SERVICEABLE_BODY };
    }

    if (catalog === "daily") {
      try {
        const zone = await resolveGpDailyZoneAtLatLng(lat, lng);
        if (!zone.eligible || zone.storeId == null) {
          this.clearTemporaryStoreId();
          return {
            serviceable: false,
            message: zone.message?.trim() || GUEST_NOT_SERVICEABLE_BODY,
          };
        }
        this.setTemporaryStoreId(zone.storeId);
        notifyGpsCatalogLocationUpdated();
        return {
          serviceable: true,
          storeName:
            zone.storeName?.trim() ||
            (zone.storeId != null ? `Store ${zone.storeId}` : undefined),
        };
      } catch {
        this.clearTemporaryStoreId();
        return { serviceable: false, message: GUEST_NOT_SERVICEABLE_BODY };
      }
    }

    try {
      await this.resolveGuestStoreFromCoordinates(lat, lng);
      notifyGpsCatalogLocationUpdated();
      const storeId = this.getTemporaryStoreId();
      if (storeId == null) {
        return { serviceable: false, message: GUEST_NOT_SERVICEABLE_BODY };
      }
      const stores = await this.getAllStores(lat, lng);
      const row = stores.find((s) => s.id === storeId);
      return {
        serviceable: true,
        storeName: row?.name?.trim() || `Store ${storeId}`,
      };
    } catch {
      this.clearTemporaryStoreId();
      return { serviceable: false, message: GUEST_NOT_SERVICEABLE_BODY };
    }
  }

  /**
   * Get store ID - returns logged-in user's store ID if available, otherwise temporary store ID
   */
  getStoreIdForProducts(): number | null {
    if (localStorage.getItem("phoneNumber")) {
      return this.getSelectedStoreId() ?? this.getTemporaryStoreId();
    }
    return this.getTemporaryStoreId();
  }

  /** Pinned saved address for store catalog (parity with app SecureStore). */
  getGpStoreCatalogAddressOverrideId(): string | null {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(GP_STORE_CATALOG_ADDRESS_OVERRIDE_ID_KEY);
    return v && v.trim() ? v.trim() : null;
  }

  setGpStoreCatalogAddressOverrideId(id: string | null): void {
    if (typeof localStorage === "undefined") return;
    if (id != null && String(id).trim()) {
      localStorage.setItem(
        GP_STORE_CATALOG_ADDRESS_OVERRIDE_ID_KEY,
        String(id).trim(),
      );
    } else {
      localStorage.removeItem(GP_STORE_CATALOG_ADDRESS_OVERRIDE_ID_KEY);
    }
  }

  /**
   * Nearest operational store for coordinates, or next selectable by distance
   * (when /nearest/ returns out-of-radius offline).
   */
  async getSelectableNearestStore(
    latitude: number,
    longitude: number,
  ): Promise<Store | null> {
    let store = await this.getNearestStore(latitude, longitude);
    if (store && !storeIsSelectableWeb(store)) {
      store = null;
    }
    if (!store) {
      store = await this.findFirstSelectableStoreNear(latitude, longitude);
    }
    return store;
  }

  /**
   * GP Store “Choose location” — guest: temporary store from pin; user: switch cart + assigned store.
   */
  async applyBrowseAddressForCatalog(address: Address): Promise<void> {
    const parts = (address.coordinates || "")
      .split(",")
      .map((s) => parseFloat(s.trim()));
    const lat = parts[0];
    const lng = parts[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(
        "This address has no map pin. Edit the address to set location on the map.",
      );
    }
    this.setGpStoreCatalogAddressOverrideId(String(address.id));
    try {
      localStorage.setItem("selectedDeliveryAddress", JSON.stringify(address));
      const headerLine = formatSavedAddressLine(address);
      if (headerLine.trim()) {
        localStorage.setItem("userLocation", headerLine);
      }
    } catch {
      /* ignore storage errors */
    }

    const isGpDaily =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/gp-daily");

    if (!localStorage.getItem("phoneNumber")) {
      await this.resolveGuestStoreFromCoordinates(lat, lng);
      notifyGpsCatalogLocationUpdated();
      return;
    }

    if (isGpDaily) {
      try {
        const zone = await resolveGpDailyZoneAtLatLng(lat, lng);
        if (!zone.eligible || zone.storeId == null) {
          this.setGpStoreCatalogAddressOverrideId(null);
          throw new Error(
            zone.message?.trim() ||
              "Genda Phool Daily is not available at this address.",
          );
        }
        this.setTemporaryStoreId(zone.storeId);
        notifyGpsCatalogLocationUpdated();
        return;
      } catch (e) {
        this.setGpStoreCatalogAddressOverrideId(null);
        throw e;
      }
    }

    const cov = await addressService.validateAddressInDeliveryArea(
      `${lat},${lng}`,
    );
    if (!cov.isValid) {
      this.setGpStoreCatalogAddressOverrideId(null);
      throw new Error(
        "We are not delivering to this address from your current store. Choose another address or switch store from Account.",
      );
    }

    const store = await this.getSelectableNearestStore(lat, lng);
    if (!store) {
      this.setGpStoreCatalogAddressOverrideId(null);
      throw new Error(REQUIRED_TOAST.NOT_DELIVERING_LOCATION);
    }
    const current = this.getSelectedStoreId();
    if (current === store.id) {
      notifyGpsCatalogLocationUpdated();
      return;
    }
    try {
      await cartService.switchCartStore(store.id);
    } catch {
      /* empty cart or network */
    }
    await this.switchStore(store.id);
    notifyGpsCatalogLocationUpdated();
  }

  /**
   * Use device GPS for catalog (clears saved-address override). Guest + logged-in.
   */
  async applyUseCurrentGpsForCatalog(): Promise<void> {
    this.setGpStoreCatalogAddressOverrideId(null);
    if (!navigator.geolocation) {
      throw new Error(GEO_MSG_UNSUPPORTED);
    }
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            if (!localStorage.getItem("phoneNumber")) {
              try {
                await this.resolveGuestStoreFromCoordinates(
                  latitude,
                  longitude,
                );
              } catch (e) {
                reject(
                  e instanceof Error
                    ? e
                    : new Error("Could not resolve store for your location."),
                );
                return;
              }
              notifyGpsCatalogLocationUpdated();
              resolve();
              return;
            }
            const cov = await addressService.validateAddressInDeliveryArea(
              `${latitude},${longitude}`,
            );
            if (!cov.isValid) {
              throw new Error(
                "We are not delivering to your current location. Pick a saved address on the map.",
              );
            }
            const store = await this.getSelectableNearestStore(
              latitude,
              longitude,
            );
            if (!store) {
              throw new Error(REQUIRED_TOAST.NOT_DELIVERING_LOCATION);
            }
            const current = this.getSelectedStoreId();
            if (current === store.id) {
              notifyGpsCatalogLocationUpdated();
              resolve();
              return;
            }
            try {
              await cartService.switchCartStore(store.id);
            } catch {
              /* ignore */
            }
            await this.switchStore(store.id);
            notifyGpsCatalogLocationUpdated();
            resolve();
          } catch (e) {
            reject(
              e instanceof Error
                ? e
                : new Error("Could not update store for your location."),
            );
          }
        },
        (geoErr) => {
          reject(new Error(messageFromGeolocationPositionError(geoErr)));
        },
        { enableHighAccuracy: false, timeout: 20_000, maximumAge: 60_000 },
      );
    });
  }

  /**
   * Store id for cart/product API calls: same as {@link getStoreIdForProducts}, then
   * (when null) {@link getStoreFromLocation} which may set temporary store for guests.
   * Never returns a hardcoded fallback id.
   */
  async resolveStoreIdForApiAsync(): Promise<number | null> {
    const direct = this.getStoreIdForProducts();
    if (direct != null) return direct;
    try {
      return await this.getStoreFromLocation();
    } catch {
      return null;
    }
  }

  /**
   * Request user location and get nearest store for logged-out users
   * Returns the store ID if successful
   */
  async getStoreFromLocation(): Promise<number | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error(GEO_MSG_UNSUPPORTED) as Error & {
          code?: string;
        };
        err.code = GUEST_NEED_CITY_PICKER_CODE;
        reject(err);
        return;
      }

      const options = {
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 60_000,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const id = await this.resolveGuestStoreFromCoordinates(latitude, longitude);
            resolve(id);
          } catch (error) {
            console.error("Error getting store from location:", error);
            reject(error);
          }
        },
        (error) => {
          const errorMessage = messageFromGeolocationPositionError(error);
          const err = new Error(errorMessage) as Error & { code?: string };
          err.code = GUEST_NEED_CITY_PICKER_CODE;
          reject(err);
        },
        options
      );
    });
  }
}

export const storeService = new StoreService();

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  cta_label?: string;
  cta_link?: string;
  secondary_cta_label?: string;
  secondary_cta_link?: string;
  image_url?: string;
  title_bg_color: string;
  cta_bg_color: string;
  sort_order: number;
  placement?: string | null;
}

type BannersApiResponse = { success: boolean; data: Banner[] };

/** Coalesce concurrent identical requests (Strict Mode double-mount, duplicate effects, etc.). */
const bannersRequestByStoreKey = new Map<
  string,
  Promise<AxiosResponse<BannersApiResponse>>
>();

// Uses raw axios (no JWT) — banners are public; sending a stale token can cause 401
export function getStoreBanners(
  storeId: number | string,
  options?: { placement?: string },
) {
  const placement = options?.placement?.trim();
  const key = placement ? `${storeId}:${placement}` : String(storeId);
  const existing = bannersRequestByStoreKey.get(key);
  if (existing) return existing;
  const req = axios
    .get<BannersApiResponse>(`${getApiUrl()}/stores/${storeId}/banners/`, {
      params: placement ? { placement } : undefined,
    })
    .finally(() => {
      bannersRequestByStoreKey.delete(key);
    });
  bannersRequestByStoreKey.set(key, req);
  return req;
}

