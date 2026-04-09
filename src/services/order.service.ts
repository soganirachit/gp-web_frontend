import api from "./api";
import { getApiUrl } from "../config/api.config";

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
     * Get orders list with optional status filter
     * @param status - Optional status filter (pending/confirmed/delivered/cancelled)
     */
    async getOrders(status?: string): Promise<any[]> {
        try {
            const params = status ? { status } : {};
            const response = await api.get(`${getApiUrl()}/orders/`, { params });

            if (response.status === 200) {
                // Handle different possible response structures
                if (response.data.success && response.data.data) {
                    return Array.isArray(response.data.data) ? response.data.data : [];
                }
                if (Array.isArray(response.data)) {
                    return response.data;
                }
                if (response.data.results) {
                    return response.data.results;
                }
                return [];
            }
            return [];
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
