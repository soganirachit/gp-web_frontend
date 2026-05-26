import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdKeyboardArrowDown } from "react-icons/md";
import { IoPlay } from "react-icons/io5";
import pauseSubIcon from "../assets/svg/cancelpage/pause.svg";

import { SubscriptionResumeButton } from "../components/Subscription/SubscriptionResumeButton";
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
import { resolveGpDailyCatalogStoreId } from "../utils/gpDailyCatalogStore";
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
import flowerIcon from "../assets/svg/gp_daily svg/flower.svg";
import bannerPng from "../assets/svg/gp_daily svg/banner.png";
import dailyOfferImage from "../assets/svg/gp_daily svg/offer.png";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import {
  ProfileAvatarButton,
  PROFILE_HEADER_AVATAR_CLASS,
  PROFILE_HEADER_FALLBACK_HOME_CLASS,
  PROFILE_HEADER_LOGO_CLASS,
} from "../components/common/ProfileAvatarButton";
import alertIcon from "../assets/svg/gp_daily svg/lowbalance.svg";
import {
  formatNamasteDeliveryLine,
  formatNamasteSubscriptionStatusLine,
  subscriptionProductLabel,
} from "../utils/subscriptionNextDelivery";
import {
  fetchGuestDeviceLocationLabel,
  GUEST_HEADER_LOCATION_TITLE,
  GUEST_LOCATION_UNAVAILABLE_HINT,
} from "../utils/guestHeaderLocation";
import {
  formatHomeHeaderAddressDisplay,
  HOME_HEADER_ADDRESS_LINE,
  HOME_HEADER_ADDRESS_PROFILE_ROW,
  HOME_HEADER_ADDRESS_TYPE,
  HOME_HEADER_CHEVRON,
  HOME_HEADER_LOCATION_CLICK,
  HOME_HEADER_LOCATION_ICON,
  HOME_HEADER_LOCATION_ROW,
  HOME_HEADER_PROFILE_OFFSET,
} from "../constants/homeHeaderLayout";

interface DayInfo {
  date: string;
  day: string;
  status: "past" | "active" | "future";
  deliveryStatus?: "pending" | "delivered" | "next";
}

/** Namaste subscription carousel — auto-advance loop (web). */
/** Matches app `GpDailyHomeScreen` namaste autoplay interval. */
const NAMASTE_CAROUSEL_AUTOPLAY_MS = 5000;
const NAMASTE_SCROLL_SETTLE_MS = 280;
/** Brief snooze after a user touch/swipe — autoplay resumes once this elapses. */
const NAMASTE_AUTOPLAY_SNOOZE_MS = 3500;
/** Hard cap on `scrollend` wait so the in-flight flag never gets stuck. */
const NAMASTE_AUTOPLAY_SCROLL_TIMEOUT_MS = 900;

function readNamasteCarouselPosition(el: HTMLDivElement): {
  slideWidth: number;
  virtualIndex: number;
} {
  const slide = el.querySelector<HTMLElement>("[data-namaste-slide]");
  const slideWidth =
    slide && slide.offsetWidth > 0 ? slide.offsetWidth : el.clientWidth;
  const virtualIndex =
    slideWidth > 0 ? Math.round(el.scrollLeft / slideWidth) : 0;
  return { slideWidth, virtualIndex };
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
  const [hasCustomerSubscription, setHasCustomerSubscription] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const subscriptionCarouselRef = useRef<HTMLDivElement | null>(null);
  const [subscriptionCarouselIndex, setSubscriptionCarouselIndex] = useState(0);
  /**
   * Virtual slide index for infinite loop: [clone last | …real… | clone first].
   * Real sub `i` sits at virtual `i + 1` when `activeSubscriptions.length > 1` (same as app).
   */
  const [namasteVirtualIndex, setNamasteVirtualIndex] = useState(0);
  const namasteJumpingRef = useRef(false);
  const namasteVirtualIndexRef = useRef(1);
  const namasteScrollRafRef = useRef<number | null>(null);
  const namasteScrollSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Epoch (ms) until which autoplay is snoozed because the user is touching /
   * swiping the carousel. Using a ref instead of state keeps the autoplay
   * interval mounted — we just skip individual ticks while the user is busy,
   * which always recovers even if a `pointerup` event is missed on mobile.
   */
  const namasteAutoplaySnoozeUntilRef = useRef(0);
  const namasteAutoplayInFlightRef = useRef(false);

  const snoozeNamasteAutoplay = useCallback((ms: number = NAMASTE_AUTOPLAY_SNOOZE_MS) => {
    namasteAutoplaySnoozeUntilRef.current = Date.now() + ms;
  }, []);
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
  const fetchSubscriptions = async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      if (!silent || activeSubscriptions.length === 0) {
        setIsLoadingSubscriptions(true);
      }
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      setHasCustomerSubscription(
        Boolean(fetchedSubscriptions && fetchedSubscriptions.length > 0),
      );

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
        setHasCustomerSubscription(false);
        setActiveSubscriptions([]);
        setSelectedSubscription(null);
        setSubscriptionCarouselIndex(0);
        setActiveSubscriptionExtra(null);
      }
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      setHasCustomerSubscription(false);
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
      const catalogSid = await resolveGpDailyCatalogStoreId();
      const sid = catalogSid || undefined;

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
    } else if (!isLoggedIn) {
      setAddressType(GUEST_HEADER_LOCATION_TITLE);
      setDeliveryLocation("");
      setIsLoadingAddress(true);
      void fetchGuestDeviceLocationLabel().then((label) => {
        setDeliveryLocation(label);
        setIsLoadingAddress(false);
      });
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
    if (!isLoggedIn) {
      navigate(`${basePath}/login`, {
        state: { returnUrl: `${basePath}/address-selection` },
      });
      return;
    }
    navigate(`${basePath}/address-selection`, { state: { fromHome: true } });
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

  const namasteLoopSlides = useMemo((): Subscription[] => {
    if (activeSubscriptions.length <= 1) return activeSubscriptions;
    return [
      activeSubscriptions[activeSubscriptions.length - 1],
      ...activeSubscriptions,
      activeSubscriptions[0],
    ];
  }, [activeSubscriptions]);

  const getNamasteRealIndexFromVirtual = useCallback(
    (virtualIdx: number) => {
      const n = activeSubscriptions.length;
      if (n <= 1) return 0;
      if (virtualIdx <= 0) return n - 1;
      if (virtualIdx >= n + 1) return 0;
      return Math.max(0, Math.min(virtualIdx - 1, n - 1));
    },
    [activeSubscriptions]
  );

  const applyNamasteCarouselState = useCallback(
    (virtualIndex: number) => {
      namasteVirtualIndexRef.current = virtualIndex;
      setNamasteVirtualIndex(virtualIndex);
      const dot = getNamasteRealIndexFromVirtual(virtualIndex);
      setSubscriptionCarouselIndex(dot);
      const s = activeSubscriptions[dot];
      if (s) setSelectedSubscription(s);
    },
    [activeSubscriptions, getNamasteRealIndexFromVirtual],
  );

  /** Init scroll to first real slide (virtual index 1) when loop, or 0 when single. */
  useEffect(() => {
    const el = subscriptionCarouselRef.current;
    if (!el) return;
    const n = activeSubscriptions.length;
    if (n === 0) return;
    if (n <= 1) {
      el.scrollTo({ left: 0, behavior: "auto" });
      namasteVirtualIndexRef.current = 0;
      setNamasteVirtualIndex(0);
      setSubscriptionCarouselIndex(0);
      if (activeSubscriptions[0]) {
        setSelectedSubscription(activeSubscriptions[0]);
      }
      return;
    }
    namasteJumpingRef.current = true;
    applyNamasteCarouselState(1);
    const apply = () => {
      const { slideWidth } = readNamasteCarouselPosition(el);
      const w = slideWidth || el.clientWidth || 1;
      if (w > 0) {
        el.scrollTo({ left: w, behavior: "auto" });
      }
      window.setTimeout(() => {
        namasteJumpingRef.current = false;
      }, 0);
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }, [subscriptionCarouselKey, activeSubscriptions, applyNamasteCarouselState]);

  const runNamasteBoundaryJump = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || activeSubscriptions.length <= 1) return;
    const { slideWidth, virtualIndex: rawIdx } = readNamasteCarouselPosition(el);
    const w = slideWidth || 1;
    const n = activeSubscriptions.length;
    const lastRealVirtual = n;
    const firstCloneVirtual = n + 1;
    if (rawIdx === 0) {
      namasteJumpingRef.current = true;
      el.scrollTo({ left: lastRealVirtual * w, behavior: "auto" });
      applyNamasteCarouselState(lastRealVirtual);
      requestAnimationFrame(() => {
        namasteJumpingRef.current = false;
      });
      return;
    }
    if (rawIdx === firstCloneVirtual) {
      namasteJumpingRef.current = true;
      el.scrollTo({ left: w, behavior: "auto" });
      applyNamasteCarouselState(1);
      requestAnimationFrame(() => {
        namasteJumpingRef.current = false;
      });
    }
  }, [activeSubscriptions, applyNamasteCarouselState]);

  /** Pagination dots + virtual index from live scroll (always runs on manual swipe). */
  const syncNamasteCarouselFromScroll = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || activeSubscriptions.length <= 1) return;
    const { virtualIndex } = readNamasteCarouselPosition(el);
    applyNamasteCarouselState(virtualIndex);
  }, [activeSubscriptions.length, applyNamasteCarouselState]);

  const snapNamasteCarouselToNearest = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || namasteJumpingRef.current || activeSubscriptions.length <= 1) {
      return;
    }
    const { slideWidth, virtualIndex: nearest } = readNamasteCarouselPosition(el);
    const w = slideWidth || 1;
    if (w <= 0) return;
    const targetLeft = nearest * w;
    if (Math.abs(el.scrollLeft - targetLeft) > 1) {
      namasteJumpingRef.current = true;
      el.scrollTo({ left: targetLeft, behavior: "auto" });
      requestAnimationFrame(() => {
        namasteJumpingRef.current = false;
      });
    }
    applyNamasteCarouselState(nearest);
    runNamasteBoundaryJump();
  }, [activeSubscriptions.length, applyNamasteCarouselState, runNamasteBoundaryJump]);

  /**
   * After scroll settles, jump off clone slides (same as app `onMomentumScrollEnd`).
   */
  useEffect(() => {
    const el = subscriptionCarouselRef.current;
    if (!el) return;
    if (activeSubscriptions.length <= 1) return;
    const onSettle = () => {
      if (namasteJumpingRef.current) return;
      snapNamasteCarouselToNearest();
    };
    const onScroll = () => {
      if (namasteScrollRafRef.current != null) {
        cancelAnimationFrame(namasteScrollRafRef.current);
      }
      namasteScrollRafRef.current = requestAnimationFrame(() => {
        namasteScrollRafRef.current = null;
        syncNamasteCarouselFromScroll();
      });
      if (namasteJumpingRef.current) return;
      if (namasteScrollSettleRef.current) {
        clearTimeout(namasteScrollSettleRef.current);
      }
      namasteScrollSettleRef.current = setTimeout(onSettle, NAMASTE_SCROLL_SETTLE_MS);
    };
    const onScrollEnd = () => onSettle();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd, { passive: true });
    return () => {
      if (namasteScrollRafRef.current != null) {
        cancelAnimationFrame(namasteScrollRafRef.current);
      }
      if (namasteScrollSettleRef.current) {
        clearTimeout(namasteScrollSettleRef.current);
      }
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
    };
  }, [
    activeSubscriptions,
    subscriptionCarouselKey,
    snapNamasteCarouselToNearest,
    syncNamasteCarouselFromScroll,
  ]);

  const scrollSubscriptionCarouselTo = useCallback(
    (index: number) => {
      const el = subscriptionCarouselRef.current;
      if (!el || activeSubscriptions.length === 0) return;
      if (activeSubscriptions.length <= 1) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const { slideWidth } = readNamasteCarouselPosition(el);
      const w = slideWidth || 1;
      const virtual = index + 1;
      applyNamasteCarouselState(virtual);
      el.scrollTo({ left: virtual * w, behavior: "smooth" });
    },
    [activeSubscriptions, applyNamasteCarouselState]
  );

  useEffect(() => {
    if (activeSubscriptions.length <= 1) {
      return;
    }
    const tick = () => {
      if (
        document.visibilityState !== "visible" ||
        namasteJumpingRef.current ||
        namasteAutoplayInFlightRef.current ||
        Date.now() < namasteAutoplaySnoozeUntilRef.current
      ) {
        return;
      }
      const el = subscriptionCarouselRef.current;
      if (!el) return;
      const n = activeSubscriptions.length;
      if (n <= 1) return;

      const { slideWidth, virtualIndex: currentVirtual } =
        readNamasteCarouselPosition(el);
      const w = slideWidth || 1;
      const nextVirtual = currentVirtual + 1;

      namasteAutoplayInFlightRef.current = true;
      applyNamasteCarouselState(nextVirtual);
      el.scrollTo({ left: nextVirtual * w, behavior: "smooth" });

      let settled = false;
      const finishAutoplay = () => {
        if (settled) return;
        settled = true;
        if (!namasteJumpingRef.current) {
          runNamasteBoundaryJump();
          syncNamasteCarouselFromScroll();
        }
        namasteAutoplayInFlightRef.current = false;
      };
      // Always arm a safety timeout in case `scrollend` is unsupported (Safari)
      // or never fires because the user interrupts the smooth scroll — we must
      // not leave `namasteAutoplayInFlightRef` stuck on `true`.
      window.setTimeout(finishAutoplay, NAMASTE_AUTOPLAY_SCROLL_TIMEOUT_MS);
      if ("onscrollend" in el) {
        el.addEventListener("scrollend", finishAutoplay, { once: true });
      }
    };
    const id = window.setInterval(tick, NAMASTE_CAROUSEL_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [
    activeSubscriptions,
    subscriptionCarouselKey,
    applyNamasteCarouselState,
    getNamasteRealIndexFromVirtual,
    runNamasteBoundaryJump,
    syncNamasteCarouselFromScroll,
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
      await fetchSubscriptions({ silent: true });
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
              <div className={HOME_HEADER_ADDRESS_PROFILE_ROW}>
                <div className={HOME_HEADER_LOCATION_ROW}>
                  <img
                    src={locationhomeIcon}
                    alt=""
                    className={HOME_HEADER_LOCATION_ICON}
                    aria-hidden
                  />
                  <div
                    className={HOME_HEADER_LOCATION_CLICK}
                    onClick={handleLocationClick}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={`${HOME_HEADER_ADDRESS_TYPE} text-[#111827]`}>{addressType}</span>
                      <span className={`${HOME_HEADER_ADDRESS_LINE} text-[#374151]`}>
                        {isLoadingAddress
                          ? "Loading..."
                          : deliveryLocation
                            ? formatHomeHeaderAddressDisplay(deliveryLocation)
                            : !isLoggedIn
                              ? GUEST_LOCATION_UNAVAILABLE_HINT
                              : "Tap to set address"}
                      </span>
                    </div>
                    <MdKeyboardArrowDown className={`${HOME_HEADER_CHEVRON} text-[#4B5563]`} />
                  </div>
                </div>

                <ProfileAvatarButton
                  className={`${PROFILE_HEADER_AVATAR_CLASS} ${HOME_HEADER_PROFILE_OFFSET}`}
                  profileHomeSrc={profilehomeIcon}
                  profileLogoSrc={profilelogoIcon}
                  fallbackHomeClassName={PROFILE_HEADER_FALLBACK_HOME_CLASS}
                  logoClassName={`${PROFILE_HEADER_LOGO_CLASS} brightness-0 invert`}
                  onClick={() => navigate("/gp-daily/account")}
                  ariaLabel={isLoggedIn ? "Account" : "Log in"}
                />
              </div>

              {/* Search Bar — unified styling, product suggestions as you type */}
              <div className="mt-2">
                <SearchBar
                  mode="product"
                  variant="homepage"
                  productBasePath="/gp-daily"
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
              {!isLoadingBalance &&
                isLoggedIn &&
                hasCustomerSubscription &&
                orderOnHold.show && (
                <div className="rounded-[40px] p-4 text-white" style={{ backgroundColor: "rgba(255, 38, 41, 0.8)" }}>
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
                    className="ml-10 inline-flex min-w-[130px] items-center justify-center self-start rounded-xl border-2 border-white px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Recharge Now
                  </button>
                </div>
              )}

              {/* Namaste + active subscriptions carousel */}
              <div className="relative overflow-hidden rounded-[40px] border border-[#F2E9D7] bg-[#f3e8d5] px-4 pt-3 pb-2">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h2 className="min-w-0 flex-1 font-serif text-xl font-semibold leading-6 text-[#222222] [overflow-wrap:anywhere]">
                    {isLoggedIn ? `Namaste, ${userFirstName || "User"}` : "Namaste!"}
                  </h2>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/manage-my-subscription`)}
                      className="shrink-0 rounded-full bg-[#E1522D]/15 px-3 py-1 text-sm font-medium text-[#E1522D] hover:bg-[#E1522D]/25"
                    >
                      Manage
                    </button>
                  ) : null}
                </div>

                {isLoadingSubscriptions && activeSubscriptions.length === 0 ? (
                  <div className="space-y-3 pl-1 animate-pulse">
                    <div className="h-5 w-[85%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[55%] rounded bg-gray-200/80" />
                    <div className="h-5 w-[70%] rounded bg-gray-200/80" />
                  </div>
                ) : activeSubscriptions.length === 0 ? (
                  <p className="pl-1 text-sm font-medium leading-5 text-[#6B7280]">
                    {isLoggedIn
                      ? "No subscriptions yet. Explore packs below to subscribe."
                      : ""}
                  </p>
                ) : (
                  <>
                    <div
                      className={`relative transition-opacity duration-300 ${
                        isLoadingSubscriptions ? "opacity-70" : ""
                      }`}
                      onPointerDown={() => snoozeNamasteAutoplay()}
                      onPointerUp={() => {
                        syncNamasteCarouselFromScroll();
                        snoozeNamasteAutoplay();
                      }}
                      onPointerCancel={() => snoozeNamasteAutoplay()}
                      onTouchStart={() => snoozeNamasteAutoplay()}
                      onTouchMove={() => snoozeNamasteAutoplay()}
                      onTouchEnd={() => {
                        syncNamasteCarouselFromScroll();
                        snoozeNamasteAutoplay();
                      }}
                    >
                    <div
                      ref={subscriptionCarouselRef}
                      className="relative z-10 flex min-h-[5.25rem] snap-x snap-mandatory overflow-x-auto overscroll-x-contain no-scrollbar touch-pan-x [scroll-snap-stop:always]"
                    >
                      {namasteLoopSlides.map((sub, loopIdx) => (
                        <div
                          key={`${String(sub.id)}-namaste-loop-${loopIdx}`}
                          data-namaste-slide
                          className="box-border w-full min-w-0 shrink-0 grow-0 basis-full snap-center snap-always"
                        >
                          {/* `pr-[3.5rem]` keeps text/product label clear of the corner flower decoration. */}
                          <div className="flex flex-col justify-start gap-1 pr-[3.5rem]">
                            {/* Row 1 — next delivery day/date (resume date when paused). */}
                            <div className="flex min-h-7 items-center gap-3 text-[#222222]">
                              <img
                                src={scooterIcon}
                                alt=""
                                className="h-5 w-5 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">
                                {formatNamasteDeliveryLine(sub)}
                              </span>
                            </div>
                            {/* Row 2 — subscription status, with the Resume CTA inline for paused subs. */}
                            <div className="flex min-h-7 items-center justify-between gap-2 text-[#222222]">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {sub.status === "PAUSED" ? (
                                  <img
                                    src={pauseSubIcon}
                                    alt=""
                                    className="h-5 w-5 shrink-0"
                                    aria-hidden
                                  />
                                ) : (
                                  <IoPlay
                                    className="h-5 w-5 shrink-0 text-[#222222]"
                                    aria-hidden
                                  />
                                )}
                                <span className="min-w-0 text-[15px] font-medium leading-5 text-[#222222]">
                                  {formatNamasteSubscriptionStatusLine(sub)}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center justify-end">
                                {sub.status === "PAUSED" ? (
                                  <SubscriptionResumeButton
                                    onClick={(e) => void handleNamasteResume(e, sub.id)}
                                    loading={resumingSubId === sub.id}
                                    className="!min-w-[4.75rem] !px-2.5 !py-1 !text-[12px] !rounded-lg"
                                  />
                                ) : null}
                              </div>
                            </div>
                            {/* Row 3 — product. */}
                            <div className="flex min-h-7 items-center gap-3 text-[#222222]">
                              <img
                                src={flowerIcon}
                                alt=""
                                className="h-5 w-5 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 text-[15px] font-medium leading-5 [overflow-wrap:anywhere]">
                                {subscriptionProductLabel(sub)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeSubscriptions.length > 1 ? (
                      <p
                        className="pointer-events-none relative z-[2] mt-1 text-xs font-semibold tabular-nums text-[#6B7280]"
                        aria-live="polite"
                      >
                        {subscriptionCarouselIndex + 1} / {activeSubscriptions.length}
                      </p>
                    ) : null}
                    {/* Offsets push the flower past the inner container's padding
                        so its edges hug the outer card (overflow-hidden + rounded
                        corners clip the excess). */}
                    <img
                      src={smallgendaIcon}
                      alt=""
                      className="pointer-events-none absolute -bottom-2 -right-4 z-[1] h-[4rem] w-[4rem] object-contain object-bottom-right select-none"
                      aria-hidden
                    />
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
                <h2 className="min-w-0 flex-1 pr-2 font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-[#222222]">
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
                        price={`₹${pack.sellingPrice}`}
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
                <h2 className="min-w-0 flex-1 pr-2 font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-[#222222]">
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
                        price={`₹${pack.sellingPrice}`}
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
                <h2 className="min-w-0 flex-1 pr-2 font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-[#222222]">
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
                        price={`₹${pack.sellingPrice}`}
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
                className="w-full max-w-none rounded-lg bg-[#FFB343] px-3.5 py-3.5 text-[15px] font-normal text-[#222222] transition-opacity hover:opacity-95"
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
