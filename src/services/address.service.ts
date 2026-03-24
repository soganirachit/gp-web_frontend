import { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";
import { toIndianE164 } from "../utils/phoneDisplay";

// API Address structure (from Django backend)
interface ApiAddress {
  id?: number;
  user_id?: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  pincode?: string;
  address_type?: "home" | "work" | "other";
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  latitude?: number | string;
  longitude?: number | string;
  receiver_name?: string;
  receiver_phone?: string;
  landmark?: string;
}

// Frontend Address interface (for backward compatibility)
export interface Address {
  id: string;
  userId: string;
  name?: string;
  houseNo: string;
  streetName: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  associatedPhoneNumber: string;
  isDefault: boolean;
  type: "Home" | "Work" | "Others" | string; // Allow custom type names (e.g., "College", "Friend")
  societyName?: string;
  district?: string;
  coordinates?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  name?: string;
  houseNo: string;
  streetName: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  associatedPhoneNumber: string;
  societyName?: string;
  district?: string;
  coordinates?: string;
  type?: "Home" | "Work" | "Others" | string; // Allow custom type names (e.g., "friends")
  setAsDefault?: boolean;
}

const API_URL = `${getApiUrl()}/users/addresses`;

// Helper: Convert API address to frontend format
const mapApiToFrontend = (apiAddr: ApiAddress): Address => {
  // Handle latitude and longitude - they can be number or string
  const lat = apiAddr.latitude !== undefined && apiAddr.latitude !== null 
    ? (typeof apiAddr.latitude === 'string' ? parseFloat(apiAddr.latitude) : apiAddr.latitude)
    : null;
  const lng = apiAddr.longitude !== undefined && apiAddr.longitude !== null
    ? (typeof apiAddr.longitude === 'string' ? parseFloat(apiAddr.longitude) : apiAddr.longitude)
    : null;
  
  // Map address_type to capitalized type (API can return "other" or "others")
  const typeMap: Record<string, "Home" | "Work" | "Others"> = {
    home: "Home",
    work: "Work",
    other: "Others",  // API returns "other" (singular)
    others: "Others"  // Handle both for backward compatibility
  };

  // Handle pincode - can be in postal_code or pincode field
  const pincode = apiAddr.pincode || apiAddr.postal_code || "";

  // Filter out "unknown" or "Unknown" values for city and state
  const city = apiAddr.city && apiAddr.city.toLowerCase() !== 'unknown' ? apiAddr.city : "";
  const state = apiAddr.state && apiAddr.state.toLowerCase() !== 'unknown' ? apiAddr.state : "";

  // Determine the type: if it's in the typeMap, use the mapped value
  // Otherwise, preserve the custom value from the API (capitalize first letter for display)
  let addressType: string;
  if (apiAddr.address_type) {
    const lowerType = apiAddr.address_type.toLowerCase();
    if (typeMap[lowerType]) {
      addressType = typeMap[lowerType];
    } else {
      // Preserve custom type, capitalize first letter for display
      addressType = apiAddr.address_type.charAt(0).toUpperCase() + apiAddr.address_type.slice(1).toLowerCase();
    }
  } else {
    addressType = "Home";
  }

  return {
    id: (apiAddr.id !== undefined && apiAddr.id !== null) ? apiAddr.id.toString() : "",
    userId: (apiAddr.user_id !== undefined && apiAddr.user_id !== null) ? apiAddr.user_id.toString() : "",
    name: apiAddr.receiver_name || "",
    houseNo: apiAddr.address_line1 || "",
    streetName: apiAddr.address_line2 || "",
    area: apiAddr.landmark || apiAddr.address_line2 || "",
    city: city,
    state: state,
    pincode: pincode,
    isDefault: apiAddr.is_default || false,
    type: addressType,
    coordinates: lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) ? `${lat},${lng}` : undefined,
    createdAt: apiAddr.created_at || "",
    updatedAt: apiAddr.updated_at || "",
    associatedPhoneNumber: apiAddr.receiver_phone || "",
  };
};

// Helper: Convert frontend format to API format
const mapFrontendToApi = (input: AddressInput): Record<string, any> => {
  // Map frontend type to API type (API expects "other" not "others")
  const typeMap: Record<string, string> = {
    "Home": "home",
    "Work": "work",
    "Others": "other"  // API expects "other" (singular), not "others"
  };
  
  // Normalize the type: trim whitespace and handle case
  const normalizedType = input.type ? input.type.trim() : "";
  
  // If type is one of the predefined ones, use the mapped value
  // Otherwise, send the custom value directly (backend accepts custom values but validation may be inconsistent)
  // Normalize custom values: capitalize first letter, lowercase rest for consistency
  let apiType: string;
  if (typeMap[normalizedType]) {
    apiType = typeMap[normalizedType];
  } else if (normalizedType) {
    // For custom types, send as-is (backend accepts them, though validation may be inconsistent)
    // Keep the original casing as the backend might be case-sensitive
    apiType = normalizedType;
  } else {
    apiType = "home";
  }

  const apiData: Record<string, any> = {
    address_line1: input.houseNo || "",
    address_line2: input.streetName || input.area || "",
    city: input.city || "",
    state: input.state || "",
    pincode: input.pincode || "",
    address_type: apiType,
    is_default: input.setAsDefault || false,
  };

  // Add receiver_name and receiver_phone if provided
  if (input.name) {
    apiData.receiver_name = input.name;
  }
  if (input.associatedPhoneNumber) {
    apiData.receiver_phone = toIndianE164(String(input.associatedPhoneNumber));
  }

  // Add landmark if provided
  if (input.area) {
    apiData.landmark = input.area;
  }

  // Add coordinates if available
  // Round to 7 decimal places to ensure max 10 digits total (including decimal point)
  if (input.coordinates) {
    const [lat, lng] = input.coordinates.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      // Round to 7 decimal places to ensure coordinates don't exceed 10 digits total
      apiData.latitude = Math.round(lat * 10000000) / 10000000;
      apiData.longitude = Math.round(lng * 10000000) / 10000000;
    }
  }

  return apiData;
};


class AddressService {
  async getAllAddresses(): Promise<Address[]> {
    try {
      const response = await api.get(`${API_URL}/`);

      // Handle API response: { success, message, data: [addresses] }
      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data.map(mapApiToFrontend);
      }
      return [];
    } catch (error) {
      console.error("Error fetching addresses:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch addresses");
      }
      throw error;
    }
  }

  async getAddressById(id: string): Promise<Address> {
    try {
      const response = await api.get(`${API_URL}/${id}/`);

      if (response.data.success && response.data.data) {
        return mapApiToFrontend(response.data.data);
      }
      throw new Error(response.data.message || "Address not found");
    } catch (error) {
      console.error("Error fetching address:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to fetch address");
      }
      throw error;
    }
  }

  async createAddress(addressInput: AddressInput): Promise<Address> {
    try {
      const apiData = mapFrontendToApi(addressInput);
      const response = await api.post(`${API_URL}/`, apiData);

      if (response.data.success && response.data.data) {
        return mapApiToFrontend(response.data.data);
      }
      throw new Error(response.data.message || "Failed to create address");
    } catch (error) {
      console.error("Error creating address:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to create address");
      }
      throw error;
    }
  }

  async updateAddress(id: string, addressInput: Partial<AddressInput>): Promise<Address> {
    try {
      // Build the full API payload then strip keys that were not provided.
      // Sending only the changed fields via PATCH (partial update).
      const fullApiData = mapFrontendToApi(addressInput as AddressInput);
      const apiData: Record<string, any> = {};
      Object.entries(fullApiData).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          apiData[key] = value;
        }
      });
      const response = await api.patch(`${API_URL}/${id}/`, apiData);

      if (response.data.success && response.data.data) {
        return mapApiToFrontend(response.data.data);
      }
      throw new Error(response.data.message || "Failed to update address");
    } catch (error) {
      console.error("Error updating address:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to update address");
      }
      throw error;
    }
  }

  async deleteAddress(id: string): Promise<void> {
    try {
      const response = await api.delete(`${API_URL}/${id}/`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to delete address");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to delete address");
      }
      throw error;
    }
  }

  async setDefaultAddress(id: string): Promise<Address> {
    try {
      const response = await api.post(`${API_URL}/${id}/set-default/`, {});

      if (response.data.success && response.data.data) {
        return mapApiToFrontend(response.data.data);
      }
      throw new Error(response.data.message || "Failed to set default address");
    } catch (error) {
      console.error("Error setting default address:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to set default address");
      }
      throw error;
    }
  }


  async validateAddressInDeliveryArea(coordinates: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      const [lat, lng] = coordinates.split(',').map(Number);

      if (isNaN(lat) || isNaN(lng)) {
        return { isValid: false, message: 'Invalid coordinates format' };
      }

      const response = await api.post(
        `${getApiUrl()}/stores/validate-coverage/`,
        { latitude: lat, longitude: lng }
      );

      // Handle API response structure: { success, message, data: { serviceable, reason, nearest_store, distance_km, store, zone } }
      const isServiceable = response.data.success && response.data.data?.serviceable === true;
      const message = response.data.message || response.data.data?.reason || 
        (isServiceable ? 'Address is within delivery area' : 'Address is outside delivery area');

      return {
        isValid: isServiceable,
        message: message
      };
    } catch (error) {
      console.error('Error validating address:', error);
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.response?.data?.data?.reason || 'Failed to validate address location';
        return { isValid: false, message: errorMessage };
      }
      return { isValid: false, message: 'Failed to validate address location' };
    }
  }

  // Helper method to validate coordinates format
  validateCoordinatesFormat(coordinates: string): boolean {
    const [lat, lng] = coordinates.split(',').map(Number);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  // Method to validate address before saving
  async validateAddressBeforeSave(addressInput: AddressInput): Promise<{ isValid: boolean; message?: string }> {
    if (!addressInput.coordinates) {
      return { isValid: false, message: 'Coordinates are required for address validation' };
    }

    if (!this.validateCoordinatesFormat(addressInput.coordinates)) {
      return { isValid: false, message: 'Invalid coordinates format' };
    }

    return await this.validateAddressInDeliveryArea(addressInput.coordinates);
  }
}

export const addressService = new AddressService();
