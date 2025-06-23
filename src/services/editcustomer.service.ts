import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

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

export const editCustomerService = {
  async editCustomer(data: Partial<CustomerDetails>): Promise<CustomerDetails> {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.put(`${getApiUrl()}/auth/edit-customer`, data, {
        headers: {
          Authorization: token || "",
          "Content-Type": "application/json",
        },
      });

      return response.data.customer;
    } catch (error: unknown) {
      console.error("Error updating customer:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },
};
