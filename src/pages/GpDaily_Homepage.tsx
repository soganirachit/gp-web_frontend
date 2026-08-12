import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdKeyboardArrowDown, MdChevronLeft, MdChevronRight } from "react-icons/md";
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
  computeGpDailyWalletBanner,
  PAUSE_REASON_INSUFFICIENT_WALLET,
  shouldShowGpDailyWalletAlertCard,
  shouldShowGpDailyOrderInHoldCard,
  shouldShowGpDailyRunningLowCard,
} from "../utils/gpDailyWalletHold";
import {
  readWalletPauseScheduleYmd,
  writeWalletPauseScheduleYmd,
} from "../utils/gpDailyWalletPauseSchedule";
import { subscriptionsDueForAutoResume } from "../utils/subscriptionAutoResume";
import { storeService, GUEST_STORE_UPDATED_EVENT, GPS_CATALOG_LOCATION_UPDATED_EVENT } from "../services/store.service";
import { resolveGpDailyCatalogStoreId } from "../utils/gpDailyCatalogStore";
import { formatNamasteGreeting, hasRealUserFirstName } from "../utils/namasteGreeting";
import type { Product as ProductType } from "../services/product.service";
import { addressService } from "../services/address.service";
import { validateGpDailyDeliveryAreaFromCoordinates } from "../services/subscriptionZone.service";
import { customerService } from "../services/getcustomer.service";
import { toast } from "react-hot-toast";
import ProductCard from "../components/common/ProductCard";
import { BrandIntroPyramidCopy } from "../components/common/BrandIntroPyramidCopy";
import { GpDailyHomeSection } from "../components/daily/GpDailyHomeSection";
import { GpDailyHomeSkeleton } from "../components/common/PageSkeletons";
import {
  gpDailyHome,
  GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS,
  GP_DAILY_SCOOTER_HERO_IMG_CLASS,
  GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS,
  GP_DAILY_SCOOTER_HERO_MARKETING_GUEST_WRAPPER_CLASS,
} from "../utils/gpDailyHomeDesignSystem";
import { SearchBar } from "../components/common/SearchBar";
import { OPTIMIZED_ILLUSTRATIONS } from "../config/optimizedIllustrations";
import scooterIcon from "../assets/svg/gp_daily svg/scooter.svg";
import flowerIcon from "../assets/svg/gp_daily svg/flower.svg";
import bannerPng from "../assets/svg/gp_daily svg/banner.png";
import dailyOfferImage from "../assets/svg/gp_daily svg/offer.png";
import { OffersBannerCarousel } from "../components/OffersBannerCarousel";
import { HorizontalScrollSection } from "../components/common/HorizontalScrollSection";
import { BANNER_PLACEMENT_DAILY_HOME } from "../utils/bannerPlacement";
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
  buildNamasteTodayOrderSlides,
  formatNamastePackNamesLine,
  type NamasteTodayOrderSlide,
} from "../utils/namasteTodayOrderSlides";
import {
  InsufficientWalletModal,
  type InsufficientWalletDetails,
} from "../components/daily/InsufficientWalletModal";
import { navigateToGpDailyWalletForRecharge } from "../utils/gpDailyWalletRechargeRedirect";
import { guestHasSavedBrowseAddress } from "../utils/guestAddressEntry";
import {
  formatNamasteDeliveryLine,
  subscriptionProductLabel,
} from "../utils/subscriptionNextDelivery";

type NamasteWebCarouselSlide =
  | { kind: "today_order"; slide: NamasteTodayOrderSlide }
  | { kind: "subscription"; sub: Subscription };
import {
  fetchGuestDeviceLocationLabel,
  GUEST_HEADER_LOCATION_TITLE,
  GUEST_LOCATION_UNAVAILABLE_HINT,
} from "../utils/guestHeaderLocation";
import {
  formatSavedAddressLine,
  pickHomeCatalogHeaderAddress,
} from "../utils/resolveHomeCatalogHeaderAddress";
import {
  GP_OPEN_GUEST_AREA_MODAL_EVENT,
} from "../config/guestAreaModalCopy";
import { HomeHeroStatusBanner } from "../components/home/HomeHeroStatusBanner";
import { GpDailyOfflineHero } from "../components/daily/GpDailyOfflineHero";
import { SleepingZzzBadge } from "../components/home/SleepingZzzBadge";
import {
  resolveHomeHeroStatus,
  type HomeHeroStatus,
} from "../utils/homeLocationHeroState";
import {
  formatHomeHeaderAddressDisplay,
  HOME_HEADER_ADDRESS_LINE,
  HOME_HEADER_ADDRESS_PROFILE_ROW,
  HOME_HEADER_ADDRESS_TYPE,
  HOME_HEADER_CHEVRON,
  HOME_HEADER_LOCATION_CLICK,
  HOME_HEADER_LOCATION_ICON,
  HOME_HEADER_LOCATION_ROW,
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
const dailyScooterHeroImg = OPTIMIZED_ILLUSTRATIONS.dailyScooter;
const dailyScooterHeroImgClass = GP_DAILY_SCOOTER_HERO_IMG_CLASS;
/** Logged-in home (Namaste + Manage) — scooter below Manage row; guests keep shared class. */
const GP_DAILY_HOME_MARKETING_SCOOTER_LOGGED_IN_CLASS =
  "pointer-events-none absolute -right-10 -top-3 z-0 translate-x-6 sm:top-11";
const NAMASTE_MAX_VISIBLE_DOTS = 3;

function getNamasteVisibleDotIndices(total: number, current: number): number[] {
  if (total <= NAMASTE_MAX_VISIBLE_DOTS) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const start = Math.max(
    0,
    Math.min(current - 1, total - NAMASTE_MAX_VISIBLE_DOTS),
  );
  return Array.from({ length: NAMASTE_MAX_VISIBLE_DOTS }, (_, i) => start + i);
}
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
  const [insufficientWalletModal, setInsufficientWalletModal] =
    useState<InsufficientWalletDetails | null>(null);
  const [productsFetchError, setProductsFetchError] = useState<string | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    Subscription[]
  >([]);
  /** Full GET /subscriptions/ list — wallet hold rules need every row (incl. RUNNING / wallet-paused). */
  const [customerSubscriptions, setCustomerSubscriptions] = useState<
    Subscription[]
  >([]);
  const [subscriptionExtrasById, setSubscriptionExtrasById] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [hasCustomerSubscription, setHasCustomerSubscription] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [todayOrderSlides, setTodayOrderSlides] = useState<
    NamasteTodayOrderSlide[]
  >([]);
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
  const [homeHeroStatus, setHomeHeroStatus] = useState<HomeHeroStatus>("default");
  const [dailyBannerStoreId, setDailyBannerStoreId] = useState<number | null>(() =>
    storeService.getStoreIdForProducts(),
  );

  const refreshDailyBannerStoreId = useCallback(async () => {
    let sid = await resolveGpDailyCatalogStoreId().catch(() => undefined);
    if (sid == null) {
      sid =
        storeService.getStoreIdForProducts() ??
        (await storeService.resolveStoreIdForApiAsync().catch(() => null)) ??
        undefined;
    }
    setDailyBannerStoreId(sid ?? null);
  }, []);

  useEffect(() => {
    void refreshDailyBannerStoreId();
    const onStore = () => {
      void refreshDailyBannerStoreId();
    };
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, onStore);
    return () => {
      window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onStore);
    };
  }, [isLoggedIn, deliveryLocation, refreshDailyBannerStoreId]);

  const refreshHomeHeroStatus = useCallback(async () => {
    const storeId =
      storeService.getStoreIdForProducts() ??
      (await resolveGpDailyCatalogStoreId()) ??
      null;
    const guestTempId = storeService.getTemporaryStoreId();
    const inServiceArea =
      deliveryZoneStatus?.isValid === true ||
      guestTempId != null ||
      storeId != null;
    let deviceLat: number | null = null;
    let deviceLng: number | null = null;
    try {
      const raw = localStorage.getItem("userCoordinates");
      if (raw) {
        const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          deviceLat = parsed.lat;
          deviceLng = parsed.lng;
        }
      }
    } catch {
      /* ignore */
    }
    const status = await resolveHomeHeroStatus({
      storeId,
      inServiceArea,
      deviceLat,
      deviceLng,
    });
    setHomeHeroStatus(status);
  }, [deliveryZoneStatus?.isValid]);

  useEffect(() => {
    void refreshHomeHeroStatus();
  }, [refreshHomeHeroStatus, deliveryLocation, isLoggedIn]);

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
        const first = user.firstName?.trim() || "";
        setUserName(`${user.firstName} ${user.lastName}`.trim());
        setUserFirstName(hasRealUserFirstName(first) ? first : "");
      } else {
        const stored = localStorage.getItem("userName")?.trim() || "";
        setUserName(stored || "");
        const first = stored.split(" ")[0] || "";
        setUserFirstName(hasRealUserFirstName(first) ? first : "");
      }
    } catch (error) {
      console.error("Error fetching customer name:", error);
      const stored = localStorage.getItem("userName")?.trim() || "";
      setUserName(stored || "");
      const first = stored.split(" ")[0] || "";
      setUserFirstName(hasRealUserFirstName(first) ? first : "");
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

      setCustomerSubscriptions(fetchedSubscriptions ?? []);

      setHasCustomerSubscription(
        Boolean(fetchedSubscriptions && fetchedSubscriptions.length > 0),
      );

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        /** Namaste carousel: active + paused only (same as mobile). */
        const rank = (s: (typeof fetchedSubscriptions)[0]) => {
          if (s.status === "ACTIVE") return 0;
          if (s.status === "PAUSED" || s.status === "INACTIVE") return 1;
          return 2;
        };
        const namasteList = fetchedSubscriptions
          .filter(
            (sub) =>
              sub.status === "ACTIVE" ||
              String(sub.status ?? "").toUpperCase() === "RUNNING" ||
              sub.status === "PAUSED" ||
              sub.status === "INACTIVE",
          )
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
        const detailIds = [
          ...new Set(
            fetchedSubscriptions
              .filter((s) => {
                const st = String(s.status ?? "").toUpperCase();
                return st === "ACTIVE" || st === "RUNNING" || st === "PAUSED";
              })
              .map((s) => String(s.id).trim())
              .filter(Boolean),
          ),
        ];
        void (async () => {
          const extras: Record<string, Record<string, unknown>> = {};
          await Promise.all(
            detailIds.map(async (id) => {
              try {
                const detail = await subscriptionService.getSubscriptionById(id);
                if (detail && Object.keys(detail).length > 0) {
                  extras[id] = detail;
                }
              } catch {
                /* optional */
              }
            }),
          );
          setSubscriptionExtrasById(extras);
        })();
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
        setCustomerSubscriptions([]);
        setSubscriptionExtrasById({});
        setActiveSubscriptions([]);
        setSelectedSubscription(null);
        setSubscriptionCarouselIndex(0);
        setActiveSubscriptionExtra(null);
      }
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      setHasCustomerSubscription(false);
      setCustomerSubscriptions([]);
      setSubscriptionExtrasById({});
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
      const { orders: raw } = await orderService.getOrdersFirstPage({
        order_type: "subscription",
      });
      const list = [...(raw || [])];
      setOrders(list);
      const asRecords = list
        .filter((o) => o && typeof o === "object")
        .map((o) => o as Record<string, unknown>);
      await orderService.enrichOrderListProductLabels(asRecords, {
        concurrency: 4,
        maxFetches: Math.max(asRecords.length, 12),
      });
      setTodayOrderSlides(buildNamasteTodayOrderSlides(asRecords));
    } catch (error) {
      console.error("Error fetching subscription orders:", error);
      setOrders([]);
      setTodayOrderSlides([]);
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
      if (!localStorage.getItem("phoneNumber")) {
        const guestAddr = storeService.getGuestBrowseAddress();
        if (guestAddr) {
          setAddressType(guestAddr.label || GUEST_HEADER_LOCATION_TITLE);
          setDeliveryLocation(guestAddr.formattedLine);
          return;
        }
        setAddressType(GUEST_HEADER_LOCATION_TITLE);
        setDeliveryLocation("");
        const label = await fetchGuestDeviceLocationLabel();
        setDeliveryLocation(label);
        return;
      }

      const addresses = await addressService.getAllAddresses();
      const selectedAddress = pickHomeCatalogHeaderAddress(addresses);

      if (selectedAddress) {
        setDeliveryLocation(formatSavedAddressLine(selectedAddress));
        setAddressType(selectedAddress.type || "Home");
      } else {
        setDeliveryLocation("");
        setAddressType("Home");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      const stored = localStorage.getItem("selectedDeliveryAddress");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Parameters<
            typeof formatSavedAddressLine
          >[0];
          setDeliveryLocation(formatSavedAddressLine(parsed));
          setAddressType(parsed.type || "Home");
        } catch {
          setDeliveryLocation(localStorage.getItem("userLocation") || "");
          setAddressType("Home");
        }
      } else {
        setDeliveryLocation(localStorage.getItem("userLocation") || "");
        setAddressType("Home");
      }
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
    void fetchLatestAddress();
  }, [fetchLatestAddress]);

  useEffect(() => {
    const onCatalogLocationChange = () => {
      void fetchLatestAddress();
      void refreshDailyBannerStoreId();
    };
    window.addEventListener(GPS_CATALOG_LOCATION_UPDATED_EVENT, onCatalogLocationChange);
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, onCatalogLocationChange);
    window.addEventListener("addressUpdated", onCatalogLocationChange);
    return () => {
      window.removeEventListener(
        GPS_CATALOG_LOCATION_UPDATED_EVENT,
        onCatalogLocationChange,
      );
      window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onCatalogLocationChange);
      window.removeEventListener("addressUpdated", onCatalogLocationChange);
    };
  }, [fetchLatestAddress, refreshDailyBannerStoreId]);

  useEffect(() => {
    if (location.pathname !== basePath) return;
    void fetchLatestAddress();
    void refreshDailyBannerStoreId();
  }, [location.pathname, basePath, fetchLatestAddress, refreshDailyBannerStoreId]);

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
      if (guestHasSavedBrowseAddress()) {
        navigate(`${basePath}/login`, {
          state: { from: location.pathname, returnUrl: `${basePath}/address-selection` },
        });
        return;
      }
      window.dispatchEvent(
        new CustomEvent(GP_OPEN_GUEST_AREA_MODAL_EVENT, {
          detail: {
            dismissible: true,
            variant: "need_location",
            redirectToAddressAfterPick: true,
          },
        }),
      );
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
    () =>
      [
        todayOrderSlides.map((s) => s.id).join("|"),
        activeSubscriptions.map((s) => s.id).join("|"),
      ].join("::"),
    [todayOrderSlides, activeSubscriptions],
  );

  const namasteCarouselSlides = useMemo((): NamasteWebCarouselSlide[] => {
    const orderSlides: NamasteWebCarouselSlide[] = todayOrderSlides.map(
      (slide) => ({
        kind: "today_order" as const,
        slide,
      }),
    );
    const subSlides: NamasteWebCarouselSlide[] = activeSubscriptions.map(
      (sub) => ({
        kind: "subscription" as const,
        sub,
      }),
    );
    return [...orderSlides, ...subSlides];
  }, [todayOrderSlides, activeSubscriptions]);

  const namasteSlideCount = namasteCarouselSlides.length;

  const namasteLoopSlides = useMemo((): NamasteWebCarouselSlide[] => {
    if (namasteSlideCount <= 1) return namasteCarouselSlides;
    return [
      namasteCarouselSlides[namasteSlideCount - 1],
      ...namasteCarouselSlides,
      namasteCarouselSlides[0],
    ];
  }, [namasteCarouselSlides, namasteSlideCount]);

  const namasteCarouselLoading =
    isLoggedIn && (isLoadingSubscriptions || isLoadingOrders);
  const hasNamasteSubs =
    isLoggedIn && !namasteCarouselLoading && namasteSlideCount > 0;
  const showNamasteMarketing =
    !isLoggedIn ||
    (!namasteCarouselLoading && namasteSlideCount === 0);

  const namasteDotIndices = useMemo(
    () => getNamasteVisibleDotIndices(namasteSlideCount, subscriptionCarouselIndex),
    [namasteSlideCount, subscriptionCarouselIndex],
  );
  const currentNamasteCarouselSlide =
    namasteCarouselSlides[subscriptionCarouselIndex] ?? null;
  const currentNamasteSub =
    currentNamasteCarouselSlide?.kind === "subscription"
      ? currentNamasteCarouselSlide.sub
      : null;
  const currentNamasteSubPaused =
    currentNamasteSub?.status === "PAUSED" ||
    currentNamasteSub?.status === "INACTIVE";

  const getNamasteRealIndexFromVirtual = useCallback(
    (virtualIdx: number) => {
      const n = namasteSlideCount;
      if (n <= 1) return 0;
      if (virtualIdx <= 0) return n - 1;
      if (virtualIdx >= n + 1) return 0;
      return Math.max(0, Math.min(virtualIdx - 1, n - 1));
    },
    [namasteSlideCount],
  );

  const applyNamasteCarouselState = useCallback(
    (virtualIndex: number) => {
      namasteVirtualIndexRef.current = virtualIndex;
      setNamasteVirtualIndex(virtualIndex);
      const dot = getNamasteRealIndexFromVirtual(virtualIndex);
      setSubscriptionCarouselIndex(dot);
      const item = namasteCarouselSlides[dot];
      if (item?.kind === "subscription") {
        setSelectedSubscription(item.sub);
      }
    },
    [namasteCarouselSlides, getNamasteRealIndexFromVirtual],
  );

  /** Init scroll to first real slide (virtual index 1) when loop, or 0 when single. */
  useEffect(() => {
    const el = subscriptionCarouselRef.current;
    if (!el) return;
    const n = namasteSlideCount;
    if (n === 0) return;
    if (n <= 1) {
      el.scrollTo({ left: 0, behavior: "auto" });
      namasteVirtualIndexRef.current = 0;
      setNamasteVirtualIndex(0);
      setSubscriptionCarouselIndex(0);
      const first = namasteCarouselSlides[0];
      if (first?.kind === "subscription") {
        setSelectedSubscription(first.sub);
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
  }, [subscriptionCarouselKey, namasteCarouselSlides, namasteSlideCount, applyNamasteCarouselState]);

  const runNamasteBoundaryJump = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || namasteSlideCount <= 1) return;
    const { slideWidth, virtualIndex: rawIdx } = readNamasteCarouselPosition(el);
    const w = slideWidth || 1;
    const n = namasteSlideCount;
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
  }, [namasteSlideCount, applyNamasteCarouselState]);

  /** Pagination dots + virtual index from live scroll (always runs on manual swipe). */
  const syncNamasteCarouselFromScroll = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || namasteSlideCount <= 1) return;
    const { virtualIndex } = readNamasteCarouselPosition(el);
    applyNamasteCarouselState(virtualIndex);
  }, [namasteSlideCount, applyNamasteCarouselState]);

  const snapNamasteCarouselToNearest = useCallback(() => {
    const el = subscriptionCarouselRef.current;
    if (!el || namasteJumpingRef.current || namasteSlideCount <= 1) {
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
  }, [namasteSlideCount, applyNamasteCarouselState, runNamasteBoundaryJump]);

  /**
   * After scroll settles, jump off clone slides (same as app `onMomentumScrollEnd`).
   */
  useEffect(() => {
    const el = subscriptionCarouselRef.current;
    if (!el) return;
    if (namasteSlideCount <= 1) return;
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
    namasteSlideCount,
    subscriptionCarouselKey,
    snapNamasteCarouselToNearest,
    syncNamasteCarouselFromScroll,
  ]);

  const scrollSubscriptionCarouselTo = useCallback(
    (index: number) => {
      const el = subscriptionCarouselRef.current;
      if (!el || namasteSlideCount === 0) return;
      if (namasteSlideCount <= 1) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const { slideWidth } = readNamasteCarouselPosition(el);
      const w = slideWidth || 1;
      const virtual = index + 1;
      applyNamasteCarouselState(virtual);
      el.scrollTo({ left: virtual * w, behavior: "smooth" });
    },
    [namasteSlideCount, applyNamasteCarouselState],
  );

  useEffect(() => {
    if (namasteSlideCount <= 1) {
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
      const n = namasteSlideCount;
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
    namasteSlideCount,
    subscriptionCarouselKey,
    applyNamasteCarouselState,
    getNamasteRealIndexFromVirtual,
    runNamasteBoundaryJump,
    syncNamasteCarouselFromScroll,
  ]);

  const goNamasteCarouselPrev = () => {
    const n = namasteSlideCount;
    if (n <= 1) return;
    const next = (subscriptionCarouselIndex - 1 + n) % n;
    scrollSubscriptionCarouselTo(next);
  };

  const goNamasteCarouselNext = () => {
    const n = namasteSlideCount;
    if (n <= 1) return;
    const next = (subscriptionCarouselIndex + 1) % n;
    scrollSubscriptionCarouselTo(next);
  };

  const renderNamastePagination = () =>
    namasteSlideCount > 1 ? (
      <div className={gpDailyHome.namastePagination}>
        <button
          type="button"
          onClick={goNamasteCarouselPrev}
          className={gpDailyHome.namastePaginationArrow}
          aria-label="Previous subscription"
        >
          <MdChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-0.5">
          {namasteDotIndices.map((dotIdx) => (
            <button
              key={`namaste-dot-${dotIdx}`}
              type="button"
              onClick={() => scrollSubscriptionCarouselTo(dotIdx)}
              className={
                dotIdx === subscriptionCarouselIndex
                  ? gpDailyHome.namastePaginationDotActive
                  : gpDailyHome.namastePaginationDot
              }
              aria-label={`Go to slide ${dotIdx + 1}`}
              aria-current={dotIdx === subscriptionCarouselIndex ? "true" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goNamasteCarouselNext}
          className={gpDailyHome.namastePaginationArrow}
          aria-label="Next subscription"
        >
          <MdChevronRight className="h-4 w-4" />
        </button>
      </div>
    ) : null;

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

  const renderNamasteTodayOrderSlide = (
    slide: NamasteTodayOrderSlide,
    keySuffix: string,
  ) => (
    <div key={keySuffix} className="min-w-0 flex-1">
      <div className="flex flex-col justify-start gap-1">
        <div className={gpDailyHome.namasteDetailRow}>
          <img
            src={scooterIcon}
            alt=""
            className={gpDailyHome.namasteIcon}
            aria-hidden
          />
          <span className={gpDailyHome.namasteDetail}>
            {slide.heading}
          </span>
        </div>
        {slide.packNames.length > 0 ? (
          <div className={gpDailyHome.namasteDetailRow}>
            <img
              src={flowerIcon}
              alt=""
              className={gpDailyHome.namasteIcon}
              aria-hidden
            />
            <span className={gpDailyHome.namasteDetail}>
              {formatNamastePackNamesLine(slide.packNames)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderNamasteCarouselSlide = (
    item: NamasteWebCarouselSlide,
    keySuffix: string,
  ) => {
    if (item.kind === "today_order") {
      return renderNamasteTodayOrderSlide(item.slide, keySuffix);
    }
    return renderNamasteSubSlide(item.sub, keySuffix);
  };

  const renderNamasteSubSlide = (sub: Subscription, keySuffix: string) => (
    <div key={keySuffix} className="min-w-0 flex-1">
      <div className="flex flex-col justify-start gap-1">
        <div className={gpDailyHome.namasteDetailRow}>
          <img
            src={flowerIcon}
            alt=""
            className={`${gpDailyHome.namasteIcon} shrink-0`}
            aria-hidden
          />
          <div className={gpDailyHome.namastePackNameRow}>
            <span className={gpDailyHome.namastePackName}>
              {subscriptionProductLabel(sub)}
            </span>
            {sub.status === "ACTIVE" ? (
              <span
                className={`${gpDailyHome.namasteActionChip} shrink-0 bg-[#9CAF3A] text-white`}
              >
                Active
              </span>
            ) : null}
            {sub.status === "PAUSED" || sub.status === "INACTIVE" ? (
              <SubscriptionResumeButton
                compact
                variant="olive"
                className="shrink-0"
                loading={resumingSubId === sub.id}
                onClick={(e) => void handleNamasteResume(e, sub.id)}
              />
            ) : null}
          </div>
        </div>
        <div className={gpDailyHome.namasteDetailRow}>
          <img
            src={scooterIcon}
            alt=""
            className={gpDailyHome.namasteIcon}
            aria-hidden
          />
          <span className={gpDailyHome.namasteDetail}>
            {formatNamasteDeliveryLine(sub)}
          </span>
        </div>
      </div>
    </div>
  );

  const isPageLoading =
    isLoadingAddress || isLoadingBalance || isLoadingProducts;

  const [walletPauseScheduleYmd, setWalletPauseScheduleYmd] = useState<string | null>(
    () => readWalletPauseScheduleYmd(),
  );
  const walletAutoPauseInFlightRef = useRef(false);
  const walletAutoResumeInFlightRef = useRef(false);

  const walletBanner = useMemo(
    () =>
      computeGpDailyWalletBanner({
        isLoggedIn,
        walletLoading: isLoadingBalance,
        walletBalance,
        subscriptions: customerSubscriptions,
        extrasBySubId: subscriptionExtrasById,
        storedPauseScheduleYmd: walletPauseScheduleYmd,
      }),
    [
      isLoggedIn,
      isLoadingBalance,
      walletBalance,
      customerSubscriptions,
      subscriptionExtrasById,
      walletPauseScheduleYmd,
    ],
  );

  useEffect(() => {
    if (!isLoggedIn || isLoadingBalance) return;
    const next = walletBanner.nextStoredPauseScheduleYmd;
    if (next === walletPauseScheduleYmd) return;
    setWalletPauseScheduleYmd(next);
    writeWalletPauseScheduleYmd(next);
  }, [
    isLoggedIn,
    isLoadingBalance,
    walletBanner.nextStoredPauseScheduleYmd,
    walletPauseScheduleYmd,
  ]);

  useEffect(() => {
    if (!isLoggedIn || walletAutoPauseInFlightRef.current) return;
    if (!walletBanner.shouldAutoPauseActiveSubs) return;
    const activeIds = activeSubscriptions
      .filter((s) => String(s.status ?? "").toUpperCase() === "ACTIVE")
      .map((s) => String(s.id).trim())
      .filter(Boolean);
    if (activeIds.length === 0) return;

    walletAutoPauseInFlightRef.current = true;
    void (async () => {
      try {
        await Promise.all(
          activeIds.map((id) =>
            subscriptionService.pauseSubscriptionWithPayload(id, {
              pause_reason: PAUSE_REASON_INSUFFICIENT_WALLET,
            }),
          ),
        );
        await fetchSubscriptions({ silent: true });
      } catch {
        /* backend cron should also handle */
      } finally {
        walletAutoPauseInFlightRef.current = false;
      }
    })();
  }, [isLoggedIn, walletBanner.shouldAutoPauseActiveSubs, activeSubscriptions]);

  useEffect(() => {
    if (!isLoggedIn || walletAutoResumeInFlightRef.current) return;
    const due = subscriptionsDueForAutoResume(activeSubscriptions);
    if (due.length === 0) return;

    walletAutoResumeInFlightRef.current = true;
    void (async () => {
      try {
        for (const sub of due) {
          const id = String(sub.id ?? sub.subscription_id ?? "").trim();
          if (!id) continue;
          await subscriptionService.resumeSubscription(id);
        }
        await fetchSubscriptions({ silent: true });
      } catch {
        /* backend Celery should resume + notify */
      } finally {
        walletAutoResumeInFlightRef.current = false;
      }
    })();
  }, [isLoggedIn, activeSubscriptions]);

  const orderOnHold = useMemo(
    () => ({
      show: shouldShowGpDailyWalletAlertCard(walletBanner),
      showOrderInHold: shouldShowGpDailyOrderInHoldCard(walletBanner),
      showRunningLow: shouldShowGpDailyRunningLowCard(walletBanner),
      kind: walletBanner.kind,
      pauseDateLabel: walletBanner.pauseDateLabel,
      threshold3Day: walletBanner.threeDayTotal,
      requiredRecharge: walletBanner.requiredRecharge,
      hasWalletHoldPause: walletBanner.hasWalletHoldPause,
      lowBalanceForSubscription: walletBanner.threeDayTotal > 0,
    }),
    [walletBanner],
  );

  if (isPageLoading) {
    return <GpDailyHomeSkeleton />;
  }

  return (
    <ErrorBoundary>
      <>
      <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
        <div className="mx-auto w-full max-w-[min(800px,100vw)]">
          <div
            className={`relative px-4 pt-4 rounded-b-2xl overflow-hidden ${showNamasteMarketing ? "pb-0" : "pb-1"}`}
            style={{
              background:
                "linear-gradient(90deg, rgba(250, 193, 20, 0.4) 0%, rgba(250, 193, 20, 0.2) 100%)",
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
                  className={`${PROFILE_HEADER_AVATAR_CLASS} -translate-x-2 sm:-translate-x-1.5`}
                  profileHomeSrc={profilehomeIcon}
                  profileLogoSrc={profilelogoIcon}
                  fallbackHomeClassName={PROFILE_HEADER_FALLBACK_HOME_CLASS}
                  logoClassName={`${PROFILE_HEADER_LOGO_CLASS} brightness-0 invert`}
                  onClick={() => navigate("/gp-daily/account")}
                  ariaLabel={isLoggedIn ? "Account" : "Log in"}
                />
              </div>

              {/* Search Bar — unified styling, product suggestions as you type */}
              <div className="mt-1.5">
                <SearchBar
                  mode="product"
                  variant="homepage"
                  productBasePath="/gp-daily"
                  storeId={storeService.getStoreIdForProducts() ?? undefined}
                />
              </div>

              {/* Legacy curated offer hero — replaced by Namaste hero block below. */}
              {/*
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
              */}

              {/* Namaste hero — store-home truck pattern with landing-page scooter. */}
              {homeHeroStatus === "store_offline" ? (
                <GpDailyOfflineHero
                  userFirstName={userFirstName || ""}
                  isLoggedIn={isLoggedIn}
                  onManage={
                    isLoggedIn
                      ? () => navigate(`${basePath}/manage-my-subscription`)
                      : undefined
                  }
                />
              ) : homeHeroStatus !== "default" ? (
                <HomeHeroStatusBanner
                  variant={homeHeroStatus}
                  typography="daily"
                  onChangeLocation={
                    homeHeroStatus === "area_coming_soon"
                      ? handleLocationClick
                      : undefined
                  }
                />
              ) : (
              <div className={`relative ${showNamasteMarketing ? "mt-2 sm:mt-3" : "mt-5 sm:mt-6"}`}>
                <div className={`mb-1.5 flex items-center justify-between gap-2 ${gpDailyHome.namasteHeroInset}`}>
                  <h2 className={isLoggedIn ? gpDailyHome.greeting : gpDailyHome.storeHeroGreeting}>
                    {formatNamasteGreeting(isLoggedIn, userFirstName)}
                  </h2>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${basePath}/manage-my-subscription`)
                      }
                      className={gpDailyHome.managePill}
                    >
                      Manage
                    </button>
                  ) : null}
                </div>

                {isLoggedIn && namasteCarouselLoading ? (
                  <div className="relative mt-0.5 pb-1">
                    <div className={`relative z-10 min-w-0 ${GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS} space-y-3 ${gpDailyHome.namasteHeroInset} animate-pulse`}>
                      <div className="h-5 w-[85%] rounded bg-gray-200/80" />
                      <div className="h-5 w-[55%] rounded bg-gray-200/80" />
                      <div className="h-5 w-[70%] rounded bg-gray-200/80" />
                    </div>
                    <div className={GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS}>
                      <img
                        src={dailyScooterHeroImg}
                        alt=""
                        aria-hidden
                        className={dailyScooterHeroImgClass}
                      />
                    </div>
                  </div>
                ) : hasNamasteSubs ? (
                  <div
                    className="relative mt-0.5 pb-1"
                  >
                    <div className={`relative z-10 min-w-0 ${GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS} ${gpDailyHome.namasteHeroInset}`}>
                      <div
                        className="relative transition-opacity duration-300"
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
                        <HorizontalScrollSection
                          ref={subscriptionCarouselRef}
                          trackClassName={gpDailyHome.namasteCarouselTrack}
                          prevLabel="Previous subscription"
                          nextLabel="Next subscription"
                          hideArrows
                          arrowCanGoPrev={namasteSlideCount > 1}
                          arrowCanGoNext={namasteSlideCount > 1}
                          onArrowPrev={() => {
                            snoozeNamasteAutoplay();
                            if (namasteSlideCount <= 1) return;
                            const next =
                              (subscriptionCarouselIndex -
                                1 +
                                namasteSlideCount) %
                              namasteSlideCount;
                            scrollSubscriptionCarouselTo(next);
                          }}
                          onArrowNext={() => {
                            snoozeNamasteAutoplay();
                            if (namasteSlideCount <= 1) return;
                            const next =
                              (subscriptionCarouselIndex + 1) %
                              namasteSlideCount;
                            scrollSubscriptionCarouselTo(next);
                          }}
                        >
                          {namasteLoopSlides.map((item, loopIdx) => (
                            <div
                              key={`${
                                item.kind === "today_order"
                                  ? item.slide.id
                                  : String(item.sub.id)
                              }-namaste-loop-${loopIdx}`}
                              data-namaste-slide
                              className="box-border w-full min-w-0 shrink-0 grow-0 basis-full snap-center snap-always"
                            >
                              {renderNamasteCarouselSlide(
                                item,
                                `${
                                  item.kind === "today_order"
                                    ? item.slide.id
                                    : String(item.sub.id)
                                }-hero-${loopIdx}`,
                              )}
                            </div>
                          ))}
                        </HorizontalScrollSection>
                      </div>
                      {renderNamastePagination()}
                    </div>
                    <div className={GP_DAILY_SCOOTER_HERO_WRAPPER_CLASS}>
                      <img
                        src={dailyScooterHeroImg}
                        alt=""
                        aria-hidden
                        className={dailyScooterHeroImgClass}
                      />
                    </div>
                  </div>
                ) : showNamasteMarketing ? (
                  <div className={`relative pb-0 sm:pb-0 ${isLoggedIn ? "mt-3 sm:mt-4" : ""}`}>
                    <div
                      className={`relative z-10 min-w-0 ${GP_DAILY_SCOOTER_HERO_COPY_PAD_CLASS} ${gpDailyHome.namasteHeroInset} ${isLoggedIn ? "pt-1" : ""}`}
                    >
                      <BrandIntroPyramidCopy className="mb-1.5" />
                      {/* <p className={gpDailyHome.marketingLine}>
                        Order in <span className="font-bold">2hrs</span> and get
                      </p>
                      <p className={gpDailyHome.marketingLine}>
                        it by tomorrow <span className="font-bold">12PM!</span>
                      </p> */}
                    </div>
                    <div
                      className={
                        isLoggedIn
                          ? GP_DAILY_HOME_MARKETING_SCOOTER_LOGGED_IN_CLASS
                          : GP_DAILY_SCOOTER_HERO_MARKETING_GUEST_WRAPPER_CLASS
                      }
                    >
                      <img
                        src={dailyScooterHeroImg}
                        alt=""
                        aria-hidden
                        className={GP_DAILY_SCOOTER_HERO_IMG_CLASS}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              )}

              {/* Legacy Namaste subscription card removed (hero carousel above is active). */}

            </div>
          </div>

          <div
            className={`${gpDailyHome.homeContentArea} flex flex-col ${gpDailyHome.homeSectionStackGap}${showNamasteMarketing ? " !pt-2" : ""}`}
          >
            <OffersBannerCarousel
              storeId={dailyBannerStoreId ?? undefined}
              placement={BANNER_PLACEMENT_DAILY_HOME}
              compactSpacing
            />

            {!isLoadingBalance &&
              isLoggedIn &&
              hasCustomerSubscription &&
              homeHeroStatus !== "store_offline" &&
              orderOnHold.show && (
              <div
                className={gpDailyHome.holdCard}
                style={{ backgroundColor: "rgba(255, 38, 41, 0.8)" }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <img src={alertIcon} alt="" className="w-[18px] h-[18px]" aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className={gpDailyHome.walletHoldText}>
                      {orderOnHold.showOrderInHold
                        ? "Order In Hold"
                        : "Wallet Running Low"}
                    </p>
                    <p className={gpDailyHome.holdCardBody}>
                      {orderOnHold.showRunningLow
                        ? `Your wallet balance will only last until ${orderOnHold.pauseDateLabel}. Please recharge to keep your deliveries running.`
                        : "Your wallet balance is low. Recharge now to continue your daily deliveries."}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigateToGpDailyWalletForRecharge(navigate, basePath, {
                          shortageAmount: Math.max(
                            0,
                            orderOnHold.requiredRecharge - walletBalance,
                          ),
                          currentBalance: walletBalance,
                          totalRequired: orderOnHold.requiredRecharge,
                          returnUrl: `${basePath}/home`,
                        })
                      }
                      className={gpDailyHome.walletRechargeBtn}
                    >
                      Recharge Now
                    </button>
                  </div>
                </div>
              </div>
            )}
            {productsFetchError ? (
              <div className="text-red-500 text-center py-4 text-sm">{productsFetchError}</div>
            ) : null}

            <div className="pt-[12px]">
              <GpDailyHomeSection
                title="All Packs"
                isFirstInGroup={
                  !(
                    !isLoadingBalance &&
                    isLoggedIn &&
                    hasCustomerSubscription &&
                    homeHeroStatus !== "store_offline" &&
                    orderOnHold.show
                  )
                }
                headerRight={
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/Products`)}
                    className={gpDailyHome.exploreMore}
                  >
                    <span>Explore More {">"}</span>
                  </button>
                }
              >
                {!productsFetchError && isLoadingProducts ? (
                  <div className="h-36 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
                ) : (
                  <HorizontalScrollSection trackClassName={gpDailyHome.productStrip}>
                    {allPackProducts.map((pack, packIdx) => (
                      <div key={pack.id} className={gpDailyHome.productCol}>
                        <ProductCard
                          compact
                          imagePriority={packIdx < 4}
                          imageUrl={getImageUrl(pack.imagesUrl)}
                          packName={pack.name}
                          categoryName={pack.categoryName}
                          description="Mixed flowers daily"
                          price={`₹${pack.sellingPrice}`}
                          showDailyButton
                          showBestsellerTag={Boolean(pack.isBestSeller)}
                          labels={pack.labels?.length ? pack.labels : undefined}
                          onClick={() => handleProductClick(pack)}
                        />
                      </div>
                    ))}
                  </HorizontalScrollSection>
                )}
                {!productsFetchError && !isLoadingProducts && allPackProducts.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-2">No packs available right now.</p>
                ) : null}
              </GpDailyHomeSection>
            </div>

            <GpDailyHomeSection
              title="Puja Packs"
              headerRight={
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${basePath}/Products?${new URLSearchParams({ category: "puja-packs" }).toString()}`,
                    )
                  }
                  className={gpDailyHome.exploreMore}
                >
                  <span>Explore More {">"}</span>
                </button>
              }
            >
              {!productsFetchError && isLoadingProducts ? (
                <div className="h-36 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
              ) : (
                <HorizontalScrollSection trackClassName={gpDailyHome.productStrip}>
                  {pujaPackProducts.map((pack) => (
                    <div key={pack.id} className={gpDailyHome.productCol}>
                      <ProductCard
                        compact
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        categoryName={pack.categoryName}
                        description="Mixed flowers daily"
                        price={`₹${pack.sellingPrice}`}
                        showDailyButton
                        showBestsellerTag={Boolean(pack.isBestSeller)}
                        labels={pack.labels?.length ? pack.labels : undefined}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </HorizontalScrollSection>
              )}
              {!productsFetchError && !isLoadingProducts && pujaPackProducts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-2">No Puja packs available right now.</p>
              ) : null}
            </GpDailyHomeSection>

            <GpDailyHomeSection
              title="Exotic Packs"
              headerRight={
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${basePath}/Products?${new URLSearchParams({ category: "exotic-packs" }).toString()}`,
                    )
                  }
                  className={gpDailyHome.exploreMore}
                >
                  <span>Explore More {">"}</span>
                </button>
              }
            >
              {!productsFetchError && isLoadingProducts ? (
                <div className="h-36 animate-pulse rounded-xl bg-gray-200/80" aria-hidden />
              ) : (
                <HorizontalScrollSection trackClassName={gpDailyHome.productStrip}>
                  {exoticPackProducts.map((pack) => (
                    <div key={pack.id} className={gpDailyHome.productCol}>
                      <ProductCard
                        compact
                        imageUrl={getImageUrl(pack.imagesUrl)}
                        packName={pack.name}
                        categoryName={pack.categoryName}
                        description="Mixed flowers daily"
                        price={`₹${pack.sellingPrice}`}
                        showDailyButton
                        showBestsellerTag={Boolean(pack.isBestSeller)}
                        labels={pack.labels?.length ? pack.labels : undefined}
                        onClick={() => handleProductClick(pack)}
                      />
                    </div>
                  ))}
                </HorizontalScrollSection>
              )}
              {!productsFetchError && !isLoadingProducts && exoticPackProducts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-2">No exotic packs available right now.</p>
              ) : null}
            </GpDailyHomeSection>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/Products`)}
                className={gpDailyHome.viewAllCta}
              >
                View All Category
              </button>
            </div>

            {/* <GpDailyHomeSection title="Quote Of The Day">
              <img
                src={OPTIMIZED_ILLUSTRATIONS.bottomBanner}
                alt=""
                className="h-auto w-full"
                aria-hidden
              />
            </GpDailyHomeSection> */}
          </div>
        </div>
      </div>

      <InsufficientWalletModal
        open={insufficientWalletModal != null}
        details={insufficientWalletModal}
        onClose={() => setInsufficientWalletModal(null)}
        onRecharge={() => {
          const details = insufficientWalletModal;
          setInsufficientWalletModal(null);
          if (!details) return;
          navigateToGpDailyWalletForRecharge(navigate, basePath, {
            shortageAmount: details.shortageAmount,
            currentBalance: details.currentBalance,
            totalRequired: details.requiredAmount,
            returnUrl: `${basePath}/home`,
          });
        }}
      />
      </>
    </ErrorBoundary>
  );
};

export default Home2;
