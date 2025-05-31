import axios from "axios";
import { getApiUrl } from "../config/api.config";

// Configure base URL for API calls
const API_URL = `${getApiUrl()}/wallet`;

class WalletService {
  private getAuthHeaders() {
    const token = localStorage.getItem("token");
    if (!token) {
      return null;
    }
    return {
      Authorization: token,
      "Content-Type": "application/json",
    };
  }

  private handleAuthError(error: any) {
    if (
      error.response?.status === 401 ||
      error.message === "Authentication required"
    ) {
      localStorage.removeItem("token");
      throw new Error("Session expired. Please login again.");
    }
    throw error;
  }

  async getWalletBalance(): Promise<number> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return 0; // Return 0 balance if not authenticated
      }

      const response = await axios.get(`${API_URL}/balance`, { headers });

      if (
        response.status === 200 &&
        typeof response.data.balance === "number"
      ) {
        return response.data.balance;
      }
      return 0; // Return 0 if invalid response
    } catch (error: any) {
      if (!localStorage.getItem("token")) {
        return 0; // Return 0 if no token
      }
      this.handleAuthError(error);
      return 0;
    }
  }

  async checkBalanceForSubscription(amount: number): Promise<{
    isEnough: boolean;
    currentBalance: number;
    shortageAmount: number;
  }> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return {
          isEnough: false,
          currentBalance: 0,
          shortageAmount: amount,
        };
      }

      const balance = await this.getWalletBalance();
      return {
        isEnough: balance >= amount,
        currentBalance: balance,
        shortageAmount: Math.max(0, amount - balance),
      };
    } catch (error) {
      return {
        isEnough: false,
        currentBalance: 0,
        shortageAmount: amount,
      };
    }
  }

 

  

  
  async createRazorpayOrder(amount: number): Promise<{
    order: any;
    key_id: string;
    customer: any;
  }> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/create-order`,
        { amount },
        { headers }
      );
   

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to create order');
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async verifyRazorpayPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<any> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/verify-payment`,
        paymentData,
        { headers }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Payment verification failed');
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }


}

export const walletService = new WalletService();