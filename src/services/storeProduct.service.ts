import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/SubProducts/store`;

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  sellingPrice: number;
  type: string;
  allowedSubscriptionType: string;
  tags: string[];
  weight?: number;
  isAvailable: boolean;
}

export const storeProductService = {
  async getAllStoreProducts(): Promise<Product[]> {
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
};
