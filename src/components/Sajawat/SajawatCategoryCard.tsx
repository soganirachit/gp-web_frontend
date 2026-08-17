import React from "react";
import {
  getCategoryDisplayImage,
  type SajawatGalleryCategory,
} from "../../services/sajawat.service";

const ImagePlaceholder: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="aspect-square w-full rounded-t-2xl bg-[#E8D5CF]"
    role="img"
    aria-label={label}
  />
);

type Props = {
  category: SajawatGalleryCategory;
  onClick: () => void;
  className?: string;
};

export const SajawatCategoryCard: React.FC<Props> = ({
  category,
  onClick,
  className = "",
}) => {
  const imageSrc = getCategoryDisplayImage(category);
  const description =
    category.description ||
    `Browse ${category.media.length} photo/video item${
      category.media.length === 1 ? "" : "s"
    } in this category.`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`${category.name} floral decor`}
          className="aspect-square w-full rounded-t-2xl object-cover"
          loading="lazy"
        />
      ) : (
        <ImagePlaceholder label={`${category.name} floral decor`} />
      )}
      <div className="p-3 sm:p-4">
        <h3 className="font-serif text-sm font-bold capitalize text-[#1F2937] sm:text-base">
          {category.name}
        </h3>
        <p className="mt-1.5 whitespace-pre-line text-[11px] leading-snug text-[#6B7280] sm:text-xs sm:leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
};
