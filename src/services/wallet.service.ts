import axios from "axios";
import { getApiUrl } from "../config/api.config";
import { TransactionType } from "@/interfaces";

// Configure base URL for API calls
const API_URL = `${getApiUrl()}/wallet`;

class WalletService {
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

  async getWalletBalance(): Promise<{
    balance: number;
    transactions: TransactionType[];
  }> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return {
          balance: 0,
          transactions: [],
        };
      }

      const response = await axios.get(`${API_URL}/balance`, { headers });

      if (
        response.status === 200
      ) {
        return response.data;
      }
      return {
        balance: 0,
        transactions: [],
      };
    } catch (error: any) {
      if (!localStorage.getItem("token")) {
        return {
          balance: 0,
          transactions: [],
        };
      }
      this.handleAuthError(error);
      return {
        balance: 0,
        transactions: [],
      };
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

      const { balance } = await this.getWalletBalance();
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
        `${API_URL}/add-to-payment`,
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
   // Temporary: Directly add amount to wallet (without Razorpay)
  async addAmountDirect(amount: number): Promise<any> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/add-to-payment`,
        { amount },
        { headers }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to add amount');
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

}

export const walletService = new WalletService();