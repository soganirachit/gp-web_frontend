import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

/**
 * Normalize Django / DRF / ResponseFormatter error payloads into a user-visible string.
 */

export function formatApiErrorBody(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string" && body.trim()) return body.trim();

  if (typeof body !== "object") return String(body);

  const b = body as Record<string, unknown>;
  const segments: string[] = [];

  const pushUnique = (s: string) => {
    const t = s.trim();
    if (t && !segments.includes(t)) segments.push(t);
  };

  const msg = b.message;
  if (typeof msg === "string" && msg.trim()) pushUnique(msg);

  const errStr = b.error;
  if (typeof errStr === "string" && errStr.trim()) pushUnique(errStr);

  const detail = b.detail;
  if (typeof detail === "string" && detail.trim()) pushUnique(detail);
  if (Array.isArray(detail)) {
    const joined = detail.map((x) => String(x)).filter(Boolean).join("; ");
    if (joined) pushUnique(joined);
  }

  const nfe = b.non_field_errors;
  if (Array.isArray(nfe)) {
    const joined = nfe.map((x) => String(x)).filter(Boolean).join("; ");
    if (joined) pushUnique(joined);
  }

  const errors = b.errors;
  if (errors != null && typeof errors === "object" && !Array.isArray(errors)) {
    const fieldLines = formatNestedFieldErrors(errors as Record<string, unknown>);
    if (fieldLines) pushUnique(fieldLines);
  }

  for (const [k, v] of Object.entries(b)) {
    if (["success", "message", "detail", "errors", "data", "pagination"].includes(k)) continue;
    if (v == null) continue;
    if (Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number")) {
      const line = `${k}: ${v.map(String).join(", ")}`;
      pushUnique(line);
    }
  }

  return segments.join("\n\n");
}

function formatNestedFieldErrors(errs: Record<string, unknown>, prefix = ""): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(errs)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null) continue;
    if (Array.isArray(v)) {
      const parts = v.map((x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : String(x))).filter(Boolean);
      if (parts.length) lines.push(`${key}: ${parts.join(", ")}`);
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const nested = formatNestedFieldErrors(v as Record<string, unknown>, key);
      if (nested) lines.push(nested);
    } else {
      lines.push(`${key}: ${String(v)}`);
    }
  }
  return lines.join("\n");
}

export function errorMessageFromParsedBody(body: unknown, fallback: string): string {
  const formatted = formatApiErrorBody(body);
  return formatted || fallback;
}

/** Axios errors, `throw response.data`, or `Error` from API helpers. */
/** True when the server indicates a cart line is missing (avoid mis-mapping 404 to “address”). */
export function isCartItemNotFoundMessage(message: string): boolean {
  const m = String(message ?? "").toLowerCase();
  if (!m.trim()) return false;
  return m.includes("cart item") && m.includes("not found");
}

/**
 * Cart line should show out-of-stock overlay and block checkout until removed.
 * Covers e.g. `{ success: false, message: "Product not found" }` on quantity/cart APIs.
 */
export function isCartLineUnavailableMessage(message: string): boolean {
  if (isCartItemNotFoundMessage(message)) return true;
  const m = String(message ?? "").toLowerCase().trim();
  if (!m) return false;
  return m.includes("product") && m.includes("not found");
}

function globalHttpStatusToast(status: number | undefined): string | null {
  if (status === 429) return REQUIRED_TOAST.TOO_MANY_REQUESTS;
  if (status === 502 || status === 503 || status === 504) return REQUIRED_TOAST.SERVICE_UNAVAILABLE;
  return null;
}

function globalNetworkToast(err: { response?: { status?: number }; message?: string; code?: string }): string | null {
  if (err.response?.status != null) return globalHttpStatusToast(err.response.status);
  const msg = String(err.message ?? "").toLowerCase();
  if (
    !err.response &&
    (msg.includes("network error") ||
      msg.includes("failed to fetch") ||
      err.code === "ECONNABORTED" ||
      msg.includes("timeout"))
  ) {
    return REQUIRED_TOAST.NETWORK_ISSUE;
  }
  return null;
}

export function errorMessageFromCatch(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: unknown; status?: number }; message?: string; code?: string };
  const globalToast = globalNetworkToast(ax);
  const data = ax?.response?.data;
  if (data !== undefined) {
    const parsed = errorMessageFromParsedBody(
      data,
      typeof ax.message === "string" && ax.message ? ax.message : fallback,
    );
    if (!parsed.trim() && globalToast) return globalToast;
    if (globalToast && ax.response?.status === 429) return globalToast;
    return parsed || globalToast || fallback;
  }
  if (globalToast) return globalToast;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && err !== null && !("response" in err)) {
    return errorMessageFromParsedBody(err, fallback);
  }
  return fallback;
}
