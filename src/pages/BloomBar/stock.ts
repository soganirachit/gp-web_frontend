import toast from 'react-hot-toast';
import { REQUIRED_TOAST } from '@/constants/requiredToastMessages';

/**
 * Units of a BloomBar product still sellable, as served by the backend.
 * `null` = no cap (product has no BOM constraining it).
 * `0` = out of stock.
 */
export function stockOf(product: { stock?: unknown }): number | null {
  return typeof product.stock === 'number' ? product.stock : null;
}

/** Tell the customer why the + stopped. Copy is approved via the {N} prefix policy.
 *
 *  Drops from the top: the + that triggers this sits low on the basket and the
 *  product card, right where the app's default bottom toast lands — the answer
 *  would cover the control it's about. Per-toast override, so every other toast
 *  in the app keeps its bottom placement.
 */
export function toastStockCap(remaining: number) {
  toast(REQUIRED_TOAST.BLOOMBAR_STOCK_CAP.replace('{N}', String(remaining)), {
    position: 'top-center',
  });
}
