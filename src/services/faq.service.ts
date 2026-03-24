import api from './api';
import { getApiUrl } from '../config/api.config';

const getFaqApiUrl = () => {
  const baseUrl = getApiUrl();
  if (baseUrl.includes('/api/v1')) {
    return `${baseUrl}/support/faqs`;
  }
  return `${baseUrl}/api/v1/support/faqs`;
};

const API_URL = getFaqApiUrl();

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  category_display: string;
  sort_order: number;
}

export interface FAQResponse {
  success: boolean;
  message: string;
  data: FAQ[];
}

class FAQService {
  async getAllFaqs(): Promise<FAQ[]> {
    try {
      const response = await api.get<FAQResponse>(API_URL);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  }
}

export const faqService = new FAQService();
