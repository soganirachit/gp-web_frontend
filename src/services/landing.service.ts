import api from "./api";
import { getApiUrl } from "../config/api.config";

export interface LandingCustomerReview {
  name: string;
  rating: number;
  review: string;
}

export interface LandingFlowerWisdom {
  image_url: string | null;
}

type ApiListPayload = {
  success?: boolean;
  data?: unknown;
};

function landingApiBase(): string {
  const base = getApiUrl().replace(/\/+$/, "");
  if (base.includes("/api/v1")) {
    return `${base}/landing`;
  }
  return `${base}/api/v1/landing`;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiListPayload;
    if (Array.isArray(wrapped.data)) return wrapped.data;
  }
  return [];
}

function unwrapObject(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const wrapped = payload as ApiListPayload;
    if (wrapped.data && typeof wrapped.data === "object" && !Array.isArray(wrapped.data)) {
      return wrapped.data as Record<string, unknown>;
    }
    return payload as Record<string, unknown>;
  }
  return null;
}

function normalizeReview(raw: unknown): LandingCustomerReview | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? row.customer_name ?? "").trim();
  const review = String(row.review ?? row.comment ?? "").trim();
  const ratingRaw = Number(row.rating);
  const rating = Number.isFinite(ratingRaw)
    ? Math.min(5, Math.max(0, Math.round(ratingRaw)))
    : 0;
  if (!name && !review) return null;
  return { name: name || "Customer", rating, review };
}

class LandingService {
  async getCustomerReviews(): Promise<LandingCustomerReview[]> {
    try {
      const response = await api.get<unknown>(
        `${landingApiBase()}/customer-reviews/`,
      );
      return unwrapList(response.data)
        .map(normalizeReview)
        .filter((r): r is LandingCustomerReview => r != null);
    } catch (error) {
      console.error("Error fetching customer reviews:", error);
      return [];
    }
  }

  async getFlowerWisdom(): Promise<LandingFlowerWisdom> {
    try {
      const response = await api.get<unknown>(
        `${landingApiBase()}/flower-wisdom/`,
      );
      const row = unwrapObject(response.data);
      const imageUrl = row?.image_url ?? row?.image;
      return {
        image_url:
          typeof imageUrl === "string" && imageUrl.trim().length > 0
            ? imageUrl.trim()
            : null,
      };
    } catch (error) {
      console.error("Error fetching flower wisdom:", error);
      return { image_url: null };
    }
  }
}

export const landingService = new LandingService();
