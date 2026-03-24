import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialise in production and when a DSN is configured
  if (!import.meta.env.PROD || !dsn) return;

  Sentry.init({
    dsn,
    environment: "production",
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Capture 100% of errors
    sampleRate: 1.0,
    // Ignore noisy browser extension / network errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error exception captured",
      /^Network Error$/,
      /^Request failed with status code 4/,
    ],
    beforeSend(event) {
      // Strip query strings from request URL to avoid leaking tokens
      if (event.request?.url) {
        event.request.url = event.request.url.split("?")[0];
      }
      return event;
    },
  });
}
