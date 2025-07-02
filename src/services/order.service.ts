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
            ) {
                const activeOrders = response.data.data.filter((order: any) => order.status !== "CANCELLED" && order.status !== "REFUNDED");
                return activeOrders;
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
