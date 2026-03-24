import api from "./api";
import { getApiUrl } from "../config/api.config";
import { TransactionType } from "@/interfaces";

// Configure base URL for API calls
const API_URL = `${getApiUrl()}/wallet`;

class WalletService {
  private readonly TIMEOUT_MS = 30000; // 30 seconds timeout

  async getWalletBalance(): Promise<{
    balance: number;
    transactions: TransactionType[];
    transactionLogs?: any[];
  }> {
    try {
      if (!localStorage.getItem("phoneNumber")) {
        return { balance: 0, transactions: [], transactionLogs: [] };
      }

      const response = await api.get(`${API_URL}/balance`);

      if (response.status === 200) {
        return response.data;
      }
      return {
        balance: 0,
        transactions: [],
        transactionLogs: [],
      };
    } catch (error: any) {
      return { balance: 0, transactions: [], transactionLogs: [] };
    }
  }

  async checkBalanceForSubscription(amount: number): Promise<{
    isEnough: boolean;
    currentBalance: number;
    shortageAmount: number;
  }> {
    try {
      if (!localStorage.getItem("phoneNumber")) {
        return { isEnough: false, currentBalance: 0, shortageAmount: amount };
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
    const response = await api.post(`${API_URL}/create-razorpay-order`, { amount });
    if (response.status === 200 && response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || "Failed to create order");
  }

  async verifyRazorpayPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<any> {
    const response = await api.post(`${API_URL}/verify-payment`, paymentData);
    if (response.status === 200 && response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || "Payment verification failed");
  }

  async verifyPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    amount: number;
  }): Promise<any> {
    const response = await api.post(`${API_URL}/add-to-payment`, paymentData, {
      timeout: this.TIMEOUT_MS,
    });
    if (response.status === 200 && response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || "Payment verification failed");
  }

  // Temporary: Directly add amount to wallet (without Razorpay)
  async addAmountDirect(amount: number): Promise<any> {
    const response = await api.post(
      `${API_URL}/add-to-payment`,
      { amount },
      { timeout: this.TIMEOUT_MS }
    );
    if (response.status === 200 && response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || "Failed to add amount");
  }

  async checkPaymentStatus(paymentId: string): Promise<{
    status: "pending" | "completed" | "failed";
    amount?: number;
  }> {
    try {
      const response = await api.get(`${API_URL}/payment-status/${paymentId}`, {
        timeout: this.TIMEOUT_MS,
      });

      if (response.status === 200) {
        return response.data;
      }
      return { status: "failed" };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { status: "pending" };
      }
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
      const response = await api.post(
        `${API_URL}/recover-payment`,
        paymentData,
        { timeout: this.TIMEOUT_MS }
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
