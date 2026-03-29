import { getApiUrl } from '../config/api.config';

/**
 * Turn a relative media path from the API into an absolute URL (same host as API, without /api/v1).
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (path == null || path === '') return '';
  const p = String(path).trim();
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const origin = getApiUrl().replace(/\/api\/v1\/?$/, '');
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return `${origin}${normalized}`;
}
