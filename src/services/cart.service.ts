import api from "./api";
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
  variant?: {
    id: number;
    name: string;
    variant_type: string;
    sku: string;
  } | null;
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
  /** Packaging and other surcharges (non-tax line items). */
  surcharge_amount?: string;
  /** Cart address used for distance-based delivery_fee; null until set via POST /cart/delivery-address/. */
  delivery_address_id?: number | null;
  total: string;
  coupon_code?: string;
  coupon_discount?: string;
}

export interface CartResponse {
  success: boolean;
  message: string;
  data: CartData;
}

/** Response from POST /cart/switch-store/ — migrates cart to the new store. */
export interface CartSwitchStoreResponse {
  success?: boolean;
  message?: string;
  data?: {
    kept_items?: unknown[];
    removed_items?: unknown[];
  };
  kept_items?: unknown[];
  removed_items?: unknown[];
}

class CartService {
  /**
   * Get user's cart
   */
  async getCart(): Promise<CartResponse> {
    try {
      const headers = headerService.getHeaders();
      const response = await api.get<CartResponse>(`${API_URL}/`, { headers });
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
   * Set delivery address on the cart and recalculate distance-based delivery_fee.
   * Returns the full cart payload (same shape as GET /cart/).
   */
  async setCartDeliveryAddress(addressId: number): Promise<CartData> {
    try {
      const headers = headerService.getHeaders();
      const response = await api.post<CartResponse | CartData>(`${API_URL}/delivery-address/`, { address_id: addressId }, { headers });
      const body = response.data as CartResponse | CartData;
      if (body && typeof body === 'object' && 'data' in body && body.data && typeof body.data === 'object' && 'items' in body.data) {
        return body.data as CartData;
      }
      if (body && typeof body === 'object' && 'items' in body && Array.isArray((body as CartData).items)) {
        return body as CartData;
      }
      throw new Error('Unexpected delivery-address cart response shape');
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Switch cart to another store. Items available at the new store are kept (prices updated);
   * unavailable items are removed. Call after POST /stores/switch/ with the same store_id.
   */
  async switchCartStore(storeId: number): Promise<CartSwitchStoreResponse> {
    try {
      const headers = headerService.getHeaders();
      const response = await api.post<CartSwitchStoreResponse>(
        `${API_URL}/switch-store/`,
        { store_id: storeId },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Add item to cart
   * @param productId - Product ID
   * @param storeId - Store ID
   * @param quantity - Quantity to add
   * @param specialInstructions - Optional special instructions/customized message
   * @param variantId - Optional variant ID (for products with size/type variants); sent when backend supports it
   */
  async addToCart(
    productId: number,
    storeId: number,
    quantity: number,
    specialInstructions?: string,
    variantId?: number
  ): Promise<CartResponse> {
    try {
      const headers = headerService.getHeaders();
      const payload: Record<string, unknown> = {
        product_id: productId,
        store_id: storeId,
        quantity,
        special_instructions: specialInstructions || undefined,
      };
      if (variantId != null) payload.variant_id = variantId;
      const response = await api.post<CartResponse>(
        `${API_URL}/add/`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Update cart item quantity and special instructions
   * @param cartItemId - Cart item ID (cart_item_id from API response)
   * @param quantity - New quantity
   * @param specialInstructions - Optional special instructions/customized message
   */
  async updateCartItem(cartItemId: number, quantity: number, specialInstructions?: string): Promise<CartItemResponse> {
    try {
      const headers = headerService.getHeaders();
      const payload: { quantity: number; special_instructions?: string } = { quantity };
      if (specialInstructions !== undefined) {
        payload.special_instructions = specialInstructions;
      }
      const response = await api.put<CartItemResponse>(
        `${API_URL}/items/${cartItemId}/`,
        payload,
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
      await api.delete(`${API_URL}/items/${cartItemId}/remove/`, { headers });
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
      await api.post(`${API_URL}/clear/`, {}, { headers });
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }

  /**
   * Sync local cart items to API.
   * Adds each item to the API cart. Uses storeId for all items (single-store cart).
   * @param items - Array of cart items with product_id, quantity; optionally variant_id when backend supports it
   * @param storeId - Store ID (required for cart add)
   */
  async syncCart(
    items: Array<{
      product_id: number;
      variant_id?: number;
      quantity: number;
      special_instructions?: string;
    }>,
    storeId: number
  ): Promise<void> {
    try {
      for (const item of items) {
        await this.addToCart(
          item.product_id,
          storeId,
          item.quantity,
          item.special_instructions,
          item.variant_id
        );
      }
    } catch (error: any) {
      headerService.handleError(error);
      throw error;
    }
  }
}

export const cartService = new CartService();

