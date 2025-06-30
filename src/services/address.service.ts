import axios from 'axios';
import { getAddressesUrl } from '../config/api.config';

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
  private getToken(): string {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please login to continue.');
    }
    return token;
  }

  private getHeaders() {
    try {
      const token = this.getToken();
      // Remove 'Bearer' prefix as it's already included in the stored token
      return {
        'Authorization': token,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      throw error;
    }
  }

  private handleError(error: any) {
    console.error('API Error:', error.response || error);
    
    if (error.response?.status === 401) {
      // Clear token and throw authentication error
      localStorage.removeItem('token');
      localStorage.removeItem('phoneNumber');
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Address not found.');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'An error occurred while processing your request.');
  }

  async getAllAddresses(): Promise<Address[]> {
    try {
      const response = await axios.get(getAddressesUrl(), {
        headers: this.getHeaders(),
      });
      
      // Check if response has the expected structure
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAddressById(id: string): Promise<Address> {
    try {
      const response = await axios.get(`${getAddressesUrl()}/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAddress(addressInput: AddressInput): Promise<Address> {
    try {
      const response = await axios.post(
        getAddressesUrl(),
        addressInput,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateAddress(id: string, addressInput: Partial<AddressInput>): Promise<Address> {
    try {
      const response = await axios.put(
        `${getAddressesUrl()}/${id}`,
        addressInput,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteAddress(id: string): Promise<void> {
    try {
      await axios.delete(`${getAddressesUrl()}/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setDefaultAddress(id: string): Promise<Address> {
    try {
      const response = await axios.put(
        `${getAddressesUrl()}/${id}/default`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const addressService = new AddressService();