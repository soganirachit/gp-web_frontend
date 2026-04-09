import { AxiosError } from "axios";
import api from "./api";
import { getApiUrl, getPaymentsRazorpayUrl, getWalletUrl } from "../config/api.config";
import { TransactionType } from "@/interfaces";

function unwrapData<T = unknown>(raw: unknown): T {
  if (raw == null || typeof raw !== "object") return raw as T;
  const r = raw as Record<string, unknown>;
  if (r.data != null && typeof r.data === "object") return r.data as T;
  return raw as T;
}

function mapTransactionRow(row: Record<string, unknown>): TransactionType {
  const amt = Number(row.amount ?? row.value ?? 0);
  const typeRaw = String(row.type ?? row.transaction_type ?? "").toUpperCase();
  const isDebit =
    typeRaw.includes("DEBIT") ||
    typeRaw === "DR" ||
    row.direction === "debit" ||
    amt < 0;
  return {
    amount: Math.abs(amt),
    type: isDebit ? "DEBIT" : "CREDIT",
    description: String(row.description ?? row.narration ?? row.note ?? ""),
    walletId: String(row.wallet_id ?? row.walletId ?? ""),
    balanceAfter: Number(row.balance_after ?? row.balanceAfter ?? row.closing_balance ?? 0),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    referenceId: String(row.reference_id ?? row.referenceId ?? row.id ?? ""),
  };
}

class WalletService {
  private readonly TIMEOUT_MS = 30000;

  /**
   * GET /wallet/ — balance; GET /wallet/transactions/ — history (Postman 09 - Wallet)
   */
  async getWalletBalance(): Promise<{
    balance: number;
    transactions: TransactionType[];
    transactionLogs?: any[];
  }> {
    try {
      if (!localStorage.getItem("phoneNumber")) {
        return { balance: 0, transactions: [], transactionLogs: [] };
      }

      const walletBase = getWalletUrl();

      const [walletRes, txRes] = await Promise.all([
        api.get(`${walletBase}/`),
        api.get(`${walletBase}/transactions/`).catch(() => null),
      ]);

      const walletPayload = unwrapData<Record<string, unknown>>(walletRes.data);
      const balance = Number(
        walletPayload.balance ??
          walletPayload.wallet_balance ??
          walletPayload.available_balance ??
          0
      );

      let transactions: TransactionType[] = [];
      const embedded = walletPayload.transactions ?? walletPayload.recent_transactions;
      if (Array.isArray(embedded)) {
        transactions = embedded.map((t) =>
          mapTransactionRow(t as Record<string, unknown>)
        );
      }

      if (transactions.length === 0 && txRes?.data != null) {
        const txInner = unwrapData<unknown>(txRes.data);
        const list = Array.isArray(txInner)
          ? txInner
          : Array.isArray((txInner as Record<string, unknown>)?.results)
            ? (txInner as { results: unknown[] }).results
            : [];
        transactions = list.map((t) =>
          mapTransactionRow(t as Record<string, unknown>)
        );
      }

      return {
        balance,
        transactions,
        transactionLogs: [],
      };
    } catch (error: any) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw new Error("Session expired");
      }
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

  /**
   * Step 1: create Razorpay order for wallet top-up (before opening Razorpay UI).
   * Swagger documents `POST /wallet/add-money/` for step 2 only — there is no
   * `payments/razorpay/create-wallet-order/` on production (404). Prefer wallet-scoped routes.
   */
  async createRazorpayOrder(
    amount: number,
    purpose: string = "wallet_recharge"
  ): Promise<{
    order: any;
    key_id: string;
    customer: any;
  }> {
    const body = { amount, purpose };
    const walletBase = getWalletUrl();
    const razorpayBase = getPaymentsRazorpayUrl();

    const tryUrls = [
      `${walletBase}/create-razorpay-order/`,
      `${walletBase}/create-order/`,
      `${razorpayBase}/create-wallet-order/`,
    ];

    let response;
    let last404: unknown;
    for (const url of tryUrls) {
      try {
        response = await api.post(url, body);
        break;
      } catch (e: unknown) {
        const ax = e as AxiosError;
        if (ax.response?.status === 404) {
          last404 = e;
          continue;
        }
        throw e;
      }
    }
    if (!response) {
      throw last404 instanceof Error
        ? last404
        : new Error(
            "Wallet Razorpay order endpoint not found. Expected one of: /wallet/create-razorpay-order/, /wallet/create-order/"
          );
    }

    const raw = response.data as Record<string, unknown>;
    if (raw.success === false) {
      throw new Error(String(raw.message || "Failed to create order"));
    }

    const d = unwrapData<Record<string, unknown>>(raw);

    const razorpayOrderId =
      (d.razorpay_order_id as string) ||
      (d.order_id as string) ||
      (typeof d.order === "object" && d.order != null
        ? String((d.order as Record<string, unknown>).id ?? "")
        : "");

    const keyId = String(d.key_id ?? d.keyId ?? "");
    const amountPaise = Number(
      d.amount ?? (d.order as Record<string, unknown> | undefined)?.amount ?? amount * 100
    );

    return {
      order: {
        id: razorpayOrderId,
        amount: amountPaise,
        currency: String(d.currency ?? "INR"),
        notes: (d.order as Record<string, unknown> | undefined)?.notes ?? d.notes,
      },
      key_id: keyId,
      customer: (d.customer as Record<string, unknown>) ?? {
        name: "",
        email: "",
        contact: localStorage.getItem("phoneNumber") ?? "",
      },
    };
  }

  /**
   * POST /wallet/add-money/ — credit wallet after Razorpay (Swagger + Postman 09 - Wallet).
   * Body: amount (number, INR), razorpay_order_id, razorpay_payment_id, razorpay_signature.
   */
  async verifyRazorpayPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    /** INR top-up amount — required by API */
    amount: number;
  }): Promise<any> {
    const payload = {
      amount: paymentData.amount,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    };

    const response = await api.post(`${getWalletUrl()}/add-money/`, payload);
    if (response.status === 200 && response.data?.success !== false) {
      return response.data;
    }
    throw new Error(response.data?.message || "Payment verification failed");
  }

  async verifyPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    amount: number;
  }): Promise<any> {
    return this.verifyRazorpayPayment(paymentData);
  }

  async addAmountDirect(amount: number): Promise<any> {
    const response = await api.post(
      `${getWalletUrl()}/add-money/`,
      { amount },
      { timeout: this.TIMEOUT_MS }
    );
    if (response.status === 200 && response.data?.success !== false) {
      return response.data;
    }
    throw new Error(response.data?.message || "Failed to add amount");
  }

  async checkPaymentStatus(razorpayOrderId: string): Promise<{
    status: "pending" | "completed" | "failed";
    amount?: number;
  }> {
    try {
      const razorpayBase = getPaymentsRazorpayUrl();
      const response = await api.get(
        `${razorpayBase}/status/${razorpayOrderId}/`,
        { timeout: this.TIMEOUT_MS }
      );

      if (response.status === 200) {
        const body = unwrapData<Record<string, unknown>>(response.data);
        const st = String(body.status ?? "").toLowerCase();
        if (st === "completed" || st === "paid" || st === "success") {
          return { status: "completed", amount: Number(body.amount) };
        }
        if (st === "failed" || st === "cancelled") {
          return { status: "failed" };
        }
        return { status: "pending" };
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
    razorpayOrderId: string,
    maxAttempts: number = 10
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const status = await this.checkPaymentStatus(razorpayOrderId);

        if (status.status === "completed") {
          return true;
        }

        if (status.status === "failed") {
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `Payment status check attempt ${attempt + 1} failed:`,
          error
        );
      }
    }

    return false;
  }

  async recoverPendingPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    amount: number;
  }): Promise<boolean> {
    try {
      const response = await api.post(
        `${getWalletUrl()}/add-money/`,
        {
          amount: paymentData.amount,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        },
        { timeout: this.TIMEOUT_MS }
      );

      if (response.status === 200 && response.data?.success !== false) {
        console.log(
          "Pending payment recovered successfully:",
          paymentData.razorpay_payment_id
        );
        return true;
      }

      throw new Error(response.data?.message || "Payment recovery failed");
    } catch (error: any) {
      console.error("Failed to recover pending payment:", error);

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

      try {
        const isCompleted = await this.pollPaymentStatus(
          paymentData.razorpay_order_id,
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
