import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/products`;

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

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get(API_URL);
      // Ensure we're getting an array from the response
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
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: token ? { Authorization: token } : {},
      });
      
      // Handle different response formats
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
};
