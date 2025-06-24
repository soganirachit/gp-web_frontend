import axios from "axios";
import { Product } from "./product.service";


const API_URL =  import.meta.env.VITE_API_BASE_URL

export const getDailyProducts = async (sortBy: string): Promise<Product[]> => {
  try {
    const response = await axios.get(
      `${API_URL}/sortProducts/daily/?sortType=${sortBy}`
    );
    return response.data.map((item: any) => ({
      category: item.category ?? "",
      ...item,
    }));
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to load products");
  }
};