/**
 * Remembers order numbers the customer placed so we can re-hydrate rows
 * dropped from GET /orders/ (e.g. after admin cancel + refund changes payment_status).
 * Scoped per logged-in user so another account on the same device is not polled.
 */
const STORAGE_KEY_PREFIX = 'gp_customer_order_numbers_v1';

const MAX_REMEMBERED = 80;

function storageKeyForUser(userId: string | null): string {
  const id = String(userId ?? '').trim();
  return id ? `${STORAGE_KEY_PREFIX}:${id}` : STORAGE_KEY_PREFIX;
}

function readNumbers(userId: string | null): string[] {
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
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

function writeNumbers(userId: string | null, nums: string[]): void {
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(nums.slice(0, MAX_REMEMBERED)));
  } catch {
    /* ignore quota */
  }
}

function currentUserId(): string | null {
  try {
    return localStorage.getItem('userId');
  } catch {
    return null;
  }
}

export function rememberCustomerOrderNumber(orderNumber: string): void {
  const key = String(orderNumber ?? '').trim();
  if (!key) return;
  const userId = currentUserId();
  const existing = readNumbers(userId).filter((n) => n !== key);
  writeNumbers(userId, [key, ...existing]);
}

export function forgetCustomerOrderNumber(orderNumber: string): void {
  const key = String(orderNumber ?? '').trim();
  if (!key) return;
  const userId = currentUserId();
  writeNumbers(userId, readNumbers(userId).filter((n) => n !== key));
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
  const userId = currentUserId();
  if (!userId) return apiOrders;

  const inApi = new Set(
    apiOrders.map((o) => String(o.order_number ?? '').trim()).filter(Boolean),
  );
  const missing = readNumbers(userId).filter((n) => !inApi.has(n)).slice(0, maxFetches);
  if (missing.length === 0) return apiOrders;

  const extras: T[] = [];
  for (const num of missing) {
    try {
      const detail = await fetchDetail(num);
      if (!detail) {
        forgetCustomerOrderNumber(num);
        continue;
      }
      extras.push(detail as T);
    } catch {
      forgetCustomerOrderNumber(num);
    }
  }
  if (extras.length === 0) return apiOrders;
  return [...apiOrders, ...extras];
}
