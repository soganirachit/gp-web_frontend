import axios from 'axios';
import { getApiUrl } from '../config/api.config';
import { headerService } from './headers.service';

// Ensure API URL includes /api/v1 if not already in base URL
const getFaqApiUrl = () => {
  const baseUrl = getApiUrl();
  // If base URL already includes /api/v1, don't add it again
  if (baseUrl.includes('/api/v1')) {
    return `${baseUrl}/support/faqs`;
  }
  // Otherwise, add /api/v1
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
      const headers = headerService.getHeaders();
      const response = await axios.get<FAQResponse>(API_URL, { headers });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      console.error('FAQ API returned unsuccessful response:', response.data);
      return [];
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      // Return empty array on error to prevent further errors
      return [];
    }
  }

  async getFaqById(id: number): Promise<FAQ | null> {
    try {
      const headers = headerService.getHeaders();
      const response = await axios.get<FAQResponse>(API_URL, { headers });
      
      if (response.data.success && response.data.data) {
        const faq = response.data.data.find(f => f.id === id);
        return faq || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching FAQ with ID ${id}:`, error);
      return null;
    }
  }
}

export const faqService = new FAQService(); 