import React from 'react';
import { FaChevronRight } from 'react-icons/fa';

interface ProductCardProps {
  imageUrl: string;
  packName: string;
  description: string;
  price: string;
  showDailyButton?: boolean;
  showBestsellerTag?: boolean;
  onClick?: () => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  imageUrl,
  packName,
  description,
  price,
  showDailyButton = false,
  showBestsellerTag = false,
  onClick,
  className = ''
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative bg-[#8B4513] w-full aspect-square sm:aspect-auto sm:h-40 md:h-48 lg:h-52 overflow-hidden">
        <img
          src={imageUrl}
          alt={packName}
          className="w-full h-full object-cover"
        />

        {/* Bestseller Tag */}
        {showBestsellerTag && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#FFB84D] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium text-gray-800">
            Bestseller
          </div>
        )}
      </div>

      {/* Information Section */}
      <div className="p-2.5 sm:p-4 md:p-5">
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

        {/* Price and Chevron */}
        <div className="flex items-center justify-between mt-1.5 sm:mt-3">
          <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
            {price}
          </span>
          <FaChevronRight className="text-black text-xs sm:text-sm md:text-base" />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;


