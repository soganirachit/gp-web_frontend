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

// ── Kiosk (mapped from "Hotel" in base44) ───────────────────────────────────

async function fetchKiosk(id: string | number) {
  const res = await api.get(`${BASE}/kiosks/${id}/`);
  return unwrap<Record<string, unknown>>(res);
}

// ── Scan event ───────────────────────────────────────────────────────────────

async function createScanEvent(data: Record<string, unknown>) {
  try {
    await api.post(`${BASE}/scan-events/`, data);
  } catch {
    // fire-and-forget — never throw
  }
}

// ── Order ────────────────────────────────────────────────────────────────────

interface OrderCreateInput {
  hotel_id?: string;
  kiosk_id?: string;
  campaign?: string;
  session_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_whatsapp: string;
  items: { product_id: string; quantity: number }[];
  subtotal?: number;
  total_amount?: number;
  status?: string;
}

interface OrderCreateResult {
  /** Our internal order id — pass to Razorpay step */
  id: string;
  order_number: string;
  total_amount: number;
  /** Razorpay order id from create-razorpay-order step */
  razorpay_order_id: string;
  /** Razorpay publishable key */
  key: string;
  /** Amount in paise */
  amount: number;
}

async function createOrder(data: OrderCreateInput): Promise<OrderCreateResult> {
  const kioskId = data.kiosk_id || data.hotel_id || '';

  // Step 1 — create BloomBar order
  const orderRes = await api.post(`${BASE}/orders/`, {
    customer_name: data.customer_name,
    customer_whatsapp: data.customer_whatsapp,
    customer_email: data.customer_email || '',
    kiosk_id: Number(kioskId),
    campaign: data.campaign || 'direct',
    session_id: data.session_id || '',
    items: data.items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: i.quantity,
    })),
  });

  const order = unwrap<{ order_id: number; order_number: string; total_amount: number }>(orderRes);

  // Step 2 — create Razorpay order (get real key + amount)
  const payRes = await api.post(`${BASE}/payments/create-razorpay-order/`, {
    order_id: order.order_id,
  });
  const payment = unwrap<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
  }>(payRes);

  return {
    id: String(order.order_id),
    order_number: order.order_number,
    total_amount: order.total_amount,
    razorpay_order_id: payment.razorpay_order_id,
    key: payment.key_id || (import.meta.env.VITE_RAZORPAY_KEY as string),
    amount: payment.amount,
  };
}

interface OrderUpdateInput {
  status?: string;
  payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  session_id?: string;
}

async function updateOrder(id: string, data: OrderUpdateInput) {
  if (data.status === 'paid') {
    const res = await api.post(`${BASE}/payments/verify/`, {
      order_id: Number(id),
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.payment_id,
      razorpay_signature: data.razorpay_signature,
      session_id: data.session_id || '',
    });
    return unwrap<Record<string, unknown>>(res);
  }
  // cancelled or other status — no-op (we don't cancel via API for now)
  return { id };
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

    /** base44 called this "Hotel" but it maps to our BloomBarKiosk */
    Hotel: {
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

    Kiosk: {
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

    QRMapping,

    Order: {
      async create(data: Record<string, unknown>) {
        return createOrder(data as unknown as OrderCreateInput);
      },
      async update(id: string, data: Record<string, unknown>) {
        return updateOrder(id, data as unknown as OrderUpdateInput);
      },
    },
  },
};
