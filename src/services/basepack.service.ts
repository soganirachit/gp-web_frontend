import axios, { AxiosError } from "axios";
import { getApiUrl } from "../config/api.config";

const API_URL = `${getApiUrl()}/basepacks`;
export interface BasePack {
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

class BasePackService {
  // private getHeaders() {
  //   const token = localStorage.getItem("token");
  //   if (!token) {
  //     throw new Error("Authentication required");
  //   }
  //   return {
  //     Authorization: token,
  //     "Content-Type": "application/json",
  //   };
  // }

  async getAllBasePacks(): Promise<BasePack[]> {
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

  async getProductById(id: string): Promise<BasePack> {
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

export const basePackService = new BasePackService();
