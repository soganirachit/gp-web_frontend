import { formatPhoneForDisplay } from "./phoneDisplay";

/** +91 98765 43210 when 10 valid digits are available. */
export function formatAddressReceiverPhoneLine(
  associatedPhoneNumber?: string | null,
): string | null {
  const digits = formatPhoneForDisplay(associatedPhoneNumber ?? "").replace(
    /\D/g,
    "",
  );
  const last10 = digits.length >= 10 ? digits.slice(-10) : "";
  if (last10.length !== 10) return null;
  return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
}

export function formatAddressReceiverNameLine(
  name?: string | null,
): string | null {
  const trimmed = (name ?? "").trim();
  return trimmed || null;
}
