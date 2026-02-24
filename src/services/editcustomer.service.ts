import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";
import { DjangoUser } from "./getcustomer.service";

export interface CustomerDetails {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: number;
  gender?: string;
  isPhoneNumberVerified: number;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phoneNumber?: number;
  gender?: string;
  date_of_birth?: string;
}

export const editCustomerService = {
  async editCustomer(data: UpdateProfileData): Promise<CustomerDetails> {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token not found");

    try {
      // Map frontend format to API format (phoneNumber not updatable)
      const apiData: Record<string, any> = {};
      if (data.firstName !== undefined) apiData.first_name = data.firstName;
      if (data.lastName !== undefined) apiData.last_name = data.lastName;
      if (data.emailAddress !== undefined) apiData.email = data.emailAddress;
      if (data.gender !== undefined) apiData.gender = data.gender.toLowerCase();
      if (data.date_of_birth !== undefined) apiData.date_of_birth = data.date_of_birth;

      const response = await axios.put(
        `${getApiUrl()}/users/me/update/`,
        apiData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || "Failed to update profile");
      }

      const user: DjangoUser = response.data.data;
      return {
        id: user.id.toString(),
        customerId: user.id.toString(),
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        emailAddress: user.email || "",
        phoneNumber: parseInt(user.phone?.replace(/\D/g, '') || '0') || 0,
        gender: user.gender || "",
        isPhoneNumberVerified: user.is_phone_verified ? 1 : 0,
      };
    } catch (error) {
      console.error("Error updating customer:", error);
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || error.message || "Failed to update profile");
      }
      throw error instanceof Error ? error : new Error("An unknown error occurred");
    }
  },
};
