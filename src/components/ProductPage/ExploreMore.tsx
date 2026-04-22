import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import {
  productService,
  getEffectivePrice,
  getBasePrice,
  showStrikeBaseOnCard,
  PRODUCT_AVAILABILITY_DAILY,
  PRODUCT_AVAILABILITY_STORE,
} from "../../services/product.service";

import type { Product, BestSeller } from "../../services/product.service";
import { storeService } from "../../services/store.service";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import ProductCard from "../common/ProductCard";
import { ProductBrowseSkeleton } from "../common/PageSkeletons";

const ExploreMore: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const section = searchParams.get("section") || "";

  const { feature, basePath } = useFeatureTheme();
  const activeFeature = feature;
  const activeBasePath = basePath;

  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [premiumProducts, setPremiumProducts] = useState<BestSeller[]>([]);
  const [allStoreProducts, setAllStoreProducts] = useState<BestSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(6);
  const fetchIdRef = useRef(0);

  // Helper function to get image URL
  const getImageUrl = (imagesUrl?: string | string[]): string => {
    if (!imagesUrl) return "/placeholder.svg";
    if (Array.isArray(imagesUrl)) {
      return imagesUrl[0] || "/placeholder.svg";
    }
    return imagesUrl;
  };

  const handleProductClick = (product: any) => {
    if (activeFeature === "gpStore") {
      const productSlug = product.slug || product.id;
      navigate(`/gp-store/product/${productSlug}`, { state: { product } });
    } else {
      const pathSlug = product.slug ?? product.id;
      navigate(`/gp-daily/product/${encodeURIComponent(String(pathSlug))}`, { state: { product } });
    }
  };

  // Fetch data based on category/section query params.
  // We still use an AbortController to stop in-flight requests on unmount / param changes.
  useEffect(() => {
    const id = ++fetchIdRef.current;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (activeFeature === "gpStore") {
          const storeId = storeService.getStoreIdForProducts();
          const categoryUpper = category.toUpperCase();
          const sectionUpper = section.toUpperCase();

          if (categoryUpper === "BEST" || sectionUpper.includes("BEST")) {
            // → GET api/v1/products/?label=best-seller&ordering=-order_count
            const fetched = await productService.getProductsByLabel(
              "best-seller",
              storeId || undefined,
              abortController.signal,
              "-order_count",
              PRODUCT_AVAILABILITY_STORE,
            );
            if (id !== fetchIdRef.current) return;
            setBestSellers(fetched || []);

          } else if (categoryUpper === "PREMIUM" || sectionUpper.includes("PREMIUM")) {
            // → GET api/v1/products/?label=premium&ordering=-order_count
            const fetched = await productService.getProductsByLabel(
              "premium",
              storeId || undefined,
              undefined,
              "-order_count"
            );
            if (id !== fetchIdRef.current) return;
            setPremiumProducts(fetched || []);

          } else if (categoryUpper === "ALL" || sectionUpper.includes("ALL")) {
            // → GET api/v1/products/  (no ordering param)
            const fetched = await productService.getProductsByOrdering(
              undefined,
              storeId || undefined,
              abortController.signal,
              PRODUCT_AVAILABILITY_STORE,
            );
            if (id !== fetchIdRef.current) return;
            setAllStoreProducts(fetched || []);

          } else {
                // Fallback: All store products (no special ordering)
                const fetched = await productService.getProductsByOrdering(
                  undefined,
                  storeId || undefined,
                  abortController.signal,
                  PRODUCT_AVAILABILITY_STORE,
                );
                if (id !== fetchIdRef.current) return;
                setAllStoreProducts(fetched || []);
              }
        } else {
          // GP Daily — scoped to selected/temporary store when available
          const dailyStoreId = storeService.getStoreIdForProducts();
          const productsResult = await productService.getAllProducts({
            availabilityType: PRODUCT_AVAILABILITY_DAILY,
            storeId: dailyStoreId || undefined,
          });
          if (id !== fetchIdRef.current) return;
          const activeProducts = productsResult.filter(
            (item: Product) => item.isActive !== false,
          );
          setProducts(activeProducts);
        }
      } catch (error) {
        if (id !== fetchIdRef.current) return;
        console.error("Error fetching data:", error);
        setError("Failed to load products");
      } finally {
        if (id === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      abortController.abort();
    };
  }, [activeFeature, category, section]);

  // Return the correct product list based on active section
  const getFilteredProducts = (): any[] => {
    if (activeFeature === "gpStore") {
      const categoryUpper = category.toUpperCase();
      const sectionUpper = section.toUpperCase();

      if (categoryUpper === "BEST" || sectionUpper.includes("BEST")) {
        return bestSellers;
      }
      if (categoryUpper === "PREMIUM" || sectionUpper.includes("PREMIUM")) {
        return premiumProducts;
      }
      if (categoryUpper === "ALL" || sectionUpper.includes("ALL")) {
        return allStoreProducts;
      }
      return bestSellers;
    }

    // GP Daily filtering logic (category names match gp-store Product page)
    if (section === "Puja Packs") {
      return products.filter(
        (item) =>
          item.category?.toUpperCase() === "PUJA" && item.isAvailable,
      );
    }

    if (section === "Exotic Packs") {
      return products.filter(
        (item) =>
          item.category?.toUpperCase() === "EXOTIC" && item.isAvailable,
      );
    }

    const categoryUpper = category.toUpperCase();
    const sectionUpper = section.toUpperCase();

    if (categoryUpper === "PUJA" || categoryUpper === "PUJA FLOWERS") {
      const pujaProducts = products.filter(
        (item) => item.category?.toUpperCase() === "PUJA"
      );
      switch (sectionUpper) {
        case "BOUQUETS":
          return pujaProducts.filter(
            (item) => item.type?.toUpperCase() === "BOUQUET" && item.isAvailable
          );
        case "GARLANDS":
          return pujaProducts.filter(
            (item) => item.type?.toUpperCase() === "GARLAND" && item.isAvailable
          );
        case "COMBO PACK":
        case "COMBO PACKS":
          return pujaProducts.filter(
            (item) => item.type?.toUpperCase() === "COMBO" && item.isAvailable
          );
        default:
          return pujaProducts.filter((item) => item.isAvailable);
      }
    }

    if (categoryUpper === "EXOTIC" || categoryUpper === "EXOTIC FLOWERS") {
      const exoticProducts = products.filter(
        (item) => item.category?.toUpperCase() === "EXOTIC"
      );
      switch (sectionUpper) {
        case "BOUQUETS":
          return exoticProducts.filter(
            (item) => item.type?.toUpperCase() === "BOUQUET" && item.isAvailable
          );
        case "GARLANDS":
          return exoticProducts.filter(
            (item) => item.type?.toUpperCase() === "GARLAND" && item.isAvailable
          );
        case "COMBO PACK":
        case "COMBO PACKS":
          return exoticProducts.filter(
            (item) => item.type?.toUpperCase() === "COMBO" && item.isAvailable
          );
        default:
          return exoticProducts.filter((item) => item.isAvailable);
      }
    }

    return [];
  };

  const filteredProducts = getFilteredProducts();
  const displayedProducts = filteredProducts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredProducts.length;

  const handleLoadMore = () => setDisplayedCount((prev) => prev + 6);

  const getPageTitle = (): string => {
    if (section) return section;
    if (category) {
      return category.charAt(0).toUpperCase() + category.slice(1) + " Flowers";
    }
    return "Explore More";
  };

  const renderCard = (item: any, index: number) => {
    const effective = getEffectivePrice(item);
    const base = getBasePrice(item);
    const showStrike = showStrikeBaseOnCard(item);
    const price = effective > 0 ? `₹${effective}` : "";

    const imageUrl = item.primary_image || getImageUrl(item.imagesUrl);

    return (
      <div key={item.id} className="flex-shrink-0">
        <ProductCard
          imageUrl={imageUrl}
          packName={item.name}
          description={
            item.short_description || item.description || "Mixed flowers daily"
          }
          price={price}
          originalPrice={showStrike ? base : undefined}
          showDailyButton={true}
          showBestsellerTag={index === 0 || index === 2}
          onClick={() => handleProductClick(item)}
        />
      </div>
    );
  };

  if (isLoading) {
    return <ProductBrowseSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto min-h-screen w-full max-w-[min(800px,100vw)] bg-[#f8f6f1] pb-nav-bottom">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {error ? (
            <div className="text-red-500 text-center py-4 text-base">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 xs:gap-6 items-start">
                {displayedProducts.map((item, index) => renderCard(item, index))}
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

      </div>
    </div>
  );
};

export default ExploreMore;