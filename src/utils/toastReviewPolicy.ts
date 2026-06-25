import { ALL_REQUIRED_TOAST_MESSAGES } from "../constants/requiredToastMessages";

const APPROVED_GLOBAL_TOAST_MESSAGES = new Set(
  ALL_REQUIRED_TOAST_MESSAGES.map((m) => m.trim().toLowerCase()),
);

const APPROVED_PREFIX_PATTERNS: readonly string[] = [
  "please choose a delivery date within the next ",
  "too many requests. please wait",
];

export function isApprovedGlobalToastMessage(message: string): boolean {
  const normalized = String(message ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (APPROVED_GLOBAL_TOAST_MESSAGES.has(normalized)) return true;
  return APPROVED_PREFIX_PATTERNS.some((prefix) => normalized.startsWith(prefix));
}
