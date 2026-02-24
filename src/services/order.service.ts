import axios from "axios";
import { getApiUrl } from "../config/api.config";

class OrderService {
    private getAuthHeaders() {
        const token = localStorage.getItem("token");
        if (!token) {
            return null;
        }
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }
    async createOrder(orderPayload: any): Promise<{
        success: boolean;
        orderId: string;
    }> {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                throw new Error("Authentication Failed");
            }

            try {
                const { data: { success, ...rest } } = await axios.post(
                    `${getApiUrl()}/order/create-order`,
                    orderPayload,
                    { headers }
                );

                if (!success) {
                    throw new Error("Failed to create order");
                }

                return { success, ...rest };
            } catch (error: any) {
                if (!localStorage.getItem("token")) {
                    throw new Error("Authentication token is not configured");
                }
                throw new Error(error.response?.data?.message || error.message || "Unknown error occurred");
            }
        } catch (error: any) {
            throw new Error(error.message || "Unknown error occurred");
        }
    }

    async createStoreOrderWithPayment(orderPayload: any): Promise<{
        success: boolean;
        orderId: string;
        paymentId: string;
        amount: number;
    }> {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                throw new Error("Authentication Failed");
            }

            try {
                const { data } = await axios.post(
                    `${getApiUrl()}/order/create-store-order`,
                    orderPayload,
                    { headers }
                );

                if (!data.success) {
                    throw new Error("Failed to create store order");
                }

                return data;
            } catch (error: any) {
                if (!localStorage.getItem("token")) {
                    throw new Error("Authentication token is not configured");
                }
                const apiError = error.response?.data;
                if (apiError?.details) {
                    console.error("Store order payload rejected:", apiError.details);
                }
                throw new Error(apiError?.error || apiError?.message || error.message || "Unknown error occurred");
            }
        } catch (error: any) {
            throw new Error(error.message || "Unknown error occurred");
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
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                throw new Error("Authentication Failed");
            }

            try {
                const { data } = await axios.post(
                    `${getApiUrl()}/orders/create/`,
                    orderPayload,
                    { headers }
                );

                if (!data.success) {
                    throw new Error(data.message || "Failed to create order");
                }

                return {
                    success: data.success,
                    orderId: data.data?.id || data.orderId || data.order_id,
                };
            } catch (error: any) {
                if (!localStorage.getItem("token")) {
                    throw new Error("Authentication token is not configured");
                }
                throw new Error(error.response?.data?.message || error.message || "Unknown error occurred");
            }
        } catch (error: any) {
            throw new Error(error.message || "Unknown error occurred");
        }
    }

    async getOrderById(orderId: string) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return null;
            }
            const response = await axios.get(`${getApiUrl()}/order/${orderId}`, {
                headers,
            });
            if (response.status === 200) {
                return response.data.data;
            }
            return null;
        } catch (error: any) {
            if (!localStorage.getItem("token")) {
                return null;
            }
            return null;
        }
    }

    /**
     * Get order details by order number
     * @param orderNumber - Order number (e.g., "GP-20260221-CK005")
     */
    async getOrderByOrderNumber(orderNumber: string) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return null;
            }
            const response = await axios.get(`${getApiUrl()}/orders/${orderNumber}/`, {
                headers,
            });
            if (response.status === 200) {
                // Handle different possible response structures
                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
                if (response.data.id) {
                    return response.data;
                }
                return response.data;
            }
            return null;
        } catch (error: any) {
            console.error('Error fetching order by order number:', error);
            if (!localStorage.getItem("token")) {
                return null;
            }
            return null;
        }
    }

    async getOrdersByCustomerId() {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return [];
            }
            const response = await axios.get(`${getApiUrl()}/order`, {
                headers,
            });
            if (
                response.status === 200
            )
            // return response.data.data
             {
            //     const orders = response.data.data.filter(
            //     (order: any) => order.product?.isStore === true
            // );;
                return response.data.data;                
                
            }
            return [];
        } catch (error: any) {
            if (!localStorage.getItem("token")) {
                return [];
            }
            return [];
        }
    }

    /**
     * Get orders list with optional status filter
     * @param status - Optional status filter (pending/confirmed/delivered/cancelled)
     */
    async getOrders(status?: string): Promise<any[]> {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return [];
            }

            const params = status ? { status } : {};
            const response = await axios.get(`${getApiUrl()}/orders/`, {
                headers,
                params,
            });

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
            if (!localStorage.getItem("token")) {
                return [];
            }
            return [];
        }
    }


    async cancelOrder(orderId: string) {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return {
                    success: false,
                    error: "Authentication token is not configured",
                };
            }
            const response = await axios.post(
                `${getApiUrl()}/order/cancel-order`,
                { orderId },
                {
                    headers,
                }
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
