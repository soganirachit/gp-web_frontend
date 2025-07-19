import axios from "axios";
import { getAddressesUrl, getPolygonUrl, getApiUrl } from "../config/api.config";
import { headerService } from "./headers.service";

export interface Address {
  id: string;
  userId: string;
  houseNo: string;
  streetName: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  associatedPhoneNumber: string; // <-- changed
  isDefault: boolean;
  type: "Home" | "Work" | "Others";
  societyName?: string;
  district?: string;
  coordinates?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  houseNo: string;
  streetName: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  associatedPhoneNumber: string; // <-- changed
  societyName?: string;
  district?: string;
  coordinates?: string;
  type?: "Home" | "Work" | "Others";
  setAsDefault?: boolean;
}

export interface PolygonData {
  points: Array<{ lat: number; lng: number }>;
}



class AddressService {
  async getAllAddresses(): Promise<Address[]> {
    try {
      const response = await axios.get(getAddressesUrl(), {
        headers: headerService.getHeaders(),
      });

      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

  async getAddressById(id: string): Promise<Address> {
    try {
      const response = await axios.get(`${getAddressesUrl()}/${id}`, {
        headers: headerService.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

  async createAddress(addressInput: AddressInput): Promise<Address> {
    try {
      const response = await axios.post(getAddressesUrl(), addressInput, {
        headers: headerService.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

  async updateAddress(
    id: string,
    addressInput: Partial<AddressInput>
  ): Promise<Address> {
    try {
      const response = await axios.put(
        `${getAddressesUrl()}/${id}`,
        addressInput,
        {
          headers: headerService.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

  async deleteAddress(id: string): Promise<void> {
    try {
      await axios.delete(`${getAddressesUrl()}/${id}`, {
        headers: headerService.getHeaders(),
      });
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

  async setDefaultAddress(id: string): Promise<Address> {
    try {
      const response = await axios.put(
        `${getAddressesUrl()}/${id}/default`,
        {},
        {
          headers: headerService.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw headerService.handleError(error);
    }
  }

 
  async validateAddressInDeliveryArea(coordinates: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      const [lat, lng] = coordinates.split(',').map(Number);
      
      if (isNaN(lat) || isNaN(lng)) {
        return { isValid: false, message: 'Invalid coordinates format' };
      }

      // Use the new delivery zone check API
      const response = await axios.post(
        `${getApiUrl()}/polygon/check-delivery-zone`,
        {
          latitude: lat,
          longitude: lng
        },
        {
          headers: headerService.getHeaders(),
        }
      );

      const { isDeliverable, message } = response.data;
      
      return {
        isValid: isDeliverable,
        message: message || (isDeliverable ? 'Address is within delivery area' : 'Address is outside delivery area')
      };
    } catch (error) {
      console.error('Error validating address:', error);
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
