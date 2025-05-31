import axios from 'axios';

// Add a fallback value for the API base URL with the correct port
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  toBeDisplayed: 'VISIBLE' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
}

class FAQService {
  async getAllFaqs(): Promise<FAQ[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/faq`);
      // Check if response.data is an array, if not, return an empty array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      // Return empty array on error to prevent further errors
      return [];
    }
  }

  async getFaqById(id: string): Promise<FAQ | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/faq/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching FAQ with ID ${id}:`, error);
      return null;
    }
  }
}

export const faqService = new FAQService(); 