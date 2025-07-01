import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/auth/fetch-customer`;

export interface CustomerDetails {
  id?: string;
  customerId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  gender: string;
  isPhoneNumberVerified: number;
}

export const customerService = {
  async getAllCustomers(): Promise<CustomerDetails[]> {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data && response.data.data) {
        return [response.data.data];
      }
      console.error("Unexpected response format:", response.data);
      return [];
    } catch (error: unknown) {
      console.error("Error fetching customers:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },
};




