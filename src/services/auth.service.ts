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
      const response = await axios.post(`${API_URL}/send-otp/`, {
        phone: phoneNumber,
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
      const response = await axios.post(`${API_URL}/verify-otp/`, {
        phone: phoneNumber,
        otp,
      });

      // Handle new Django API response structure: { success, message, data: { access_token, refresh_token, user, is_new_user } }
      if (response.data.success && response.data.data) {
        const { access_token, refresh_token, user, is_new_user } = response.data.data;
        
        // Store tokens and user info in localStorage
        if (access_token) {
          localStorage.setItem("token", access_token);
          localStorage.setItem("phoneNumber", phoneNumber);
        }
        
        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
        }

        // Store user info if available
        if (user) {
          if (user.full_name) {
            localStorage.setItem("userName", user.full_name);
          }
          if (user.id) {
            localStorage.setItem("userId", user.id.toString());
          }
        }

        // Return formatted response for backward compatibility
        return {
          success: true,
          message: response.data.message || "Number verified successfully",
          access_token,
          refresh_token,
          user,
          is_new_user: is_new_user || false,
          userExists: !is_new_user, // For backward compatibility
          userName: user?.full_name || user?.first_name + " " + user?.last_name || phoneNumber,
        };
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Completes user onboarding by updating their profile
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

      // New Django API endpoint: PUT /users/me/update/
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const response = await axios.put(
        `${baseUrl}/users/me/update/`,
        {
          first_name: firstName,
          last_name: lastName,
          gender: gender.toLowerCase(), // Convert to lowercase as per API
          email: email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle Django API response structure
      if (response.data.success) {
        const user = response.data.data?.user || response.data.data;
        return {
          success: true,
          message: response.data.message || "Profile updated successfully",
          customerId: user?.id,
          userName: user?.full_name || `${firstName} ${lastName}`,
          user: user,
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
            error.response?.data?.message || error.response?.data?.error || "Failed to complete onboarding",
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
   * Refreshes access token using refresh token
   * @param refreshToken - Refresh token (optional, will use stored token if not provided)
   * @returns New access token
   * @throws Error if refresh fails
   */
  async refreshToken(refreshToken?: string) {
    try {
      const token = refreshToken || localStorage.getItem("refresh_token");
      
      if (!token) {
        throw new Error("Refresh token not found");
      }

      const response = await axios.post(`${API_URL}/refresh/`, {
        refresh: token,
      });

      // Handle Django API response structure: { success, message, data: { access_token } }
      if (response.data.success && response.data.data) {
        const { access_token } = response.data.data;
        
        if (access_token) {
          localStorage.setItem("token", access_token);
          return {
            access_token,
            success: true,
            message: response.data.message || "Token refreshed successfully",
          };
        }
      }

      // Fallback for old response format (if any)
      if (response.data.access) {
        localStorage.setItem("token", response.data.access);
        if (response.data.refresh) {
          localStorage.setItem("refresh_token", response.data.refresh);
        }
        return {
          access_token: response.data.access,
          refresh_token: response.data.refresh,
        };
      }

      return response.data;
    } catch (error: any) {
      // If refresh fails, clear tokens
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      throw error.response?.data || error;
    }
  },

  /**
   * Checks if user is currently authenticated
   * @returns Boolean indicating if valid token exists
   */
  isAuthenticated() {
    const token = localStorage.getItem("token");
    return !!token;
  },

  /**
   * Logs out user by calling API and removing stored auth data
   * @returns Response with success status and message
   */
  async logout() {
    let apiResponse = null;
    const token = localStorage.getItem("token");
    
    // Call logout API endpoint if token exists
    if (token) {
      try {
        const response = await axios.post(
          `${API_URL}/logout/`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Handle Django API response structure: { success, message, data: null }
        if (response.data.success) {
          apiResponse = {
            success: true,
            message: response.data.message || "Logged out successfully",
          };
        } else {
          apiResponse = response.data;
        }
      } catch (error: any) {
        // Continue with local cleanup even if API call fails
        console.error("Logout API call failed:", error);
        apiResponse = {
          success: false,
          message: error.response?.data?.message || "Logout API call failed, but local logout completed",
          error: error.response?.data || error,
        };
      }
    }
    
    // Always clear local storage regardless of API call result
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("phoneNumber");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    // Clear cart data on logout
    localStorage.removeItem("gp_store_cart");
    localStorage.removeItem("gp_store_cart_delivery_info");
    // Dispatch event to notify cart context
    window.dispatchEvent(new Event('tokenRemoved'));

    // Return success if no token was present (already logged out) or if API call succeeded
    return apiResponse || {
      success: true,
      message: "Logged out successfully",
    };
  },
};
