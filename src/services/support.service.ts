import axios from "axios";
import { getApiUrl } from "../config/api.config";
import { headerService } from "./headers.service";

const API_URL = `${getApiUrl()}/support/tickets`;
const SUPPORT_API_URL = `${getApiUrl()}/support`;

export interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  order_number?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  message: string;
  is_internal: boolean;
  created_by_name: string;
  created_at: string;
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
}

export interface EligibleOrder {
  id: number;
  order_number: string;
  status: string;
  delivered_at: string;
  total_amount: string;
  created_at: string;
}

export interface TicketQuestion {
  id: number;
  question_text: string;
  question_type: 'choice' | 'text';
  choices?: string[]; // For choice type questions
  order: number; // Order in which question should be displayed
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
      const response = await axios.get<EligibleOrder[]>(`${SUPPORT_API_URL}/eligible-orders/`, { headers });
      return response.data;
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
      const response = await axios.get<TicketQuestion[]>(`${SUPPORT_API_URL}/ticket-questions/`, { headers });
      return response.data;
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
      const response = await axios.get<SupportTicket[]>(`${API_URL}/`, { headers });
      return response.data;
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
      const response = await axios.get<SupportTicketDetail>(
        `${API_URL}/${ticketNumber}/`,
        { headers }
      );
      return response.data;
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
      const response = await axios.post<SupportTicket>(
        `${API_URL}/create/`,
        {
          order_id: orderId,
          predefined_answers: predefinedAnswers,
          priority: priority,
        },
        { headers }
      );
      return response.data;
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
      await axios.post(
        `${API_URL}/${ticketNumber}/request-agent/`,
        {},
        { headers }
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
      await axios.post(
        `${API_URL}/${ticketNumber}/request-callback/`,
        {},
        { headers }
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
      await axios.patch(
        `${API_URL}/${ticketNumber}/update/`,
        { status },
        { headers }
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

        // Remove Content-Type header to let browser set it with boundary for multipart
        const { Authorization } = headers;
        const formHeaders = {
          Authorization,
        };

        const response = await axios.post<SupportMessage>(
          `${API_URL}/${ticketNumber}/messages/`,
          formData,
          { headers: formHeaders }
        );
        return response.data;
      } else {
        // Text-only message, use application/json
        const response = await axios.post<SupportMessage>(
          `${API_URL}/${ticketNumber}/messages/`,
          {
            message: message || '',
            is_internal: isInternal,
          },
          { headers }
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


