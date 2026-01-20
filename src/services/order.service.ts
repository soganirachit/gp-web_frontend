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
