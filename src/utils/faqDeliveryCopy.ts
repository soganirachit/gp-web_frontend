/**
 * FAQ answers come from the API; until CMS is updated, normalize known
 * delivery-booking copy from 7 → 20 days.
 */
export function normalizeFaqDeliveryWindowCopy(text: string): string {
  return text
    .replace(/\bup to 7 days\b/gi, "up to 20 days")
    .replace(/\bup to 7 day\b/gi, "up to 20 days")
    .replace(/\b7 days in advance\b/gi, "20 days in advance")
    .replace(/\b7 day in advance\b/gi, "20 days in advance")
    .replace(/\b7 days ahead\b/gi, "20 days ahead")
    .replace(/\b7 day ahead\b/gi, "20 days ahead")
    .replace(/\bwithin 7 days in advance\b/gi, "within 20 days in advance")
    .replace(/\bmaximum (?:of )?7 days\b/gi, "maximum of 20 days")
    .replace(/\bmax\.?\s*7 days\b/gi, "max. 20 days");
}
