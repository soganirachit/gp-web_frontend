/**
 * Session-scoped JWT storage (tab lifetime). Migrates legacy localStorage tokens once.
 * Same auth mechanism (Bearer JWT); reduces persistence vs localStorage-only.
 */
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

function primary(): Storage {
  return sessionStorage;
}

function legacy(): Storage {
  return localStorage;
}

export function readAccessToken(): string | null {
  let token = primary().getItem(ACCESS_KEY);
  if (!token) {
    token = legacy().getItem(ACCESS_KEY);
    if (token) {
      primary().setItem(ACCESS_KEY, token);
      legacy().removeItem(ACCESS_KEY);
    }
  }
  return token;
}

export function readRefreshToken(): string | null {
  let token = primary().getItem(REFRESH_KEY);
  if (!token) {
    token = legacy().getItem(REFRESH_KEY);
    if (token) {
      primary().setItem(REFRESH_KEY, token);
      legacy().removeItem(REFRESH_KEY);
    }
  }
  return token;
}

export function writeAccessToken(token: string): void {
  primary().setItem(ACCESS_KEY, token);
  // Mirror for legacy callers until fully migrated (tab-scoped copy is authoritative).
  legacy().setItem(ACCESS_KEY, token);
}

export function writeRefreshToken(token: string): void {
  primary().setItem(REFRESH_KEY, token);
  legacy().setItem(REFRESH_KEY, token);
}

export function clearAuthTokens(): void {
  primary().removeItem(ACCESS_KEY);
  primary().removeItem(REFRESH_KEY);
  legacy().removeItem(ACCESS_KEY);
  legacy().removeItem(REFRESH_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(readAccessToken());
}
