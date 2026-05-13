import { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";

// Product API endpoints - using the configured api instance
// The api instance baseURL should be: http://185.137.122.250:8083/api/v1
// So we use relative paths like '/products/...'
const PRODUCTS_BASE = '/products';

export const PRODUCT_AVAILABILITY_STORE = "store";

/**
 * GP Daily catalog: `GET /products/?availability_type=daily,both` (include `daily` and `both` rows).
 * Do not send bare `daily` alone — backend list endpoints expect this combined filter.
 */
export const PRODUCT_AVAILABILITY_GP_DAILY_LIST = "daily,both";

/**
 * Same value as {@link PRODUCT_AVAILABILITY_GP_DAILY_LIST} — legacy name used by some GP Daily screens.
 */
export const PRODUCT_AVAILABILITY_DAILY = PRODUCT_AVAILABILITY_GP_DAILY_LIST;

function apiRootProtocol(): string {
  const root = getApiUrl().replace(/\/$/, "");
  try {
    const base = root.includes("://") ? root : `https://${root}`;
    return new URL(base).protocol;
  } catch {
    return "https:";
  }
}

function normalizeProductListNextUrl(nextOrPath: string): string {
  const root = getApiUrl().replace(/\/$/, "");
  const scheme = apiRootProtocol();
  const s = nextOrPath.trim();
  if (!s) return root;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      u.protocol = scheme;
      return u.href;
    } catch {
      return s;
    }
  }
  const path = s.startsWith("/") ? s : `/${s}`;
  if (path.startsWith("/api/")) {
    try {
      const baseForOrigin = root.includes("://") ? root : `https://${root}`;
      const origin = new URL(baseForOrigin).origin;
      return `${origin}${path}`;
    } catch {
      return `${root}${path}`;
    }
  }
  return `${root}${path}`;
}

/** Default page size for store / browse product grids (matches web orders “load 6”). */
export const STORE_PRODUCT_LIST_PAGE_SIZE = 6;

/** One page from GET /products/ or a paginated `next` URL (DRF `{ results, next }`, etc.). */
export function extractProductListPage(data: unknown): {
  results: any[];
  nextUrl: string | null;
} {
  const d = data as Record<string, unknown> | null | undefined;
  if (!d) return { results: [], nextUrl: null };

  const innerData =
    d.data != null && typeof d.data === "object" && !Array.isArray(d.data)
      ? (d.data as Record<string, unknown>)
      : null;

  let results: any[] = [];
  if (Array.isArray(d.results)) results = d.results as any[];
  else if (innerData && Array.isArray(innerData.results))
    results = innerData.results as any[];
  else if (d.success && Array.isArray(d.data)) results = d.data as any[];
  else if (Array.isArray(d.data)) results = d.data as any[];
  else if (Array.isArray(d)) results = d as any[];

  let nextRaw: unknown = d.next;
  if (
    (typeof nextRaw !== "string" || !nextRaw.trim()) &&
    innerData &&
    typeof innerData.next === "string"
  ) {
    nextRaw = innerData.next;
  }

  const nextUrl =
    typeof nextRaw === "string" && nextRaw.trim()
      ? normalizeProductListNextUrl(nextRaw.trim())
      : null;
  return { results, nextUrl };
}

async function fetchAllProductPages(
  path: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<any[]> {
  const allResults: any[] = [];
  let nextUrl: string | null = null;
  const firstResponse = await api.get(path, { params, signal });
  let data = firstResponse.data;
  const extractResults = (d: any): any[] => {
    if (d && Array.isArray(d.results)) return d.results;
    if (d && d.success && Array.isArray(d.data)) return d.data;
    if (Array.isArray(d)) return d;
    return [];
  };
  allResults.push(...extractResults(data));
  nextUrl = data?.next ?? null;
  while (nextUrl) {
    const res = await api.get(normalizeProductListNextUrl(String(nextUrl)), {
      signal,
    });
    data = res.data;
    allResults.push(...extractResults(data));
    nextUrl = data?.next ?? null;
  }
  return allResults;
}

export interface Product {
  id: string;
  /** URL segment for GET /products/{slug}/ (customer API); numeric id alone is not valid for that endpoint. */
  slug?: string;
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
  /** From list API `category_name` (display). */
  categoryName?: string;
  availability_type?: string;
  labels?: Array<{
    name?: string;
    slug?: string;
    color_code?: string;
    icon?: string;
  }>;
}

function legacyCategoryCodeFromCategoryName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("exotic")) return "EXOTIC";
  if (n.includes("puja") || n.includes("pooja")) return "PUJA";
  return "GENERAL";
}

/** Map GET /products/ DRF row (`category_name`, `current_price`, …) to {@link Product}. */
export function mapGpDailyCatalogRowToProduct(
  row: Record<string, unknown>,
): Product {
  const categoryName = String(row.category_name ?? row.category ?? "").trim();
  const id = String(row.id ?? row.slug ?? "");
  const slug = row.slug != null ? String(row.slug) : undefined;
  const primary = row.primary_image;
  const imagesUrl =
    typeof primary === "string" && primary
      ? [primary]
      : Array.isArray(row.imagesUrl)
        ? (row.imagesUrl as string[])
        : undefined;
  const price = Number(
    row.current_price ??
      row.sale_price ??
      row.base_price ??
      row.sellingPrice ??
      0,
  );
  const desc = String(
    row.short_description ?? row.description ?? "",
  ).trim();
  const avail = String(row.availability_type ?? "").toLowerCase();
  const labelsRaw = row.labels;
  const labels = Array.isArray(labelsRaw)
    ? (labelsRaw as Product["labels"])
    : undefined;
  return {
    id,
    slug,
    name: String(row.name ?? "").trim() || "Product",
    description: desc || "—",
    sellingPrice: Number.isFinite(price) ? price : 0,
    imagesUrl,
    tags: [],
    subcategories: [],
    isAvailable:
      row.is_available !== false &&
      row.in_stock !== false &&
      row.is_available !== 0,
    category: (
      categoryName
        ? legacyCategoryCodeFromCategoryName(categoryName)
        : String(row.category ?? "GENERAL")
    ).toUpperCase(),
    categoryName: categoryName || undefined,
    availability_type: avail || undefined,
    labels,
    isActive: row.is_active !== false,
  };
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
  /**
   * GET /products/ — optional `availability_type` (e.g. `daily,both` for GP Daily catalog, `store` for store).
   */
  async getAllProducts(opts?: {
    storeId?: number;
    availabilityType?: string;
    signal?: AbortSignal;
  }): Promise<Product[]> {
    try {
      const params: Record<string, string | number> = {};
      if (opts?.storeId) params.store_id = opts.storeId;
      if (opts?.availabilityType) params.availability_type = opts.availabilityType;

      const response = await api.get(`${PRODUCTS_BASE}/`, {
        params: Object.keys(params).length ? params : undefined,
        signal: opts?.signal,
      });
      const d = response.data;
      // Paginated DRF: { count, next, previous, results: [...] }
      if (d?.results && Array.isArray(d.results)) {
        return d.results;
      }
      if (d?.success && Array.isArray(d.data)) {
        return d.data;
      }
      if (Array.isArray(d?.data)) {
        return d.data;
      }
      if (Array.isArray(d)) {
        return d;
      }
      console.error("Unexpected response format:", d);
      return [];
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  /**
   * GET /products/ and follow `next` until exhausted — use for GP Daily home “All packs”.
   */
  async getAllProductsPaged(opts?: {
    storeId?: number;
    availabilityType?: string;
    signal?: AbortSignal;
    pageChunkSize?: number;
  }): Promise<any[]> {
    const params: Record<string, unknown> = {};
    if (opts?.storeId != null && Number.isFinite(Number(opts.storeId))) {
      params.store_id = Number(opts.storeId);
    }
    if (opts?.availabilityType) params.availability_type = opts.availabilityType;
    const chunk = opts?.pageChunkSize ?? 100;
    if (chunk > 0) {
      params.page_size = chunk;
      params.limit = chunk;
    }
    return fetchAllProductPages(`${PRODUCTS_BASE}/`, params, opts?.signal);
  },

  /** Prefer `getProductBySlug` for customer flows — public catalog detail is GET /products/{slug}/ per API (numeric id returns 404). */
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

  async getProductBySlug(
    slug: string,
    opts?: { storeId?: number },
  ): Promise<any> {
    try {
      const params =
        opts?.storeId != null && Number.isFinite(Number(opts.storeId))
          ? { store_id: Number(opts.storeId) }
          : undefined;
      const response = await api.get(`${PRODUCTS_BASE}/${encodeURIComponent(slug)}/`, {
        params,
      });
      const d = response.data;
      if (d && typeof d === "object" && !Array.isArray(d)) {
        if ("success" in d && d.success && d.data != null) return d.data;
        if ("data" in d && d.data != null) return d.data;
        return d;
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
        throw error;
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
        throw error;
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  async getProductsByCategory(
    categorySlug: string,
    storeId?: number,
    availabilityType?: string,
    limit: number = 100,
    signal?: AbortSignal,
  ): Promise<any[]> {
    try {
      const params: Record<string, unknown> = { category: categorySlug };
      if (storeId) params.store_id = storeId;
      if (availabilityType) params.availability_type = availabilityType;
      if (limit > 0) {
        params.limit = limit;
        params.page_size = limit;
      }
      return await fetchAllProductPages(`${PRODUCTS_BASE}/`, params, signal);
    } catch (error: unknown) {
      if (error instanceof AxiosError && (error.code === 'ERR_CANCELED' || error.name === 'AbortError')) {
        throw error;
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
  async getProductsByOrdering(
    ordering?: string,
    storeId?: number,
    signal?: AbortSignal,
    availabilityType?: string,
  ): Promise<BestSeller[]> {
    try {
      const params: Record<string, any> = {};
      if (ordering) params.ordering = ordering;
      if (storeId) params.store_id = storeId;
      if (availabilityType) params.availability_type = availabilityType;

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
        throw error;
      }
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  },

  /**
   * First page of GET /products/ for browse grids (does not follow `next`).
   * Use {@link productService.getStoreProductListNextPage} for infinite scroll.
   */
  async getStoreProductListFirstPage(opts: {
    categorySlug?: string | null;
    ordering?: string;
    storeId?: number;
    availabilityType?: string;
    pageSize?: number;
    signal?: AbortSignal;
  }): Promise<{ products: any[]; nextUrl: string | null }> {
    const pageSize = opts.pageSize ?? STORE_PRODUCT_LIST_PAGE_SIZE;
    const params: Record<string, unknown> = {
      page_size: pageSize,
      limit: pageSize,
    };
    if (opts.categorySlug) params.category = opts.categorySlug;
    if (opts.ordering) params.ordering = opts.ordering;
    if (opts.storeId != null && Number.isFinite(Number(opts.storeId))) {
      params.store_id = Number(opts.storeId);
    }
    if (opts.availabilityType) params.availability_type = opts.availabilityType;
    const res = await api.get(`${PRODUCTS_BASE}/`, {
      params,
      signal: opts.signal,
    });
    const { results, nextUrl } = extractProductListPage(res.data);
    return { products: results, nextUrl };
  },

  async getStoreProductListNextPage(
    nextPageUrl: string,
    signal?: AbortSignal,
  ): Promise<{ products: any[]; nextUrl: string | null }> {
    const res = await api.get(normalizeProductListNextUrl(nextPageUrl), {
      signal,
    });
    const { results, nextUrl: followingUrl } = extractProductListPage(res.data);
    return { products: results, nextUrl: followingUrl };
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
        throw error;
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
    ordering?: string,
    availabilityType?: string,
  ): Promise<BestSeller[]> {
    try {
      const params: Record<string, string | number> = { label: labelSlug };
      if (storeId) params.store_id = storeId;
      if (ordering) params.ordering = ordering;
      if (availabilityType) params.availability_type = availabilityType;

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
        throw error;
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
  async searchProducts(
    search: string,
    storeId?: number,
    signal?: AbortSignal,
    availabilityType?: string,
  ): Promise<BestSeller[]> {
    try {
      const params: Record<string, any> = { search };
      if (storeId) params.store_id = storeId;
      if (availabilityType) params.availability_type = availabilityType;

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
 * Absolute image URL for catalog payloads (`GET /products/`, `GET /products/{slug}/`).
 * Uses `primary_image`, then `imagesUrl`, then `images[].image`, with `/media/` prefix for relative paths.
 */
export function resolveProductImageUrl(item: Record<string, unknown> | null | undefined): string {
  if (item == null) return "/placeholder.svg";

  const convertToFullUrl = (imagePath: string): string => {
    if (!imagePath) return "/placeholder.svg";
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    const apiUrl = getApiUrl();
    const baseUrl = apiUrl.replace("/api/v1", "");
    if (imagePath.startsWith("src/")) {
      const cleanPath = imagePath.replace("src/", "");
      return `${baseUrl}/media/${cleanPath}`;
    }
    return `${baseUrl}/media/${imagePath}`;
  };

  const primary = item.primary_image;
  if (typeof primary === "string" && primary) {
    return convertToFullUrl(primary);
  }

  const imagesUrl = item.imagesUrl;
  if (Array.isArray(imagesUrl) && imagesUrl[0]) {
    return convertToFullUrl(String(imagesUrl[0]));
  }
  if (typeof imagesUrl === "string" && imagesUrl) {
    return convertToFullUrl(imagesUrl);
  }

  const imgs = item.images as Array<{ image?: string }> | undefined;
  if (imgs?.[0]?.image) {
    return convertToFullUrl(imgs[0].image);
  }

  return "/placeholder.svg";
}

/**
 * Thumbnail for PDP size-variant chips — uses variant image fields when present, else product hero.
 */
export function resolveVariantChipImageUrl(
  variant: Record<string, unknown> | null | undefined,
  product: Record<string, unknown> | null | undefined,
): string {
  if (variant == null) return resolveProductImageUrl(product ?? {});
  const direct =
    (typeof variant.primary_image === "string" && variant.primary_image.trim()
      ? variant.primary_image
      : null) ||
    (typeof variant.image === "string" && variant.image.trim() ? variant.image : null) ||
    (typeof variant.thumbnail === "string" && variant.thumbnail.trim()
      ? variant.thumbnail
      : null) ||
    (typeof variant.thumbnail_url === "string" && variant.thumbnail_url.trim()
      ? variant.thumbnail_url
      : null);
  if (direct) {
    return resolveProductImageUrl({ primary_image: direct } as Record<string, unknown>);
  }
  return resolveProductImageUrl(product ?? {});
}

/** One slide in the catalog PDP image carousel (main + thumbnails). */
export type CatalogPdpGallerySlide = { src: string; alt: string };

/**
 * Build PDP gallery slides: selected variant `image` when set (only that variant — never
 * other variants’ images), then product `primary_image`, then `images[]`. Deduplicates by resolved URL.
 */
export function buildCatalogPdpGalleryImages(
  product: Record<string, unknown> | null | undefined,
  selectedVariant: Record<string, unknown> | null | undefined,
): CatalogPdpGallerySlide[] {
  if (product == null) {
    return [{ src: "/placeholder.svg", alt: "Product" }];
  }
  const productName = String(product.name ?? "Product");
  const slides: CatalogPdpGallerySlide[] = [];
  const seen = new Set<string>();

  const pushRaw = (url: unknown, alt: string) => {
    const raw = url != null ? String(url).trim() : "";
    if (!raw) return;
    const src = resolveProductImageUrl({ primary_image: raw } as Record<string, unknown>);
    if (!src || src === "/placeholder.svg" || seen.has(src)) return;
    seen.add(src);
    slides.push({ src, alt });
  };

  const variantsRaw = product.variants;
  const sizeVariants = Array.isArray(variantsRaw)
    ? (variantsRaw as unknown[]).filter((v: any) => {
        if (v?.is_active === false) return false;
        const t = String(v?.variant_type ?? "size").toLowerCase();
        return t === "size";
      })
    : [];
  const sortedVariants = [...sizeVariants].sort(
    (a: any, b: any) => (Number(a?.display_order) || 0) - (Number(b?.display_order) || 0),
  );
  const selId = selectedVariant?.id != null ? selectedVariant.id : null;
  const selectedRow =
    selId != null
      ? sortedVariants.find((v: any) => String(v?.id) === String(selId))
      : null;

  let primaryPushed = false;
  const selIm =
    selectedRow && (selectedRow as any).image != null
      ? String((selectedRow as any).image ?? "").trim()
      : "";
  if (selIm) {
    pushRaw(selIm, `${productName} – ${String((selectedRow as any).name || "Variant")}`);
  } else {
    pushRaw(product.primary_image, productName);
    primaryPushed = true;
  }

  if (!primaryPushed) {
    pushRaw(product.primary_image, productName);
  }

  const imgs = product.images;
  if (Array.isArray(imgs)) {
    const sortedImgs = [...imgs].sort(
      (a: any, b: any) => (Number(a?.display_order) || 0) - (Number(b?.display_order) || 0),
    );
    for (const img of sortedImgs) {
      pushRaw((img as any)?.image, String((img as any)?.alt_text || productName));
    }
  }

  if (slides.length === 0) {
    slides.push({ src: "/placeholder.svg", alt: productName });
  }
  return slides;
}

/** PDP rupee string — avoids rounding fractional prices (e.g. 0.8 → ₹1). */
export function formatRupeePdpAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  const s = r.toFixed(2);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

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

/**
 * Keep price rows stable on cards: if payable price is already wide,
 * hide struck-through MRP on cards and show it only on detail pages.
 */
export function showStrikeBaseOnCard(item: any): boolean {
  if (!showStrikeBase(item)) return false;
  const effective = getEffectivePrice(item);
  if (effective >= 1000) return false;
  const priceText = `₹${effective}`;
  return priceText.length <= 7;
}