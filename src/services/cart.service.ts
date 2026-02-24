import axios from "axios";
import { getApiUrl } from "../config/api.config";
import { headerService } from "./headers.service";

const API_URL = `${getApiUrl()}/cart`;

export interface CartItemResponse {
  cart_item_id: number; // Cart item ID (for PUT/DELETE operations)
  quantity: number;
  unit_price: string;
  total_price: string;
  special_instructions?: string;
  product: {
    id: number;
    name: string;
    slug: string;
    primary_image: string | null;
    unit?: string;
    unit_value?: string;
  };
}

export interface CartData {
  id: number;
  store: number;
  store_name: string;
  items: CartItemResponse[];
  items_count: number;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  delivery_fee: string;
  total: string;
  coupon_code?: string;
  coupon_discount?: string;
}

export interface CartResponse {
  success: boolean;
  message: string;
  data: CartData;
}

class CartService {
  /**
   * Get user's cart
   */
  async getCart(): Promise<CartResponse> {
    try {
      const headers = headerService.getHeaders();
      const response = await axios.get<CartResponse>(`${API_URL}/`, { headers });
      return response.data;
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }
  
  /**
   * Get cart data (extracts data from response)
   */
  async getCartData(): Promise<CartData> {
    const response = await this.getCart();
    return response.data;
  }

  /**
   * Add item to cart
   * @param productId - Product ID
   * @param storeId - Store ID
   * @param quantity - Quantity to add
   * @param specialInstructions - Optional special instructions/customized message
   */
  async addToCart(
    productId: number,
    storeId: number,
    quantity: number,
    specialInstructions?: string
  ): Promise<CartResponse> {
    try {
      console.log('CartService.addToCart called with:', { productId, storeId, quantity, specialInstructions });
      console.log('API_URL:', `${API_URL}/add/`);
      const headers = headerService.getHeaders();
      console.log('Headers retrieved, making POST request...');
      const payload = {
        product_id: productId,
        store_id: storeId,
        quantity,
        special_instructions: specialInstructions || undefined,
      };
      console.log('Request payload:', payload);
      const response = await axios.post<CartResponse>(
        `${API_URL}/add/`,
        payload,
        { headers }
      );
      console.log('addToCart API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('CartService.addToCart error:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url
      });
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * @param cartItemId - Cart item ID (cart_item_id from API response)
   * @param quantity - New quantity
   */
  async updateCartItem(cartItemId: number, quantity: number): Promise<CartItemResponse> {
    try {
      const headers = headerService.getHeaders();
      const response = await axios.put<CartItemResponse>(
        `${API_URL}/items/${cartItemId}/`,
        { quantity },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param cartItemId - Cart item ID (cart_item_id from API response)
   */
  async removeCartItem(cartItemId: number): Promise<void> {
    try {
      const headers = headerService.getHeaders();
      await axios.delete(`${API_URL}/items/${cartItemId}/remove/`, { headers });
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    try {
      const headers = headerService.getHeaders();
      await axios.post(`${API_URL}/clear/`, {}, { headers });
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Sync local cart items to API
   * This will add all items from local cart to API cart
   * @param items - Array of cart items with product_id and inventory_id
   */
  async syncCart(items: Array<{
    product_id: number;
    inventory_id: number;
    quantity: number;
    special_instructions?: string;
  }>): Promise<void> {
    try {
      // Add each item to the API cart
      for (const item of items) {
        await this.addToCart(
          item.product_id,
          item.inventory_id,
          item.quantity,
          item.special_instructions
        );
      }
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }
}

export const cartService = new CartService();

