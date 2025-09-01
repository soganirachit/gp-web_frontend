import axios from "axios";
import { getApiUrl } from "../config/api.config";
import { TransactionType } from "@/interfaces";

// Configure base URL for API calls
const API_URL = `${getApiUrl()}/wallet`;

class WalletService {
  private readonly TIMEOUT_MS = 30000; // 30 seconds timeout

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
    transactionLogs?: any[];
  }> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        return {
          balance: 0,
          transactions: [],
          transactionLogs: [],
        };
      }

      const response = await axios.get(`${API_URL}/balance`, { headers });

      if (response.status === 200) {
        return response.data;
      }
      return {
        balance: 0,
        transactions: [],
        transactionLogs: [],
      };
    } catch (error: any) {
      if (!localStorage.getItem("token")) {
        return {
          balance: 0,
          transactions: [],
          transactionLogs: [],
        };
      }
      this.handleAuthError(error);
      return {
        balance: 0,
        transactions: [],
        transactionLogs: [],
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
        throw new Error("Authentication required");
      }

      const response = await axios.post(
        `${API_URL}/create-razorpay-order`,
        { amount },
        { headers }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || "Failed to create order");
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
        throw new Error("Authentication required");
      }

      const response = await axios.post(
        `${API_URL}/verify-payment`,
        paymentData,
        { headers }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || "Payment verification failed");
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async verifyPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    amount: number;
  }): Promise<any> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error("Authentication required");
      }

      const response = await axios.post(
        `${API_URL}/add-to-payment`,
        paymentData,
        {
          headers,
          timeout: this.TIMEOUT_MS,
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || "Payment verification failed");
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
        throw new Error("Authentication required");
      }

      const response = await axios.post(
        `${API_URL}/add-to-payment`,
        { amount },
        {
          headers,
          timeout: this.TIMEOUT_MS,
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || "Failed to add amount");
    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

  async checkPaymentStatus(paymentId: string): Promise<{
    status: "pending" | "completed" | "failed";
    amount?: number;
  }> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error("Authentication required");
      }

      // Check if payment exists in our database
      const response = await axios.get(`${API_URL}/payment-status/${paymentId}`, {
        headers,
        timeout: this.TIMEOUT_MS,
      });

      if (response.status === 200) {
        return response.data;
      }
      return { status: "failed" };
    } catch (error: any) {
      // If endpoint doesn't exist, assume payment is still pending
      if (error.response?.status === 404) {
        return { status: "pending" };
      }
      this.handleAuthError(error);
      return { status: "failed" };
    }
  }

  async pollPaymentStatus(
    paymentId: string,
    maxAttempts: number = 10
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.checkPaymentStatus(paymentId);

        if (status.status === "completed") {
          return true;
        }

        if (status.status === "failed") {
          return false;
        }

        // Wait 2 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `Payment status check attempt ${attempt + 1} failed:`,
          error
        );
      }
    }

    return false; // Timeout reached
  }

  async recoverPendingPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    amount: number;
  }): Promise<boolean> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers) {
        throw new Error("Authentication required");
      }

      const response = await axios.post(
        `${API_URL}/recover-payment`,
        paymentData,
        {
          headers,
          timeout: this.TIMEOUT_MS,
        }
      );

      if (response.status === 200 && response.data.success) {
        console.log(
          "Pending payment recovered successfully:",
          paymentData.razorpay_payment_id
        );
        return true;
      }
      
      throw new Error(response.data.message || "Payment recovery failed");
    } catch (error: any) {
      console.error("Failed to recover pending payment:", error);
      
      // If specific recovery endpoint fails, try the original verification
      try {
        await this.verifyPayment(paymentData);
        console.log(
          "Pending payment recovered via verification:",
          paymentData.razorpay_payment_id
        );
        return true;
      } catch (verifyError) {
        console.error("Verification fallback also failed:", verifyError);
      }

      // Try polling as last resort
      try {
        const isCompleted = await this.pollPaymentStatus(
          paymentData.razorpay_payment_id,
          3
        );
        if (isCompleted) {
          console.log(
            "Payment recovered via polling:",
            paymentData.razorpay_payment_id
          );
          return true;
        }
      } catch (pollError) {
        console.error("Payment polling also failed:", pollError);
      }

      return false;
    }
  }
}

export const walletService = new WalletService();
