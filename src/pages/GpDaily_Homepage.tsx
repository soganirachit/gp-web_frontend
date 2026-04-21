import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdKeyboardArrowDown } from "react-icons/md";
import { IoPlay } from "react-icons/io5";
import logo from "../assets/All/logo.png";
import { walletService } from "../services/wallet.service";
import {
  subscriptionService,
  Subscription,
} from "../services/subscription.service";
import { orderService } from "@/services/order.service";
import ErrorBoundary from "../components/ErrorBoundary";
import useGoogleMaps from "../hooks/useGoogleMaps";
import {
  productService,
  PRODUCT_AVAILABILITY_GP_DAILY_LIST,
  mapGpDailyCatalogRowToProduct,
} from "../services/product.service";
import {
  pickActiveSubscriptionDailyUnitRupees,
  computeGpDailyOrderOnHold,
} from "../utils/gpDailyWalletHold";
import { storeService } from "../services/store.service";
import type { Product as ProductType } from "../services/product.service";
import { addressService } from "../services/address.service";
import { validateGpDailyDeliveryAreaFromCoordinates } from "../services/subscriptionZone.service";
import { customerService } from "../services/getcustomer.service";
import { toast } from "react-hot-toast";
import ProductCard from "../components/common/ProductCard";
import { GpDailyHomeSkeleton } from "../components/common/PageSkeletons";
import { SearchBar } from "../components/common/SearchBar";
import smallgendaIcon from "../assets/svg/smallgenda.svg";
import scooterIcon from "../assets/svg/gp_daily svg/scooter.svg";
import clockIcon from "../assets/svg/gp_daily svg/clock.svg";
import flowerIcon from "../assets/svg/gp_daily svg/flower.svg";
import bannerPng from "../assets/svg/gp_daily svg/banner.png";
import dailyOfferImage from "../assets/svg/gp_daily svg/offer.png";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import alertIcon from "../assets/svg/gp_daily svg/lowbalance.svg";
import {
  formatNamasteDeliveryLine,
  subscriptionProductLabel,
} from "../utils/subscriptionNextDelivery";

interface DayInfo {
  date: string;
  day: string;
  status: "past" | "active" | "future";
  deliveryStatus?: "pending" | "delivered" | "next";
}

/** Matches `NAMASTE_TIME_SLOT_DISPLAY` on mobile GP Daily home. */
const NAMASTE_TIME_SLOT_DISPLAY = "7 AM – 12 PM";
/** Namaste subscription carousel — auto-advance loop (web). */
const NAMASTE_CAROUSEL_AUTOPLAY_MS = 5000;

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
  /** Pause autoplay while pointer is over the carousel (manual read without fighting the timer). */
  const [namasteCarouselHoverPause, setNamasteCarouselHoverPause] =
    useState(false);
  const [allPackProducts, setAllPackProducts] = useState<ProductType[]>([]);
  const [pujaPackProducts, setPujaPackProducts] = useState<ProductType[]>([]);
  const [exoticPackProducts, setExoticPackProducts] = useState<ProductType[]>([]);
  const [activeSubscriptionExtra, setActiveSubscriptionExtra] = useState<
    Record<string, unknown> | null
  >(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [resumingSubId, setResumingSubId] = useState<string | null>(null);
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
        /** Namaste carousel: active + paused only (same as mobile). */
        const rank = (s: (typeof fetchedSubscriptions)[0]) => {
          if (s.status === "ACTIVE") return 0;
          if (s.status === "PAUSED") return 1;
          return 2;
        };
        const namasteList = fetchedSubscriptions
          .filter((sub) => sub.status === "ACTIVE" || sub.status === "PAUSED")
          .sort((a, b) => {
            const d = rank(a) - rank(b);
            if (d !== 0) return d;
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        setActiveSubscriptions(namasteList);
        setSelectedSubscription(namasteList[0] ?? null);
        setSubscriptionCarouselIndex(0);
        const firstForDetail =
          namasteList.find((s) => s.status === "ACTIVE") ?? namasteList[0];
        if (firstForDetail?.id) {
          try {
            const detail = await subscriptionService.getSubscriptionById(
              firstForDetail.id,
            );
            setActiveSubscriptionExtra(
              detail && Object.keys(detail).length > 0 ? detail : null,
            );
          } catch {
            setActiveSubscriptionExtra(null);
          }
        } else {
          setActiveSubscriptionExtra(null);
        }
      } else {
        setActiveSubscriptions([]);
        setSelectedSubscription(null);
        setSubscriptionCarouselIndex(0);
        setActiveSubscriptionExtra(null);
      }
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      setActiveSubscriptions([]);
      setSelectedSubscription(null);
      setSubscriptionCarouselIndex(0);
      setActiveSubscriptionExtra(null);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const fetchOrdersByCustomerId = async () => {
    try {
      setIsLoadingOrders(true);
      const orders = await orderService.getOrders({
        order_type: "subscription",
      });
      setOrders(orders);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    const DAILY_ALLOWED = new Set(["daily", "both"]);
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
      const sid = storeId || undefined;

      const [rawAll, rawPuja, rawExotic] = await Promise.all([
        productService.getAllProductsPaged({
          availabilityType: PRODUCT_AVAILABILITY_GP_DAILY_LIST,
          storeId: sid,
        }),
        productService.getProductsByCategory(
          "puja-packs",
          sid,
          PRODUCT_AVAILABILITY_GP_DAILY_LIST,
          100,
        ),
        productService.getProductsByCategory(
          "exotic-packs",
          sid,
          PRODUCT_AVAILABILITY_GP_DAILY_LIST,
          100,
        ),
      ]);

      const mapRow = (r: Record<string, unknown>) =>
        mapGpDailyCatalogRowToProduct(r);

      const allMapped = (rawAll || [])
        .filter((p: { availability_type?: string }) =>
          DAILY_ALLOWED.has(
            String(p?.availability_type ?? "")
              .toLowerCase()
              .trim(),
          ),
        )
        .map((p: Record<string, unknown>) => mapRow(p))
        .filter((p) => p.isActive !== false);

      setAllPackProducts(allMapped.filter((p) => p.isAvailable).slice(0, 10));
      setPujaPackProducts(
        (rawPuja || [])
          .map((p: Record<string, unknown>) => mapRow(p))
          .filter((p) => p.isAvailable)
          .slice(0, 6),
      );
      setExoticPackProducts(
        (rawExotic || [])
          .map((p: Record<string, unknown>) => mapRow(p))
          .filter((p) => p.isAvailable)
          .slice(0, 6),
      );
    } catch (error: unknown) {
      console.error("Error fetching products:", error);
      setAllPackProducts([]);
      setPujaPackProducts([]);
      setExoticPackProducts([]);
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

        const validation = await validateGpDailyDeliveryAreaFromCoordinates(
          coordinates,
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

  useEffect(() => {
    if (activeSubscriptions.length <= 1 || namasteCarouselHoverPause) {
      return;
    }
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      setSubscriptionCarouselIndex((prev) => {
        const len = activeSubscriptions.length;
        if (len <= 1) return prev;
        const next = (prev + 1) % len;
        const el = subscriptionCarouselRef.current;
        if (el) {
          const w = el.clientWidth || 1;
          el.scrollTo({ left: next * w, behavior: "smooth" });
        }
        const sub = activeSubscriptions[next];
        if (sub) setSelectedSubscription(sub);
        return next;
      });
    };
    const id = window.setInterval(tick, NAMASTE_CAROUSEL_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [
    activeSubscriptions,
    namasteCarouselHoverPause,
    subscriptionCarouselKey,
  ]);

  const isPageLoading =
    isLoadingAddress || isLoadingBalance || isLoadingProducts;

  /** Wallet “order on hold” uses first active subscription’s daily unit (not a paused card). */
  const primarySubscriptionForWallet = useMemo(
    () =>
      activeSubscriptions.find((s) => s.status === "ACTIVE") ??
      activeSubscriptions[0] ??
      null,
    [activeSubscriptions],
  );

  const dailySubscriptionUnitRupees = useMemo(
    () =>
      pickActiveSubscriptionDailyUnitRupees(
        primarySubscriptionForWallet,
        activeSubscriptionExtra,
      ),
    [primarySubscriptionForWallet, activeSubscriptionExtra],
  );

  const handleNamasteResume = async (e: React.MouseEvent, subId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setResumingSubId(subId);
      await subscriptionService.toggleSubscriptionStatus(subId);
      toast.success("Subscription resumed");
      await fetchSubscriptions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not resume";
      toast.error(msg);
    } finally {
      setResumingSubId(null);
    }
  };

  const orderOnHold = useMemo(
    () =>
      computeGpDailyOrderOnHold(
        isLoggedIn,
        isLoadingBalance,
        walletBalance,
        dailySubscriptionUnitRupees,
      ),
    [isLoggedIn, isLoadingBalance, walletBalance, dailySubscriptionUnitRupees],
  );

  if (isPageLoading) {
    return <GpDailyHomeSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
        <div className="mx-auto w-full max-w-[min(800px,100vw)]">
          <div
            className="relative px-4 pt-4 pb-0 rounded-b-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(90deg, rgba(250, 193, 20, 0.4) 0%, rgba(250, 193, 20, 0.2) 100%)",
              minHeight: "clamp(200px, 38vw, 260px)",
            }}
          >
            {/* <img
              src={bannerPng}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none"
              aria-hidden
            /> */}

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <img
                    src={locationhomeIcon}
                    alt=""
                    className="w-[18px] h-[18px] flex-shrink-0"
                    aria-hidden
                  />
                  <div
                    className="flex items-center gap-1 cursor-pointer min-w-0 flex-1"
                    onClick={handleLocationClick}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base font-bold text-[#111827]">{addressType}</span>
                      <span className="text-xs sm:text-sm text-[#374151] truncate font-medium">
                        {isLoadingAddress
                          ? "Loading..."
                          : deliveryLocation
                            ? deliveryLocation.length > 50
                              ? `${deliveryLocation.slice(0, 50)}...`
                              : deliveryLocation
                            : "Tap to set address"}
                      </span>
                    </div>
                    <MdKeyboardArrowDown className="text-[#4B5563] flex-shrink-0 text-xl" />
                  </div>
                </div>


                <button
                  type="button"
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full flex items-center justify-center"
                  onClick={() => navigate("/gp-daily/account")}
                  aria-label={isLoggedIn ? "Wallet" : "Log in"}
                >
                  <img
                    src={profilehomeIcon}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden
                  />
                  <img
                    src={profilelogoIcon}
                    alt=""
                    className="relative z-10 h-[18px] w-[18px] object-contain brightness-0 invert"
                    aria-hidden
                  />
                </button>
              </div>

              {/* Search Bar — unified styling, product suggestions as you type */}
              <div className="mt-2">
                <SearchBar
                  mode="product"
                  productBasePath="/gp-daily"
                  searchPagePath="/search"
                  storeId={storeService.getStoreIdForProducts() ?? undefined}
                />
              </div>

              {/* Special Festival Offers — matches app `GpDailyHomeScreen` offerCard + offer.png (no extra image opacity). */}
              <div className="relative mt-[14px] min-h-[160px] overflow-hidden bg-transparent">
                <p className="relative z-10 ml-[10px] mt-[30px] max-w-[14rem] whitespace-pre-line font-serif text-[18px] font-normal leading-7 text-[#222222]">
                  Special Festival Offers{"\n"}Available
                </p>
                <button
                  type="button"
                  className="relative z-10 ml-[10px] mt-2 self-start border-b border-[#1f1f1f] pb-[1px]"
                >
                  <span className="font-sans text-xs font-normal leading-[22.75px] text-[#222222]">
                    Curated for you -&gt;
                  </span>
                </button>
                <img
                  src={dailyOfferImage}
                  alt=""
                  width={320}
                  height={208}
                  className="pointer-events-none absolute bottom-[-10px] right-[-24px] z-[1] h-[208px] w-[320px] max-w-none object-cover select-none"
                  aria-hidden
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
              {/* Order in Hold Banner - Only show after balance is loaded */}
              {!isLoadingBalance && isLoggedIn && orderOnHold.show && (
                <div className="rounded-[18px] p-4 text-white" style={{ backgroundColor: "rgba(255, 38, 41, 0.8)" }}>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <img src={alertIcon} alt="" className="w-[18px] h-[18px]" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[17px] mb-1.5">Order in hold</h3>
                      <p className="text-sm text-white/90">
                        {orderOnHold.lowBalanceForSubscription
                          ? `Your wallet balance is below 3-day subscription amount (₹${orderOnHold.threshold3Day}). Recharge now to continue deliveries.`
                          : "Your wallet balance is low. Recharge now to continue your daily deliveries."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/wallet`)}
                    className="inline-flex min-w-[130px] items-center justify-center self-start rounded-xl border-2 border-white px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Recharge Now
                  </button>
                </div>
              )}

              {/* Namaste + active subscriptions carousel */}
              <div className="rounded-[22px] border border-[#fcf5eb] bg-[#fcf5eb] p-4">
                <div className="flex items-center justify-between mb-3.5 pl-1">
                  <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                    <h2 className="min-w-0 flex-1 font-serif text-2xl font-semibold leading-7 text-[#222222] [overflow-wrap:anywhere]">
                      {isLoggedIn ? `Namaste, ${userFirstName || "User"}` : "Namaste!"}
                    </h2>
                    {isLoggedIn ? (
                      <img
                        src={smallgendaIcon}
                        alt=""
                        className="h-[34px] w-[34px] shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/manage-my-subscription`)}
                      className="shrink-0 text-sm font-medium text-[#E1522D] underline"
                    >
                      Manage
                    </button>
                  ) : null}
                </div>

                {isLoadingSubscriptions ? (
                  <div className="space-y-3 pl-1 animate-pulse">
                    <div className="h-5 w-[85%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[55%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[70%] rounded bg-gray-200/80" />
                  </div>
                ) : activeSubscriptions.length === 0 ? (
                  <p className="pl-1 text-sm font-medium leading-5 text-[#6B7280]">
                    {isLoggedIn
                      ? "No subscriptions yet. Explore packs below to subscribe."
                      : "Sign in to see your subscriptions here."}
                  </p>
                ) : (
                  <>
                    <div
                      className="-mx-1 px-1"
                      onMouseEnter={() => setNamasteCarouselHoverPause(true)}
                      onMouseLeave={() => setNamasteCarouselHoverPause(false)}
                    >
                    <div
                      ref={subscriptionCarouselRef}
                      onScroll={handleSubscriptionCarouselScroll}
                      className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
                    >
                      {activeSubscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="w-full min-w-full shrink-0 snap-center px-1"
                        >
                          <div className="space-y-3 pl-1">
                            <div className="flex items-start justify-between gap-2 text-[#222222]">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <img
                                  src={scooterIcon}
                                  alt=""
                                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 text-base font-medium leading-snug [overflow-wrap:anywhere]">
                                  {formatNamasteDeliveryLine(sub)}
                                </span>
                              </div>
                              {sub.status === "PAUSED" ? (
                                <span className="inline-flex shrink-0 items-center rounded-md border-2 border-[#664D03] px-2 py-0.5 text-[11px] font-semibold text-[#664D03]">
                                  Paused
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center rounded-md border-2 border-[#166534] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[#222222]">
                              <img
                                src={clockIcon}
                                alt=""
                                className="h-5 w-5 flex-shrink-0"
                                aria-hidden
                              />
                              <span className="text-base font-medium text-[#222222]">{NAMASTE_TIME_SLOT_DISPLAY}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[#222222]">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <img
                                  src={flowerIcon}
                                  alt=""
                                  className="h-5 w-5 flex-shrink-0"
                                  aria-hidden
                                />
                                <span className="min-w-0 text-base font-medium [overflow-wrap:anywhere]">
                                  {subscriptionProductLabel(sub)}
                                </span>
                              </div>
                              {sub.status === "PAUSED" ? (
                                <button
                                  type="button"
                                  onClick={(e) => void handleNamasteResume(e, sub.id)}
                                  disabled={resumingSubId === sub.id}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border-[1.5px] border-[#2563EB] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#2563EB] disabled:opacity-60"
                                >
                                  {resumingSubId === sub.id ? (
                                    "…"
                                  ) : (
                                    <>
                                      <IoPlay className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                      Resume
                                    </>
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeSubscriptions.length > 1 && (
                      <div className="mt-2.5 flex justify-center gap-1.5">
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
                                  ? "h-1.5 w-1.5 bg-[#E1522D]"
                                  : "h-1.5 w-1.5 bg-[#D1D5DB]"
                              }`}
                              aria-hidden
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>
            </div>

          {/* Main Content */}
          <div className="px-4 py-4 space-y-6">
            {productsFetchError ? (
              <div className="text-red-500 text-center py-4 text-sm">{productsFetchError}</div>
            ) : null}

            {/* All Packs — same idea as mobile: horizontal strip + Explore full catalog */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                <h2 className="min-w-0 flex-1 pr-2 font-serif text-2xl font-semibold text-[#222222]">
                  All Packs
                </h2>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/Products`)}
                  className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#6B7280]"
                >
                  <span>Explore More {">"}</span>
                </button>
              </div>
              {!productsFetchError && isLoadingProducts ? (
                <div className="h-40 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
              ) : (
                <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 xs:gap-4 no-scrollbar pb-4 -mx-1 px-1">
                  {allPackProducts.map((pack) => (
                    <div
                      key={pack.id}
                      className="w-[min(46vw,10.75rem)] xs:w-[11rem] flex-shrink-0 snap-start"
                    >
                      <ProductCard
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        categoryName={pack.categoryName}
                        description="Mixed flowers daily"
                        price={`₹${pack.sellingPrice}/Day`}
                        showDailyButton
                        showBestsellerTag={!pack.labels?.length}
                        labels={pack.labels?.length ? pack.labels : undefined}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!productsFetchError && !isLoadingProducts && allPackProducts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-2">No packs available right now.</p>
              ) : null}
            </div>

            {/* Puja Packs — GET /products/?category=puja-packs&availability_type=daily,both */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                <h2 className="min-w-0 flex-1 pr-2 font-serif text-2xl font-semibold text-[#222222]">
                  Puja Packs
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${basePath}/Products?${new URLSearchParams({ category: "puja-packs" }).toString()}`,
                    )
                  }
                  className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#6B7280]"
                >
                  <span>Explore More {">"}</span>
                </button>
              </div>

              {!productsFetchError && isLoadingProducts ? (
                <div className="h-40 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
              ) : (
                <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 xs:gap-4 no-scrollbar pb-4 -mx-1 px-1">
                  {pujaPackProducts.map((pack) => (
                    <div
                      key={pack.id}
                      className="w-[min(46vw,10.75rem)] xs:w-[11rem] flex-shrink-0 snap-start"
                    >
                      <ProductCard
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        categoryName={pack.categoryName}
                        description="Mixed flowers daily"
                        price={`₹${pack.sellingPrice}/Day`}
                        showDailyButton
                        showBestsellerTag={!pack.labels?.length}
                        labels={pack.labels?.length ? pack.labels : undefined}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!productsFetchError && !isLoadingProducts && pujaPackProducts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-2">No Puja packs available right now.</p>
              ) : null}
            </div>

            {/* Exotic Packs — GET /products/?category=exotic-packs&availability_type=daily,both */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
                <h2 className="min-w-0 flex-1 pr-2 font-serif text-2xl font-semibold text-[#222222]">
                  Exotic Packs
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${basePath}/Products?${new URLSearchParams({ category: "exotic-packs" }).toString()}`,
                    )
                  }
                  className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#6B7280]"
                >
                  <span>Explore More {">"}</span>
                </button>
              </div>

              {!productsFetchError && isLoadingProducts ? (
                <div className="h-40 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
              ) : (
                <div className="flex snap-x snap-mandatory overflow-x-auto gap-3 xs:gap-4 no-scrollbar pb-4 -mx-1 px-1">
                  {exoticPackProducts.map((pack) => (
                    <div
                      key={pack.id}
                      className="w-[min(46vw,10.75rem)] xs:w-[11rem] flex-shrink-0 snap-start"
                    >
                      <ProductCard
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        categoryName={pack.categoryName}
                        description="Mixed flowers daily"
                        price={`₹${pack.sellingPrice}/Day`}
                        showDailyButton
                        showBestsellerTag={!pack.labels?.length}
                        labels={pack.labels?.length ? pack.labels : undefined}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </div>
              )}
              {!productsFetchError && !isLoadingProducts && exoticPackProducts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-2">No exotic packs available right now.</p>
              ) : null}
            </div>

            {/* Full product browse — always visible (route: /gp-daily/Products) */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/Products`)}
                className="w-full max-w-none rounded-2xl bg-[#FFB343] px-3.5 py-2.5 text-[15px] font-normal text-[#222222] transition-opacity hover:opacity-95"
              >
                View All Category
              </button>
            </div>

            {/* Quote of the Day Section */}
            <div className="pt-1">
              <h2 className="mb-2 self-start font-serif text-lg font-semibold leading-6 text-[#222222]">
                Quote of the day
              </h2>
              <img
                src={bottomBannerSvg}
                alt=""
                className="h-auto w-full"
                aria-hidden
              />
            </div>
          </div>
        </div>

      </div>
    </ErrorBoundary >
  );
};

export default Home2;
