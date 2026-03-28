/**
 * Title case each word; spaces are kept between words.
 * e.g. "rose bouquet" → "Rose Bouquet", "DAFFODIL flower" → "Daffodil Flower"
 */
export function formatProductTitleCase(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
