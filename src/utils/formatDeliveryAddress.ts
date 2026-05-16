/** Deduped single-line address from API delivery_address fields. */

function cleanPart(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function containsPart(haystack: string, part: string): boolean {
  if (!part) return true;
  return haystack.toLowerCase().includes(part.toLowerCase());
}

function looseKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\broad\b/g, "rd")
    .replace(/\bstreet\b/g, "st")
    .replace(/[.,]/g, " ")
    .replace(/[\s,:-]+/g, "");
}

function shouldSkipLine2(line1: string, line2: string): boolean {
  if (!line2) return true;
  if (line2.toLowerCase() === line1.toLowerCase()) return true;
  const k1 = looseKey(line1);
  const k2 = looseKey(line2);
  if (k1.length >= 10 && k2.includes(k1)) return true;
  if (k2.length >= 10 && k1.includes(k2)) return true;
  return false;
}

export function formatDeliveryAddress(
  addr: Record<string, unknown> | null | undefined
): string {
  if (!addr || typeof addr !== "object") return "";

  const line1 = cleanPart(addr.address_line1);
  const line2 = cleanPart(addr.address_line2);
  const landmark = cleanPart(addr.landmark);
  const city = cleanPart(addr.city);
  const state = cleanPart(addr.state);
  const pincode = cleanPart(addr.pincode);

  const segments: string[] = [];
  let combined = "";

  const append = (part: string) => {
    if (!part) return;
    const lower = part.toLowerCase();
    if (segments.some((s) => s.toLowerCase() === lower)) return;
    if (containsPart(combined, part)) return;
    segments.push(part);
    combined = segments.join(", ");
  };

  append(line1);
  if (line2 && !shouldSkipLine2(line1, line2)) append(line2);
  append(landmark);

  const tail: string[] = [];
  if (city && !containsPart(combined, city)) tail.push(city);
  if (state && !containsPart(combined, state)) tail.push(state);
  if (pincode && !containsPart(combined, pincode)) tail.push(pincode);
  if (tail.length > 0) append(tail.join(", "));

  return combined;
}

export function formatDeliveryAddressOrFallback(
  addr: Record<string, unknown> | null | undefined
): string {
  const formatted = formatDeliveryAddress(addr);
  return formatted || "Not available";
}
