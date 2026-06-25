/** Shared formatting for store order confirmation + order details delivery schedule. */

export type DeliverySlotInfo = {
  id?: number | null;
  slot_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
} | null;

export type OrderConfirmationItem = {
  name: string;
  quantity: number;
  categoryName?: string;
  customizedMessage?: string;
};

export type OrderConfirmationSnapshot = {
  items: OrderConfirmationItem[];
  delivery_address?: Record<string, unknown> | null;
  delivery_date?: string | null;
  delivery_time_slot?: string | null;
  delivery_slot_info?: DeliverySlotInfo;
  total_amount?: string | number;
};

/** 24h "HH:mm:ss" → "9 AM" / "12:30 PM". */
export function formatClockTimeLabel(time: string): string {
  const [hStr, mStr] = time.slice(0, 8).split(':');
  const h24 = Number(hStr);
  const minutes = Number(mStr) || 0;
  if (!Number.isFinite(h24)) return time.trim();
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  if (minutes > 0) {
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }
  return `${h12} ${period}`;
}

export function formatDeliveryDateLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  const ymd = String(raw).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  try {
    return new Date(raw).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return raw;
  }
}

export function formatDeliveryTimeSlot(
  slotInfo: DeliverySlotInfo,
  timeSlot: string | null | undefined,
): string {
  const start = slotInfo?.start_time?.trim();
  const end = slotInfo?.end_time?.trim();
  if (start && end) {
    return `${formatClockTimeLabel(start)} – ${formatClockTimeLabel(end)}`;
  }
  const legacy = (timeSlot || slotInfo?.slot_name || '').trim();
  return legacy;
}

export function formatDeliverySchedule(
  deliveryDate: string | null | undefined,
  slotInfo: DeliverySlotInfo,
  timeSlot: string | null | undefined,
  fallbackCreatedAt?: string | null,
): string {
  const date = formatDeliveryDateLabel(deliveryDate || fallbackCreatedAt);
  const time = formatDeliveryTimeSlot(slotInfo, timeSlot);
  if (date && time) return `${date}, ${time}`;
  return date || time || '';
}

export function orderItemCategoryLabel(categoryName: string | null | undefined): string {
  const c = (categoryName || '').trim();
  return c || 'Product';
}

function isBouquetOrderLine(item: {
  product?: { category_name?: string; name?: string };
}): boolean {
  const cat = (item.product?.category_name ?? '').toLowerCase();
  const name = (item.product?.name ?? '').toLowerCase();
  return cat.includes('bouquet') || name.includes('bouquet');
}

/**
 * Per-line bouquet message: prefer `special_instructions`, else map `customer_notes`
 * lines onto bouquet rows only (never order-wide).
 */
export function resolveOrderLineCustomMessage(
  item: {
    id: number;
    special_instructions?: string | null;
    product?: { category_name?: string; name?: string };
  },
  allItems: Array<{
    id: number;
    special_instructions?: string | null;
    product?: { category_name?: string; name?: string };
  }>,
  customerNotes?: string | null,
): string | null {
  const direct = (item.special_instructions ?? '').trim();
  if (direct) return direct;

  const notes = (customerNotes ?? '').trim();
  if (!notes || !isBouquetOrderLine(item)) return null;

  const bouquetLines = allItems.filter(isBouquetOrderLine);
  const bouquetIndex = bouquetLines.findIndex((b) => b.id === item.id);
  if (bouquetIndex < 0) return null;

  const noteLines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
  if (noteLines.length === 0) return null;
  if (noteLines.length === 1 && bouquetLines.length === 1) return noteLines[0];
  if (noteLines.length === bouquetLines.length) return noteLines[bouquetIndex] ?? null;
  return null;
}
