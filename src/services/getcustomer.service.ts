import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/auth/fetch-customer`;

export interface CustomerDetails {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: number;
  gender: string;
  isPhoneNumberVerified: number;
}

export const customerService = {
  async getAllCustomers(): Promise<CustomerDetails[]> {
      const token = localStorage.getItem("token");
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: token || "",
        },
      });
      console.log("API response:", response.data); // Add this line for debugging
      // Ensure we're getting an array from the response
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.customer) {
        // If it's a single customer object, wrap it in an array
        return [response.data.customer];
      } else {
        console.error("Unexpected response format:", response.data);
        return [];
      }
    } catch (error: unknown) {
      console.error("Error fetching customers:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },
};


