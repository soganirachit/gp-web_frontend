import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { motion } from "framer-motion";
import logo from "../assets/All/logo.png";
import { walletService } from "../services/wallet.service";
import { basePackService, BasePack } from "../services/basepack.service";
import {
  subscriptionService,
  Subscription,
} from "../services/subscription.service";
import { orderService } from "@/services/order.service";
import ErrorBoundary from "../components/ErrorBoundary";
import useGoogleMaps from "../hooks/useGoogleMaps";
import { productService } from "../services/product.service";
import type { Product as ProductType } from "../services/product.service";
import { addressService } from "../services/address.service";
import { customerService } from "../services/getcustomer.service";
import { toast } from "react-hot-toast";
import ProductCard from "../components/common/ProductCard";
import BottomNavigation from "./../components/layout/BottomNav";
import Spinner from "../components/common/Spinner";
import ProfileIcon from "../assets/icon/Profile.png";
import SearchIcon from "../assets/icon/Search.png";
import smallgendaIcon from "../assets/svg/smallgenda.svg";
import scooterIcon from "../assets/svg/gp_daily svg/scooter.svg";
import clockIcon from "../assets/svg/gp_daily svg/clock.svg";
import flowerIcon from "../assets/svg/gp_daily svg/flower.svg";
import bannerPng from "../assets/svg/gp_daily svg/banner.png";
import topBannerSvg from "../assets/svg/gp_daily svg/top _banner.svg";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import alertIcon from "../assets/svg/gp_daily svg/lowbalance.svg";
import { useFeatureTheme } from "../context/FeatureThemeContext";

interface DayInfo {
  date: string;
  day: string;
  status: "past" | "active" | "future";
  deliveryStatus?: "pending" | "delivered" | "next";
}

const Home2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [, setDays] = useState<DayInfo[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [addressType, setAddressType] = useState<string>("Home");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    Subscription[]
  >([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [deliveryZoneStatus, setDeliveryZoneStatus] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  const [isValidatingDeliveryZone, setIsValidatingDeliveryZone] =
    useState(false);

  // API status - hardcoded for now
  const [apiStatus, setApiStatus] = useState<number>(200);

  useGoogleMaps();

  const fetchWalletBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const { balance } = (await walletService.getWalletBalance()) || {};
      setWalletBalance(balance);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchCustomerName = async () => {
    try {
      const customers = await customerService.getAllCustomers();
      if (customers && customers.length > 0) {
        const user = customers[0];
        setUserName(`${user.firstName} ${user.lastName}`);
        setUserFirstName(user.firstName);
      } else {
        setUserName(localStorage.getItem("userName") || "User");
        setUserFirstName(localStorage.getItem("userName")?.split(" ")[0] || "User");
      }
    } catch (error) {
      console.error("Error fetching customer name:", error);
      setUserName(localStorage.getItem("userName") || "User");
      setUserFirstName(localStorage.getItem("userName")?.split(" ")[0] || "User");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setIsLoadingSubscriptions(true);
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        const active = fetchedSubscriptions.find(
          (sub) => sub.status === "ACTIVE"
        );
        setActiveSubscriptions(fetchedSubscriptions);
        setSelectedSubscription(active || null);
      } else {
        setActiveSubscriptions([]);
        setSelectedSubscription(null);
      }
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      setActiveSubscriptions([]);
      setSelectedSubscription(null);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const fetchActiveSubscriptions = async () => {
    try {
      setIsLoadingSubscriptions(true);
      const subscriptions =
        await subscriptionService.getCustomerSubscriptions();
      const active = subscriptions.filter((sub) => sub.status === "ACTIVE");
      setActiveSubscriptions(active);

      if (active.length > 0) {
        setSelectedSubscription(active[0]);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setActiveSubscriptions([]);
      setIsLoadingSubscriptions(false);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const fetchOrdersByCustomerId = async () => {
    try {
      setIsLoadingOrders(true);
      const orders = await orderService.getOrdersByCustomerId();
      setOrders(orders);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchBasePacks = async () => {
    try {
      setIsLoadingPacks(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate(`${basePath}/login`, { state: { returnUrl: location.pathname } });
        return;
      }

      const packs = await basePackService.getAllBasePacks();
      setBasePacks(packs);
    } catch (error: any) {
      console.error("Error fetching base packs:", error);
      if (
        error.message === "Authentication required" ||
        error.message.includes("Session expired")
      ) {
        navigate(`${basePath}/login`, { state: { returnUrl: location.pathname } });
      } else {
        setError(error.message || "Failed to load base packs");
      }
    } finally {
      setIsLoadingPacks(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const fetchedProducts = await productService.getAllProducts();

      const normalizedProducts = fetchedProducts.map((product) => ({
        ...product,
        type: product?.type?.toUpperCase(),
        category: product?.category?.toUpperCase(),
      }));

      // Debug: Log available categories to understand data structure
      const uniqueCategories = [...new Set(normalizedProducts.map(p => p.category))];
      console.log("Available categories in products:", uniqueCategories);

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const validateDeliveryZone = async (showToast = false) => {
    try {
      setIsValidatingDeliveryZone(true);
      const storedCoordinates = localStorage.getItem("userCoordinates");
      if (storedCoordinates) {
        let coordinates: string;

        try {
          const parsedCoords = JSON.parse(storedCoordinates);
          if (parsedCoords.lat && parsedCoords.lng) {
            coordinates = `${parsedCoords.lat},${parsedCoords.lng}`;
          } else {
            coordinates = storedCoordinates;
          }
        } catch {
          coordinates = storedCoordinates;
        }

        const validation = await addressService.validateAddressInDeliveryArea(
          coordinates
        );
        setDeliveryZoneStatus(validation);

        if (showToast) {
          if (validation.isValid) {
            toast.success("Delivery zone validated successfully!");
          } else {
            toast.error(
              validation.message || "Address is outside delivery area"
            );
          }
        }
      } else if (showToast) {
        toast.error(
          "No location coordinates found. Please set your location first."
        );
      }
    } catch (error) {
      console.error("Error validating delivery zone:", error);
      if (showToast) {
        toast.error("Failed to validate delivery zone");
      }
    } finally {
      setIsValidatingDeliveryZone(false);
    }
  };

  const fetchLatestAddress = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();

      // Get default address first, otherwise get the latest address
      const defaultAddress = addresses.find(addr => addr.isDefault);
      const selectedAddress = defaultAddress || addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      [0];

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

  useEffect(() => {
    const needLocation = localStorage.getItem("needLocation") === "true";
    if (needLocation) {
      localStorage.removeItem("needLocation");
    }

    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    if (token) {
      fetchWalletBalance();
      fetchSubscriptions();
      fetchActiveSubscriptions();
      fetchOrdersByCustomerId();
      fetchCustomerName();
    }

    fetchBasePacks();
    fetchProducts();
    validateDeliveryZone(false);
    fetchLatestAddress();
  }, [fetchLatestAddress]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userLocation") {
        setDeliveryLocation(e.newValue || "");
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const checkLocalStorage = () => {
      const location = localStorage.getItem("userLocation") || "";
      if (location !== deliveryLocation) {
        setDeliveryLocation(location);
      }
    };

    const interval = setInterval(checkLocalStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [deliveryLocation]);

  useEffect(() => {
    if (deliveryLocation) {
      localStorage.setItem("userLocation", deliveryLocation);
      validateDeliveryZone(false);
    }
  }, [deliveryLocation]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchActiveSubscriptions();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const nextSevenDays: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      let deliveryStatus: "pending" | "delivered" | "next" | undefined =
        undefined;

      if (selectedSubscription) {
        const subscriptionStartDate = new Date(selectedSubscription.startDate);
        const currentDate = new Date(date);

        currentDate.setHours(0, 0, 0, 0);
        subscriptionStartDate.setHours(0, 0, 0, 0);

        if (currentDate < subscriptionStartDate) {
          deliveryStatus = undefined;
        } else if (currentDate.getTime() === subscriptionStartDate.getTime()) {
          deliveryStatus = "next";
        } else if (currentDate < new Date()) {
          deliveryStatus = "delivered";
        } else {
          deliveryStatus = "pending";
        }
      }

      return {
        date: date.getDate().toString().padStart(2, "0"),
        day: weekdays[date.getDay()],
        status: i === 0 ? "active" : i < 0 ? "past" : "future",
        deliveryStatus,
      };
    });
    setDays(nextSevenDays);
  }, [selectedSubscription]);

  const handleProductClick = (product: ProductType | BasePack) => {
    navigate(`/gp-daily/product/${product.id}`);
  };

  const handleLocationClick = () => {
    navigate(`${basePath}/addresses`);
  };

  // Helper function to get image URL (handles both string and array)
  const getImageUrl = (imagesUrl?: string | string[]): string => {
    if (!imagesUrl) return "https://via.placeholder.com/160";
    if (Array.isArray(imagesUrl)) {
      return imagesUrl[0] || "https://via.placeholder.com/160";
    }
    return imagesUrl;
  };

  // Get next delivery date (static for now)
  const getNextDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Tomorrow - ${days[tomorrow.getDay()]}, ${tomorrow.getDate()} ${months[tomorrow.getMonth()]}`;
  };

  const isPageLoading = isLoadingAddress || isLoadingBalance || isLoadingPacks || isLoadingProducts;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFFBEB] pb-24">
        <div className="max-w-[800px] mx-auto">
          {/* Top Header with Gradient Background */}
          <div className="relative px-3 sm:px-4 pt-0 pb-8 sm:pb-12" style={{
            background: 'linear-gradient(to bottom, rgba(250, 193, 20, 0.8), rgba(250, 193, 20, 0.4))',
            minHeight: '280px'
          }}>
            {/* Banner PNG Background with reduced opacity */}
            <img
              src={bannerPng}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />

            {/* Content Overlay */}
            <div className="relative z-10 pt-3">
              {/* Location and Profile */}
              <div className="flex items-center justify-between mb-3">
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
                      <span className="text-sm sm:text-base font-bold text-gray-800">{addressType}</span>
                      <span className="text-xs sm:text-sm text-gray-700 truncate font-medium">
                        {isLoadingAddress ? 'Loading...' : deliveryLocation || 'Tap to set address'}
                      </span>
                    </div>
                    <MdKeyboardArrowDown className="text-gray-600 flex-shrink-0 text-lg sm:text-xl" />
                  </div>
                </div>

                {/* Right Side Icons - Only Profile */}
                <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={profilehomeIcon}
                    alt="Profile"
                    className=" absolute inset-0 w-12 h-12 object-contain cursor-pointer self-center justify-self-center"
                    onClick={() => navigate(`${basePath}/account`)}
                  />
                  <img
                    src={profilelogoIcon}
                    alt="Profile Logo"
                    className="relative z-10 w-5 h-5 object-contain"
                  />
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 sm:mt-5">
                <div
                  className="bg-white rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 cursor-pointer shadow-sm border border-gray-200"
                  onClick={() => navigate('/search')}
                >
                  <img src={SearchIcon} alt="Search" className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-gray-400 text-sm sm:text-base font-medium">Search anything....</span>
                </div>
              </div>

              {/* Special Festival Offers Text Overlay */}
              <div className="mt-5 flex flex-col items-start pl-4">
                <img
                  src={topBannerSvg}
                  alt="Special Festival Offers Available"
                  className="h-12 sm:h-14 mb-2 pr-12 mt-8 ml-8"
                />
                <button className="flex items-center mt-4 ml-8 gap-1 text-[#FAA222] text-sm font-medium underline self-start">
                  <span>Curated for you</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Banners - Only show if API status is 200 */}
          {apiStatus === 200 && (
            <div className="px-4 py-4 space-y-4">
              {/* Order in Hold Banner - Only show after balance is loaded */}
              {!isLoadingBalance && walletBalance < 100 && (
                <div className="bg-[#FE5053] rounded-2xl p-4 text-white">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <img src={alertIcon} alt="Alert" className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1">Order in hold</h3>
                      <p className="text-sm text-white/90">
                        Your wallet balance is low. Recharge now to continue your daily deliveries.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`${basePath}/wallet`)}
                    className="w-full py-2.5 border-2 border-white rounded-xl text-white font-medium text-sm hover:bg-white/10 transition-colors"
                  >
                    Recharge Now
                  </button>
                </div>
              )}

              {/* Namaste Section */}
              <div className="bg-[#FFF5DC] rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4 pl-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Namaste, {userFirstName || ""}
                    </h2>
                    <img
                      src={smallgendaIcon}
                      alt="Small Genda"
                      className="w-6 h-6"
                    />
                  </div>
                  <button
                    onClick={() => navigate(`${basePath}/manage-my-subscription`)}
                    className="text-[#FAA222] text-sm font-medium underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex items-center gap-3 text-gray-700">
                    <img
                      src={scooterIcon}
                      alt="Scooter"
                      className="w-5 h-5 flex-shrink-0"
                    />
                    <span className="text-base font-medium">{getNextDeliveryDate()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <img
                      src={clockIcon}
                      alt="Clock"
                      className="w-5 h-5 flex-shrink-0"
                    />
                    <span className="text-base font-medium">7:00 AM - 9:00 AM</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <img
                      src={flowerIcon}
                      alt="Flower"
                      className="w-5 h-5 flex-shrink-0"
                    />
                    <span className="text-base font-medium">Premium Daily Pack</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="px-4 py-4 space-y-6">
            {/* Puja Packs Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Puja Packs</h2>
                <button
                  onClick={() => navigate("/explore-more?category=Puja Flowers&section=Puja Packs")}
                  className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                >
                  <span>Explore More</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>

              {isLoadingPacks ? (
                <div className="flex justify-center items-center h-40">
                  <Spinner size={400} />
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : (
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {basePacks.map((pack, index) => (
                    <div key={pack.id} className="flex-shrink-0 w-[calc((100%-2rem)/3)] min-w-[calc((100%-2rem)/3)]">
                      <ProductCard
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        description={pack.description || "Mixed flowers daily"}
                        price={`₹${pack.sellingPrice}/Day`}
                        showDailyButton={true}
                        showBestsellerTag={index === 0}
                        onClick={() => handleProductClick(pack as unknown as ProductType)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exotic Packs Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">Exotic Packs</h2>
                <button
                  onClick={() => navigate("/explore-more?category=Exotic Flowers&section=Exotic Packs")}
                  className="flex items-center gap-1 text-gray-900 text-sm font-medium"
                >
                  <span>Explore More</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>

              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                {products
                  .filter((item) => item.category === "EXOTIC" && item.isAvailable)
                  .slice(0, 6)
                  .map((item, index) => (
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
              </div>
            </div>

            {/* View All Category Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => navigate(`${basePath}/Products`)}
                className="w-full max-w-md bg-[#FAA222] text-gray-700 py-3 rounded-lg font-medium text-sm hover:bg-[#DD7600] transition-colors"
              >
                View All Category
              </button>
            </div>

            {/* Quote of the Day Section */}
            <div>
              <img
                src={bottomBannerSvg}
                alt="Quote of the Day"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    </ErrorBoundary >
  );
};

export default Home2;
