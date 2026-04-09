/**
 * Subscription APIs — aligned with Postman "10 - Subscriptions"
 * Base: {VITE_API_BASE_URL}/subscriptions/
 */

import api from "./api";
import { getSubscriptionsUrl } from "../config/api.config";

const base = () => getSubscriptionsUrl();

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    const inner = o.data as Record<string, unknown> | undefined;
    if (inner && typeof inner === "object") {
      if (Array.isArray(inner.results)) return inner.results;
      if (Array.isArray(inner.subscriptions)) return inner.subscriptions;
    }
  }
  return [];
}

function mapSubscriptionFromApi(raw: Record<string, unknown>): Subscription {
  const plan =
    (raw.plan as Record<string, unknown> | undefined) ||
    (raw.plan_details as Record<string, unknown> | undefined) ||
    (raw.product as Record<string, unknown> | undefined);

  const images =
    (plan?.images_url as string[] | undefined) ||
    (plan?.imagesUrl as string[] | undefined) ||
    (plan?.image_url ? [String(plan.image_url)] : undefined);

  return {
    id: String(raw.id ?? ""),
    customerId: String(raw.customer_id ?? raw.customerId ?? ""),
    type: String(raw.subscription_type ?? raw.type ?? "DAILY").toUpperCase() as
      | "DAILY"
      | "CUSTOM",
    selectedDays: (raw.selected_days ??
      raw.delivery_days ??
      raw.selectedDays ??
      []) as string[],
    startDate: raw.start_date
      ? new Date(String(raw.start_date))
      : raw.startDate
        ? new Date(String(raw.startDate))
        : new Date(),
    endDate: raw.end_date
      ? new Date(String(raw.end_date))
      : raw.endDate
        ? new Date(String(raw.endDate))
        : undefined,
    status: String(raw.status ?? "ACTIVE").toUpperCase() as Subscription["status"],
    basePackId: String(raw.plan_id ?? raw.base_pack_id ?? raw.basePackId ?? ""),
    basePackDetails: raw.base_pack_details as Subscription["basePackDetails"],
    deliveryAddress: raw.delivery_address as Subscription["deliveryAddress"],
    amount: typeof raw.amount === "number" ? raw.amount : Number(raw.amount ?? raw.price) || undefined,
    createdAt: raw.created_at
      ? new Date(String(raw.created_at))
      : new Date(),
    productDetails: plan
      ? {
          name: String(plan.name ?? ""),
          description: String(plan.description ?? ""),
          imagesUrl: images ?? [],
          contents: Array.isArray(plan.contents)
            ? (plan.contents as Array<{ id: string; name: string; quantity: number }>)
            : [],
        }
      : (raw.product_details as Subscription["productDetails"]),
  };
}

// Response interfaces
export interface Subscription {
  id: string;
  customerId: string;
  type: "DAILY" | "CUSTOM";
  selectedDays: string[];
  startDate: Date;
  endDate?: Date;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "INACTIVE";
  basePackId: string;
  basePackDetails?: {
    name: string;
    description: string;
    imageUrl?: string;
    contents: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
  };
  deliveryAddress?: {
    id: string;
    houseNo: string;
    streetName: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    phoneNumber: string;
    societyName?: string;
    district?: string;
    isDefault: boolean;
  };
  amount?: number;
  createdAt: Date;
  productDetails?: {
    name: string;
    description: string;
    imagesUrl: string[];
    contents: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
  };
}

export interface SubscriptionInitiateResponse {
  success: boolean;
  message: string;
  subscriptionId?: string;
  amount?: number;
  details?: {
    id: string;
    type: "DAILY" | "CUSTOM";
    startDate: string;
    status: string;
  };
  nextStep?: string;
  error?: string;
}

export interface SubscriptionConfirmResponse {
  success: boolean;
  message?: string;
  subscription?: any;
  error?: string;
}

// Input interfaces
export interface SubscriptionInitiateRequest {
  basePackId: string;
  type: "Daily" | "custom" | "DAILY" | "CUSTOM";
  startDate: Date;
  days: number;
  selectedDays?: string[];
}

export interface SubscriptionConfirmRequest {
  basePackId: string;
  deliveryAddressId: string;
  type: "Daily" | "custom" | "DAILY" | "CUSTOM";
  startDate: Date;
  selectedDays: string[];
  /** Packs per delivery; must be a positive integer (defaults to 1). */
  quantity?: number;
}

/** Short labels (MON) and full names → API full weekday names. */
function normalizeDeliveryDayNames(days: string[]): string[] {
  const shortToFull: Record<string, string> = {
    MON: "MONDAY",
    TUE: "TUESDAY",
    WED: "WEDNESDAY",
    THU: "THURSDAY",
    FRI: "FRIDAY",
    SAT: "SATURDAY",
    SUN: "SUNDAY",
    MONDAY: "MONDAY",
    TUESDAY: "TUESDAY",
    WEDNESDAY: "WEDNESDAY",
    THURSDAY: "THURSDAY",
    FRIDAY: "FRIDAY",
    SATURDAY: "SATURDAY",
    SUNDAY: "SUNDAY",
  };
  return days.map((d) => {
    const key = String(d).trim().toUpperCase();
    return shortToFull[key] ?? key;
  });
}

/** Match GET /subscriptions/plans/ row to catalog product id → subscription plan PK. */
function pickPlanIdForProduct(
  plans: Record<string, unknown>[],
  productId: number
): number | null {
  for (const p of plans) {
    const candidates: unknown[] = [
      p.product_id,
      p.product,
      typeof p.product === "object" && p.product !== null
        ? (p.product as Record<string, unknown>).id
        : undefined,
      p.daily_product_id,
      p.linked_product_id,
    ];
    for (const c of candidates) {
      if (c == null || c === "") continue;
      if (Number(c) === productId) {
        const planPk = p.id ?? p.plan_id;
        const n = Number(planPk);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
  }
  return null;
}

function formatCreateError(data: unknown): string {
  if (data == null) return "Request failed";
  if (typeof data === "string") return data;
  if (typeof data !== "object") return "Request failed";
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail)) {
    return o.detail.map((x) => String(x)).join(" ").trim() || "Request failed";
  }
  if (typeof o.message === "string") return o.message;
  if (typeof o.error === "string") return o.error;
  const nonField = o.non_field_errors;
  if (Array.isArray(nonField) && nonField[0]) return String(nonField[0]);
  const firstKey = Object.keys(o).find((k) => k !== "success");
  if (firstKey && Array.isArray(o[firstKey])) {
    const arr = o[firstKey] as unknown[];
    if (arr[0]) return `${firstKey}: ${String(arr[0])}`;
  }
  try {
    return JSON.stringify(o);
  } catch {
    return "Bad request";
  }
}

class SubscriptionService {
  private normalizeType(type: string): "DAILY" | "CUSTOM" {
    if (!type) {
      throw new Error("Subscription type is required");
    }
    const normalized = type.toUpperCase();
    if (normalized !== "DAILY" && normalized !== "CUSTOM") {
      throw new Error(
        "Invalid subscription type. Must be either Daily or custom"
      );
    }
    return normalized;
  }

  private validateSubscriptionData(data: SubscriptionInitiateRequest) {
    if (!data.basePackId) {
      throw new Error("basePackId is required");
    }
    if (!data.type) {
      throw new Error("type is required");
    }
    if (!data.startDate) {
      throw new Error("startDate is required");
    }
    if (!data.days || data.days <= 0) {
      throw new Error("days must be a positive number");
    }
  }

  /**
   * Legacy two-step flow: UI calls initiate then confirm.
   * New API only exposes POST /subscriptions/create/ — initiation is a client-side checkpoint.
   */
  async initiateSubscription(
    data: SubscriptionInitiateRequest
  ): Promise<SubscriptionInitiateResponse> {
    this.validateSubscriptionData(data);
    this.normalizeType(data.type);
    return {
      success: true,
      message: "ok",
    };
  }

  /**
   * GET /subscriptions/plans/ — active plans (used to map product id → plan_id).
   */
  async getSubscriptionPlans(): Promise<Record<string, unknown>[]> {
    try {
      const { data } = await api.get(`${base()}/plans/`);
      const list = unwrapList(data);
      return list.map((item) => item as Record<string, unknown>);
    } catch {
      return [];
    }
  }

  /**
   * Create subscription — POST /subscriptions/create/
   * Resolves `plan_id`: Postman uses subscription plan ids; we map catalog `product_id` via GET /subscriptions/plans/ when possible.
   */
  async confirmSubscription(
    data: SubscriptionConfirmRequest
  ): Promise<SubscriptionConfirmResponse> {
    const normalizedType = this.normalizeType(data.type);

    const productOrPlanId = parseInt(String(data.basePackId).trim(), 10);
    const deliveryAddressId = parseInt(String(data.deliveryAddressId).trim(), 10);
    if (Number.isNaN(productOrPlanId) || Number.isNaN(deliveryAddressId)) {
      throw new Error("Invalid plan or address id");
    }
    if (productOrPlanId <= 0 || deliveryAddressId <= 0) {
      throw new Error(
        "Invalid subscription request: choose a product and a saved delivery address."
      );
    }

    const plans = await this.getSubscriptionPlans();
    const mappedPlanId = pickPlanIdForProduct(plans, productOrPlanId);
    const planId = mappedPlanId ?? productOrPlanId;

    const qtyRaw = data.quantity != null ? Number(data.quantity) : 1;
    const quantity =
      Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

    const startDate = data.startDate.toISOString().split("T")[0];

    const body: Record<string, unknown> = {
      plan_id: planId,
      delivery_address_id: deliveryAddressId,
      quantity,
      start_date: startDate,
    };

    if (normalizedType === "CUSTOM" && data.selectedDays?.length) {
      body.delivery_days = normalizeDeliveryDayNames(data.selectedDays);
    }

    try {
      const { data: res } = await api.post(`${base()}/create/`, body);

      const payload = res as Record<string, unknown>;
      if (payload.success === false) {
        const err =
          (payload.message as string) ||
          (payload.error as string) ||
          "Failed to create subscription";
        if (
          String(err).includes("active subscription") ||
          String(err).includes("address")
        ) {
          return {
            success: false,
            error: err,
            ...payload,
          };
        }
        throw new Error(err);
      }

      const subRaw =
        (payload.data as Record<string, unknown> | undefined) ||
        (payload.subscription as Record<string, unknown> | undefined) ||
        payload;

      return {
        success: true,
        subscription: subRaw,
        message: payload.message as string | undefined,
      };
    } catch (error: unknown) {
      const ax = error as { response?: { data?: unknown } };
      const payload = ax.response?.data;
      const msg =
        formatCreateError(payload) ||
        (error instanceof Error ? error.message : "Request failed");
      if (
        String(msg).includes("active subscription") ||
        String(msg).includes("address")
      ) {
        return {
          success: false,
          error: msg,
        };
      }
      throw new Error(msg);
    }
  }

  /**
   * GET /subscriptions/
   */
  async getCustomerSubscriptions(): Promise<Subscription[]> {
    const { data } = await api.get(`${base()}/`);
    const list = unwrapList(data);
    return list.map((item) =>
      mapSubscriptionFromApi(item as Record<string, unknown>)
    );
  }

  /**
   * Resume: POST /subscriptions/{id}/resume/
   * Pause (scheduled resume): POST /subscriptions/{id}/pause/ with resume_date
   */
  async toggleSubscriptionStatus(subscriptionId: string, resumeDate?: Date) {
    if (resumeDate) {
      const { data } = await api.post(`${base()}/${subscriptionId}/pause/`, {
        resume_date: resumeDate.toISOString().split("T")[0],
      });
      return data;
    }
    const { data } = await api.post(`${base()}/${subscriptionId}/resume/`);
    return data;
  }

  async cancelSubscription(subscriptionId: string, cancellationReason: string) {
    const { data } = await api.post(`${base()}/${subscriptionId}/cancel/`, {
      cancellation_reason: cancellationReason,
    });
    const payload = data as Record<string, unknown>;
    if (payload.success === false) {
      throw new Error((payload.error as string) || "Failed to cancel subscription");
    }
    return data;
  }

  async pauseSubscription(
    subscriptionId: string,
    pauseDays: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const resumeDate = new Date();
      resumeDate.setDate(resumeDate.getDate() + pauseDays);
      await this.toggleSubscriptionStatus(subscriptionId, resumeDate);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred";
      return { success: false, error: msg };
    }
  }

  /**
   * PATCH /subscriptions/{id}/update/
   */
  async updateSubscription(
    subscriptionId: string,
    updates: {
      type?: "DAILY" | "CUSTOM";
      selectedDays?: string[];
      endDate?: Date;
      status?: "ACTIVE" | "PAUSED" | "CANCELLED" | "INACTIVE";
    }
  ): Promise<Subscription> {
    const body: Record<string, unknown> = {};
    if (updates.type != null) body.subscription_type = updates.type;
    if (updates.selectedDays != null) body.delivery_days = updates.selectedDays;
    if (updates.endDate != null) body.end_date = updates.endDate.toISOString().split("T")[0];
    if (updates.status != null) body.status = updates.status;

    const { data: res } = await api.patch(
      `${base()}/${subscriptionId}/update/`,
      body
    );

    const payload = res as Record<string, unknown>;
    const raw =
      (payload.data as Record<string, unknown> | undefined) ||
      (payload.subscription as Record<string, unknown> | undefined);
    if (!raw && payload.id) {
      return mapSubscriptionFromApi(payload);
    }
    if (!raw) {
      throw new Error(
        (payload.error as string) || (payload.message as string) || "Failed to update subscription"
      );
    }
    return mapSubscriptionFromApi(raw);
  }
}

export const subscriptionService = new SubscriptionService();
