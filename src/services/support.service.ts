import api from "./api";
import { getApiUrl } from "../config/api.config";
import { headerService } from "./headers.service";

const API_URL = `${getApiUrl()}/support/tickets`;
const SUPPORT_API_URL = `${getApiUrl()}/support`;

export interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  description?: string; // Optional - not always present in list view
  status: string;
  priority: string;
  order_number?: string | null;
  created_at: string;
  updated_at: string;
  agent_requested?: boolean;
  callback_requested?: boolean;
  messages_count?: number;
  has_unread_by_customer?: boolean;
}

export interface SupportMessage {
  id: number;
  message: string;
  is_internal: boolean;
  is_from_customer?: boolean;
  created_by_name: string;
  created_at: string;
  image_url?: string | null;
}

export interface SupportTicketDetail {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  order_number?: string;
  order_id?: number;
  created_at: string;
  updated_at: string;
  messages: SupportMessage[];
  agent_requested?: boolean;
  callback_requested?: boolean;
  has_unread_by_customer?: boolean;
}

export interface EligibleOrder {
  id: number;
  order_number: string;
  status: string;
  delivered_at: string;
  total_amount: string;
  items_preview?: string; // Preview of items in the order
  created_at: string;
}

export interface TicketQuestionOption {
  value: string;
  label: string;
}

export interface TicketQuestion {
  id: string; // e.g., "issue_type", "affected_items", etc.
  question: string; // Question text
  type: 'choice' | 'text'; // Question type
  options?: TicketQuestionOption[]; // For choice type questions (array of {value, label})
  placeholder?: string; // For text type questions
}

export interface PredefinedAnswers {
  issue_type?: string; // From choices: wrong items / missing items / damaged / not delivered / quality / other
  affected_items?: string; // Text answer
  description?: string; // Text answer (API uses "description" not "problem_description")
  noticed_when?: string; // Text answer
}

class SupportService {
  /**
   * Get eligible orders for support (delivered in last 12 hours)
   */
  async getEligibleOrders(): Promise<EligibleOrder[]> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return [];
      }
      const response = await api.get<{ success: boolean; message: string; data: EligibleOrder[] }>(`${SUPPORT_API_URL}/eligible-orders/`);
      // Handle wrapped response structure
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      // Fallback: if response.data is directly an array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching eligible orders:', error);
      headerService.handleError(error);
      return [];
    }
  }

  /**
   * Get predefined ticket questions
   */
  async getTicketQuestions(): Promise<TicketQuestion[]> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return [];
      }
      const response = await api.get<{ success: boolean; message: string; data: TicketQuestion[] } | TicketQuestion[]>(`${SUPPORT_API_URL}/ticket-questions/`);
      console.log('Ticket questions API response:', response.data);
      
      // Handle wrapped response structure
      if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // Fallback: if response.data is directly an array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching ticket questions:', error);
      headerService.handleError(error);
      return [];
    }
  }

  /**
   * Get all support tickets for the current user
   */
  async getTickets(): Promise<SupportTicket[]> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return [];
      }
      const response = await api.get<{ count: number; next: string | null; previous: string | null; results: SupportTicket[] } | SupportTicket[]>(`${API_URL}/`);
      console.log('Tickets API response:', response.data);
      
      // Handle paginated response structure
      if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      // Fallback: if response.data is directly an array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
      headerService.handleError(error);
      return [];
    }
  }

  /**
   * Get ticket details with messages
   * @param ticketNumber - Ticket number
   */
  async getTicketDetails(ticketNumber: string): Promise<SupportTicketDetail | null> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return null;
      }
      const response = await api.get<
        { success: boolean; message: string; data: SupportTicketDetail } | SupportTicketDetail
      >(
        `${API_URL}/${ticketNumber}/`
      );

      const data = response.data;

      // Handle wrapped response structure: { success, message, data: {...ticket...} }
      if (data && typeof data === 'object' && 'data' in data) {
        return (data as { data: SupportTicketDetail }).data;
      }

      // Fallback: response is directly the ticket detail
      return data as SupportTicketDetail;
    } catch (error: any) {
      console.error('Error fetching ticket details:', error);
      headerService.handleError(error);
      return null;
    }
  }

  /**
   * Create a new support ticket with predefined answers
   * @param orderId - Order ID from eligible orders
   * @param predefinedAnswers - Answers to the 4 predefined questions
   * @param priority - Optional priority (default: "medium")
   */
  async createTicket(
    orderId: number,
    predefinedAnswers: PredefinedAnswers,
    priority: string = 'medium'
  ): Promise<SupportTicket | null> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return null;
      }
      const response = await api.post<{ success: boolean; message: string; data: SupportTicket } | SupportTicket>(
        `${API_URL}/create/`,
        {
          order_id: orderId,
          predefined_answers: predefinedAnswers,
          priority: priority,
        }
      );
      // Handle wrapped response structure
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      }
      // Fallback: if response.data is directly the ticket
      return response.data as SupportTicket;
    } catch (error: any) {
      console.error('Error creating support ticket:', error);
      headerService.handleError(error);
      return null;
    }
  }

  /**
   * Request agent for a ticket
   * @param ticketNumber - Ticket number
   */
  async requestAgent(ticketNumber: string): Promise<boolean> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return false;
      }
      await api.post(
        `${API_URL}/${ticketNumber}/request-agent/`,
        {}
      );
      return true;
    } catch (error: any) {
      console.error('Error requesting agent:', error);
      headerService.handleError(error);
      return false;
    }
  }

  /**
   * Request callback for a ticket
   * @param ticketNumber - Ticket number
   */
  async requestCallback(ticketNumber: string): Promise<boolean> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return false;
      }
      await api.post(
        `${API_URL}/${ticketNumber}/request-callback/`,
        {}
      );
      return true;
    } catch (error: any) {
      console.error('Error requesting callback:', error);
      headerService.handleError(error);
      return false;
    }
  }

  /**
   * Update ticket status (e.g., close ticket)
   * @param ticketNumber - Ticket number
   * @param status - New status (e.g., "closed")
   */
  async updateTicketStatus(ticketNumber: string, status: string): Promise<boolean> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return false;
      }
      await api.patch(
        `${API_URL}/${ticketNumber}/update/`,
        { status }
      );
      return true;
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      headerService.handleError(error);
      return false;
    }
  }

  /**
   * Add a message to a support ticket
   * @param ticketNumber - Ticket number
   * @param message - Message content (optional if image is provided)
   * @param imageFile - Image file to upload (optional)
   * @param isInternal - Whether the message is internal (default: false)
   */
  async addMessage(
    ticketNumber: string,
    message?: string,
    imageFile?: File,
    isInternal: boolean = false
  ): Promise<SupportMessage | null> {
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return null;
      }

      // If image is provided, use multipart/form-data
      if (imageFile) {
        const formData = new FormData();
        if (message) {
          formData.append('message', message);
        }
        formData.append('image', imageFile);
        formData.append('is_internal', isInternal.toString());

        // Omit Content-Type to let browser set it with multipart boundary
        const response = await api.post<SupportMessage>(
          `${API_URL}/${ticketNumber}/messages/`,
          formData,
          { headers: { 'Content-Type': undefined } }
        );
        return response.data;
      } else {
        // Text-only message, use application/json
        const response = await api.post<SupportMessage>(
          `${API_URL}/${ticketNumber}/messages/`,
          {
            message: message || '',
            is_internal: isInternal,
          }
        );
        return response.data;
      }
    } catch (error: any) {
      console.error('Error adding message to ticket:', error);
      headerService.handleError(error);
      return null;
    }
  }
}

export const supportService = new SupportService();


