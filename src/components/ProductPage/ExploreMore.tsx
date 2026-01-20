import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { productService } from "../../services/product.service";
import type { Product } from "../../services/product.service";
import { basePackService, BasePack } from "../../services/basepack.service";
import ProductCard from "../common/ProductCard";
import BottomNavigation from "../layout/BottomNav";
import Spinner from "../common/Spinner";

const ExploreMore: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const section = searchParams.get("section") || "";
  
  const [products, setProducts] = useState<Product[]>([]);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(6);

  // Helper function to get image URL
  const getImageUrl = (imagesUrl?: string | string[]): string => {
    if (!imagesUrl) return "https://via.placeholder.com/160";
    if (Array.isArray(imagesUrl)) {
      return imagesUrl[0] || "https://via.placeholder.com/160";
    }
    return imagesUrl;
  };

  const handleProductClick = (product: Product | BasePack) => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [productsResult, basePacksResult] = await Promise.all([
          productService.getAllProducts(),
          basePackService.getAllBasePacks().catch(() => [])
        ]);

        const activeProducts = productsResult.filter((item: Product) => item.isActive);
        setProducts(activeProducts);
        setBasePacks(basePacksResult);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products based on category and section
  const getFilteredProducts = (): (Product | BasePack)[] => {
    if (section === "Puja Packs") {
      return basePacks;
    }

    if (section === "Exotic Packs") {
      return products.filter((item) => item.category?.toUpperCase() === "EXOTIC" && item.isAvailable);
    }

    // Filter by category and type
    const categoryUpper = category.toUpperCase();
    const sectionUpper = section.toUpperCase();

    if (categoryUpper === "PUJA" || categoryUpper === "PUJA FLOWERS") {
      const pujaProducts = products.filter((item) => item.category?.toUpperCase() === "PUJA");
      
      switch (sectionUpper) {
        case "BOUQUETS":
          return pujaProducts.filter((item) => item.type?.toUpperCase() === "BOUQUET" && item.isAvailable);
        case "GARLANDS":
          return pujaProducts.filter((item) => item.type?.toUpperCase() === "GARLAND" && item.isAvailable);
        case "COMBO PACK":
        case "COMBO PACKS":
          return pujaProducts.filter((item) => item.type?.toUpperCase() === "COMBO" && item.isAvailable);
        default:
          return pujaProducts.filter((item) => item.isAvailable);
      }
    }

    if (categoryUpper === "EXOTIC" || categoryUpper === "EXOTIC FLOWERS") {
      const exoticProducts = products.filter((item) => item.category?.toUpperCase() === "EXOTIC");
      
      switch (sectionUpper) {
        case "BOUQUETS":
          return exoticProducts.filter((item) => item.type?.toUpperCase() === "BOUQUET" && item.isAvailable);
        case "GARLANDS":
          return exoticProducts.filter((item) => item.type?.toUpperCase() === "GARLAND" && item.isAvailable);
        case "COMBO PACK":
        case "COMBO PACKS":
          return exoticProducts.filter((item) => item.type?.toUpperCase() === "COMBO" && item.isAvailable);
        default:
          return exoticProducts.filter((item) => item.isAvailable);
      }
    }

    return [];
  };

  const filteredProducts = getFilteredProducts();
  const displayedProducts = filteredProducts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredProducts.length;

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + 6);
  };

  // Get page title
  const getPageTitle = (): string => {
    if (section) {
      return section;
    }
    if (category) {
      return category.charAt(0).toUpperCase() + category.slice(1) + " Flowers";
    }
    return "Explore More";
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto bg-[#FFFBEB] min-h-screen pb-20">
        {/* Header */}
        <div className="bg-[#FFFBEB] sticky top-0 z-20 px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <IoArrowBack className="text-xl text-gray-800" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-800">{getPageTitle()}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size={400} />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4 text-base">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {displayedProducts.map((item, index) => (
                  <div key={item.id} className="flex-shrink-0">
                    <ProductCard
                      imageUrl={getImageUrl(item.imagesUrl || (item as BasePack).imagesUrl)}
                      packName={item.name}
                      description={item.description || "Mixed flowers daily"}
                      price={`₹${item.sellingPrice}/Day`}
                      showDailyButton={true}
                      showBestsellerTag={index === 0 || index === 2}
                      onClick={() => handleProductClick(item)}
                    />
                  </div>
                ))}
              </div>
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products found in this category
                </div>
              )}

              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    className="text-gray-700 underline text-base font-medium hover:text-gray-900"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
};

export default ExploreMore;

