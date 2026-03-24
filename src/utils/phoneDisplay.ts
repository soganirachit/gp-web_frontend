/**
 * Phone helpers — API returns E.164 (e.g. +919876543210). Use for display vs API payloads.
 */

/** Strip +91 for UI when showing a 10-digit Indian mobile number. */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (phone == null || phone === "") return "";
  const s = String(phone).trim();
  if (s.startsWith("+91")) {
    const digits = s.slice(3).replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : s;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return s;
}

/** Normalize to Indian E.164 for API. Accepts 10 digits, +91…, or legacy 0-prefix. */
export function toIndianE164(input: string): string {
  const digits = String(input).replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10.length !== 10) return String(input).trim();
  return `+91${last10}`;
}

/** Last 10 digits as number for legacy code paths that still expect a numeric type. */
export function phoneDigitsAsNumber(phone: string | null | undefined): number {
  const d = formatPhoneForDisplay(phone).replace(/\D/g, "");
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n : 0;
}
