/**
 * Product catalog slugs are single path tokens (e.g. red-rose-bunch-1).
 * Share/copy often appends description text or newlines — strip before API calls.
 */

const SLUG_TOKEN_RE = /^([a-zA-Z0-9][a-zA-Z0-9_-]*)/;

function tryDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Extract slug from a pasted customer-app /products/… URL if present. */
function slugFromProductsPath(value: string): string | null {
  const match = value.match(/\/products\/([^/?#\s]+)/i);
  if (!match?.[1]) return null;
  return tryDecodeURIComponent(match[1]).trim();
}

/**
 * Normalize a slug from route params, share payloads, or clipboard paste.
 * Returns "" when nothing usable remains.
 */
export function sanitizeProductRouteSlug(
  raw: string | undefined | null,
): string {
  if (raw == null) return "";
  let value = String(raw).trim();
  if (!value) return "";

  value = tryDecodeURIComponent(value);

  const fromPath = slugFromProductsPath(value);
  if (fromPath) value = fromPath;

  value = value.split(/[\r\n]/)[0]!.trim();
  if (!value) return "";

  const beforeSpace = value.split(/\s+/)[0]!.trim();
  value = beforeSpace || value;

  const token = value.match(SLUG_TOKEN_RE);
  return token?.[1] ?? "";
}

/** True when the route param contained extra text but sanitization recovered a valid slug. */
export function productSlugRouteDiffersFromParam(
  rawParam: string | undefined | null,
  cleanSlug: string,
): boolean {
  if (!cleanSlug || rawParam == null) return false;
  const raw = String(rawParam).trim();
  if (!raw) return false;
  return sanitizeProductRouteSlug(raw) === cleanSlug && raw !== cleanSlug;
}
