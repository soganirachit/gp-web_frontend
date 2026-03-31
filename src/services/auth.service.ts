import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/auth`
  : "";

/** WhatsApp delivery outcome from POST /auth/send-otp/ (customer app). */
export type WhatsappOtpStatus =
  | "sent"
  | "not_on_whatsapp"
  | "failed"
  | "not_configured"
  | (string & {});

export interface SendOtpResult {
  /** Mirrors API `success`; false means do not treat as a normal send. */
  success: boolean;
  message: string;
  phone?: string;
  whatsapp_status?: WhatsappOtpStatus;
  /** When omitted by older APIs, callers may treat delivery as unknown / ok. */
  whatsapp_delivered?: boolean;
}

function normalizeSendOtpResponse(body: unknown): SendOtpResult {
  const b = body as Record<string, unknown> | null;
  const data = (b?.data as Record<string, unknown> | undefined) ?? {};
  const whatsapp_status = data.whatsapp_status as WhatsappOtpStatus | undefined;
  const whatsapp_delivered =
    typeof data.whatsapp_delivered === "boolean" ? data.whatsapp_delivered : undefined;
  return {
    success: b?.success !== false,
    message: (typeof b?.message === "string" && b.message) || "OTP sent successfully",
    phone: typeof data.phone === "string" ? data.phone : undefined,
    whatsapp_status,
    whatsapp_delivered,
  };
}

/** User cannot receive OTP on WhatsApp — do not advance to OTP entry. */
export function shouldBlockOtpEntryAfterSendOtp(result: SendOtpResult): boolean {
  return result.whatsapp_status === "not_on_whatsapp";
}

/**
 * For OTP screen copy: false when WhatsApp delivery failed, dev, or explicitly not delivered.
 * Legacy responses (no status) → true.
 */
export function whatsappOtpLikelyDelivered(result: SendOtpResult): boolean {
  if (shouldBlockOtpEntryAfterSendOtp(result)) return false;
  if (result.whatsapp_status === "failed" || result.whatsapp_status === "not_configured") return false;
  if (result.whatsapp_delivered === false) return false;
  if (result.whatsapp_delivered === true) return true;
  if (result.whatsapp_status === "sent") return true;
  return true;
}

/** Parsed GET /auth/otp-delivery-status/ payload (under `data`). */
export interface OtpDeliveryStatusData {
  not_on_whatsapp: boolean;
  wa_delivery_status?: string;
  message?: string;
}

function normalizeOtpDeliveryStatusBody(body: unknown): OtpDeliveryStatusData {
  const b = body as Record<string, unknown> | null | undefined;
  let d = (b?.data as Record<string, unknown>) ?? {};
  if (d && typeof (d as { data?: unknown }).data === "object" && (d as { data?: unknown }).data !== null) {
    d = (d as { data: Record<string, unknown> }).data;
  }
  return {
    not_on_whatsapp: d.not_on_whatsapp === true,
    wa_delivery_status: typeof d.wa_delivery_status === "string" ? d.wa_delivery_status : undefined,
    message: typeof b?.message === "string" ? b.message : undefined,
  };
}

const OTP_DELIVERY_POLL_INTERVAL_MS = 3000;
const OTP_DELIVERY_POLL_MAX_ATTEMPTS = 5;

export type OtpDeliveryPollCallbacks = {
  onNotOnWhatsapp?: (message?: string) => void;
  onDelivered?: () => void;
  /** Fired after 5 polls (~15s) without `delivered` or `not_on_whatsapp`. */
  onGiveUp?: () => void;
};

export const authService = {
  /**
   * Sends OTP to the provided phone number.
   * Parses `data.whatsapp_status` / `data.whatsapp_delivered` when present.
   */
  async sendOTP(phoneNumber: string): Promise<SendOtpResult> {
    try {
      if (!API_URL) {
        throw new Error("API base URL is not configured");
      }
      const response = await axios.post(`${API_URL}/send-otp/`, { phone: phoneNumber });
      return normalizeSendOtpResponse(response.data);
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Latest WhatsApp delivery flags for an OTP send (used by polling or diagnostics).
   */
  async getOtpDeliveryStatus(phone: string): Promise<OtpDeliveryStatusData> {
    if (!API_URL) {
      throw new Error("API base URL is not configured");
    }
    const response = await axios.get(`${API_URL}/otp-delivery-status/`, {
      params: { phone },
    });
    return normalizeOtpDeliveryStatusBody(response.data);
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

/**
 * Poll GET /auth/otp-delivery-status/?phone= every 3s, up to 5 times (~15s).
 * First request runs after 3s. Returns `stop` — call on unmount or after OTP verify.
 */
export function startOtpDeliveryPolling(phone: string, callbacks: OtpDeliveryPollCallbacks = {}): () => void {
  if (!API_URL || !phone) {
    return () => {};
  }

  let attempts = 0;
  let stopped = false;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    stopped = true;
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const run = async () => {
    if (stopped) return;
    attempts += 1;
    try {
      const status = await authService.getOtpDeliveryStatus(phone);
      if (stopped) return;

      if (status.not_on_whatsapp) {
        stop();
        callbacks.onNotOnWhatsapp?.(status.message);
        return;
      }
      if (status.wa_delivery_status === "delivered") {
        stop();
        callbacks.onDelivered?.();
        return;
      }
    } catch (e) {
      console.warn("otp-delivery-status poll failed", e);
    }

    if (attempts >= OTP_DELIVERY_POLL_MAX_ATTEMPTS) {
      stop();
      callbacks.onGiveUp?.();
    }
  };

  intervalId = setInterval(() => {
    void run();
  }, OTP_DELIVERY_POLL_INTERVAL_MS);

  return stop;
}
