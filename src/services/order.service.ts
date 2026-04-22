import api from "./api";
import { getApiUrl } from "../config/api.config";

const MAX_ORDER_LIST_PAGES = 40;

/** Never send explicit page index on `GET /orders/` — pagination follows `next` URLs only. */
function sanitizeOrderListParams(
    params?: Record<string, string>,
): Record<string, string> | undefined {
    if (!params || !Object.keys(params).length) return undefined;
    const next = { ...params };
    delete next.page;
    delete next.page_no;
    delete next.p;
    return Object.keys(next).length ? next : undefined;
}

function extractOrderListPayload(data: unknown): any[] {
  if (Array.isArray(data)) return data as any[];
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.data)) return d.data as any[];
  if (Array.isArray(d.results)) return d.results as any[];
  return [];
}

/**
 * Follow DRF `next` until exhausted (matches mobile `order.service`), except for
 * `order_type=subscription` — backend must not be called with `?page=2` etc.; only
 * the first `GET /orders/?order_type=subscription` (no page param) is used.
 */
async function fetchAllOrderPages(
    params?: Record<string, string>,
): Promise<any[]> {
    const all: any[] = [];
    let url = `${getApiUrl()}/orders/`;
    let firstParams = sanitizeOrderListParams(params);
    const subscriptionOnlyRequest =
        String(firstParams?.order_type ?? "").toLowerCase() === "subscription";

    for (let p = 0; p < MAX_ORDER_LIST_PAGES; p++) {
        const response = await api.get(
            url,
            firstParams ? { params: firstParams } : undefined,
        );
        firstParams = undefined;

        const data = response.data;
        const list = extractOrderListPayload(data);
        all.push(...list);

        if (subscriptionOnlyRequest) {
            break;
        }

        const next =
            typeof (data as any)?.next === "string" &&
            (data as any).next.trim()
                ? String((data as any).next).trim()
                : null;
        if (!next) break;
        url = next;
    }
    return all;
}

class OrderService {
    async createOrder(orderPayload: any): Promise<{
        success: boolean;
        orderId: string;
    }> {
        const { data } = await api.post(
            `${getApiUrl()}/order/create-order`,
            orderPayload
        );
        if (!data.success) {
            throw new Error("Failed to create order");
        }
        return {
            success: data.success,
            orderId: data.orderId || data.order_id || data.data?.id,
        };
    }

    async createStoreOrderWithPayment(orderPayload: any): Promise<{
        success: boolean;
        orderId: string;
        paymentId: string;
        amount: number;
    }> {
        try {
            const { data } = await api.post(
                `${getApiUrl()}/order/create-store-order`,
                orderPayload
            );
            if (!data.success) {
                throw new Error("Failed to create store order");
            }
            return data;
        } catch (error: any) {
            const apiError = error.response?.data;
            if (apiError?.details) {
                console.error("Store order payload rejected:", apiError.details);
            }
            throw new Error(apiError?.error || apiError?.message || error.message || "Unknown error occurred");
        }
    }

    /**
     * Create order from cart
     * @param orderPayload - Order payload with delivery_address_id, payment_method, etc.
     */
    async createOrderFromCart(orderPayload: {
        delivery_address_id: number;
        payment_method: string;
        delivery_instructions?: string;
        payment_details?: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
        };
        idempotency_key: string;
    }): Promise<{
        success: boolean;
        orderId: string;
    }> {
        const { data } = await api.post(
            `${getApiUrl()}/orders/create/`,
            orderPayload
        );
        if (!data.success) {
            throw new Error(data.message || "Failed to create order");
        }
        return {
            success: data.success,
            orderId: data.data?.id || data.orderId || data.order_id,
        };
    }

    async getOrderById(orderId: string) {
        try {
            const response = await api.get(`${getApiUrl()}/order/${orderId}`);
            if (response.status === 200) {
                return response.data.data;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Get order details by order number
     * @param orderNumber - Order number (e.g., "GP-20260221-CK005")
     */
    async getOrderByOrderNumber(orderNumber: string) {
        try {
            const response = await api.get(`${getApiUrl()}/orders/${orderNumber}/`);
            if (response.status === 200) {
                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
                return response.data;
            }
            return null;
        } catch (error: any) {
            console.error('Error fetching order by order number:', error);
            return null;
        }
    }

    /** Customer orders list — same as {@link getOrders} (backend exposes `GET /orders/`, not `/order`). */
    async getOrdersByCustomerId(): Promise<any[]> {
        return this.getOrders();
    }

    /**
     * Get orders list. Pass a string for legacy `?status=` only, or an object for multiple filters
     * (e.g. `{ order_type: 'subscription' }` for subscription deliveries).
     */
    async getOrders(
        statusOrFilters?: string | { status?: string; order_type?: string },
    ): Promise<any[]> {
        try {
            const params: Record<string, string> = {};
            if (typeof statusOrFilters === "string") {
                if (statusOrFilters) params.status = statusOrFilters;
            } else if (statusOrFilters && typeof statusOrFilters === "object") {
                if (statusOrFilters.status) params.status = statusOrFilters.status;
                if (statusOrFilters.order_type)
                    params.order_type = statusOrFilters.order_type;
            }
            const query = Object.keys(params).length ? params : undefined;
            const rawList = await fetchAllOrderPages(query);

            const subscriptionOnly =
                String(params.order_type ?? "").toLowerCase() === "subscription";
            const keepSubscriptionRows = (list: any[]) =>
                subscriptionOnly
                    ? list.filter(
                          (o) =>
                              String(o?.order_type ?? "").toLowerCase() ===
                              "subscription",
                      )
                    : list;

            return keepSubscriptionRows(rawList);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }


    async cancelOrder(orderId: string) {
        try {
            const response = await api.post(
                `${getApiUrl()}/order/cancel-order`,
                { orderId }
            );
            if (
                response.status === 200
            ) {
                return {
                    success: true,
                };
            }
            return {
                success: false,
                error: "Failed to cancel order",
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data || error,
            };
        }
    }
}
export const orderService = new OrderService();
