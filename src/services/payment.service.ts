import axios from "axios";
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
      const headers = headerService.getHeaders();
      console.log('Payment Service - Headers:', { 
        hasAuth: !!headers.Authorization,
        authPrefix: headers.Authorization?.substring(0, 10),
        url: `${API_URL}/create-order/`,
        data 
      });
      
      const response = await axios.post<any>(
        `${API_URL}/create-order/`,
        data,
        { headers }
      );
      
      console.log('Payment Service - Response:', response.data);
      
      // Check if the response indicates failure
      if (response.data && response.data.success === false) {
        const errorMessage = response.data.message || 'Authentication failed';
        console.error('API returned error:', errorMessage, response.data);
        throw new Error(errorMessage);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating checkout order:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      // If it's already an Error with a message, throw it
      if (error instanceof Error) {
        throw error;
      }
      
      // Check if response has success: false
      if (error.response?.data?.success === false) {
        throw new Error(error.response.data.message || 'Authentication failed');
      }
      
      // Otherwise, handle through headerService
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Step 3: Verify payment and create order
   * This verifies the Razorpay signature and creates the actual order
   */
  async verifyPayment(
    data: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> {
    try {
      const headers = headerService.getHeaders();
      const response = await axios.post<any>(
        `${API_URL}/verify/`,
        data,
        { headers }
      );
      
      // Check if the response indicates failure
      if (response.data && response.data.success === false) {
        const errorMessage = response.data.message || 'Payment verification failed';
        console.error('API returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      
      // If it's already an Error with a message, throw it
      if (error instanceof Error) {
        throw error;
      }
      
      // Otherwise, handle through headerService
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
      const headers = headerService.getHeaders();
      const response = await axios.get<PaymentStatusResponse>(
        `${API_URL}/status/${razorpayOrderId}/`,
        { headers }
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

