function isLikelyPhoneValue(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

/** True when we have a real profile name — not phone, placeholder, or empty. */
export function hasRealUserFirstName(
  firstName?: string | null,
): boolean {
  const trimmed = (firstName ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === "user") return false;
  if (isLikelyPhoneValue(trimmed)) return false;
  return true;
}

export function formatNamasteGreeting(
  isLoggedIn: boolean,
  firstName?: string | null,
): string {
  if (!isLoggedIn) return "Namaste!";
  if (!hasRealUserFirstName(firstName)) return "Namaste!";
  return `Namaste, ${firstName!.trim()}!`;
}
