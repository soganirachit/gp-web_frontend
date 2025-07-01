import axios from 'axios';
import { getAddressesUrl } from '../config/api.config';
import {headerService} from './headers.service';
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
  type: 'Home' | 'Work' | 'Others';
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
  setAsDefault?: boolean;
  
}

class AddressService {

  async getAllAddresses(): Promise<Address[]> {
    try {
      const response = await axios.get(getAddressesUrl(), {
        headers: headerService.getHeaders(),
      });
      
      // Check if response has the expected structure
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
      const response = await axios.post(
        getAddressesUrl(),
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

  async updateAddress(id: string, addressInput: Partial<AddressInput>): Promise<Address> {
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
}

export const addressService = new AddressService();