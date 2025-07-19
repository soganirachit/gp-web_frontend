import axios from "axios";
import { getAddressesUrl, getPolygonUrl } from "../config/api.config";
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

// Point-in-polygon validation function
function isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>): boolean {
  const { lat, lng } = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
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

  async getPolygonData(): Promise<PolygonData> {
    try {
      const response = await axios.get(getPolygonUrl());
      const rawPoints = response.data.points;
      const points = Array.isArray(rawPoints)
        ? rawPoints.map((pt: any) =>
            Array.isArray(pt) ? { lat: pt[0], lng: pt[1] } : pt
          )
        : [];
      return { points };
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

      // Get polygon data
      const polygonData = await this.getPolygonData();
      
      if (!polygonData.points || polygonData.points.length === 0) {
        return { isValid: false, message: 'Delivery area not configured' };
      }

      // Check if point is inside polygon
      const isInside = isPointInPolygon({ lat, lng }, polygonData.points);
      
      return {
        isValid: isInside,
        message: isInside ? 'Address is within delivery area' : 'Address is outside delivery area'
      };
    } catch (error) {
      console.error('Error validating address:', error);
      return { isValid: false, message: 'Failed to validate address location' };
    }
  }
}

export const addressService = new AddressService();
