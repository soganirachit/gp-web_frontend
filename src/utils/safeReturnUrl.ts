/** Allow only same-origin relative in-app paths (blocks open redirects). */
export function safeReturnUrl(path: unknown, fallback = "/home"): string {
  if (typeof path !== "string") return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  return trimmed;
}
