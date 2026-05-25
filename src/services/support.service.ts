import api from "./api";
import { getApiUrl, getApiOrigin } from "../config/api.config";
import { headerService } from "./headers.service";

const API_URL = `${getApiUrl()}/support/tickets`;
const SUPPORT_API_URL = `${getApiUrl()}/support`;

/** DRF `next`/`previous` may be absolute; normalize for axios when `baseURL` matches. */
function normalizeTicketsRequestUrl(url: string): string {
  const u = url.trim();
  if (!u) return `${API_URL}/`;
  if (!/^https?:\/\//i.test(u)) return u.startsWith("/") ? u : `/${u}`;
  try {
    const parsed = new URL(u);
    const base = getApiUrl().replace(/\/$/, "");
    const baseParsed = new URL(base.endsWith("/") ? base : `${base}/`);
    if (parsed.origin !== baseParsed.origin) return u;
    const basePath = baseParsed.pathname.replace(/\/$/, "");
    let path = parsed.pathname + parsed.search;
    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length) || "/";
    }
    return path.startsWith("/") ? path : `/${path}`;
  } catch {
    return u;
  }
}

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

/** Paginated list response from support tickets API (DRF-style). */
export interface SupportTicketsPage {
  results: SupportTicket[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface SupportMessage {
  id: number;
  message: string;
  is_internal: boolean;
  is_from_customer?: boolean;
  created_by_name: string;
  created_at: string;
  image_url?: string | null;
  /** When API returns several URLs in one message (align with mobile). */
  image_urls?: string[] | null;
}

/** Collect raw image URL strings from API (single or array fields). */
export function collectRawImageUrlsFromMessage(m: {
  image_urls?: unknown;
  images?: unknown;
  image_url?: unknown;
  image?: unknown;
}): string[] {
  const out: string[] = [];
  if (Array.isArray(m?.image_urls)) {
    for (const u of m.image_urls) {
      if (typeof u === "string" && u.trim()) out.push(u.trim());
    }
  }
  if (Array.isArray(m?.images)) {
    for (const u of m.images) {
      if (typeof u === "string" && u.trim()) out.push(u.trim());
    }
  }
  if (out.length) return out;
  const one =
    m?.image_url != null && m.image_url !== ""
      ? String(m.image_url)
      : m?.image != null && m.image !== ""
        ? String(m.image)
        : null;
  return one && one.trim() ? [one.trim()] : [];
}

export function resolveSupportImageUrl(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const origin = getApiOrigin();
  if (s.startsWith("/")) return `${origin}${s}`;
  return `${origin}/${s.replace(/^\/+/, "")}`;
}

export function getResolvedMessageImageUris(msg: SupportMessage): string[] {
  if (Array.isArray(msg.image_urls) && msg.image_urls.length > 0) {
    return msg.image_urls
      .map((u) => resolveSupportImageUrl(u))
      .filter((u): u is string => Boolean(u));
  }
  const one = resolveSupportImageUrl(msg.image_url ?? null);
  return one ? [one] : [];
}

export function normalizeSupportMessagePayload(m: any): SupportMessage {
  const raw = collectRawImageUrlsFromMessage(m);
  return {
    id: Number(m.id),
    message: String(m?.message ?? m?.text ?? m?.body ?? ""),
    is_internal: Boolean(m.is_internal),
    is_from_customer: m.is_from_customer,
    created_by_name: String(
      m?.created_by_name ?? m?.user?.full_name ?? "User",
    ),
    created_at: m.created_at,
    image_url: raw[0] ?? null,
    image_urls: raw.length > 0 ? raw : null,
  };
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

/**
 * Known API statuses → user-facing labels (Open, In Progress, Closed).
 */
const SUPPORT_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  new: "Open",
  reopened: "Open",
  pending: "Open",
  awaiting_reply: "Open",
  awaiting_customer: "Open",
  active: "Open",
  in_progress: "In Progress",
  inprogress: "In Progress",
  processing: "In Progress",
  assigned: "In Progress",
  working: "In Progress",
  answered: "In Progress",
  waiting_on_customer: "In Progress",
  closed: "Close",
  close: "Close",
  resolved: "Close",
  solved: "Close",
  cancelled: "Close",
  canceled: "Close",
};

/**
 * Normalize API status for comparisons (lowercase, trim, spaces → underscores).
 */
export function normalizeSupportStatus(status: string | undefined | null): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

/**
 * User-facing status: Open, In Progress, Closed (plus Title Case for unknown values).
 */
export function formatSupportStatusLabel(status: string | undefined | null): string {
  const key = normalizeSupportStatus(status);
  if (!key) return "";
  if (SUPPORT_STATUS_LABEL[key]) return SUPPORT_STATUS_LABEL[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
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
   * Get eligible orders for support (preparing/out for delivery anytime; delivered within 12h)
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
   * Fetch one page of support tickets. Pass `nextUrl` from a previous page's `next` field, or omit for first page.
   */
  async getTicketsPage(nextUrl?: string | null): Promise<SupportTicketsPage> {
    const empty: SupportTicketsPage = {
      results: [],
      count: 0,
      next: null,
      previous: null,
    };
    try {
      const headers = headerService.getHeaders();
      if (!headers) {
        return empty;
      }
      const raw =
        nextUrl != null && String(nextUrl).trim() !== ""
          ? String(nextUrl).trim()
          : `${API_URL}/`;
      const url = normalizeTicketsRequestUrl(raw);
      const response = await api.get<
        | { count: number; next: string | null; previous: string | null; results: SupportTicket[] }
        | SupportTicket[]
      >(url);

      const data = response.data;
      if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) {
        return {
          results: data.results,
          count: typeof data.count === "number" ? data.count : data.results.length,
          next: data.next ?? null,
          previous: data.previous ?? null,
        };
      }
      if (Array.isArray(data)) {
        return {
          results: data,
          count: data.length,
          next: null,
          previous: null,
        };
      }
      return empty;
    } catch (error: any) {
      console.error("Error fetching support tickets page:", error);
      headerService.handleError(error);
      return empty;
    }
  }

  /**
   * Get all support tickets for the current user (first page only — prefer {@link getTicketsPage} for pagination).
   */
  async getTickets(): Promise<SupportTicket[]> {
    const page = await this.getTicketsPage();
    return page.results;
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

      const normalizeDetail = (d: SupportTicketDetail): SupportTicketDetail => ({
        ...d,
        messages: Array.isArray(d.messages)
          ? d.messages.map((m) => normalizeSupportMessagePayload(m))
          : d.messages,
      });

      if (data && typeof data === "object" && "data" in data) {
        return normalizeDetail(
          (data as { data: SupportTicketDetail }).data,
        );
      }

      return normalizeDetail(data as SupportTicketDetail);
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

        const response = await api.post<SupportMessage>(
          `${API_URL}/${ticketNumber}/messages/`,
          formData,
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


