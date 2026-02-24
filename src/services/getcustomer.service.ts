import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/users/me/`;

// Django API User structure
export interface DjangoUser {
  id: number;
  phone: string;
  email: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_image: string | null;
  role: string;
  date_of_birth: string | null;
  gender: string;
  language_preference: string;
  notification_enabled: boolean;
  whatsapp_updates: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  addresses: any[];
  preferences?: {
    id: number;
    push_notifications: boolean;
    sms_notifications: boolean;
    whatsapp_notifications: boolean;
    email_notifications: boolean;
    preferred_delivery_time: string;
    delivery_instructions: string;
    marketing_emails: boolean;
    promotional_notifications: boolean;
    created_at: string;
    updated_at: string;
  };
  created_at: string;
  updated_at: string;
  last_login: string | null;
  login_count: number;
}

// Legacy interface for backward compatibility
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
  /**
   * Get current user profile from Django API
   * @returns CustomerDetails array (legacy format) for backward compatibility
   */
  async getAllCustomers(): Promise<CustomerDetails[]> {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle Django API response structure: { success, message, data: { user object } }
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Failed to fetch customer data");
      }

      const user: DjangoUser = response.data.data;

      // Map Django user structure to legacy CustomerDetails format
      const customerDetails: CustomerDetails = {
        id: user.id?.toString(),
        customerId: user.id?.toString() || "",
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        emailAddress: user.email || "",
        phoneNumber: user.phone || "",
        gender: user.gender || "",
        isPhoneNumberVerified: user.is_phone_verified ? 1 : 0,
      };

      return [customerDetails];
    } catch (error: unknown) {
      console.error("Error fetching customer:", error);
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch customer data";
        throw new Error(errorMessage);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  /**
   * Get current user profile (returns Django user structure)
   * @returns DjangoUser object
   */
  async getCurrentUser(): Promise<DjangoUser> {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle Django API response structure: { success, message, data: { user object } }
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Failed to fetch user data");
      }

      return response.data.data;
    } catch (error: unknown) {
      console.error("Error fetching current user:", error);
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch user data";
        throw new Error(errorMessage);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },
};




