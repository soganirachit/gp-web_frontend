import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { ProductImageTag } from './ProductImageTag';

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
  /** Optional API labels (shown on image top-left; overrides showBestsellerTag when set) */
  labels?: { name?: string; slug?: string }[];
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
  showBestsellerTag = false,
  labels,
  onClick,
  className = ''
}) => {
  const shouldShowOriginalOnCard =
    originalPrice != null && originalPrice > 0 && String(price || "").length <= 8;
  const tagVariant = showDailyButton ? "daily" : "store";

  return (
    <div
      className={`bg-white overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] h-full flex flex-col rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.08)] ${className}`}
      onClick={onClick}
    >
      {/* Image Section */}
      <div
        className={`relative w-full aspect-square sm:aspect-auto sm:h-40 md:h-48 lg:h-52 overflow-hidden ${
          showDailyButton ? "bg-[#f8f6f1]" : "bg-[#8B4513]"
        }`}
      >
        <img
          src={imageUrl}
          alt={packName}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {(labels && labels.length > 0) ? (
          <ProductImageTag labels={labels} variant={tagVariant} />
        ) : showBestsellerTag ? (
          <ProductImageTag labels={[{ name: 'Bestseller' }]} variant={tagVariant} />
        ) : null}
      </div>

      {/* Information Section */}
      <div className="p-2.5 sm:p-3 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] leading-5 font-semibold text-[#111827] truncate mb-0.5">
              {packName}
            </h3>
            {categoryName ? (
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[#19411f]/80 truncate mb-0.5">
                {categoryName}
              </p>
            ) : null}
            <p className="text-[11px] leading-snug text-[#6B7280] truncate">
              {description}
            </p>
          </div>

          {/* Daily Button */}
          {showDailyButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle daily button click if needed
              }}
              className="bg-[#ffb042] text-[#3C2A00] text-[10px] font-medium px-2 py-0.5 rounded-sm flex-shrink-0"
            >
              Daily
            </button>
          )}
        </div>

        {/* Offer price first, then struck MRP when applicable */}
        <div className="flex items-center justify-between mt-auto pt-1.5">
          <span className="text-[19px] leading-[22px] font-semibold text-[#111827] whitespace-nowrap">
            {price}
            {shouldShowOriginalOnCard && (
              <span className="text-gray-500 font-medium line-through ml-1">₹{originalPrice}</span>
            )}
          </span>
          <FaChevronRight className="text-[#111827] text-base shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;


