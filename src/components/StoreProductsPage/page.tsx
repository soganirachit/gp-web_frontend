// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import searchImage from "../../assets/icon/Search.png";
import { Product, storeProductService } from "../../services/storeProduct.service";
import walletImage from "../../assets/icon/Wallet.png";
import profileImage from "../../assets/icon/Profile.png";
import { IoArrowBack } from "react-icons/io5";
import Spinner from "../common/Spinner";
import { storeProducts } from "@/services/stroeProductDetails.service";

const StoreProductsPages: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const isBasePack = (item: Product | storeProducts): item is storeProducts =>
    "sellingPricePerPackDaily" in item;

  
  const sortProducts = (items: (Product | storeProducts)[], sortType: string) => {
      return [...items].sort((a, b) => {
        switch (sortType) {
          case "Price": {
            const priceA = isBasePack(a) ? a.sellingPrice : a.sellingPrice;
            const priceB = isBasePack(b) ? b.sellingPrice : b.sellingPrice;
            return priceA - priceB;
          }
          case "Popularity":
            // You can add popularity logic here if you have a popularity field
            return 0;
          case "New":
            // Sort by creation date if available, otherwise by ID
            return b.id.localeCompare(a.id);
          case "Special":
            // You can add special sorting logic here
            return 0;
          default:
            return 0;
        }
      });
    };

  const getItemPrice = (item: Product | storeProducts): number => {
    return isBasePack(item) ? item.sellingPrice : item.sellingPrice;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await storeProductService.getAllStoreProducts();
        // Ensure each product has a 'category' property (fallback to empty string if missing)
           const activeProducts = result.filter((item: any) => item.isActive);
        setProducts(
          activeProducts.map((item: any) => ({
            category: item.category ?? "",
            ...item,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProductClick = (product: Product | storeProducts ) => {
    navigate(`/store/${product.id}`, { state: { product } });
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFBEB]">
          <div className="max-w-[800px] mx-auto">
            <div className="p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <IoArrowBack className="text-xl md:text-2xl" />
                </button>
                <h1 className="text-xl md:text-2xl font-medium">
                  Store Products
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={searchImage}
                  alt="search"
                  className="w-6 h-6 md:w-6 md:h-6"
                  onClick={() => navigate("/search")}
                />
                <img
                  src={walletImage}
                  alt="Wallet"
                  className="w-10 h-10 md:w-10 md:h-10"
                  onClick={() => navigate("/wallet")}
                />
                {/* <img
                  src={profileImage}
                  alt="Profile"
                  className="w-6 h-6 md:w-8 md:h-8"
                  onClick={() => navigate("/account")}
                /> */}
              </div>
            </div>

            {/* Filter Section */}
            {/* <div className="px-4 pb-4 bg-[#FFFBEB] ">
              <div className="flex items-center justify-end"> */}
                {/* <h2 className="text-xl font-semibold">Puja Flower Packs</h2> */}
                {/* <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-full px-4 py-2 pr-8 text-sm font-medium text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F15A22] focus:border-transparent"
                  >
                    <option value="Price">Sort by Price</option>
                    <option value="Popularity">Sort by Popularity</option>
                    <option value="New">Sort by New</option>
                    <option value="Special">Sort by Special</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}

         {/* Filter Section - Improved for mobile */}
         <div className="px-4 pb-4 bg-[#FFFBEB]">
              <div className="flex items-center justify-end">
                {/* <h2 className="text-xl font-semibold">Puja Flower Packs</h2> */}
                
                {/* Custom Sort Dropdown - Mobile Friendly */}
                <div className="relative">
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:border-[#F15A22] focus:outline-none focus:ring-2 focus:ring-[#F15A22] focus:border-transparent transition-colors"
                  >
                    <span>Sort by {sortBy}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu - Mobile Optimized */}
                  {isSortDropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Content */}
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
                                ? 'bg-[#F15A22] text-white' 
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
            </div>
          </div>
        </div>

        {/* Spacer to offset the fixed header */}
        <div className="h-[65px]"></div>

        {/* Content */}
        <div className="px-8 pb-20">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size={400} />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4 text-base md:text-lg">
              {error}
            </div>
          ) : (
            <>
              {/* Exotic Flowers - Shows all products */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               
                  {sortProducts(products, sortBy).map((item)=>(
                  <div
                    key={item.id}
                    className="w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProductClick(item)}
                  >
                    <div className="p-3">
                      <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                        <img
                          src={
                            item.imagesUrl?.[0] ||
                            "https://via.placeholder.com/160"
                          }
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="pt-1 pb-2 px-1 space-y-2">
                        <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                          {item.name} 
                        </h3>
                        {/* <p className="text-[14px] text-gray-500 truncate">
                          {"type" in item ? item.type : "Basepack"}
                        </p> */}
                        <p className="text-pink-600 text-[16px] font-bold">
                          ₹{getItemPrice(item)}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(item);
                          }}
                          className="text-white bg-[#F97316] text-sm rounded-full mb-3 p-1 px-4 py-2 text-[12px] font-semibold"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreProductsPages;
