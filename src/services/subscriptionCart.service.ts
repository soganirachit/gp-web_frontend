import api from "./api";
import { getApiUrl } from "../config/api.config";
import { errorMessageFromCatch } from "../utils/apiErrorMessage";
import { checkSubscriptionZone as postCheckSubscriptionZone } from "./subscriptionZone.service";

export type DailyCartPaymentMethod = "wallet" | "cod";

export interface DailyCartItem {
  id: number;
  product_id: number;
  product_name?: string;
  product_slug?: string;
  primary_image?: string | null;
  quantity: number;
  unit_price?: string | number;
  total_price?: string | number;
  [k: string]: unknown;
}

export interface DailyCart {
  id: number;
  delivery_address_id?: number | null;
  store_id?: number | null;
  store_name?: string;
  zone_id?: number | null;
  items: DailyCartItem[];
  items_count?: number;
  subtotal?: string | number;
  total?: string | number;
  [k: string]: unknown;
}

export type SubscriptionZoneCheckResponse = {
  eligible: boolean;
  message?: string;
  delivery_fee?: string | number;
  store?: unknown;
  zone?: unknown;
  [k: string]: unknown;
};

function unwrap<T>(raw: unknown): T {
  const obj = raw as any;
  if (obj && typeof obj === "object" && "data" in obj) return obj.data as T;
  return raw as T;
}

export const subscriptionCartService = {
  _weekdayToInt(day: string): number | null {
    const d = String(day).trim().toLowerCase();
    if (d === "mon" || d === "monday") return 0;
    if (d === "tue" || d === "tues" || d === "tuesday") return 1;
    if (d === "wed" || d === "wednesday") return 2;
    if (d === "thu" || d === "thur" || d === "thurs" || d === "thursday") return 3;
    if (d === "fri" || d === "friday") return 4;
    if (d === "sat" || d === "saturday") return 5;
    if (d === "sun" || d === "sunday") return 6;
    return null;
  },

  async getDailyCart(): Promise<DailyCart> {
    try {
      const res = await api.get(`${getApiUrl()}/subscriptions/cart/`);
      return unwrap<DailyCart>(res.data);
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to fetch daily cart"));
    }
  },

  /**
   * Check if a delivery address is within a subscription delivery zone.
   * POST /subscriptions/check-zone/  { address_id }
   */
  async checkSubscriptionZone(addressId: number): Promise<SubscriptionZoneCheckResponse> {
    try {
      const res = await postCheckSubscriptionZone({ address_id: addressId });
      return res as SubscriptionZoneCheckResponse;
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to check delivery zone"));
    }
  },

  /**
   * Persist selected delivery days on the daily cart.
   */
  async setDeliveryDays(deliveryDays: Array<string | number>): Promise<DailyCart> {
    const ints = deliveryDays
      .map((d) => (typeof d === "number" ? d : this._weekdayToInt(d)))
      .filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 6);
    const payload = { delivery_days: ints };
    try {
      const res = await api.post(`${getApiUrl()}/subscriptions/cart/set-delivery-days/`, payload);
      return unwrap<DailyCart>(res.data);
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to set delivery days"));
    }
  },

  async setDeliveryAddress(deliveryAddressId: number): Promise<DailyCart> {
    try {
      const res = await api.post(`${getApiUrl()}/subscriptions/cart/set-address/`, {
        delivery_address_id: deliveryAddressId,
      });
      return unwrap<DailyCart>(res.data);
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to set delivery address"));
    }
  },

  async addItem(productId: number, quantity: number): Promise<DailyCart> {
    try {
      const res = await api.post(`${getApiUrl()}/subscriptions/cart/add/`, {
        product_id: productId,
        quantity,
      });
      return unwrap<DailyCart>(res.data);
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to update daily cart"));
    }
  },

  async removeItem(itemId: number): Promise<void> {
    try {
      await api.delete(`${getApiUrl()}/subscriptions/cart/items/${itemId}/`);
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to remove item"));
    }
  },

  async clear(): Promise<void> {
    try {
      await api.post(`${getApiUrl()}/subscriptions/cart/clear/`, {});
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Failed to clear daily cart"));
    }
  },

  async checkout(params: {
    start_date: string; // YYYY-MM-DD
    payment_method: DailyCartPaymentMethod;
    delivery_days?: number[];
  }): Promise<unknown> {
    try {
      const res = await api.post(`${getApiUrl()}/subscriptions/cart/checkout/`, params);
      return res.data;
    } catch (e: unknown) {
      throw new Error(errorMessageFromCatch(e, "Checkout failed"));
    }
  },
};

