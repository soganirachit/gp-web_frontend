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
    async createOrder(order: {
        amount: number;
        couponCode: string;
        paymentMethod: string;
    }): Promise<{
        orderId: string;
    }> {
        try {
            const headers = this.getAuthHeaders();
            if (!headers) {
                return {
                    orderId: "",
                };
            }
            const orderPayload = {
                "subscriptionId": "",
                "productId": "DPRD1000",
                "quantity": 1,
                "addressId": "7c1fd7c9-c2fd-44a0-97bf-c271e034a972",
                "deliveredBy": "Rahul",
                "routeId": "test-id",
                "couponCode": order.couponCode,
                "paymentMethod": order.paymentMethod,
            }
            const response = await axios.post(`${getApiUrl()}/create-order`, orderPayload, {
                headers,
            });
            if (
                response.status === 200
            ) {
                return response.data;
            }
            return {
                orderId: "",
            };
        } catch (error: any) {
            if (!localStorage.getItem("token")) {
                return {
                    orderId: "",
                };
            }
            return {
                orderId: "",
            };
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
