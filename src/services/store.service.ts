import axios, { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";

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
        return response.data.data;
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
        reject(new Error("Geolocation is not supported by your browser"));
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
            const nearestStore = await this.getNearestStore(latitude, longitude);
            
            if (nearestStore) {
              this.setTemporaryStoreId(nearestStore.id);
              resolve(nearestStore.id);
            } else {
              // If no nearest store, try to get all stores and use the first one
              const stores = await this.getAllStores(latitude, longitude);
              if (stores.length > 0) {
                this.setTemporaryStoreId(stores[0].id);
                resolve(stores[0].id);
              } else {
                reject(new Error("No stores available in your area"));
              }
            }
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
          reject(new Error(errorMessage));
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

