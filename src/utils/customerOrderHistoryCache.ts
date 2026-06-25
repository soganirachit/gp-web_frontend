/**
 * Remembers order numbers the customer placed so we can re-hydrate rows
 * dropped from GET /orders/ (e.g. after admin cancel + refund changes payment_status).
 */
const STORAGE_KEY = 'gp_customer_order_numbers_v1';
const MAX_REMEMBERED = 80;

function readNumbers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeNumbers(nums: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nums.slice(0, MAX_REMEMBERED)));
  } catch {
    /* ignore quota */
  }
}

export function rememberCustomerOrderNumber(orderNumber: string): void {
  const key = String(orderNumber ?? '').trim();
  if (!key) return;
  const existing = readNumbers().filter((n) => n !== key);
  writeNumbers([key, ...existing]);
}

/**
 * Fetch detail for remembered orders missing from the list API response.
 */
export async function hydrateMissingCustomerOrders<T extends { order_number?: string }>(
  apiOrders: T[],
  fetchDetail: (orderNumber: string) => Promise<Record<string, unknown> | null>,
  options?: { maxFetches?: number },
): Promise<T[]> {
  const maxFetches = options?.maxFetches ?? 12;
  const inApi = new Set(
    apiOrders.map((o) => String(o.order_number ?? '').trim()).filter(Boolean),
  );
  const missing = readNumbers().filter((n) => !inApi.has(n)).slice(0, maxFetches);
  if (missing.length === 0) return apiOrders;

  const extras: T[] = [];
  for (const num of missing) {
    try {
      const detail = await fetchDetail(num);
      if (!detail) continue;
      extras.push(detail as T);
    } catch {
      /* skip */
    }
  }
  if (extras.length === 0) return apiOrders;
  return [...apiOrders, ...extras];
}
