import api from "./api";
import { getApiUrl } from "../config/api.config";
import { headerService } from "./headers.service";

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
    } catch (error: any) {
      console.error('Error creating checkout order:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });

      if (error instanceof Error) {
        throw error;
      }

      if (error.response?.data?.success === false) {
        throw new Error(error.response.data.message || 'Authentication failed');
      }

      headerService.handleError(error);
      throw error;
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

      return response.data;
    } catch (error: any) {
      console.error('Error verifying payment:', error);

      if (error instanceof Error) {
        throw error;
      }

      headerService.handleError(error);
      throw error;
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

      return response.data;
    } catch (error: any) {
      console.error('Error getting payment status:', error);
      headerService.handleError(error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

