import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { MdLocationOn, MdKeyboardArrowDown } from "react-icons/md";
import { FaChevronRight } from "react-icons/fa";
import { IoFilterOutline, IoSwapVerticalOutline } from "react-icons/io5";
import searchImage from "../../assets/icon/Search.png";
import locationhomeIcon from "../../assets/svg/gp_daily svg/locationhome.svg";
import { productService, Category, getEffectivePrice, getBasePrice, showStrikeBase } from "../../services/product.service";
import { storeService } from "../../services/store.service";
import { addressService } from "../../services/address.service";
import Spinner from "../common/Spinner";
import BottomNav from "../layout/BottomNav";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { getApiUrl } from "../../config/api.config";

const StoreProductsPages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { feature } = useFeatureTheme();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [categoryName, setCategoryName] = useState<string>("All Products");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [addressType, setAddressType] = useState<string>("Home");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [displayedProducts, setDisplayedProducts] = useState(6); // For Load More functionality

  // Memoize the category slug from URL
  const categorySlug = useMemo(() => searchParams.get('category'), [searchParams]);
  const stateCategoryName = useMemo(() => location.state?.categoryName, [location.state?.categoryName]);

  // Fetch address
  const fetchLatestAddress = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();
      const defaultAddress = addresses.find(addr => addr.isDefault);
      const selectedAddress = defaultAddress || addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

      if (selectedAddress) {
        const formattedAddress = [
          selectedAddress.houseNo,
          selectedAddress.streetName,
          selectedAddress.area,
          selectedAddress.city,
          selectedAddress.state,
          selectedAddress.pincode
        ].filter(Boolean).join(', ');

        setDeliveryLocation(formattedAddress);
        setAddressType(selectedAddress.type || "Home");
      } else {
        setDeliveryLocation("");
        setAddressType("Home");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setDeliveryLocation(localStorage.getItem("userLocation") || "");
      setAddressType("Home");
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const storeId = storeService.getStoreIdForProducts();
        const fetchedCategories = await productService.getCategories(
          storeId || undefined,
          "store"
        );
        const activeCategories = fetchedCategories
          .filter((cat) => cat.is_active)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setCategories(activeCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Initialize temporary store ID if user is not logged in
        const token = localStorage.getItem("token");
        if (!token) {
          const existingTempStoreId = storeService.getTemporaryStoreId();
          if (!existingTempStoreId) {
            try {
              await storeService.getStoreFromLocation();
            } catch (error: any) {
              console.error("Error getting store from location:", error);
              // Continue without store ID - products might still load
            }
          }
        }
        
        // Get category name from location state or use default
        if (stateCategoryName) {
          setCategoryName(stateCategoryName);
        } else if (categorySlug) {
          const formattedName = categorySlug.split('-').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          setCategoryName(formattedName);
        } else {
          setCategoryName("All Products");
        }

        // Set selected category slug
        setSelectedCategorySlug(categorySlug);

        // Get store ID (temporary for logged-out, selected for logged-in)
        const storeId = storeService.getStoreIdForProducts();

        if (categorySlug) {
          // Fetch products by category slug
          const result = await productService.getProductsByCategory(
            categorySlug,
            storeId || undefined,
            "store"
          );
          console.log("Fetched products for category:", categorySlug, result);
          console.log("First product image:", result?.[0]?.primary_image);
          setProducts(result || []);
        } else {
          // Fetch all products - using best sellers as fallback for "All"
          const result = await productService.getBestSellers(storeId || undefined);
          setProducts(result || []);
        }
        setDisplayedProducts(6); // Reset displayed products count
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    fetchLatestAddress();
  }, [categorySlug, stateCategoryName, fetchLatestAddress]);

  const getItemPrice = (item: any): number => getEffectivePrice(item);

  const sortProducts = (items: any[], sortType: string) => {
    return [...items].sort((a, b) => {
      switch (sortType) {
        case "Price": {
          const priceA = getItemPrice(a);
          const priceB = getItemPrice(b);
          return priceA - priceB;
        }
        case "Popularity":
          return 0;
        case "New":
          const idA = a.id?.toString() || a.slug || '';
          const idB = b.id?.toString() || b.slug || '';
          return idB.localeCompare(idA);
        case "Special":
          return 0;
        default:
          return 0;
      }
    });
  };

  const handleProductClick = (product: any) => {
    const productIdentifier = product.slug || product.id;
    navigate(`/gp-store/product/${productIdentifier}`, { state: { product } });
  };

  const handleCategoryClick = (slug: string | null) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  const handleLocationClick = () => {
    navigate(`${basePath}/addresses`);
  };

  const handleLoadMore = () => {
    setDisplayedProducts(prev => prev + 6);
  };

  const getProductImageUrl = (item: any): string => {
    // Helper to convert relative path to full URL
    const convertToFullUrl = (imagePath: string): string => {
      // If it's already a full URL, use it directly
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      // Get API base URL and remove /api/v1 to get server root
      const apiUrl = getApiUrl(); // e.g., "http://185.137.122.250:8083/api/v1"
      const baseUrl = apiUrl.replace('/api/v1', ''); // e.g., "http://185.137.122.250:8083"
      
      // Handle paths like "src/assets/A1/A5.jpeg"
      if (imagePath.startsWith('src/')) {
        // Remove 'src/' prefix and serve from /media/ endpoint (like Django media files)
        const cleanPath = imagePath.replace('src/', '');
        return `${baseUrl}/media/${cleanPath}`;
      }
      
      // If path doesn't start with src/, try /media/ endpoint
      return `${baseUrl}/media/${imagePath}`;
    };

    // Check if primary_image exists
    if (item.primary_image) {
      return convertToFullUrl(item.primary_image);
    }
    
    // Fallback to images array
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0].image || item.images[0];
      if (firstImage) {
        return convertToFullUrl(firstImage);
      }
    }
    
    return "https://via.placeholder.com/160";
  };

  const sortedProducts = sortProducts(products, sortBy);
  const visibleProducts = sortedProducts.slice(0, displayedProducts);
  const hasMoreProducts = sortedProducts.length > displayedProducts;

  // Combined loading state for full-screen loader
  const isPageLoading = isLoading || isLoadingCategories || isLoadingAddress;

  // Show full-screen loader while initial data is loading
  if (isPageLoading) {
    return (
      <div className="min-h-screen relative bg-[#f8f6f1]">
        <div className="absolute inset-0 bg-[#f8f6f1] flex items-center justify-center">
          <Spinner size={400} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto bg-[#f8f6f1] min-h-screen pb-20">
        {/* Top Header with Location and Search */}
        <div className="sticky top-0 z-20 bg-[#f8f6f1] border-b border-gray-200">
          <div className="px-4 pt-6 pb-3">
            {/* Location Section */}
            <div className="flex items-center gap-1.5 mb-3">
              <img
                src={locationhomeIcon}
                alt="Location"
                className="w-4 h-4 flex-shrink-0"
              />
              <div
                className="flex items-center gap-1 cursor-pointer min-w-0 flex-1"
                onClick={handleLocationClick}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-gray-800">{addressType}</span>
                  <span className="text-xs text-gray-600 truncate font-medium">
                    {isLoadingAddress ? 'Loading...' : deliveryLocation || 'Tap to set address'}
                  </span>
                </div>
                <MdKeyboardArrowDown className="text-gray-600 flex-shrink-0 text-lg" />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search anything....."
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#19411f] focus:border-transparent"
              />
              <img
                src={searchImage}
                alt="Search"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 cursor-pointer"
                onClick={() => navigate("/search")}
              />
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleCategoryClick(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedCategorySlug
                    ? 'bg-[#19411f] text-white'
                    : ' text-[#222222]'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategorySlug === category.slug
                      ? 'bg-[#19411f] text-white'
                      : ' text-[#222222]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Sort and Filter Buttons */}
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[#fff] border border[#E9E6E2] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <IoSwapVerticalOutline className="w-4 h-4" />
                <span>Sort</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-[#fff] border border-[#E9E6E2] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                <IoFilterOutline className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>

            {/* Sort Dropdown */}
            {isSortDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSortDropdownOpen(false)}
                />
                <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {[
                    { value: "Price", label: "Sort by Price" },
                    { value: "Popularity", label: "Sort by Popularity"},
                    { value: "New", label: "Sort by New"},
                    { value: "Special", label: "Sort by Special"}
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        sortBy === option.value 
                          ? 'bg-[#19411f] text-white' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-6">
          {error ? (
            <div className="text-red-500 text-center py-4 text-base">
              {error}
            </div>
          ) : (
            <>
              {/* Category Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {categoryName}
              </h1>

              {/* Product Grid */}
              {visibleProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products found in this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {visibleProducts.map((item) => (
                    <div
                      key={item.id || item.slug}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow relative"
                      onClick={() => handleProductClick(item)}
                    >
                    {/* Product Image */}
                    <div className="aspect-square bg-white overflow-hidden relative">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const currentSrc = img.src;
                          const apiUrl = getApiUrl();
                          const baseUrl = apiUrl.replace('/api/v1', '');
                          
                          // Try alternative URL formats as fallback
                          if (item.primary_image && item.primary_image.startsWith('src/')) {
                            const cleanPath = item.primary_image.replace('src/', '');
                            // Try without /media/ first
                            if (currentSrc.includes('/media/')) {
                              img.src = `${baseUrl}/${cleanPath}`;
                            } else {
                              // Try with full path including src/
                              img.src = `${baseUrl}/media/${item.primary_image}`;
                            }
                            return;
                          }
                          
                          // Final fallback to placeholder
                          img.src = "https://via.placeholder.com/160";
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 flex-1 pr-2">
                          {item.name}
                        </h3>
                        {/* Bestseller Badge */}
                        {item.labels && item.labels.some((label: any) => label.slug === 'best-seller') && (
                          <span className="bg-[#19411f] text-white text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0">
                            Bestseller
                          </span>
                        )}
                      </div>
                      
                      {/* Price and Arrow — effective_price only; show struck base when effective < base */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-gray-900 text-base font-bold">
                          {showStrikeBase(item) && (
                            <span className="text-gray-500 font-medium line-through mr-1">₹{getBasePrice(item)}</span>
                          )}
                          ₹{getItemPrice(item)}/
                        </p>
                        <FaChevronRight className="text-gray-400 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMoreProducts && (
                <div className="flex justify-center mb-6">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2.5 underline text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default StoreProductsPages;
