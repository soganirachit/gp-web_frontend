import { lazy, type ComponentType } from 'react';

type ImportFn = () => Promise<{ default: ComponentType<any> }>;

/**
 * Wraps React.lazy so a transient network failure or a single stale chunk
 * after deploy can recover without showing the raw "Failed to fetch dynamically imported module" error.
 */
export function lazyWithRetry(importFn: ImportFn, maxAttempts = 3) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await importFn();
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}
