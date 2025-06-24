import axios from "axios";

import { Product } from "./storeProduct.service";


const API_URL =  import.meta.env.VITE_API_BASE_URL


export const getSortedProducts = async (sortBy: string): Promise<Product[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/sortProducts/?sortType=${sortBy}`
    );
    return response.data.map((item: any) => ({
      category: item.category ?? "",
      ...item,
    }));
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to load products");
  }
};


