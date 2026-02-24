import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { authService } from "./auth.service";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        // No refresh token, logout user
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        // Clear cart data when session expires
        localStorage.removeItem("gp_store_cart");
        localStorage.removeItem("gp_store_cart_delivery_info");
        // Dispatch event to notify cart context
        window.dispatchEvent(new Event('tokenRemoved'));
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await authService.refreshToken(refreshToken);
        const newToken = response.access_token;

        if (newToken) {
          // Update the token in localStorage
          localStorage.setItem("token", newToken);

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          // Process queued requests
          processQueue(null, newToken);
          isRefreshing = false;

          // Retry the original request
          return api(originalRequest);
        } else {
          throw new Error("No access token in refresh response");
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        // Clear cart data when session expires
        localStorage.removeItem("gp_store_cart");
        localStorage.removeItem("gp_store_cart_delivery_info");
        // Dispatch event to notify cart context
        window.dispatchEvent(new Event('tokenRemoved'));
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // For non-401 errors or if refresh already attempted, just reject
    return Promise.reject(error);
  }
);

export default api;
