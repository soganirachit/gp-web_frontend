import React from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { ProductImageTag } from './ProductImageTag';

interface ProductCardProps {
  imageUrl: string;
  packName: string;
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
  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] h-full flex flex-col ${className}`}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative bg-[#8B4513] w-full aspect-square sm:aspect-auto sm:h-40 md:h-48 lg:h-52 overflow-hidden">
        <img
          src={imageUrl}
          alt={packName}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {(labels && labels.length > 0) ? (
          <ProductImageTag labels={labels} />
        ) : showBestsellerTag ? (
          <ProductImageTag labels={[{ name: 'Bestseller' }]} />
        ) : null}
      </div>

      {/* Information Section */}
      <div className="p-2.5 sm:p-4 md:p-5 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate mb-1">
              {packName}
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 truncate">
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
              className="bg-[#FAA222] text-gray-900 text-[10px] sm:text-xs md:text-sm font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1.5 rounded flex-shrink-0 hover:bg-[#DD7600] transition-colors"
            >
              Daily
            </button>
          )}
        </div>

        {/* Offer price first, then struck MRP when applicable */}
        <div className="flex items-center justify-between mt-auto pt-1.5 sm:pt-3">
          <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 whitespace-nowrap">
            {price}
            {shouldShowOriginalOnCard && (
              <span className="text-gray-500 font-medium line-through ml-1">₹{originalPrice}</span>
            )}
          </span>
          <FaChevronRight className="text-black text-xs sm:text-sm md:text-base" />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;


