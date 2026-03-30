import { AxiosError } from 'axios';
import api from './api';
import { getApiUrl } from '../config/api.config';

export interface OrderInvoicePayload {
  is_generated: boolean;
  pdf_file: string | null;
}

function parseInvoiceBody(raw: unknown): OrderInvoicePayload | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    is_generated: Boolean(r.is_generated),
    pdf_file: r.pdf_file != null && r.pdf_file !== '' ? String(r.pdf_file) : null,
  };
}

/**
 * GET /api/v1/invoices/order/<order_number>/
 * (Postman: customer invoice by order — same path pattern as my-invoices detail flow.)
 */
async function getInvoiceByOrderNumber(orderNumber: string): Promise<OrderInvoicePayload | null> {
  try {
    const encoded = encodeURIComponent(orderNumber);
    const response = await api.get(`${getApiUrl()}/invoices/order/${encoded}/`);
    const raw = response.data?.data ?? response.data;
    return parseInvoiceBody(raw);
  } catch (e) {
    if (e instanceof AxiosError && e.response?.status === 404) {
      return null;
    }
    console.warn('Invoice for order not available:', orderNumber, e);
    return null;
  }
}

export const invoiceService = {
  getInvoiceByOrderNumber,
};
