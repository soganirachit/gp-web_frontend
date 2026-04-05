import axios from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";

// Ensure API URL includes /api/v1 if not already in base URL
const getPaymentApiUrl = () => {
  const baseUrl = getApiUrl();
  // If base URL already includes /api/v1, don't add it again
  if (baseUrl.includes('/api/v1')) {
    return `${baseUrl}/payments/razorpay`;
  }
  // Otherwise, add /api/v1
  return `${baseUrl}/api/v1/payments/razorpay`;
};

const API_URL = getPaymentApiUrl();

/** Best-effort parse of Django / DRF error bodies */
function extractServerErrorMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
  if (typeof d.detail === "string" && d.detail.trim()) return d.detail.trim();
  if (Array.isArray(d.detail) && d.detail.length > 0) {
    const first = d.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "message" in first) {
      const m = (first as { message?: string }).message;
      if (typeof m === "string") return m;
    }
  }
  if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
  return undefined;
}

/**
 * Maps Axios/network failures to copy suitable for customers (avoids raw "Request failed with status code 404").
 * Export for basket/checkout UI if needed.
 */
export function getUserFacingPaymentError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const serverMsg = extractServerErrorMessage(data);

    if (!error.response) {
      return "We could not reach the payment service. Check your connection and try again.";
    }

    if (status === 404) {
      return (
        serverMsg ||
        "Checkout could not start because the payment endpoint was not found on the server (404). " +
          "This is usually a configuration or deployment issue — please try again later or contact support."
      );
    }

    if (status === 401) {
      return serverMsg || "Your session may have expired. Please log in again and try checkout.";
    }

    if (status === 403) {
      return serverMsg || "You do not have permission to complete this payment. Try logging in again.";
    }

    if (status === 400 && serverMsg) {
      return serverMsg;
    }

    if (status === 408 || status === 504) {
      return "The request timed out. Please try checkout again.";
    }

    if (status === 502 || status === 503) {
      return "Payment service is temporarily unavailable. Please try again in a few minutes.";
    }

    if (serverMsg) {
      return serverMsg;
    }

    return `Could not start payment (${status}). Please try again.`;
  }

  if (error instanceof Error) {
    const m = error.message;
    if (/Request failed with status code\s*404/i.test(m) || /\b404\b/.test(m)) {
      return (
        "Checkout could not start because the payment service was not found (404). " +
        "Please try again later or contact support if this continues."
      );
    }
    return m;
  }

  return "Something went wrong while starting payment. Please try again.";
}

/** Same wrapper pattern as create-order: `{ success, data: { ... } }` */
function unwrapResponseBody(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  if (r.success === false) return r;
  if (r.data != null && typeof r.data === "object" && !Array.isArray(r.data)) {
    return r.data as Record<string, unknown>;
  }
  return r;
}

/** Build the shape Cart expects after POST /verify/ (handles wrapped + alternate keys). */
function normalizeVerifyResponse(raw: unknown): VerifyPaymentResponse {
  const body = unwrapResponseBody(raw);

  let order = body.order as VerifyPaymentResponse["order"] | undefined;
  let payment = body.payment as VerifyPaymentResponse["payment"] | unknown;

  if (!order && typeof body.order_number === "string") {
    order = {
      id: Number(body.order_id) || 0,
      order_number: body.order_number,
    };
  }

  if (order && !payment) {
    if (body.payment_id != null || typeof body.payment_status === "string") {
      payment = {
        id: Number(body.payment_id) || 0,
        status: String(body.payment_status || "completed"),
      };
    } else {
      payment = { id: 0, status: "completed" };
    }
  }

  if (!order?.order_number || payment == null || typeof payment !== "object") {
    const msg =
      (typeof body.message === "string" && body.message) ||
      "Payment verified but response did not include order details. Check server /verify/ payload.";
    throw new Error(msg);
  }

  return {
    order,
    payment: payment as VerifyPaymentResponse["payment"],
  };
}

export interface CreateCheckoutOrderRequest {
  delivery_address_id: number;
  delivery_slot_id?: number;
  delivery_date?: string; // Format: "YYYY-MM-DD"
  delivery_instructions?: string;
  customer_notes?: string;
}

export interface CreateCheckoutOrderResponse {
  razorpay_order_id: string;
  amount: number; // in paise
  currency: string;
  key_id?: string; // Razorpay key ID (if provided by API)
  // Some backends may return the full Razorpay order object instead
  order?: {
    id: string;
    amount: number;
    currency: string;
    [key: string]: any;
  };
  // Fallback field name in case API uses order_id instead of razorpay_order_id
  order_id?: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  order: {
    id: number;
    order_number: string;
    [key: string]: any;
  };
  payment: {
    id: number;
    status: string;
    [key: string]: any;
  };
}

export interface PaymentStatusResponse {
  razorpay_order_id: string;
  status: string;
  amount: string;
  order_id?: number;
  order_number?: string;
  razorpay_payment_id?: string;
}

class PaymentService {
  /**
   * Step 1: Create Razorpay order for cart checkout
   * This creates a PendingCheckout and returns razorpay_order_id
   */
  async createCheckoutOrder(
    data: CreateCheckoutOrderRequest
  ): Promise<CreateCheckoutOrderResponse> {
    try {
      const response = await api.post(
        `${API_URL}/create-order/`,
        data
      );

      console.log('Payment Service - Raw Response:', response.data);

      if (response.data && response.data.success === false) {
        const errorMessage = response.data.message || 'Authentication failed';
        console.error('API returned error:', errorMessage, response.data);
        throw new Error(errorMessage);
      }

      // Some APIs wrap the actual payload under a `data` key
      // e.g. { success: true, data: { razorpay_order_id, amount, currency, key_id } }
      const raw = response.data;
      const maybeWrapped = (raw && raw.data) ? raw.data : raw;

      console.log('Payment Service - Normalized create-order payload:', maybeWrapped);

      return maybeWrapped;
    } catch (error: unknown) {
      console.error("Error creating checkout order:", error);
      if (axios.isAxiosError(error)) {
        console.error("Checkout request details:", {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      throw new Error(getUserFacingPaymentError(error));
    }
  }

  /**
   * Step 2: Open Razorpay checkout UI
   * Call this with the razorpay_order_id returned from Step 1
   * Resolves with payment details on success, rejects on failure/dismissal
   */
  async openRazorpayCheckout(options: {
    razorpayOrderId: string;
    amount: number;          // in paise (e.g. 50000 = ₹500)
    currency?: string;       // default: 'INR'
    razorpayKeyId: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    description?: string;
    theme?: {
      color?: string;
    };
  }): Promise<{
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }> {
    return new Promise((resolve, reject) => {
      const rzpOptions = {
        key: options.razorpayKeyId,
        amount: options.amount,
        currency: options.currency || 'INR',
        order_id: options.razorpayOrderId,
        description: options.description || 'Order Payment',
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
        },
        theme: {
          color: options.theme?.color || '#3399cc',
        },
        handler: function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          // Payment successful — resolve with details to pass into Step 3
          console.log('Razorpay payment successful:', response);
          resolve(response);
        },
        modal: {
          ondismiss: function () {
            console.log('Razorpay checkout dismissed by user');
            reject(new Error('Payment cancelled by user'));
          },
        },
      };
    });
  }

  /**
   * Step 3: Verify payment and create order
   * This verifies the Razorpay signature and creates the actual order
   */
  async verifyPayment(
    data: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> {
    try {
      const response = await api.post(
        `${API_URL}/verify/`,
        data
      );

      if (response.data && response.data.success === false) {
        const errorMessage = response.data.message || 'Payment verification failed';
        console.error('API returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      return normalizeVerifyResponse(response.data);
    } catch (error: unknown) {
      console.error("Error verifying payment:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(getUserFacingPaymentError(error));
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(getUserFacingPaymentError(error));
    }
  }

  /**
   * Step 4: Check payment status (optional)
   * Use this to check if payment was completed if app crashed
   */
  async getPaymentStatus(
    razorpayOrderId: string
  ): Promise<PaymentStatusResponse> {
    try {
      const response = await api.get(
        `${API_URL}/status/${razorpayOrderId}/`
      );

      const body = unwrapResponseBody(response.data);
      const st = String(body.status ?? "").toLowerCase();
      return {
        razorpay_order_id: String(body.razorpay_order_id ?? razorpayOrderId),
        status: st,
        amount: String(body.amount ?? ""),
        order_id:
          body.order_id != null ? Number(body.order_id) : undefined,
        order_number:
          body.order_number != null ? String(body.order_number) : undefined,
        razorpay_payment_id:
          body.razorpay_payment_id != null
            ? String(body.razorpay_payment_id)
            : undefined,
      };
    } catch (error: unknown) {
      console.error("Error getting payment status:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(getUserFacingPaymentError(error));
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(getUserFacingPaymentError(error));
    }
  }
}

export const paymentService = new PaymentService();

