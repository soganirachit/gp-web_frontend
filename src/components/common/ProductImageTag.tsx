import { formatProductTitleCase } from "../../lib/formatProductTitleCase";

export type ProductLabelLike = { name?: string; slug?: string };

type Props = {
  labels?: ProductLabelLike[] | null;
};

function labelDisplayText(label: ProductLabelLike): string | null {
  if (label.name?.trim()) return formatProductTitleCase(label.name);
  if (label.slug?.trim()) return formatProductTitleCase(label.slug.replace(/-/g, " "));
  return null;
}

/**
 * Top-left overlay on product thumbnails (store cards). Inset slightly so it clears the image edge.
 */
export function ProductImageTag({ labels }: Props) {
  if (!labels?.length) return null;
  const label = labels.find((l) => labelDisplayText(l)) ?? labels[0];
  const text = label ? labelDisplayText(label) : null;
  if (!text) return null;

  return (
    <div className="pointer-events-none absolute top-2 z-10 max-w-[min(100%,calc(100%-1rem))]">
      <span className="inline-block truncate bg-[#19411F] px-2 py-1 text-[10px] font-bold leading-tight text-white xs:text-[11px]">
        {text}
      </span>
    </div>
  );
}
