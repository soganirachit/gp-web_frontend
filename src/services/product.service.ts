import { AxiosError } from "axios";
import api from "./api";

// Product API endpoints - using the configured api instance
// The api instance baseURL should be: http://185.137.122.250:8083/api/v1
// So we use relative paths like '/products/...'
const PRODUCTS_BASE = '/products';

export interface Product {
  id: string;
  productId?: string;
  name: string;
  sku?: string;
  description: string;
  sellingPrice: number;
  imagesUrl?: string | string[];
  tags: string[];
  subcategories?: string[];
  isAvailable: boolean;
  weight?: number | null;
  margin?: number;
  profit?: number;
  costOfGoods?: number;
  noOfSticks?: number;
  contents?: Array<{
    id: string;
    name: string;
    quantity: number;
    description?: string;
  }>;
  category: string;
  type?: string;
  allowedSubscriptionType?: string;
  surcharge?: number;
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean | unknown;
  isStore?: boolean;
  isDaily?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color_code?: string;
  parent?: number | null;
  display_order?: number;
  is_active?: boolean;
  is_featured?: boolean;
  subcategories_count?: number;
  products_count?: number;
  created_at?: string;
}

export interface ProductLabel {
  id: number;
  name: string;
  slug: string;
  color_code: string;
  icon: string;
}

export interface BestSeller {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description?: string;
  category_name: string;
  availability_type: string;
  base_price: string;
  sale_price: string | null;
  current_price: number;
  effective_price: string;
  discount_percentage: number;
  primary_image: string | null;
  is_featured: boolean;
  is_best_seller: boolean;
  is_perishable: boolean;
  unit: string;
  labels: ProductLabel[];
  in_stock: boolean;
}

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await api.get(PRODUCTS_BASE);
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error("Unexpected response format:", response.data);
        return [];
      }
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await api.get(`${PRODUCTS_BASE}/${id}`);
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data;
      }
      throw new Error("Invalid response format");
    } catch (error: unknown) {
      console.error("Error fetching product:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getProductBySlug(slug: string): Promise<any> {
    try {
      const response = await api.get(`${PRODUCTS_BASE}/${slug}`);
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data) {
        return response.data;
      }
      throw new Error("Invalid response format");
    } catch (error: unknown) {
      console.error("Error fetching product by slug:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getCategories(storeId?: number, availabilityType?: string, signal?: AbortSignal): Promise<Category[]> {
    try {
      const params: Record<string, any> = {};
      if (storeId) params.store_id = storeId;
      if (availabilityType) params.availability_type = availabilityType;

      const response = await api.get(`${PRODUCTS_BASE}/categories/`, { params, signal });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error("Unexpected response format:", response.data);
        return [];
      }
    } catch (error: unknown) {
      console.error("Error fetching categories:", error);
      if (error instanceof AxiosError && (error.code === 'ERR_CANCELED' || error.name === 'AbortError')) {
        return [];
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getBestSellers(storeId?: number, signal?: AbortSignal): Promise<BestSeller[]> {
    try {
      const params: Record<string, any> = {};
      if (storeId) params.store_id = storeId;

      const response = await api.get(`${PRODUCTS_BASE}/best-sellers/`, { params, signal });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error("Unexpected response format:", response.data);
        return [];
      }
    } catch (error: unknown) {
      console.error("Error fetching best sellers:", error);
      if (error instanceof AxiosError && (error.code === 'ERR_CANCELED' || error.name === 'AbortError')) {
        return [];
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getProductsByCategory(categorySlug: string, storeId?: number, availabilityType?: string): Promise<any[]> {
    try {
      const params: Record<string, any> = { category: categorySlug };
      if (storeId) params.store_id = storeId;
      if (availabilityType) params.availability_type = availabilityType;

      const response = await api.get(`${PRODUCTS_BASE}/`, { params });

      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }

      console.error("Unexpected response format:", response.data);
      return [];
    } catch (error: unknown) {
      if (error instanceof AxiosError && (error.code === 'ERR_CANCELED' || error.name === 'AbortError')) {
        return [];
      }
      console.error("Error fetching products by category:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  // Calls GET api/v1/products/ with optional ordering param
  // ordering="-order_count" → Premium Packs (descending by order count)
  // ordering=undefined      → All Packs (no ordering, plain list)
  async getProductsByOrdering(ordering?: string, storeId?: number, signal?: AbortSignal): Promise<BestSeller[]> {
    try {
      const params: Record<string, any> = {};
      if (ordering) params.ordering = ordering;
      if (storeId) params.store_id = storeId;

      const response = await api.get(`${PRODUCTS_BASE}/`, { params, signal });

      // Handle paginated response: { count, next, previous, results: [...] }
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      // Handle success wrapper: { success: true, data: [...] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // Handle direct array
      if (Array.isArray(response.data)) {
        return response.data;
      }

      console.error("Unexpected response format:", response.data);
      return [];
    } catch (error: unknown) {
      console.error("Error fetching products by ordering:", error);
      if (error instanceof AxiosError && (error.code === 'ERR_CANCELED' || error.name === 'AbortError')) {
        return [];
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },
};

/**
 * Price display helpers — use effective_price for all customer-facing amounts.
 * base_price = MRP, effective_price = what customer pays (store-level).
 * Show struck-through MRP and discount badge only when effective_price < base_price.
 */
export function getEffectivePrice(item: any): number {
  if (item == null) return 0;
  const eff = item.effective_price != null ? parseFloat(String(item.effective_price)) : NaN;
  if (!Number.isNaN(eff)) return eff;
  if (item.current_price !== undefined) return Number(item.current_price);
  if (item.sellingPrice !== undefined) return Number(item.sellingPrice);
  return 0;
}

export function getBasePrice(item: any): number {
  if (item == null) return 0;
  const base = item.base_price != null ? parseFloat(String(item.base_price)) : NaN;
  return Number.isNaN(base) ? 0 : base;
}

export function showStrikeBase(item: any): boolean {
  const base = getBasePrice(item);
  const effective = getEffectivePrice(item);
  return base > 0 && effective < base;
}