/**
 * BloomBar service — replaces all base44.entities.* calls with GP backend API calls.
 * Exported as `base44` so existing page imports need no changes.
 */
import api from './api';

const BASE = '/bloombar';

// ── Helpers ─────────────────────────────────────────────────────────────────

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}

// ── Product ──────────────────────────────────────────────────────────────────

/** Map the backend product shape (effective_price/image) to the card's shape (price/image_url). */
function normalizeProduct(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    id: String(raw.id),
    name: String(raw.name ?? ''),
    price: Number(raw.effective_price ?? raw.price ?? 0),
    image_url: (raw.image ?? raw.image_url ?? undefined) as string | undefined,
  };
}

async function fetchProduct(id: string | number) {
  const res = await api.get(`${BASE}/products/${id}/`);
  return normalizeProduct(unwrap<Record<string, unknown>>(res));
}

// ── Kiosk ──────────────────────────────────────────────────────────────────

async function fetchKiosk(id: string | number) {
  const res = await api.get(`${BASE}/kiosks/${id}/`);
  return unwrap<Record<string, unknown>>(res);
}

// ── Store (store-QR catalog) ─────────────────────────────────────────────────

export interface BloomBarStoreCatalog {
  store: Record<string, unknown>;
  products: Record<string, unknown>[];
}

/**
 * Load a store's BloomBar catalog for a scanned store QR: the store branding plus
 * every product mapped to the store's active kiosks. Throws an Error carrying the
 * backend's friendly message when the store is unknown or unavailable.
 */
async function fetchStoreCatalog(code: string): Promise<BloomBarStoreCatalog> {
  try {
    const res = await api.get(`${BASE}/store/${encodeURIComponent(code)}/products/`);
    const data = unwrap<{ store: Record<string, unknown>; products: Record<string, unknown>[] }>(res);
    return {
      store: data.store,
      products: (data.products ?? []).map(normalizeProduct),
    };
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'This store is not available right now.';
    throw new Error(message);
  }
}

// ── Resolve (scan gate) ──────────────────────────────────────────────────────

export interface BloomBarResolveResult {
  product: Record<string, unknown>;
  kiosk: Record<string, unknown> | null;
}

/**
 * Authoritative scan gate. Validates the product, kiosk, and per-QR mapping's
 * active state in one call and returns the product + kiosk branding. Throws an
 * Error carrying the backend's friendly message ("This QR code is currently
 * inactive." etc.) when the QR or kiosk has been switched off in admin.
 */
async function resolveScan(params: {
  product?: string;
  kiosk?: string;
  campaign?: string;
}): Promise<BloomBarResolveResult> {
  const qs = new URLSearchParams();
  if (params.product) qs.set('product', String(params.product));
  if (params.kiosk) qs.set('kiosk', String(params.kiosk));
  if (params.campaign) qs.set('campaign', params.campaign);
  try {
    const res = await api.get(`${BASE}/resolve/?${qs.toString()}`);
    const data = unwrap<{ product: Record<string, unknown>; kiosk: Record<string, unknown> | null }>(res);
    return { product: normalizeProduct(data.product), kiosk: data.kiosk ?? null };
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'This QR code is not available right now.';
    throw new Error(message);
  }
}

// ── Scan event ───────────────────────────────────────────────────────────────

async function createScanEvent(data: Record<string, unknown>) {
  try {
    await api.post(`${BASE}/scan-events/`, data);
  } catch {
    // fire-and-forget — never throw
  }
}

// ── Order (deferred-order pattern — mirrors the store checkout) ───────────────
//
// No BloomBar order exists until payment is verified. `createOrder` only spins up
// a Razorpay order from the validated basket; the real order is CREATED by the
// backend inside `verifyOrder` once payment succeeds — and lands already
// delivered/paid. If the customer abandons the sheet or the bank declines, no
// order is ever created, so nothing can get stuck in "Pending".

interface CheckoutInput {
  /** Kiosk-QR flow. Exactly one of kiosk_id / store_id must be set. */
  kiosk_id?: string;
  /** Store-QR flow (whole-store catalog). Carries a room instead of a single kiosk. */
  store_id?: string;
  campaign?: string;
  session_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_whatsapp: string;
  /** Room / table — required by the backend for a store-QR order. */
  customer_room?: string;
  items: { product_id: string; quantity: number }[];
}

/** Shape the basket into the backend checkout payload (sent to both steps).
 *  The backend accepts exactly one entry point, so we send store_id + room for a
 *  store-QR basket, or kiosk_id for a kiosk-QR basket — never both. */
function toBackendCheckout(data: CheckoutInput) {
  const base = {
    customer_name: data.customer_name,
    customer_whatsapp: data.customer_whatsapp,
    customer_email: data.customer_email || '',
    campaign: data.campaign || 'direct',
    session_id: data.session_id || '',
    items: data.items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: i.quantity,
    })),
  };
  if (data.store_id) {
    return { ...base, store_id: Number(data.store_id), customer_room: data.customer_room || '' };
  }
  return { ...base, kiosk_id: Number(data.kiosk_id || 0) };
}

interface RazorpayInitResult {
  /** Razorpay order id to hand to the Razorpay SDK */
  razorpay_order_id: string;
  /** Razorpay publishable key */
  key: string;
  /** Amount in paise (locked by Razorpay) */
  amount: number;
  /** Total in rupees (server-computed) */
  total_amount: number;
}

/** Step 1 — create the Razorpay order. No local order is created yet. */
async function createOrder(data: CheckoutInput): Promise<RazorpayInitResult> {
  const res = await api.post(`${BASE}/payments/create-razorpay-order/`, toBackendCheckout(data));
  const payment = unwrap<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    total_amount: number;
  }>(res);
  return {
    razorpay_order_id: payment.razorpay_order_id,
    key: payment.key_id || (import.meta.env.VITE_RAZORPAY_KEY as string),
    amount: payment.amount,
    total_amount: payment.total_amount,
  };
}

interface VerifyInput extends CheckoutInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface VerifiedOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
}

/** Step 2 — verify the payment; the backend creates the order (delivered/paid). */
async function verifyOrder(data: VerifyInput): Promise<VerifiedOrder> {
  const res = await api.post(`${BASE}/payments/verify/`, {
    ...toBackendCheckout(data),
    razorpay_order_id: data.razorpay_order_id,
    razorpay_payment_id: data.razorpay_payment_id,
    razorpay_signature: data.razorpay_signature,
  });
  const o = unwrap<{
    id: number;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number | string;
  }>(res);
  return {
    id: String(o.id),
    order_number: o.order_number,
    status: o.status,
    payment_status: o.payment_status,
    total_amount: Number(o.total_amount) || 0,
  };
}

// ── Cart totals (backend is the source of truth — mirrors store/daily) ───────

export interface BloomBarTotals {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  /** Discount the backend applied, if any. Optional, for display. */
  discount_amount?: number;
  /** Effective discount % (discount_amount / subtotal). Optional, for display. */
  discount_percentage?: number;
  /** Tax % the backend used (from admin config). Optional, for display. */
  tax_rate?: number;
}

interface TotalsInput {
  kiosk_id?: string;
  store_id?: string;
  campaign?: string;
  items: { product_id: string; quantity: number }[];
}

/**
 * Ask the backend to compute subtotal / tax / total for the current basket,
 * exactly like the store/daily `GET /cart/` flow. The tax here comes from the
 * admin tax configuration on the server — NOT a hardcoded frontend rate.
 * Sends store_id for a store-QR basket, kiosk_id for a kiosk-QR basket.
 */
async function fetchTotals(data: TotalsInput): Promise<BloomBarTotals> {
  const payload: Record<string, unknown> = {
    campaign: data.campaign || 'direct',
    items: data.items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: i.quantity,
    })),
  };
  if (data.store_id) payload.store_id = Number(data.store_id);
  else if (data.kiosk_id) payload.kiosk_id = Number(data.kiosk_id);
  const res = await api.post(`${BASE}/orders/calculate/`, payload);
  const t = unwrap<{
    subtotal: number | string;
    tax_amount: number | string;
    total_amount: number | string;
    discount_amount?: number | string;
    discount_percentage?: number | string;
    tax_rate?: number | string;
  }>(res);
  return {
    subtotal: Number(t.subtotal) || 0,
    tax_amount: Number(t.tax_amount) || 0,
    total_amount: Number(t.total_amount) || 0,
    discount_amount: t.discount_amount !== undefined ? Number(t.discount_amount) || 0 : undefined,
    discount_percentage:
      t.discount_percentage !== undefined ? Number(t.discount_percentage) || 0 : undefined,
    tax_rate: t.tax_rate !== undefined ? Number(t.tax_rate) : undefined,
  };
}

// ── Entity stubs (kept for API compatibility with existing page imports) ─────

const QRMapping = {
  async filter(_params: Record<string, unknown>) {
    return [];
  },
  async update(_id: string, _data: Record<string, unknown>) {
    return {};
  },
};

// ── Exported interface matching base44.entities.* ────────────────────────────

export const base44 = {
  entities: {
    Product: {
      async filter(params: Record<string, unknown>) {
        if (params.id) {
          const p = await fetchProduct(params.id as string);
          return [p];
        }
        return [];
      },
      async list(_sort?: string, _limit?: number) {
        // Not used in production — fallback for dev only
        return [];
      },
    },

    Kiosk: {
      async filter(params: Record<string, unknown>) {
        if (params.id) {
          const k = await fetchKiosk(params.id as string);
          return [k];
        }
        return [];
      },
      async list() {
        const res = await api.get(`${BASE}/admin/kiosks/`);
        return unwrap<Record<string, unknown>[]>(res) ?? [];
      },
    },

    QRScanEvent: {
      async create(data: Record<string, unknown>) {
        await createScanEvent(data);
        return {};
      },
    },

    BloomBar: {
      async resolve(params: { product?: string; kiosk?: string; campaign?: string }) {
        return resolveScan(params);
      },
    },

    Store: {
      /** Store-QR catalog: store branding + all products across its active kiosks. */
      async catalog(code: string): Promise<BloomBarStoreCatalog> {
        return fetchStoreCatalog(code);
      },
    },

    QRMapping,

    Cart: {
      async getTotals(data: TotalsInput) {
        return fetchTotals(data);
      },
    },

    Order: {
      async create(data: Record<string, unknown>) {
        return createOrder(data as unknown as CheckoutInput);
      },
      async verify(data: Record<string, unknown>) {
        return verifyOrder(data as unknown as VerifyInput);
      },
    },
  },
};
