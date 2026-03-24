import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/auth`
  : "";

export const authService = {
  /**
   * Sends OTP to the provided phone number
   */
  async sendOTP(phoneNumber: string) {
    try {
      if (!API_URL) {
        throw new Error("API base URL is not configured");
      }
      const response = await axios.post(
        `${API_URL}/send-otp/`,
        { phone: phoneNumber }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Verifies OTP. Backend returns access_token and refresh_token in the response body.
   */
  async verifyOTP(phoneNumber: string, otp: string) {
    try {
      const response = await axios.post(
        `${API_URL}/verify-otp/`,
        { phone: phoneNumber, otp }
      );

      if (response.data.success && response.data.data) {
        const { user, is_new_user, access_token, refresh_token } = response.data.data;

        // Save JWT tokens to localStorage
        if (access_token) {
          localStorage.setItem("access_token", access_token);
        }
        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
        }

        // Store non-sensitive user info for UI display
        localStorage.setItem("phoneNumber", phoneNumber);

        if (user) {
          if (user.full_name) {
            localStorage.setItem("userName", user.full_name);
          }
          if (user.id) {
            localStorage.setItem("userId", user.id.toString());
          }
        }

        return {
          success: true,
          message: response.data.message || "Number verified successfully",
          user,
          is_new_user: is_new_user || false,
          userExists: !is_new_user,
          userName: user?.full_name || `${user?.first_name} ${user?.last_name}` || phoneNumber,
        };
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Completes user onboarding by updating their profile
   */
  async completeOnboarding(
    firstName: string,
    lastName: string,
    gender: string,
    email: string
  ) {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const token = localStorage.getItem("access_token");
      const response = await axios.put(
        `${baseUrl}/users/me/update/`,
        {
          first_name: firstName,
          last_name: lastName,
          gender: gender.toLowerCase(),
          email,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.data.success) {
        const user = response.data.data?.user || response.data.data;
        return {
          success: true,
          message: response.data.message || "Profile updated successfully",
          customerId: user?.id,
          userName: user?.full_name || `${firstName} ${lastName}`,
          user,
        };
      }

      return {
        success: false,
        error: response.data.message || "Failed to update profile",
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error:
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Failed to complete onboarding",
        };
      }
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  },

  /**
   * Refreshes access token using the refresh token stored in localStorage.
   * Returns the new access token string so the interceptor can retry with it.
   */
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await axios.post(
        `${API_URL}/refresh/`,
        { refresh: refreshToken }
      );

      const newAccessToken = response.data.access || response.data.access_token || response.data.data?.access_token;
      if (newAccessToken) {
        localStorage.setItem("access_token", newAccessToken);
        // Some backends also rotate the refresh token
        const newRefreshToken = response.data.refresh || response.data.refresh_token || response.data.data?.refresh_token;
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }
        return newAccessToken;
      }

      throw new Error("No access token in refresh response");
    } catch (error: any) {
      // Clear all auth data on refresh failure — user must log in again
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("phoneNumber");
      localStorage.removeItem("userName");
      localStorage.removeItem("userId");
      throw error.response?.data || error;
    }
  },

  /**
   * Checks if user is currently authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem("access_token");
  },

  /**
   * Logs out user — clears all auth tokens and user info
   */
  async logout() {
    let apiResponse = null;

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/logout/`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data.success) {
        apiResponse = {
          success: true,
          message: response.data.message || "Logged out successfully",
        };
      } else {
        apiResponse = response.data;
      }
    } catch (error: any) {
      console.error("Logout API call failed:", error);
      apiResponse = {
        success: false,
        message:
          error.response?.data?.message ||
          "Logout API call failed, but local logout completed",
        error: error.response?.data || error,
      };
    }

    // Always clear all auth data regardless of API result
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("phoneNumber");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("gp_store_cart");
    localStorage.removeItem("gp_store_cart_delivery_info");
    window.dispatchEvent(new Event("tokenRemoved"));

    return apiResponse || {
      success: true,
      message: "Logged out successfully",
    };
  },
};
