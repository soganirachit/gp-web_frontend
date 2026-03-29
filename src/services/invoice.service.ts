import api from './api';
import { getApiUrl } from '../config/api.config';

export interface OrderInvoicePayload {
  is_generated: boolean;
  pdf_file: string | null;
}

/**
 * GET /api/v1/invoices/order/<order_number>/
 */
async function getInvoiceByOrderNumber(orderNumber: string): Promise<OrderInvoicePayload | null> {
  try {
    const encoded = encodeURIComponent(orderNumber);
    const response = await api.get(`${getApiUrl()}/invoices/order/${encoded}/`);
    const raw = response.data?.data ?? response.data;
    if (raw == null) return null;
    return {
      is_generated: Boolean(raw.is_generated),
      pdf_file: raw.pdf_file != null && raw.pdf_file !== '' ? String(raw.pdf_file) : null,
    };
  } catch (e) {
    console.warn('Invoice for order not available:', orderNumber, e);
    return null;
  }
}

export const invoiceService = {
  getInvoiceByOrderNumber,
};
