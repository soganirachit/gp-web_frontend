import { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";
import { DjangoUser } from "./getcustomer.service";
import { phoneDigitsAsNumber } from "../utils/phoneDisplay";

const USERS_ME_URL = `${getApiUrl()}/users/me/`;

export interface CustomerDetails {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: number;
  gender?: string;
  isPhoneNumberVerified: number;
  profileImageUrl?: string | null;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  phoneNumber?: number;
  gender?: string;
  date_of_birth?: string;
  /** Send as multipart field `profile_image` on PATCH /users/me/ */
  profileImage?: File | null;
  clearProfileImage?: boolean;
}

function mapUserToCustomerDetails(user: DjangoUser): CustomerDetails {
  return {
    id: user.id.toString(),
    customerId: user.id.toString(),
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    emailAddress: user.email || "",
    phoneNumber: phoneDigitsAsNumber(user.phone),
    gender: user.gender || "",
    isPhoneNumberVerified: user.is_phone_verified ? 1 : 0,
    profileImageUrl: user.profile_image,
  };
}

function parseProfileResponse(data: unknown): DjangoUser {
  const body = data as { success?: boolean; message?: string; data?: DjangoUser };
  if (!body?.success || !body.data) {
    throw new Error(body?.message || "Failed to update profile");
  }
  return body.data;
}

export const editCustomerService = {
  /**
   * Update profile via PATCH /users/me/.
   * Text-only: JSON body. With image: multipart/form-data (`profile_image` file field).
   */
  async editCustomer(data: UpdateProfileData): Promise<CustomerDetails> {
    try {
      const hasImageFile = data.profileImage instanceof File;
      const useMultipart = hasImageFile || Boolean(data.clearProfileImage);

      if (useMultipart) {
        const formData = new FormData();
        if (data.firstName !== undefined) formData.append("first_name", data.firstName);
        if (data.lastName !== undefined) formData.append("last_name", data.lastName);
        if (data.emailAddress !== undefined) {
          formData.append("email", data.emailAddress);
        }
        if (data.gender !== undefined) {
          formData.append("gender", data.gender.toLowerCase());
        }
        if (data.date_of_birth !== undefined) {
          formData.append("date_of_birth", data.date_of_birth);
        }
        if (data.profileImage) {
          formData.append("profile_image", data.profileImage);
        }
        if (data.clearProfileImage) {
          formData.append("clear_profile_image", "true");
        }

        const response = await api.patch(USERS_ME_URL, formData);
        return mapUserToCustomerDetails(parseProfileResponse(response.data));
      }

      const apiData: Record<string, string> = {};
      if (data.firstName !== undefined) apiData.first_name = data.firstName;
      if (data.lastName !== undefined) apiData.last_name = data.lastName;
      if (data.emailAddress !== undefined) apiData.email = data.emailAddress;
      if (data.gender !== undefined) apiData.gender = data.gender.toLowerCase();
      if (data.date_of_birth !== undefined) apiData.date_of_birth = data.date_of_birth;

      const response = await api.patch(USERS_ME_URL, apiData);
      return mapUserToCustomerDetails(parseProfileResponse(response.data));
    } catch (error) {
      console.error("Error updating customer:", error);
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.message;
        const fieldErrors = error.response?.data?.errors;
        if (typeof detail === "string" && detail) {
          throw new Error(detail);
        }
        if (fieldErrors && typeof fieldErrors === "object") {
          const first = Object.values(fieldErrors).flat()[0];
          if (typeof first === "string") throw new Error(first);
        }
        throw new Error(error.message || "Failed to update profile");
      }
      throw error instanceof Error ? error : new Error("An unknown error occurred");
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    try {
      const apiUrl = getApiUrl();
      const deleteAccountUrl = `${apiUrl}/users/me/delete-account/`;

      const response = await api.post(deleteAccountUrl, {});

      if (response.data.success || response.status === 200) {
        return {
          success: true,
          message: response.data.message || "Account deleted successfully",
        };
      }

      throw new Error(response.data.message || "Failed to delete account");
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.message || error.message || "Failed to delete account",
        );
      }
      throw error instanceof Error ? error : new Error("An unknown error occurred");
    }
  },
};
