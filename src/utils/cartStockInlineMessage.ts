import { errorMessageFromCatch } from './apiErrorMessage';

/** Shown when the API signals stock/availability but returns no usable message body. */
export const FALLBACK_CART_STOCK_INLINE =
  'Product is currently unavailable at this store';

/** Prefer `errorMessageFromCatch` (parses Django/DRF bodies). */
export function extractCartStockApiMessage(error: unknown): string {
  return errorMessageFromCatch(error, '').trim();
}

/**
 * True when the message should be shown inline on cart / PDP (not a generic toast).
 */
export function isCartStockOrAvailabilityInlineError(message: string): boolean {
  const m = String(message ?? '').toLowerCase();
  if (!m.trim()) return false;
  return (
    m.includes('stock') ||
    m.includes('insufficient') ||
    m.includes('unavailable') ||
    m.includes('out of stock') ||
    m.includes('available quantity') ||
    /\bonly\s+\d+/.test(m) ||
    m.includes('maximum') ||
    m.includes('quantity') ||
    m.includes('at this store') ||
    m.includes('this store') ||
    m.includes('mismatch') ||
    m.includes('not available') ||
    m.includes('cannot be added') ||
    m.includes('unable to add') ||
    m.includes('inactive') ||
    m.includes('does not belong') ||
    m.includes('wrong store')
  );
}

export function formatCartStockInlineMessage(raw: string): string {
  const t = String(raw ?? '').trim();
  if (t) {
    return t.length > 220 ? `${t.slice(0, 217)}…` : t;
  }
  return FALLBACK_CART_STOCK_INLINE;
}
