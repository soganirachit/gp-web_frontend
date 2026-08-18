import {
  labelDisplayText,
  pickProductLabel,
  type ProductLabelLike,
} from "../../utils/productLabelDisplay";

export type { ProductLabelLike };

type Props = {
  labels?: ProductLabelLike[] | null;
  /** `store` = green badge (gp-store). `daily` = orange badge (gp-daily). */
  variant?: "store" | "daily";
  /** When set, show this label slug on the card (e.g. `premium`, `best-seller`). */
  preferredLabelSlug?: string;
};

/**
 * Top-left overlay on product thumbnails (store cards). Inset slightly so it clears the image edge.
 */
export function ProductImageTag({
  labels,
  variant = "store",
  preferredLabelSlug,
}: Props) {
  if (!labels?.length) return null;
  const label = pickProductLabel(labels, preferredLabelSlug);
  const text = label ? labelDisplayText(label) : null;
  if (!text) return null;

  const badgeClass =
    variant === "daily"
      ? "bg-[#ffb042] text-[#3C2A00] rounded-tr-sm rounded-br-sm rounded-tl-none rounded-bl-none"
      : "bg-[#19411F] text-white rounded-tr-sm rounded-br-sm rounded-tl-none rounded-bl-none";

  return (
    <div className="pointer-events-none absolute left-0 top-2 z-10 max-w-[min(100%,calc(100%-1rem))]">
      <span
        className={`inline-block truncate px-2 py-1 text-[10px] font-bold leading-tight xs:text-[11px] ${badgeClass}`}
      >
        {text}
      </span>
    </div>
  );
}
