const KEY = "gp-pending-product-add-slug";

export function setPendingProductAddAfterLogin(slug: string): void {
  const trimmed = String(slug ?? "").trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function consumePendingProductAddAfterLogin(
  expectedSlug?: string,
): string | null {
  try {
    const pending = localStorage.getItem(KEY)?.trim();
    if (!pending) return null;
    if (expectedSlug && pending !== expectedSlug.trim()) return null;
    localStorage.removeItem(KEY);
    return pending;
  } catch {
    return null;
  }
}

export function peekPendingProductAddAfterLogin(): string | null {
  try {
    return localStorage.getItem(KEY)?.trim() || null;
  } catch {
    return null;
  }
}
