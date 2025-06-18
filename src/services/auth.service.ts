// Import axios for making HTTP requests
import axios from "axios";

// Base URL for authentication endpoints

const API_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/auth`
  : "";

// Authentication service object containing methods for auth operations
export const authService = {
  /**
   * Sends OTP to the provided phone number
   * @param phoneNumber - User's WhatsApp phone number
   * @returns Response data from the server
   * @throws Error if request fails
   */
  async sendOTP(phoneNumber: string) {
    try {
      console.log("API URL:", API_URL);
      if (!API_URL) {
        throw new Error("API base URL is not configured");
      }
      const response = await axios.post(`${API_URL}/send-otp`, {
        whatsappNumber: phoneNumber,
      });
      return response.data;
    } catch (error: any) {
      console.error("Send OTP Error:", error);
      throw error.response?.data || error;
    }
  },

  /**
   * Verifies OTP entered by user
   * @param phoneNumber - User's WhatsApp phone number
   * @param otp - One-time password entered by user
   * @returns Response data including auth token
   * @throws Error if verification fails
   */
  async verifyOTP(phoneNumber: string, otp: string) {
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, {
        whatsappNumber: phoneNumber,
        otp,
      });

      // Store the authentication token and phone number in localStorage if verification successful
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("phoneNumber", phoneNumber);
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Completes user onboarding by updating their full name
   * @param firstName - User's first name
   * @param lastName - User's last name
   * @param gender - User's gender
   * @param email - User's email address
   * @returns Response data from the server
   * @throws Error if token missing or request fails
   */

  async completeOnboarding(
    firstName: string,
    lastName: string,
    gender: string,
    email: string
  ) {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return {
          success: false,
          error: "Authentication token is not configured",
        };
      }

      const response = await axios.post(
        `${API_URL}/create-customer`,
        { firstName, lastName, gender, email },
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (
        response.data.message === "Full name updated successfully" ||
        response.data.message === "User created successfully" ||
        response.data.message === "Profile updated successfully"
      ) {
        return {
          success: true,
          message: response.data.message,
          customerId: response.data.customerId,
          userName: response.data.userName,
        };
      }

      return {
        success: false,
        error: response.data.message || "Failed to update name",
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to complete onboarding",
        };
      }
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  },

  // async completeOnboarding(
  //   firstName: string,
  //   lastName: string,
  //   gender: string,
  //   email: string
  // ) {
  //   try {
  //     const token = localStorage.getItem("token");

  //     if (!token) {
  //       return {
  //         success: false,
  //         error: "Authentication token is not configured",
  //       };
  //     }
  //     const response = await axios.post(
  //       `${API_URL}/create-customer`,
  //       { firstName, lastName, gender, email },
  //       {
  //         headers: {
  //           Authorization: token,
  //           "Content-Type": "application/json",
  //         },
  //       }
  //     );

  //     console.log("Onboarding response:", response);

  //     if (response.data.message === "Full name updated successfully") {
  //       return {
  //         success: true,
  //         message: "Full name updated successfully",
  //       };
  //     }

  //     return {
  //       success: false,
  //       error: response.data.message || "Failed to update name",
  //     };
  //   } catch (error) {
  //     if (axios.isAxiosError(error)) {
  //       return {
  //         success: false,
  //         error:
  //           error.response?.data?.message || "Failed to complete onboarding",
  //       };
  //     }
  //     return {
  //       success: false,
  //       error: "An unexpected error occurred",
  //     };
  //   }
  // },

  /**
   * Checks if user is currently authenticated
   * @returns Boolean indicating if valid token exists
   */
  isAuthenticated() {
    const token = localStorage.getItem("token");
    return !!token;
  },

  /**
   * Logs out user by removing stored auth data
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("phoneNumber");
    localStorage.removeItem("userName");
  },
};
