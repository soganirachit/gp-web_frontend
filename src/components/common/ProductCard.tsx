import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { gpDailyTitleCase } from '../../utils/gpDailyHomeDesignSystem';
import { ProductImageTag } from './ProductImageTag';
import { SessionCachedImage } from './SessionCachedImage';

interface ProductCardProps {
  imageUrl: string;
  packName: string;
  /** e.g. API `category_name` — Puja Packs / Exotic Packs */
  categoryName?: string;
  description: string;
  price: string;
  /** If set, show struck-through MRP after the offer price (₹129 ~~₹149~~) */
  originalPrice?: number;
  showDailyButton?: boolean;
  showBestsellerTag?: boolean;
  /** GP Daily home — denser card (~10–15% smaller type/padding). */
  compact?: boolean;
  /** Optional API labels (shown on image top-left; overrides showBestsellerTag when set) */
  labels?: { name?: string; slug?: string }[];
  /** When set, badge shows this label slug (e.g. premium section → `premium`). */
  preferredLabelSlug?: string;
  /** Eager-load above-the-fold product thumbnails without progressive paint. */
  imagePriority?: boolean;
  onClick?: () => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  imageUrl,
  packName,
  categoryName,
  description,
  price,
  originalPrice,
  showDailyButton = false,
  compact = false,
  labels,
  preferredLabelSlug,
  imagePriority = false,
  onClick,
  className = ''
}) => {
  const shouldShowOriginalOnCard =
    originalPrice != null && originalPrice > 0 && String(price || "").length <= 8;
  const tagVariant = showDailyButton ? "daily" : "store";
  const isCompact = compact || showDailyButton;
  const imageHeightClass = isCompact
    ? "sm:aspect-auto sm:h-[8.75rem] md:h-36"
    : "sm:aspect-auto sm:h-40 md:h-48 lg:h-52";
  const bodyPadClass = isCompact ? "p-3" : "p-2.5 sm:p-3";
  const titleClass = isCompact
    ? "text-gp-card-title sm:text-gp-card-title-md font-semibold text-[#111827] truncate mb-0.5"
    : "text-[15px] font-semibold text-[#111827] truncate mb-0.5";
  const categoryClass = isCompact
    ? "text-gp-card-meta sm:text-gp-card-meta-md font-medium text-[#19411f]/80 truncate mb-0.5"
    : "text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#19411f]/80 truncate mb-0.5";
  const descClass = isCompact
    ? "text-gp-body-sm text-[#6B7280] truncate"
    : "text-[11px] leading-snug text-[#6B7280] truncate";
  const priceClass = isCompact
    ? "text-gp-card-price sm:text-gp-card-price-md font-semibold text-[#111827] whitespace-nowrap"
    : "text-[19px] leading-[22px] font-semibold text-[#111827] whitespace-nowrap";
  const chevronClass = isCompact ? "text-sm" : "text-base";
  const dailyPillClass = isCompact
    ? "bg-[#FFB343] text-[#222222] text-[9px] font-semibold px-1.5 py-0.5 rounded-sm flex-shrink-0 self-start mt-0.5"
    : "bg-[#FFB343] text-[#222222] text-[10px] font-medium px-2 py-0.5 rounded-sm flex-shrink-0 self-start";

  return (
    <div
      className={`bg-white overflow-hidden cursor-pointer h-full flex flex-col rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${className}`}
      onClick={onClick}
    >
      {/* Image Section */}
      <div
        className={`relative isolate w-full aspect-square ${imageHeightClass} overflow-hidden ${
          showDailyButton ? "bg-[#f8f6f1]" : "bg-[#8B4513]"
        }`}
      >
        <SessionCachedImage
          src={imageUrl}
          alt={packName}
          className="w-full h-full object-cover"
          priority={imagePriority}
        />

        {(labels && labels.length > 0) ? (
          <ProductImageTag
            labels={labels}
            variant={tagVariant}
            preferredLabelSlug={preferredLabelSlug}
          />
        ) : null}
      </div>

      {/* Information Section */}
      <div className={`${bodyPadClass} flex flex-1 flex-col`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className={titleClass}>{packName}</h3>
            {categoryName ? (
              <p className={categoryClass}>
                {isCompact ? gpDailyTitleCase(categoryName) : categoryName}
              </p>
            ) : null}
            <p className={descClass}>{description}</p>
          </div>

          {showDailyButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={dailyPillClass}
            >
              Daily
            </button>
          )}
        </div>

        {/* Offer price first, then struck MRP when applicable */}
        <div className={`flex items-center justify-between mt-auto ${isCompact ? "pt-1" : "pt-1.5"}`}>
          <span className={priceClass}>
            {price}
            {shouldShowOriginalOnCard && (
              <span className="text-gray-500 font-medium line-through ml-1">₹{originalPrice}</span>
            )}
          </span>
          <FaChevronRight className={`mr-1.5 text-[#111827] ${chevronClass} shrink-0`} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;


