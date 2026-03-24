import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdLocationOn, MdKeyboardArrowDown } from "react-icons/md";
import { FaChevronRight, FaSearch } from "react-icons/fa";
import { addressService } from "../../services/address.service";
import { productService } from "../../services/product.service";
import type { Product } from "../../services/product.service";
import { basePackService, BasePack } from "../../services/basepack.service";
import ProductCard from "../common/ProductCard";
import BottomNavigation from "../layout/BottomNav";
import Spinner from "../common/Spinner";
import SearchIcon from "../../assets/icon/Search.png";
import ProfileIcon from "../../assets/icon/Profile.png";
import walletImage from "../../assets/icon/Wallet.png";
import scooterIcon from "../../assets/svg/gp_daily svg/scooter.svg";
import pujaIcon from "../../assets/icon/puja.svg";
import exoticIcon from "../../assets/icon/exotic.svg";
import sortIcon from "../../assets/svg/gp_daily svg/sort.svg";
import filterIcon from "../../assets/svg/gp_daily svg/filter.svg";
import orangeCover from "../../assets/svg/gp_daily svg/orange_cover.svg";
import locationhomeIcon from "../../assets/svg/gp_daily svg/locationhome.svg";

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");

  // State management
  const [activeTab, setActiveTab] = useState("Puja Flowers");
  const [activeSubCategory, setActiveSubCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);

  // Fetch address
  const fetchLatestAddress = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();

      const latestAddress = addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      [0];

      if (latestAddress) {
        const formattedAddress = [
          latestAddress.houseNo,
          latestAddress.streetName,
          latestAddress.area,
          latestAddress.city,
          latestAddress.state,
          latestAddress.pincode
        ].filter(Boolean).join(', ');

        setDeliveryLocation(formattedAddress);
      } else {
        setDeliveryLocation('');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      setDeliveryLocation(localStorage.getItem('userLocation') || '');
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  useEffect(() => {
    if (category === "puja" || category === "pujaflowers") {
      setActiveTab("Puja Flowers");
      setActiveSubCategory("All");
    } else if (category === "exotic") {
      setActiveTab("Exotic Flowers");
      setActiveSubCategory("All");
    }
  }, [category]);

  useEffect(() => {
    fetchLatestAddress();
  }, [fetchLatestAddress]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [productsResult, basePacksResult] = await Promise.all([
          productService.getAllProducts(),
          basePackService.getAllBasePacks().catch(() => []) // Handle error gracefully
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

  // Helper function to get image URL
  const getImageUrl = (imagesUrl?: string | string[]): string => {
    if (!imagesUrl) return "/placeholder.svg";
    if (Array.isArray(imagesUrl)) {
      return imagesUrl[0] || "/placeholder.svg";
    }
    return imagesUrl;
  };

  const handleProductClick = (product: Product | BasePack) => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  const handleLocationClick = () => {
    navigate('/location', { state: { returnUrl: '/Products' } });
  };

  // Filter products by category and type
  const pujaProducts = products.filter((item) => item.category === "PUJA");
  const exoticProducts = products.filter((item) => item.category === "EXOTIC");

  // Filter by type for subcategories (Puja Flowers)
  const pujaPackProducts = basePacks;
  const bouquetProducts = pujaProducts.filter((item) => item.type?.toUpperCase() === "BOUQUET");
  const garlandProducts = pujaProducts.filter((item) => item.type?.toUpperCase() === "GARLAND");
  const comboPackProducts = pujaProducts.filter((item) => item.type?.toUpperCase() === "COMBO");

  // Filter by type for subcategories (Exotic Flowers)
  // Exotic Packs are all exotic products (matching gp-daily homepage logic)
  const exoticPackProducts = exoticProducts.filter((item) => item.isAvailable);
  const exoticBouquetProducts = exoticProducts.filter((item) => item.type?.toUpperCase() === "BOUQUET");
  const exoticGarlandProducts = exoticProducts.filter((item) => item.type?.toUpperCase() === "GARLAND");
  const exoticComboPackProducts = exoticProducts.filter((item) => item.type?.toUpperCase() === "COMBO");

  // Get products based on active subcategory
  const getFilteredProducts = () => {
    if (activeTab === "Exotic Flowers") {
      // For Exotic Flowers, filter by subcategory
      switch (activeSubCategory) {
        case "Bouquets":
          return exoticBouquetProducts.filter((item) => item.isAvailable);
        case "Garlands":
          return exoticGarlandProducts.filter((item) => item.isAvailable);
        case "Combo Pack":
          return exoticComboPackProducts.filter((item) => item.isAvailable);
        case "All":
        default:
          return exoticProducts.filter((item) => item.isAvailable);
      }
    }

    // For Puja Flowers, filter by subcategory
    switch (activeSubCategory) {
      case "Puja Packs":
        return pujaPackProducts;
      case "Bouquets":
        return bouquetProducts.filter((item) => item.isAvailable);
      case "Garlands":
        return garlandProducts.filter((item) => item.isAvailable);
      case "Combo Pack":
        return comboPackProducts.filter((item) => item.isAvailable);
      case "All":
      default:
        return pujaProducts.filter((item) => item.isAvailable);
    }
  };

  const filteredProducts = getFilteredProducts();

  if (isLoading || isLoadingAddress) {
    return (
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto bg-[#f8f6f1] min-h-screen pb-20">
        {/* Top Navigation Bar */}
        <div className="bg-[#f8f6f1] sticky top-0 z-20 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Location Section */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <img
                src={locationhomeIcon}
                alt="Location"
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
              />
              <div
                className="flex items-center gap-1 cursor-pointer min-w-0 flex-1"
                onClick={handleLocationClick}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-bold text-gray-800">Home</span>
                  <span className="text-xs sm:text-sm text-gray-600 truncate font-medium">
                    {isLoadingAddress ? 'Loading...' : deliveryLocation || 'Tap to set address'}
                  </span>
                </div>
                <MdKeyboardArrowDown className="text-gray-600 flex-shrink-0 text-lg sm:text-xl" />
              </div>
            </div>

            {/* Right Side Icons */}
            {/* <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <img
                src={SearchIcon}
                alt="Search"
                className="w-6 h-6 sm:w-7 sm:h-7 cursor-pointer"
                onClick={() => navigate('/search')}
                />
                <img
                  src={walletImage}
                  alt="Wallet"
                className="w-10 h-10 sm:w-10 sm:h-10 cursor-pointer"
                onClick={() => navigate('/wallet')}
              />
            </div> */}
          </div>

          {/* Search Bar */}
          <div className="mt-2 sm:mt-3">
            <div
              className="rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 cursor-pointer shadow-sm border border-[#808080]"
              onClick={() => navigate('/search')}
            >
              <span className="flex-1 text-left text-gray-400 text-sm sm:text-base font-medium">Search anything.....</span>
              <FaSearch className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Primary and Secondary Category Filters */}
        <div className="bg-[#f8f6f1] px-4 pt-4">
          <div className="bg-white rounded-2xl p-2 mb-3 border border-gray-200">
            <div className="relative flex gap-2">
              {/* Sliding Orange Background */}
              <div
                className={`absolute top-0 bottom-0 transition-all duration-300 ease-in-out ${activeTab === "Puja Flowers" ? "left-2" : "left-1/2"
                  }`}
                style={{
                  width: "calc(50% - 0.5rem)",
                }}
              >
                <img
                  src={orangeCover}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ borderRadius: "0.75rem" }}
                />
              </div>

              {/* Buttons */}
              <button
                onClick={() => {
                  setActiveTab("Puja Flowers");
                  setActiveSubCategory("All");
                }}
                className="relative z-10 flex-1 py-1.5 sm:py-2.5 px-4 text-center rounded-lg transition-all duration-300 text-sm sm:text-base font-medium flex items-center justify-center gap-2 bg-transparent"
              >
                <img
                  src={pujaIcon}
                  alt="Puja"
                  className={`w-5 h-5 sm:w-7 sm:h-7 transition-opacity duration-300 ${activeTab === "Puja Flowers" ? "opacity-100" : "opacity-50"
                    }`}
                  style={activeTab === "Puja Flowers" ? { filter: "brightness(0) saturate(100%)" } : {}}
                />
                <span className={activeTab === "Puja Flowers" ? "text-[#222222]" : "text-gray-400"}>
                  Puja Flowers
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("Exotic Flowers");
                  setActiveSubCategory("All");
                }}
                className="relative z-10 flex-1 py-1.5 sm:py-2.5 px-4 text-center rounded-lg transition-all duration-300 text-sm sm:text-base font-medium flex items-center justify-center gap-2 bg-transparent"
              >
                <img
                  src={exoticIcon}
                  alt="Exotic"
                  className={`w-5 h-5 sm:w-7 sm:h-7 transition-opacity duration-300 ${activeTab === "Exotic Flowers" ? "opacity-100" : "opacity-50"
                    }`}
                  style={activeTab === "Exotic Flowers" ? { filter: "brightness(0) saturate(100%)" } : {}}
                />
                <span className={activeTab === "Exotic Flowers" ? "text-[#222222]" : "text-gray-400"}>
                  Exotic Flowers
                </span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center px-4">
            {activeTab === "Puja Flowers"
              ? ["All", "Puja Packs", "Bouquets", "Garlands"].map((subCat) => (
                activeSubCategory === subCat ? (
                  <button
                    key={subCat}
                    onClick={() => setActiveSubCategory(subCat)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 bg-[rgb(250,162,34)] text-gray-900"
                  >
                    {subCat}
                  </button>
                ) : (
                  <button
                    key={subCat}
                    onClick={() => setActiveSubCategory(subCat)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 text-gray-900 bg-white border border-gray-200"
                  >
                    {subCat}
                  </button>
                )
              ))
              : ["All", "Bouquets", "Garlands", "Combo Pack"].map((subCat) => (
                activeSubCategory === subCat ? (
                  <button
                    key={subCat}
                    onClick={() => setActiveSubCategory(subCat)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 bg-[rgb(250,162,34)] text-gray-900"
                  >
                    {subCat}
                  </button>
                ) : (
                  <button
                    key={subCat}
                    onClick={() => setActiveSubCategory(subCat)}
                    className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 text-gray-900 bg-white border border-gray-200"
                  >
                    {subCat}
                  </button>
                )
              ))
            }
          </div>
        </div>

        {/* Sort and Filter Buttons */}
        <div className="bg-[#f8f6f1] px-8 py-2 flex items-center justify-start gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#222222]">
            <img src={sortIcon} alt="Sort" className="w-4 h-4" />
            Sort
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-[#222222]">
            <img src={filterIcon} alt="Filter" className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Delivery Information Banner */}
        <div className="px-4">
          <div className="bg-white py-2 rounded-2xl">
            <div className="flex items-center gap-2 text-sm text-gray-700 px-4">
              <img src={scooterIcon} alt="Scooter" className="w-5 h-5" />
              <span>Free Delivery - 5-25 min slots in Vadodara</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {error ? (
            <div className="text-red-500 text-center py-4 text-base">
              {error}
            </div>
          ) : (activeTab === "Puja Flowers" && activeSubCategory === "All") || (activeTab === "Exotic Flowers" && activeSubCategory === "All") ? (
            // Show sections for "All" subcategory
            <div className="space-y-6">
              {/* Puja Packs Section - Only for Puja Flowers */}
              {activeTab === "Puja Flowers" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Puja Packs</h2>
                    <button
                      onClick={() => {
                        navigate(`/explore-more?category=Puja Flowers&section=Puja Packs`);
                      }}
                      className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                    >
                      <span>Explore More</span>
                      <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                  <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {pujaPackProducts.slice(0, 3).map((pack, index) => (
                      <div key={pack.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                        <ProductCard
                          imageUrl={getImageUrl(pack.imagesUrl)}
                          packName={pack.name}
                          description={pack.description || "Mixed flowers daily"}
                          price={`₹${pack.sellingPrice}/Day`}
                          showDailyButton={true}
                          showBestsellerTag={index === 0}
                          onClick={() => handleProductClick(pack as unknown as Product)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exotic Packs Section - Only for Exotic Flowers */}
              {activeTab === "Exotic Flowers" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Exotic Packs</h2>
                    <button
                      onClick={() => {
                        navigate(`/explore-more?category=Exotic Flowers&section=Exotic Packs`);
                      }}
                      className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                    >
                      <span>Explore More</span>
                      <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                  <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {exoticPackProducts.slice(0, 3).map((item, index) => (
                      <div key={item.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                        <ProductCard
                          imageUrl={getImageUrl(item.imagesUrl)}
                          packName={item.name}
                          description={item.description || "Mixed flowers daily"}
                          price={`₹${item.sellingPrice}/Day`}
                          showDailyButton={true}
                          showBestsellerTag={index === 0}
                          onClick={() => handleProductClick(item)}
                        />
                      </div>
                    ))}
                    {exoticPackProducts.length === 0 && (
                      <div className="w-full text-center py-8 text-gray-500">
                        No exotic packs found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bouquets Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Bouquets</h2>
                  <button
                    onClick={() => {
                      navigate(`/explore-more?category=${activeTab}&section=Bouquets`);
                    }}
                    className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                  >
                    <span>Explore More</span>
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {(activeTab === "Puja Flowers" ? bouquetProducts : exoticBouquetProducts).filter(item => item.isAvailable).slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                      <ProductCard
                        imageUrl={getImageUrl(item.imagesUrl)}
                        packName={item.name}
                        description={item.description || "Mixed flowers daily"}
                        price={`₹${item.sellingPrice}/Day`}
                        showDailyButton={true}
                        showBestsellerTag={index === 0 || index === 2}
                        onClick={() => handleProductClick(item)}
                      />
                    </div>
                  ))}
                  {((activeTab === "Puja Flowers" ? bouquetProducts : exoticBouquetProducts).filter(item => item.isAvailable).length === 0) && (
                    <div className="w-full text-center py-8 text-gray-500">
                      No bouquets found
                    </div>
                  )}
                </div>
              </div>

              {/* Garlands Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Garlands</h2>
                  <button
                    onClick={() => {
                      navigate(`/explore-more?category=${activeTab}&section=Garlands`);
                    }}
                    className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                  >
                    <span>Explore More</span>
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {(activeTab === "Puja Flowers" ? garlandProducts : exoticGarlandProducts).filter(item => item.isAvailable).slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                      <ProductCard
                        imageUrl={getImageUrl(item.imagesUrl)}
                        packName={item.name}
                        description={item.description || "Mixed flowers daily"}
                        price={`₹${item.sellingPrice}/Day`}
                        showDailyButton={true}
                        showBestsellerTag={index === 0}
                        onClick={() => handleProductClick(item)}
                      />
                    </div>
                  ))}
                  {((activeTab === "Puja Flowers" ? garlandProducts : exoticGarlandProducts).filter(item => item.isAvailable).length === 0) && (
                    <div className="w-full text-center py-8 text-gray-500">
                      No garlands found
                    </div>
                  )}
                </div>
              </div>

              {/* Combo Pack Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Combo Pack</h2>
                  <button
                    onClick={() => {
                      navigate(`/explore-more?category=${activeTab}&section=Combo Pack`);
                    }}
                    className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                  >
                    <span>Explore More</span>
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {(activeTab === "Puja Flowers" ? comboPackProducts : exoticComboPackProducts).filter(item => item.isAvailable).slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                      <ProductCard
                        imageUrl={getImageUrl(item.imagesUrl)}
                        packName={item.name}
                        description={item.description || "Mixed flowers daily"}
                        price={`₹${item.sellingPrice}/Day`}
                        showDailyButton={true}
                        showBestsellerTag={index === 0 || index === 2}
                        onClick={() => handleProductClick(item)}
                      />
                    </div>
                  ))}
                  {((activeTab === "Puja Flowers" ? comboPackProducts : exoticComboPackProducts).filter(item => item.isAvailable).length === 0) && (
                    <div className="w-full text-center py-8 text-gray-500">
                      No combo packs found
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Show grid view for selected subcategory or Exotic Flowers
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((item, index) => (
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
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No products found in this category
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
};

export default ProductPage;
