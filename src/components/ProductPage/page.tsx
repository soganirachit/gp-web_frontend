// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import searchImage from "../../assets/icon/Search.png";
import { basePackService } from "../../services/basepack.service";
import type { BasePack } from "../../services/basepack.service";
import { productService } from "../../services/product.service";
import type { Product } from "../../services/product.service";
import walletImage from "../../assets/icon/Wallet.png";
import profileImage from "../../assets/icon/Profile.png";
import { IoArrowBack } from "react-icons/io5";
import Spinner from "../common/Spinner";

// Import product images

// interface CartItem {
//   id: string;
//   name: string;
//   price: number;
//   quantity: number;
//   image: string;
//   description?: string;
//   category?: string;
// }

// const CART_STORAGE_KEY = 'gendaphool_cart';

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Puja Flowers");
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isBasePack = (item: Product | BasePack): item is BasePack =>
    "sellingPricePerPackDaily" in item;

  const sortProducts = (items: (Product | BasePack)[], sortType: string) => {
    return [...items].sort((a, b) => {
      switch (sortType) {
        case "Price": {
          const priceA = isBasePack(a)
            ? a.sellingPricePerPackDaily
            : a.sellingPrice;
          const priceB = isBasePack(b)
            ? b.sellingPricePerPackDaily
            : b.sellingPrice;
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

  const getItemPrice = (item: Product | BasePack): number => {
    return isBasePack(item) ? item.sellingPricePerPackDaily : item.sellingPrice;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // const [packs, prods] = await Promise.all([
        //   basePackService.getAllBasePacks(),
        //   productService.getAllProducts(),
        // ]);
        // setBasePacks(packs);
        // setProducts(prods);
        const result = await productService.getAllProducts();
        setProducts(result);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleProductClick = (product: Product | BasePack) => {
    navigate(`/product/${product.id}`, { state: { product } });
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
                  Subscription Packs
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
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-6 h-6 md:w-8 md:h-8"
                  onClick={() => navigate("/account")}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-[#FFFBEB] px-4 pt-4 pb-2">
              <div className="flex bg-gray-100 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setActiveTab("Puja Flowers")}
                  className={`flex-1 py-2.5 md:py-3 text-center rounded-full transition-all duration-300 text-base md:text-lg ${
                    activeTab === "Puja Flowers"
                      ? "bg-white text-pink-600 shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Puja Flowers
                </button>
                <button
                  onClick={() => setActiveTab("Exotic Flowers")}
                  className={`flex-1 py-2.5 md:py-3 text-center rounded-full transition-all duration-300 text-base md:text-lg ${
                    activeTab === "Exotic Flowers"
                      ? "bg-white text-pink-600 shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Exotic Flowers
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="px-4 pb-4 bg-[#FFFBEB] ">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Puja Flower Packs</h2>
                <div className="relative">
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
        </div>

        {/* Spacer to offset the fixed header */}
        <div className="h-[300px]"></div>

        {/* Content */}
        <div className="px-4">
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
              {activeTab === "Puja Flowers" && (
                <div className="space-y-6 md:space-y-8">
                  {/* Combo Puja Packs */}
                  <div className="mb-8 md:mb-12">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        Combo Puja Packs
                      </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                      {sortProducts(basePacks, sortBy).map((pack) => (
                        <div
                          key={pack.id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(pack)}
                        >
                          <div className="p-3">
                            <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                              <img
                                src={
                                  pack.imageUrl ||
                                  "https://via.placeholder.com/160"
                                }
                                alt={pack.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="pt-3 pb-2 px-1 space-y-2">
                              <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                                {pack.name}
                              </h3>
                              <p className="text-[14px] text-gray-500 truncate">
                                Basepack
                              </p>
                              <p className="text-pink-600 text-[16px] font-bold">
                                ₹{getItemPrice(pack)}/Day
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(pack);
                                }}
                                className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Flowers Section */}
                  <div className="mb-8 md:mb-12">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        Flowers
                      </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                      {sortProducts(
                        products.filter((item) => item.type === "FLOWERS"),
                        sortBy
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(item)}
                        >
                          <div className="p-3">
                            <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                              <img
                                src={
                                  item.imageUrl ||
                                  "https://via.placeholder.com/160"
                                }
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="pt-3 pb-2 px-1 space-y-2">
                              <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                                {item.name}
                              </h3>
                              <p className="text-[14px] text-gray-500 truncate">
                                {item.description}
                              </p>
                              <p className="text-pink-600 text-[16px] font-bold">
                                ₹{getItemPrice(item)}/Day
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(item);
                                }}
                                className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fresh Leaves */}
                  <div className="mb-8 md:mb-12">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        Fresh Leaves
                      </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                      {sortProducts(
                        products.filter((item) => item.type === "LEAVES"),
                        sortBy
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(item)}
                        >
                          <div className="p-3">
                            <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                              <img
                                src={
                                  item.imageUrl ||
                                  "https://via.placeholder.com/160"
                                }
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="pt-3 pb-2 px-1 space-y-2">
                              <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                                {item.name}
                              </h3>
                              <p className="text-[14px] text-gray-500 truncate">
                                {item.description}
                              </p>
                              <p className="text-pink-600 text-[16px] font-bold">
                                ₹{getItemPrice(item)}/Day
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(item);
                                }}
                                className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Garlands */}
                  <div className="mb-8 md:mb-12">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                      <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                        Garlands
                      </h2>
                    </div>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                      {sortProducts(
                        products.filter((item) => item.type === "GARLAND"),
                        sortBy
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(item)}
                        >
                          <div className="p-3">
                            <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                              <img
                                src={
                                  item.imageUrl ||
                                  "https://via.placeholder.com/160"
                                }
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="pt-3 pb-2 px-1 space-y-2">
                              <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                                {item.name}
                              </h3>
                              <p className="text-[14px] text-gray-500 truncate">
                                {item.description}
                              </p>
                              <p className="text-pink-600 text-[16px] font-bold">
                                ₹{getItemPrice(item)}/Day
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(item);
                                }}
                                className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Exotic Flowers - Shows all products */}
              {activeTab === "Exotic Flowers" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sortProducts([...products], sortBy).map((item) => (
                    <div
                      key={item.id}
                      className="w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleProductClick(item)}
                    >
                      <div className="p-3">
                        <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                          <img
                            src={
                              item.imageUrl?.[0] ||
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
                          <p className="text-[14px] text-gray-500 truncate">
                            {"type" in item ? item.type : "Basepack"}
                          </p>
                          <p className="text-pink-600 text-[16px] font-bold">
                            ₹{getItemPrice(item)}/Day
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(item);
                            }}
                            className="text-white bg-[#F97316] text-sm rounded-full mb-3 p-1 px-4 py-2 text-[10px]"
                          >
                            Subscribe
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
