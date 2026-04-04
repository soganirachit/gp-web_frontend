import axios, { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";
import { addressService } from "./address.service";

/** Dispatched on `window` after a guest picks a store from the city picker (home / products refresh). */
export const GUEST_STORE_UPDATED_EVENT = "gp-guest-temporary-store-updated";

export function notifyGuestTemporaryStoreUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GUEST_STORE_UPDATED_EVENT));
  }
}

/** Thrown / attached when logged-out user is outside coverage or location unavailable. */
export const GUEST_NEED_CITY_PICKER_CODE = "GUEST_NEED_CITY_PICKER";

export interface CityOption {
  id: number;
  name: string;
  state: string;
}

/** Cities we operate in (guest city picker; keep in sync with mobile `AVAILABLE_CITIES`). */
export const GUEST_SERVICE_CITIES: CityOption[] = [
  { id: 1, name: "Delhi", state: "Delhi" },
  { id: 2, name: "New Delhi", state: "Delhi" },
  { id: 3, name: "Bengaluru", state: "Karnataka" },
  { id: 4, name: "Mumbai", state: "Maharashtra" },
  { id: 5, name: "Pune", state: "Maharashtra" },
  { id: 6, name: "Jaipur", state: "Rajasthan" },
  { id: 7, name: "Chennai", state: "Tamil Nadu" },
  { id: 8, name: "Hyderabad", state: "Telangana" },
  { id: 9, name: "Chandigarh", state: "Punjab" },
  { id: 10, name: "Kolkata", state: "West Bengal" },
  { id: 11, name: "Lucknow", state: "Uttar Pradesh" },
  { id: 12, name: "Surat", state: "Gujarat" },
  { id: 13, name: "Nashik", state: "Maharashtra" },
  { id: 14, name: "Mysore", state: "Karnataka" },
  { id: 15, name: "Coimbatore", state: "Tamil Nadu" },
  { id: 16, name: "Warangal", state: "Telangana" },
  { id: 17, name: "Vijayawada", state: "Andhra Pradesh" },
  { id: 18, name: "Guntur", state: "Andhra Pradesh" },
];

function storeIsOperationalWeb(s: Store): boolean {
  if (typeof s.is_online === "boolean") return s.is_online;
  return true;
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


class StoreService {
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

  /**
   * Online stores in a city (guest picker). Backend: GET /stores/?city=
   */
  async getStoresInCity(cityName: string): Promise<Store[]> {
    try {
      const response = await axios.get(`${getApiUrl()}/stores/`, {
        params: { city: cityName },
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        const list = response.data.data as Store[];
        return list
          .filter(storeIsOperationalWeb)
          .sort((a, b) => a.name.localeCompare(b.name));
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
   * Resolve a guest store from device coordinates: validates coverage, then nearest selectable store.
   */
  async resolveGuestStoreFromCoordinates(latitude: number, longitude: number): Promise<number> {
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
    localStorage.setItem("temporaryStoreId", storeId.toString());
  }

  /**
   * Clear temporary store ID (e.g., when user logs in)
   */
  clearTemporaryStoreId(): void {
    localStorage.removeItem("temporaryStoreId");
  }

  /**
   * Get store ID - returns logged-in user's store ID if available, otherwise temporary store ID
   */
  getStoreIdForProducts(): number | null {
    if (localStorage.getItem("phoneNumber")) {
      return this.getSelectedStoreId();
    } else {
      return this.getTemporaryStoreId();
    }
  }

  /**
   * Request user location and get nearest store for logged-out users
   * Returns the store ID if successful
   */
  async getStoreFromLocation(): Promise<number | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error("Geolocation is not supported by your browser") as Error & {
          code?: string;
        };
        err.code = GUEST_NEED_CITY_PICKER_CODE;
        reject(err);
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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
          let errorMessage = "Failed to get your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
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
}

// Uses raw axios (no JWT) — banners are public; sending a stale token can cause 401
export const getStoreBanners = (storeId: number | string) =>
  axios.get<{ success: boolean; data: Banner[] }>(`${getApiUrl()}/stores/${storeId}/banners/`);

