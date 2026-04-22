import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { authService } from "./auth.service";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Many services pass `${getApiUrl()}/cart` while `baseURL` is already `getApiUrl()`.
 * Axios would merge to `/api/v1/api/v1/cart` → 404. Strip the duplicate base path.
 */
function stripDuplicateBaseUrlPath(config: InternalAxiosRequestConfig) {
  const base = String(config.baseURL ?? "").replace(/\/+$/, "");
  const raw = config.url;
  if (!base || raw == null || raw === "") return;
  const url = String(raw);
  if (/^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)) return;

  if (url === base) {
    config.url = "/";
    return;
  }
  if (url.startsWith(`${base}/`)) {
    const rest = url.slice(base.length);
    config.url = rest.startsWith("/") ? rest : `/${rest}`;
  }
}

/**
 * Axios 1.x sets `defaults.adapter` to `['xhr','http','fetch']`, not a function.
 * Without resolving it, GET dedupe never enabled (was always broken in this app).
 */
function getUnderlyingAxiosAdapter():
  | ((config: InternalAxiosRequestConfig) => Promise<AxiosResponse>)
  | null {
  const raw = axios.defaults.adapter as unknown;
  if (typeof raw === "function") {
    return raw as (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
  }
  if (raw != null && typeof axios.getAdapter === "function") {
    try {
      return axios.getAdapter(raw as never) as (
        config: InternalAxiosRequestConfig
      ) => Promise<AxiosResponse>;
    } catch {
      return null;
    }
  }
  return null;
}

const underlyingAxiosAdapter = getUnderlyingAxiosAdapter();

/** Coalesce concurrent identical GET/HEAD calls (Strict Mode, duplicate effects, multiple subscribers). */
const dedupeGetsEnabled =
  import.meta.env.VITE_API_DEDUPE_GETS !== "false" &&
  underlyingAxiosAdapter != null;

const inflightIdempotent = new Map<string, Promise<AxiosResponse>>();

function dedupeKeyForConfig(config: InternalAxiosRequestConfig): string | null {
  const method = (config.method || "get").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const h = config.headers;
  const skip =
    (typeof (h as { get?: (k: string) => string })?.get === "function"
      ? (h as { get: (k: string) => string }).get("X-Skip-Request-Dedupe")
      : (h as Record<string, unknown>)?.["X-Skip-Request-Dedupe"]) != null;
  if (skip) return null;
  try {
    return `${method} ${axios.getUri(config)}`;
  } catch {
    return null;
  }
}

function withCallerConfig(
  res: AxiosResponse,
  cfg: InternalAxiosRequestConfig,
): AxiosResponse {
  return { ...res, config: cfg };
}

// Track if we're currently refreshing to avoid multiple parallel refresh calls
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

// Request interceptor — attach Bearer token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    // FormData: let the browser set multipart boundary (default instance has application/json)
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      const h = config.headers;
      if (h && typeof (h as { delete?: (k: string) => void }).delete === "function") {
        (h as { delete: (k: string) => void }).delete("Content-Type");
        (h as { delete: (k: string) => void }).delete("content-type");
      } else if (h && typeof h === "object") {
        delete (h as Record<string, unknown>)["Content-Type"];
        delete (h as Record<string, unknown>)["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor — share one in-flight GET/HEAD per URL (after auth header is set).
// Adapter runs only when dispatch runs (after transforms), not inside the interceptor.
api.interceptors.request.use(
  (config) => {
    if (!dedupeGetsEnabled) return config;
    const key = dedupeKeyForConfig(config);
    if (!key) return config;

    config.adapter = (cfg) => {
      let shared = inflightIdempotent.get(key);
      if (!shared) {
        shared = underlyingAxiosAdapter!(cfg).finally(() => {
          inflightIdempotent.delete(key);
        });
        inflightIdempotent.set(key, shared);
      }
      return shared.then((res) => withCallerConfig(res, cfg));
    };
    return config;
  },
  (error) => Promise.reject(error)
);

// Runs first (Axios request interceptors are LIFO) so URLs are correct for dedupe + dispatch.
api.interceptors.request.use(
  (config) => {
    stripDuplicateBaseUrlPath(config);
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — on 401, refresh the access token and retry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await authService.refreshToken();
        processQueue(null, newToken);
        isRefreshing = false;
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // Clear all auth data and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        localStorage.removeItem("gp_store_cart");
        localStorage.removeItem("gp_store_cart_delivery_info");
        window.dispatchEvent(new Event("tokenRemoved"));
        {
          const p = typeof window !== "undefined" ? window.location.pathname : "";
          const loginPath = p.startsWith("/gp-daily") ? "/gp-daily/login" : "/gp-store/login";
          window.location.href = loginPath;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
