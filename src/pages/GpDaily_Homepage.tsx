import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import logo from "../assets/All/logo.png";
import { walletService } from "../services/wallet.service";
import {
  subscriptionService,
  Subscription,
} from "../services/subscription.service";
import { orderService } from "@/services/order.service";
import ErrorBoundary from "../components/ErrorBoundary";
import useGoogleMaps from "../hooks/useGoogleMaps";
import { productService, PRODUCT_AVAILABILITY_DAILY } from "../services/product.service";
import { storeService } from "../services/store.service";
import type { Product as ProductType } from "../services/product.service";
import { addressService } from "../services/address.service";
import { customerService } from "../services/getcustomer.service";
import { toast } from "react-hot-toast";
import ProductCard from "../components/common/ProductCard";
import { GpDailyHomeSkeleton } from "../components/common/PageSkeletons";
import ProfileIcon from "../assets/icon/Profile.png";
import { SearchBar } from "../components/common/SearchBar";
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
import {
  formatHomepageNextDeliveryLine,
  subscriptionProductLabel,
} from "../utils/subscriptionNextDelivery";

interface DayInfo {
  date: string;
  day: string;
  status: "past" | "active" | "future";
  deliveryStatus?: "pending" | "delivered" | "next";
}

const Home2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  /** This route is always GP Daily — do not derive from theme context (query can override context). */
  const basePath = "/gp-daily";
  const [, setDays] = useState<DayInfo[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [addressType, setAddressType] = useState<string>("Home");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  /** Sync once from storage so we do not mount as false and trigger a second subscription fetch */
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("phoneNumber")
  );
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [productsFetchError, setProductsFetchError] = useState<string | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    Subscription[]
  >([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const subscriptionCarouselRef = useRef<HTMLDivElement | null>(null);
  const [subscriptionCarouselIndex, setSubscriptionCarouselIndex] = useState(0);
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

  /** Single list request — avoids duplicate calls (was fetchSubscriptions + fetchActiveSubscriptions). */
  const fetchSubscriptions = async () => {
    try {
      setIsLoadingSubscriptions(true);
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        const active = fetchedSubscriptions.filter(
          (sub) => sub.status === "ACTIVE"
        );
        setActiveSubscriptions(active);
        setSelectedSubscription(active[0] ?? null);
        setSubscriptionCarouselIndex(0);
      } else {
        setActiveSubscriptions([]);
        setSelectedSubscription(null);
        setSubscriptionCarouselIndex(0);
      }
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      setActiveSubscriptions([]);
      setSelectedSubscription(null);
      setSubscriptionCarouselIndex(0);
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

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setProductsFetchError(null);

      if (!localStorage.getItem("phoneNumber")) {
        const existing = storeService.getTemporaryStoreId();
        if (!existing) {
          try {
            await storeService.getStoreFromLocation();
          } catch {
            /* browse still works without store; API may return broader catalog */
          }
        }
      }
      const storeId = storeService.getStoreIdForProducts();

      const fetchedProducts = await productService.getAllProducts({
        availabilityType: PRODUCT_AVAILABILITY_DAILY,
        storeId: storeId || undefined,
      });

      const normalizedProducts = fetchedProducts
        .filter((product) => product.isActive !== false)
        .map((product) => ({
          ...product,
          type: product?.type?.toUpperCase(),
          category: product?.category?.toUpperCase(),
        }));

      setProducts(normalizedProducts);
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      setProducts([]);
      const msg =
        error && typeof error === "object" && "message" in error
          ? String((error as Error).message)
          : "Failed to load products";
      setProductsFetchError(msg);
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

    const isLoggedIn = !!localStorage.getItem("phoneNumber");
    setIsLoggedIn(isLoggedIn);

    if (isLoggedIn) {
      fetchWalletBalance();
      fetchSubscriptions();
      fetchOrdersByCustomerId();
      fetchCustomerName();
    } else {
      setIsLoadingBalance(false);
      setIsLoadingSubscriptions(false);
    }

    fetchProducts();
    validateDeliveryZone(false);
    if (localStorage.getItem("access_token")) {
      fetchLatestAddress();
    } else {
      setIsLoadingAddress(false);
    }
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

  const handleProductClick = (product: ProductType) => {
    const pathSlug = product.slug ?? product.id;
    navigate(`/gp-daily/product/${encodeURIComponent(String(pathSlug))}`);
  };

  const handleLocationClick = () => {
    navigate(`${basePath}/addresses`);
  };

  // Helper function to get image URL (handles both string and array)
  const getImageUrl = (imagesUrl?: string | string[]): string => {
    if (!imagesUrl) return "/placeholder.svg";
    if (Array.isArray(imagesUrl)) {
      return imagesUrl[0] || "/placeholder.svg";
    }
    return imagesUrl;
  };

  const subscriptionCarouselKey = useMemo(
    () => activeSubscriptions.map((s) => s.id).join("|"),
    [activeSubscriptions]
  );

  useEffect(() => {
    const el = subscriptionCarouselRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setSubscriptionCarouselIndex(0);
    if (activeSubscriptions[0]) {
      setSelectedSubscription(activeSubscriptions[0]);
    }
  }, [subscriptionCarouselKey, activeSubscriptions]);

  const handleSubscriptionCarouselScroll = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || activeSubscriptions.length === 0) return;
    const w = el.clientWidth || 1;
    const idx = Math.min(
      activeSubscriptions.length - 1,
      Math.max(0, Math.round(el.scrollLeft / w))
    );
    setSubscriptionCarouselIndex(idx);
    const sub = activeSubscriptions[idx];
    if (sub) setSelectedSubscription(sub);
  }, [activeSubscriptions]);

  const scrollSubscriptionCarouselTo = useCallback(
    (index: number) => {
      const el = subscriptionCarouselRef.current;
      if (!el || activeSubscriptions.length === 0) return;
      const clamped = Math.min(activeSubscriptions.length - 1, Math.max(0, index));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
      setSubscriptionCarouselIndex(clamped);
      const sub = activeSubscriptions[clamped];
      if (sub) setSelectedSubscription(sub);
    },
    [activeSubscriptions]
  );

  const isPageLoading =
    isLoadingAddress || isLoadingBalance || isLoadingProducts;

  /** Same category filters as gp-store Product browse (PUJA / EXOTIC). */
  const pujaPacksForHome = useMemo(
    () =>
      products.filter(
        (item) => item.category === "PUJA" && item.isAvailable,
      ),
    [products],
  );

  const exoticPacksForHome = useMemo(
    () =>
      products.filter(
        (item) => item.category === "EXOTIC" && item.isAvailable,
      ),
    [products],
  );

  if (isPageLoading) {
    return <GpDailyHomeSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
        <div className="mx-auto w-full max-w-[min(800px,100vw)]">
          {/* Top Header with Gradient Background */}
          <div className="relative px-3 sm:px-4 pt-0 pb-6 xs:pb-8 sm:pb-12" style={{
            background: 'linear-gradient(to bottom, rgba(250, 193, 20, 0.8), rgba(250, 193, 20, 0.4))',
            minHeight: 'clamp(220px, 42vw, 280px)'
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
                <div className="relative w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={profilehomeIcon}
                    alt="Profile"
                    className="absolute inset-0 m-auto h-9 w-9 xs:h-10 xs:w-10 sm:h-12 sm:w-12 object-contain cursor-pointer"
                    onClick={() => navigate("/gp-daily/account")}
                  />
                  <img
                    src={profilelogoIcon}
                    alt="Profile Logo"
                    className="relative z-10 w-5 h-5 object-contain"
                  />
                </div>
              </div>

              {/* Search Bar — unified styling, product suggestions as you type */}
              <div className="mt-4 sm:mt-5">
                <SearchBar
                  mode="product"
                  productBasePath="/gp-daily"
                  searchPagePath="/search"
                />
              </div>

              {/* Special Festival Offers Text Overlay */}
              <div className="mt-5 flex flex-col items-start pl-2 pr-2 sm:pl-4">
                <img
                  src={topBannerSvg}
                  alt="Special Festival Offers Available"
                  className="h-10 xs:h-12 sm:h-14 mb-2 mt-4 max-w-full sm:ml-8 sm:pr-12"
                />
                <button type="button" className="flex items-center mt-3 sm:mt-4 ml-0 sm:ml-8 gap-1 text-[#FAA222] text-xs xs:text-sm font-medium underline self-start">
                  <span>Curated for you</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
              {/* Order in Hold Banner - Only show after balance is loaded */}
              {!isLoadingBalance && walletBalance < 10000 && (
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

              {/* Namaste + active subscriptions carousel */}
              <div className="bg-[#FFF5DC] rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4 pl-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-900 leading-tight [overflow-wrap:anywhere]">
                      Namaste, {userFirstName || ""}
                    </h2>
                    <img
                      src={smallgendaIcon}
                      alt="Small Genda"
                      className="w-6 h-6"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/manage-my-subscription`)}
                    className="text-[#FAA222] text-sm font-medium underline"
                  >
                    Manage
                  </button>
                </div>

                {isLoadingSubscriptions ? (
                  <div className="space-y-3 pl-1 animate-pulse">
                    <div className="h-5 w-[85%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[55%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[70%] rounded bg-gray-200/80" />
                  </div>
                ) : activeSubscriptions.length === 0 ? (
                  <p className="pl-1 text-sm text-gray-600">
                    {isLoggedIn
                      ? "No active subscriptions yet. Explore packs below to get started."
                      : "Sign in to see your subscriptions here."}
                  </p>
                ) : (
                  <>
                    <div
                      ref={subscriptionCarouselRef}
                      onScroll={handleSubscriptionCarouselScroll}
                      className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar -mx-1 px-1"
                    >
                      {activeSubscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="w-full min-w-full shrink-0 snap-center px-1"
                        >
                          <div className="space-y-3 pl-1">
                            <div className="flex items-center justify-between gap-2 text-gray-700">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <img
                                  src={scooterIcon}
                                  alt=""
                                  className="h-5 w-5 flex-shrink-0"
                                  aria-hidden
                                />
                                <span className="truncate text-base font-medium">
                                  {formatHomepageNextDeliveryLine(sub)}
                                </span>
                              </div>
                              <span className="inline-flex shrink-0 items-center rounded-full border border-green-600 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                                Active
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                              <img
                                src={clockIcon}
                                alt=""
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden
                              />
                              <span className="text-base font-medium">7:00 AM - 9:00 AM</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                              <img
                                src={flowerIcon}
                                alt=""
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden
                              />
                              <span className="text-base font-medium">{subscriptionProductLabel(sub)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeSubscriptions.length > 1 && (
                      <div className="mt-3 flex justify-center gap-1">
                        {activeSubscriptions.map((sub, i) => (
                          <button
                            key={sub.id}
                            type="button"
                            aria-label={`Subscription ${i + 1}`}
                            aria-current={i === subscriptionCarouselIndex ? "true" : undefined}
                            onClick={() => scrollSubscriptionCarouselTo(i)}
                            className="touch-target-compact inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 touch-manipulation"
                          >
                            <span
                              className={`rounded-full transition-[width,height,background-color] ${
                                i === subscriptionCarouselIndex
                                  ? "h-[5px] w-[5px] bg-[#FAA222]"
                                  : "h-[4px] w-[4px] bg-[#D1D5DB]"
                              }`}
                              aria-hidden
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          {/* Main Content */}
          <div className="px-4 py-4 space-y-6">
            {/* Puja Packs — products API, category PUJA (same as gp-store browse) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-800 min-w-0 flex-1 pr-2">
                  Puja Packs
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${basePath}/Products?${new URLSearchParams({ category: "puja" }).toString()}`)
                  }
                  className="flex shrink-0 items-center gap-1 text-[#19411f] text-sm font-semibold"
                >
                  <span>Explore More</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>

              {productsFetchError ? (
                <div className="text-red-500 text-center py-4 text-sm">{productsFetchError}</div>
              ) : (
                <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 xs:gap-4 no-scrollbar pb-4 -mx-1 px-1">
                  {pujaPacksForHome.slice(0, 6).map((pack, index) => (
                    <div key={pack.id} className="w-[min(46vw,10.75rem)] xs:w-[11rem] flex-shrink-0 snap-start">
                      <ProductCard
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        description={pack.description || "Mixed flowers daily"}
                        price={`₹${pack.sellingPrice}/Day`}
                        showDailyButton={true}
                        showBestsellerTag={index === 0}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!productsFetchError && pujaPacksForHome.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-2">No Puja packs available right now.</p>
              )}
            </div>

            {/* Exotic Packs — products API, category EXOTIC */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-800 min-w-0 flex-1 pr-2">
                  Exotic Packs
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${basePath}/Products?${new URLSearchParams({ category: "exotic" }).toString()}`)
                  }
                  className="flex shrink-0 items-center gap-1 text-[#19411f] text-sm font-semibold"
                >
                  <span>Explore More</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>

              <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 xs:gap-4 no-scrollbar pb-4 -mx-1 px-1">
                {exoticPacksForHome.slice(0, 6).map((item, index) => (
                  <div key={item.id} className="w-[min(46vw,10.75rem)] xs:w-[11rem] flex-shrink-0 snap-start">
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
              {exoticPacksForHome.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-2">No exotic packs available right now.</p>
              )}
            </div>

            {/* Full product browse — always visible (route: /gp-daily/Products) */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
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

      </div>
    </ErrorBoundary >
  );
};

export default Home2;
