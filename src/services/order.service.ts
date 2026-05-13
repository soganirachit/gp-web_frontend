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

function extractNextOrderListUrl(data: unknown): string | null {
    const next =
        typeof (data as { next?: unknown })?.next === "string" &&
        String((data as { next: string }).next).trim()
            ? String((data as { next: string }).next).trim()
            : null;
    return next || null;
}

function parseOrderListPage(data: unknown): { items: any[]; nextUrl: string | null } {
    return {
        items: extractOrderListPayload(data),
        nextUrl: extractNextOrderListUrl(data),
    };
}

function keepSubscriptionOrderRows(list: any[], subscriptionOnly: boolean): any[] {
    return subscriptionOnly
        ? list.filter(
              (o) =>
                  String(o?.order_type ?? "").toLowerCase() === "subscription",
          )
        : list;
}

/** Follow DRF `next` until exhausted (matches mobile `order.service`). */
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

        const { items, nextUrl } = parseOrderListPage(response.data);
        all.push(...items);

        if (!nextUrl) break;
        url = nextUrl;
    }
    return all;
}

function buildOrderListQueryParams(
    statusOrFilters?: string | { status?: string; order_type?: string },
): Record<string, string> {
    const params: Record<string, string> = {};
    if (typeof statusOrFilters === "string") {
        if (statusOrFilters) params.status = statusOrFilters;
    } else if (statusOrFilters && typeof statusOrFilters === "object") {
        if (statusOrFilters.status) params.status = statusOrFilters.status;
        if (statusOrFilters.order_type)
            params.order_type = statusOrFilters.order_type;
    }
    return params;
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
            const params = buildOrderListQueryParams(statusOrFilters);
            const query = Object.keys(params).length ? params : undefined;
            const rawList = await fetchAllOrderPages(query);
            const subscriptionOnly =
                String(params.order_type ?? "").toLowerCase() === "subscription";
            return keepSubscriptionOrderRows(rawList, subscriptionOnly);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    /**
     * First page of `GET /orders/` only. Use {@link getOrdersNextPage} with the returned
     * `nextUrl` when the user taps “Load more” (avoids requesting every page up front).
     */
    async getOrdersFirstPage(
        statusOrFilters?: string | { status?: string; order_type?: string },
    ): Promise<{ orders: any[]; nextUrl: string | null }> {
        try {
            const params = buildOrderListQueryParams(statusOrFilters);
            const sanitized = sanitizeOrderListParams(
                Object.keys(params).length ? params : undefined,
            );
            const response = await api.get(
                `${getApiUrl()}/orders/`,
                sanitized ? { params: sanitized } : undefined,
            );
            const { items, nextUrl } = parseOrderListPage(response.data);
            const subscriptionOnly =
                String(params.order_type ?? "").toLowerCase() === "subscription";
            return {
                orders: keepSubscriptionOrderRows(items, subscriptionOnly),
                nextUrl,
            };
        } catch (error: any) {
            console.error("Error fetching orders (first page):", error);
            return { orders: [], nextUrl: null };
        }
    }

    async getOrdersNextPage(
        nextUrl: string,
        subscriptionOnly: boolean,
    ): Promise<{ orders: any[]; nextUrl: string | null }> {
        try {
            const response = await api.get(nextUrl);
            const { items, nextUrl: next } = parseOrderListPage(response.data);
            return {
                orders: keepSubscriptionOrderRows(items, subscriptionOnly),
                nextUrl: next,
            };
        } catch (error: any) {
            console.error("Error fetching orders (next page):", error);
            return { orders: [], nextUrl: null };
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
