import axios, { AxiosError } from "axios";


const baseUrl =  import.meta.env.VITE_API_BASE_URL

const API_URL = `${baseUrl}/storeProducts/store`;
export interface storeProducts {
  id: string;
  name: string;
  description: string;
  imagesUrl?: string;
  sellingPrice: number;
  type: string;
  contents: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

class storesProductsService {
 

  async getAllStoreProducts(): Promise<storeProducts[]> {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  }

  async getBasePackById(id: string): Promise<storeProducts> {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error || error instanceof AxiosError) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  }
}

export const storeProductGet = new storesProductsService();
