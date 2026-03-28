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
  description?: string;
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
  // ordering=undefined → All Packs (no ordering, plain list)
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

  /** GET /products/labels/ — active label definitions (slug, name, …). */
  async listProductLabels(signal?: AbortSignal): Promise<ProductLabel[]> {
    try {
      const response = await api.get(`${PRODUCTS_BASE}/labels/`, { signal });
      const d = response.data;
      if (d?.success && Array.isArray(d.data)) return d.data;
      if (Array.isArray(d?.data)) return d.data;
      if (Array.isArray(d)) return d;
      console.error("Unexpected labels response format:", d);
      return [];
    } catch (error: unknown) {
      console.error("Error fetching product labels:", error);
      if (error instanceof AxiosError && (error.code === "ERR_CANCELED" || error.name === "AbortError")) {
        return [];
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  /**
   * GET /products/?label=<slug> — products with that label (Postman: List Products, query `label`).
   * e.g. labelSlug `premium` for Premium Packs.
   */
  async getProductsByLabel(
    labelSlug: string,
    storeId?: number,
    signal?: AbortSignal,
    ordering?: string
  ): Promise<BestSeller[]> {
    try {
      const params: Record<string, string | number> = { label: labelSlug };
      if (storeId) params.store_id = storeId;
      if (ordering) params.ordering = ordering;

      const response = await api.get(`${PRODUCTS_BASE}/`, { params, signal });

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
      console.error("Error fetching products by label:", error);
      if (error instanceof AxiosError && (error.code === "ERR_CANCELED" || error.name === "AbortError")) {
        return [];
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  // Normalize API product object to BestSeller-like shape for consistent UI
  normalizeToBestSeller(p: any): BestSeller {
    const id = p.id != null ? Number(p.id) : 0;
    const name = p.name || '';
    const slug = p.slug || String(id) || '';
    const primary_image =
      p.primary_image ?? (Array.isArray(p.imagesUrl) ? p.imagesUrl[0] : p.imagesUrl) ?? p.image ?? null;
    const base_price =
      p.base_price != null ? String(p.base_price) : p.mrp != null ? String(p.mrp) : '0';
    const current_price =
      p.current_price != null ? Number(p.current_price) : p.sellingPrice != null ? Number(p.sellingPrice) : 0;
    const effective_price =
      p.effective_price != null ? String(p.effective_price) : String(current_price);
    return {
      id,
      name,
      slug,
      sku: p.sku || '',
      short_description: p.short_description ?? p.description ?? undefined,
      description: p.description,
      category_name: p.category_name ?? p.category ?? '',
      availability_type: p.availability_type ?? 'store',
      base_price,
      sale_price: p.sale_price ?? null,
      current_price,
      effective_price,
      discount_percentage: p.discount_percentage ?? 0,
      primary_image,
      is_featured: p.is_featured ?? false,
      is_best_seller: p.is_best_seller ?? false,
      is_perishable: p.is_perishable ?? false,
      unit: p.unit ?? 'pack',
      labels: Array.isArray(p.labels) ? p.labels : [],
      in_stock: p.in_stock ?? true,
    };
  },

  // Search products using GET /products/ with ?search= query (and optional store_id)
  async searchProducts(search: string, storeId?: number, signal?: AbortSignal): Promise<BestSeller[]> {
    try {
      const params: Record<string, any> = { search };
      if (storeId) params.store_id = storeId;

      const response = await api.get(`${PRODUCTS_BASE}/`, { params, signal });
      const data = response.data;

      let list: any[] = [];
      if (data && Array.isArray(data.results)) {
        list = data.results;
      } else if (data && data.success && Array.isArray(data.data)) {
        list = data.data;
      } else if (data && Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data)) {
        list = data;
      } else if (data && data.data && Array.isArray(data.data.products)) {
        list = data.data.products;
      } else if (data && Array.isArray(data.products)) {
        list = data.products;
      } else if (data?.data && Array.isArray(data.data)) {
        list = data.data;
      } else if (data && Array.isArray(data.items)) {
        list = data.items;
      } else {
        console.warn("Search products: unexpected response shape", data);
        return [];
      }

      return list.map((p) => productService.normalizeToBestSeller(p));
    } catch (error: unknown) {
      console.error("Error searching products:", error);
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

/** Show strikethrough on base_price when discount applies. Prefer API discount_percentage when available. */
export function showStrikeBase(item: any): boolean {
  if (item?.discount_percentage != null && item.discount_percentage > 0) return true;
  const base = getBasePrice(item);
  const effective = getEffectivePrice(item);
  return base > 0 && effective < base;
}