import { formatProductTitleCase } from "../lib/formatProductTitleCase";

export type ProductLabelLike = { name?: string; slug?: string };

export function labelDisplayText(label: ProductLabelLike): string | null {
  if (label.name?.trim()) return formatProductTitleCase(label.name);
  if (label.slug?.trim()) return formatProductTitleCase(label.slug.replace(/-/g, " "));
  return null;
}

/** Pick the label badge to show — prefer the slug matching the section query (e.g. premium, best-seller). */
export function pickProductLabel(
  labels: ProductLabelLike[] | null | undefined,
  preferredSlug?: string,
): ProductLabelLike | null {
  if (!labels?.length) return null;
  if (preferredSlug) {
    const match = labels.find((l) => l.slug === preferredSlug);
    if (match && labelDisplayText(match)) return match;
  }
  return labels.find((l) => labelDisplayText(l)) ?? labels[0] ?? null;
}

/** Section heading from API label metadata on fetched products. */
export function resolveLabelSectionTitle(
  labelSlug: string,
  products: { labels?: ProductLabelLike[] | null }[],
): string {
  for (const product of products) {
    const match = product.labels?.find((l) => l.slug === labelSlug);
    if (match?.name?.trim()) return formatProductTitleCase(match.name);
  }
  return formatProductTitleCase(labelSlug.replace(/-/g, " "));
}
