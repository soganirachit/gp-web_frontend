import React, { useEffect, useState, useCallback, useRef } from "react";
import { SEO } from "../components/SEO";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight, FaSearch } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { motion } from "framer-motion";
import { useFeatureTheme } from "../context/FeatureThemeContext";
import { addressService } from "../services/address.service";
import { customerService } from "../services/getcustomer.service";
import {
  productService,
  Category,
  BestSeller,
  getEffectivePrice,
  getBasePrice,
  showStrikeBaseOnCard,
  PRODUCT_AVAILABILITY_STORE,
} from "../services/product.service";
import {
  GUEST_STORE_UPDATED_EVENT,
  GPS_CATALOG_LOCATION_UPDATED_EVENT,
  storeService,
} from "../services/store.service";
import { toast } from "react-hot-toast";
import { StoreHomeSkeleton } from "../components/common/PageSkeletons";
import { SearchBar } from "../components/common/SearchBar";
import ErrorBoundary from "../components/ErrorBoundary";
import SearchIcon from "../assets/icon/Search.png";
import { useAuth } from "../context/AuthContext";
import { GP_OPEN_GUEST_AREA_MODAL_EVENT } from "../config/guestAreaModalCopy";
import { guestHasSavedBrowseAddress } from "../utils/guestAddressEntry";
import { HomeHeroStatusBanner } from "../components/home/HomeHeroStatusBanner";
import { GpStoreOfflineHero } from "../components/store/GpStoreOfflineHero";
import { GpDailyHomeSection } from "../components/daily/GpDailyHomeSection";
import {
  gpDailyHome,
  GP_STORE_HERO_TRUCK_IMG_CLASS,
} from "../utils/gpDailyHomeDesignSystem";
import {
  parseDeliveryAddressCoords,
  resolveHomeHeroStatus,
  type HomeHeroStatus,
} from "../utils/homeLocationHeroState";
import { resolveGpStoreOfflineStoreCandidates } from "../utils/gpStoreOfflineStore";
import truckStoreIcon from "../assets/svg/gp_store_svg/truckhome.svg";
import storeGreenBanner from "../assets/svg/gp_store_svg/greenbanner.svg";
import storeWhiteLogo from "../assets/svg/gp_store_svg/whitelogo.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import {
  ProfileAvatarButton,
  PROFILE_HEADER_AVATAR_CLASS,
  PROFILE_HEADER_FALLBACK_HOME_CLASS,
  PROFILE_HEADER_LOGO_CLASS,
} from "../components/common/ProfileAvatarButton";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
import { formatProductTitleCase } from "../lib/formatProductTitleCase";
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
import { ProductImageTag } from "../components/common/ProductImageTag";
import { OffersBannerCarousel } from "../components/OffersBannerCarousel";
import { BANNER_PLACEMENT_STORE_HOME } from "../utils/bannerPlacement";

// Note: If truckstore.svg doesn't exist, rename truckhome.svg to truckstore.svg

const GpStore_Homepage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, feature } = useFeatureTheme();
    const { isLoggedIn } = useAuth();
    const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

    const [deliveryLocation, setDeliveryLocation] = useState<string>("");
    const [addressType, setAddressType] = useState<string>("Home");
    const [isLoadingAddress, setIsLoadingAddress] = useState(true);
    /** All Packs — GET /products/ (no ordering) */
    const [products, setProducts] = useState<BestSeller[]>([]);
    /** Premium Packs — GET /products/?label=premium (see Postman List Products + List Labels) */
    const [premiumProducts, setPremiumProducts] = useState<BestSeller[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [userFirstName, setUserFirstName] = useState<string>("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
    const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true);
    const [storeId, setStoreId] = useState<number | null>(null);
    const [homeHeroStatus, setHomeHeroStatus] = useState<HomeHeroStatus>("default");
    const deliveryCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
    const [deliveryCoordsTick, setDeliveryCoordsTick] = useState(0);

    const refreshHomeHeroStatus = useCallback(async () => {
        const { primaryStoreId, storeIds } =
            await resolveGpStoreOfflineStoreCandidates();
        const sid = primaryStoreId ?? storeId;
        const guestTempId = storeService.getTemporaryStoreId();
        const inServiceArea =
            guestTempId != null ||
            storeIds.length > 0 ||
            (!!localStorage.getItem("access_token") && sid != null);
        const delivery = deliveryCoordsRef.current;
        let deviceLat: number | null = delivery?.lat ?? null;
        let deviceLng: number | null = delivery?.lng ?? null;
        if (deviceLat == null || deviceLng == null) {
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
        }
        const status = await resolveHomeHeroStatus({
            storeId: sid ?? null,
            storeIds,
            inServiceArea,
            deviceLat,
            deviceLng,
        });
        setHomeHeroStatus(status);
    }, [storeId]);

    useEffect(() => {
        void refreshHomeHeroStatus();
    }, [refreshHomeHeroStatus, deliveryCoordsTick, deliveryLocation, isLoggedIn]);

    const fetchCustomerName = async () => {
        try {
            const customers = await customerService.getAllCustomers();
            if (customers && customers.length > 0) {
                const user = customers[0];
                setUserFirstName(user.firstName);
            } else {
                setUserFirstName(localStorage.getItem("userName")?.split(" ")[0] || "User");
            }
        } catch (error) {
            console.error("Error fetching customer name:", error);
            setUserFirstName(localStorage.getItem("userName")?.split(" ")[0] || "User");
        }
    };

    const fetchProducts = async (signal?: AbortSignal) => {
        try {
            setIsLoadingProducts(true);
            const storeId = storeService.getStoreIdForProducts();
            const sid = storeId || undefined;
            if (!storeId) {
                console.warn("Store ID not available, products may not load correctly");
            }

            const normalizeList = (list: unknown[]) =>
                (list || []).map((p) => productService.normalizeToBestSeller(p as Record<string, unknown>));

            const [allPacksRaw, premiumRaw] = await Promise.all([
                productService.getProductsByOrdering(undefined, sid, signal, PRODUCT_AVAILABILITY_STORE),
                productService.getProductsByLabel("premium", sid, signal, "-order_count", PRODUCT_AVAILABILITY_STORE),
            ]);

            setProducts(normalizeList(allPacksRaw as unknown[]));
            setPremiumProducts(normalizeList(premiumRaw as unknown[]).slice(0, 12));
        } catch (error: any) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log("Products request was canceled");
                return;
            }
            console.error("Error fetching products:", error);
            if (error?.response?.status === 401) {
                console.warn("Products endpoint returned 401 - store_id might be required");
            }
            setProducts([]);
            setPremiumProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const fetchCategories = async (signal?: AbortSignal) => {
        try {
            setIsLoadingCategories(true);
            const storeId = storeService.getStoreIdForProducts();
            
            // Ensure store ID is available before fetching
            if (!storeId) {
                console.warn("Store ID not available, categories may not load correctly");
            }
            
            const fetchedCategories = await productService.getCategories(
                storeId || undefined,
                "store",
                signal
            );
            // Filter only active categories and sort by display_order
            const activeCategories = fetchedCategories
                .filter((cat) => cat.is_active)
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            setCategories(activeCategories);
        } catch (error: any) {
            // Don't log error if request was aborted (component unmounted)
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('Categories request was canceled');
                return;
            }
            console.error("Error fetching categories:", error);
            // If 401 error, user might not be authenticated - this is OK for non-logged-in users
            if (error?.response?.status === 401) {
                console.warn("Categories endpoint returned 401 - store_id might be required");
            }
            setCategories([]);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    /** Best Sellers — GET /products/?label=best-seller (not GET /products/best-sellers/) */
    const fetchBestSellers = async (signal?: AbortSignal) => {
        try {
            setIsLoadingBestSellers(true);
            const storeId = storeService.getStoreIdForProducts();
            
            // Ensure store ID is available before fetching
            if (!storeId) {
                console.warn("Store ID not available, best sellers may not load correctly");
            }
            
            const fetchedBestSellers = await productService.getProductsByLabel(
                "best-seller",
                storeId || undefined,
                signal,
                "-order_count",
                PRODUCT_AVAILABILITY_STORE,
            );
            setBestSellers(fetchedBestSellers);
        } catch (error: any) {
            // Don't log error if request was aborted (component unmounted)
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('Best sellers request was canceled');
                return;
            }
            console.error("Error fetching best sellers:", error);
            // If 401 error, user might not be authenticated - this is OK for non-logged-in users
            if (error?.response?.status === 401) {
                console.warn("Best sellers endpoint returned 401 - store_id might be required");
            }
            setBestSellers([]);
        } finally {
            setIsLoadingBestSellers(false);
        }
    };

    const fetchLatestAddress = useCallback(async () => {
        try {
            setIsLoadingAddress(true);
            if (!isLoggedIn) {
                const guestAddr = storeService.getGuestBrowseAddress();
                if (guestAddr) {
                    setAddressType(guestAddr.label || GUEST_HEADER_LOCATION_TITLE);
                    setDeliveryLocation(guestAddr.formattedLine);
                    setIsLoadingAddress(false);
                    return;
                }
                setAddressType(GUEST_HEADER_LOCATION_TITLE);
                setDeliveryLocation("");
                setIsLoadingAddress(true);
                try {
                    const label = await fetchGuestDeviceLocationLabel();
                    setDeliveryLocation(label);
                } finally {
                    setIsLoadingAddress(false);
                }
                return;
            }
            const addresses = await addressService.getAllAddresses();
            const overrideId = storeService.getGpStoreCatalogAddressOverrideId();
            const fromOverride = overrideId
                ? addresses.find((a) => String(a.id) === String(overrideId))
                : null;
            const defaultAddress = addresses.find((addr) => addr.isDefault);
            const selectedAddress =
                fromOverride ||
                defaultAddress ||
                addresses
                    .sort(
                        (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime()
                    )[0];

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
                deliveryCoordsRef.current =
                    parseDeliveryAddressCoords(selectedAddress);
            } else {
                setDeliveryLocation("");
                setAddressType("Home");
                deliveryCoordsRef.current = null;
            }
            setDeliveryCoordsTick((t) => t + 1);
        } catch (error) {
            console.error("Error fetching address:", error);
            // Avoid showing stale address when logged out or on failures.
            setDeliveryLocation("");
            setAddressType("Home");
        } finally {
            setIsLoadingAddress(false);
        }
    }, [isLoggedIn]);

    /**
     * Catalog loads intentionally do NOT use AbortController.
     * Aborting on effect cleanup causes DevTools "(canceled)" for every in-flight GET when:
     * - React 18 Strict Mode remounts, or
     * - User navigates e.g. home → /gp-store/products (same endpoints refetch there).
     * Outdated responses are harmless to apply briefly; identical GETs are coalesced in api.ts.
     */
    useEffect(() => {
        let isMounted = true;
        let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;

        const initializeStore = async () => {
            if (isLoggedIn) {
                if (isMounted) {
                    fetchCustomerName();
                    fetchLatestAddress();
                }
            } else {
                if (isMounted) {
                    void fetchLatestAddress();
                }

            }

            if (!isMounted) return;

            const runCatalogFetch = () => {
                if (!isMounted) return;
                const sid = storeService.getStoreIdForProducts();
                if (isMounted) setStoreId(sid ?? null);
                void fetchProducts();
                void fetchCategories();
                void fetchBestSellers();
            };

            fetchTimeoutId = setTimeout(runCatalogFetch, 0);
        };

        initializeStore();

        return () => {
            isMounted = false;
            if (fetchTimeoutId != null) clearTimeout(fetchTimeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isLoggedIn) return;
        const onGuestStore = () => {
            const sid = storeService.getStoreIdForProducts();
            setStoreId(sid ?? null);
            void fetchProducts();
            void fetchCategories();
            void fetchBestSellers();
        };
        window.addEventListener(GUEST_STORE_UPDATED_EVENT, onGuestStore);
        return () => window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onGuestStore);
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        const onCatalog = () => {
            void fetchLatestAddress();
            const sid = storeService.getStoreIdForProducts();
            setStoreId(sid ?? null);
            void fetchProducts();
            void fetchCategories();
            void fetchBestSellers();
        };
        window.addEventListener(GPS_CATALOG_LOCATION_UPDATED_EVENT, onCatalog);
        return () =>
            window.removeEventListener(
                GPS_CATALOG_LOCATION_UPDATED_EVENT,
                onCatalog,
            );
        // Event handler uses the latest fetch* and fetchLatestAddress from the render when the listener is attached.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    const handleLocationClick = () => {
        if (!isLoggedIn) {
            if (guestHasSavedBrowseAddress()) {
                navigate(`${basePath}/login`, {
                    state: {
                        from: location.pathname,
                        returnUrl: `${basePath}/address-selection`,
                    },
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

    const handleProductClick = (product: BestSeller) => {
        const productSlug = product.slug;
        navigate(`${basePath}/product/${productSlug}`, { state: { product } });
    };

    const handleBestSellerClick = (bestSeller: BestSeller) => {
        navigate(`${basePath}/product/${bestSeller.slug}`, { state: { product: bestSeller } });
    };

    const getImageUrl = (image?: string | string[] | null): string => {
        if (!image) return "/placeholder.svg";
        if (Array.isArray(image)) {
            return image[0] || "/placeholder.svg";
        }
        return image;
    };

    const isPageLoading = isLoadingAddress || isLoadingProducts || isLoadingCategories || isLoadingBestSellers;

    if (isPageLoading) {
        return <StoreHomeSkeleton />;
    }

    const filteredBestSellers = bestSellers;

    return (
        <ErrorBoundary>
            <SEO
              title="Genda Phool Store — Flowers, Bouquets & Pooja Items in Jaipur"
              description="Shop fresh loose flowers, bouquets, garlands, pooja kits, diyas and incense online. Same-day delivery in Jaipur."
              canonical="https://customerapp.mygendaphool.com/gp-store"
            />
            <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom overflow-x-hidden">
                <div className="mx-auto w-full min-w-0 max-w-[min(800px,100vw)]">
                    {/* Top Header with Green Background */}
                    <div className="relative px-4 pt-0 pb-4" style={{
                        background: 'linear-gradient(to bottom, #DAFFD9, #D8F0D7)',
                        minHeight: 'clamp(220px, 42vw, 280px)'
                    }}>
                        {/* Content Overlay */}
                        <div className="relative z-10 pt-0">
                            {/* Location and Profile */}
                            <div className={HOME_HEADER_ADDRESS_PROFILE_ROW}>
                                {/* Location Section */}
                                <div className={HOME_HEADER_LOCATION_ROW}>
                                    <img
                                        src={locationhomeIcon}
                                        alt="Location"
                                        className={HOME_HEADER_LOCATION_ICON}
                                    />
                                    <div
                                        className={HOME_HEADER_LOCATION_CLICK}
                                        onClick={handleLocationClick}
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className={`${HOME_HEADER_ADDRESS_TYPE} text-gray-800`}>{addressType}</span>
                                            <span className={`${HOME_HEADER_ADDRESS_LINE} text-gray-700`}>
                                                {isLoadingAddress
                                                  ? 'Loading...'
                                                  : deliveryLocation
                                                    ? formatHomeHeaderAddressDisplay(deliveryLocation)
                                                    : !isLoggedIn
                                                      ? GUEST_LOCATION_UNAVAILABLE_HINT
                                                      : "Tap to set address"}
                                            </span>
                                        </div>
                                        <MdKeyboardArrowDown className={HOME_HEADER_CHEVRON} />
                                    </div>
                                </div>

                                {/* Right Side Icons - Only Profile */}
                                <ProfileAvatarButton
                                    className={`${PROFILE_HEADER_AVATAR_CLASS} ${HOME_HEADER_PROFILE_OFFSET}`}
                                    profileHomeSrc={profilehomeIcon}
                                    profileLogoSrc={profilelogoIcon}
                                    fallbackHomeClassName={PROFILE_HEADER_FALLBACK_HOME_CLASS}
                                    logoClassName={PROFILE_HEADER_LOGO_CLASS}
                                    onClick={() => navigate(`${basePath}/account`)}
                                    ariaLabel="Account"
                                />
                            </div>

                            {/* Search Bar — unified styling, product suggestions as you type */}
                            <div className="mt-4 sm:mt-5">
                                <SearchBar
                                    mode="product"
                                    variant="homepage"
                                    storeId={storeId}
                                    productBasePath="/gp-store"
                                />
                            </div>

                            {/* Namaste + delivery truck — single row (design ref) */}
                            {homeHeroStatus === "store_offline" ? (
                                <GpStoreOfflineHero
                                    userFirstName={userFirstName || "User"}
                                />
                            ) : homeHeroStatus !== "default" ? (
                                <HomeHeroStatusBanner
                                    variant={homeHeroStatus}
                                    onChangeLocation={
                                        homeHeroStatus === "area_coming_soon"
                                            ? handleLocationClick
                                            : undefined
                                    }
                                />
                            ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mt-5"
                            >
                                <div className="relative min-h-[7rem] pb-1 sm:min-h-[7.5rem]">
                                    <div
                                        className={`relative z-[1] min-w-0 pr-[40%] ${gpDailyHome.namasteHeroInset}`}
                                    >
                                        <h2 className={`${gpDailyHome.storeHeroGreeting} relative z-10`}>
                                            {userFirstName
                                                ? `Namaste, ${userFirstName}!`
                                                : "Namaste!"}
                                        </h2>
                                        <div className="relative z-[1]">
                                            <p className={gpDailyHome.marketingTagline}>
                                                We are Genda Phool! Your partner for everyday floral needs.
                                            </p>
                                            <p className={gpDailyHome.marketingLine}>
                                                Order in <span className="font-bold">2hrs</span> and get
                                            </p>
                                            <p className={gpDailyHome.marketingLine}>
                                                it by tomorrow <span className="font-bold">12PM!</span>
                                            </p>
                                        </div>
                                    </div>
                                    <img
                                        src={truckStoreIcon}
                                        alt=""
                                        aria-hidden
                                        className={GP_STORE_HERO_TRUCK_IMG_CLASS}
                                    />
                                </div>
                            </motion.div>
                            )}
                        </div>
                    </div>

                    <div className={`px-4 pb-4 ${gpDailyHome.blockGap}`}>
                    {/* Pick your Blooms */}
                    <section>
                        <div className="flex flex-col gap-3">
                        <h2 className={gpDailyHome.sectionHeadingWithGap}>Pick your Blooms</h2>
                        {[categories.slice(0, 4), categories.slice(4)].filter((row) => row.length > 0).map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-4 gap-x-2 xs:gap-x-2.5 sm:gap-x-3">
                            {row.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex min-w-0 flex-col items-stretch cursor-pointer"
                                    onClick={() =>
                                        navigate(
                                            `/gp-store/products?category=${category.slug}`,
                                            {
                                                state: {
                                                    categoryName: category.name,
                                                    categorySlug: category.slug,
                                                },
                                            },
                                        )
                                    }
                                >
                                    <div
                                        className="aspect-square w-full rounded-2xl overflow-hidden mb-1.5 shadow-sm flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: category.color_code || '#ffffff' }}
                                    >
                                        {category.icon ? (
                                            <img
                                                src={category.icon}
                                                alt={category.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[0.65rem] xs:text-xs">
                                                {category.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="block w-full min-h-[2.25rem] px-0.5 text-center text-[10px] xs:text-xs text-gray-700 font-medium leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                                        {category.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                        ))}
                        </div>
                    </section>

                    <div className={` mb-8 ${gpDailyHome.blockGap}`}>
                        <OffersBannerCarousel
                            storeId={storeId}
                            placement={BANNER_PLACEMENT_STORE_HOME}
                            compactSpacing
                        />
                    </div>

                    <GpDailyHomeSection
                        title="All Packs"
                        isFirstInGroup
                        headerRight={
                            products.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => navigate("/gp-store/products")}
                                    className={gpDailyHome.exploreMore}
                                >
                                    <span>Explore More {">"}</span>
                                </button>
                            ) : null
                        }
                    >
                        <div className={gpDailyHome.productStrip}>
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="gp-store-card-scroll"
                                        onClick={() => handleProductClick(product)}
                                    >
                                        <div className="aspect-square bg-[#f8f6f1] overflow-hidden">
                                            <img
                                                src={getImageUrl(product.primary_image)}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="gp-store-card-scroll-inner">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                                {formatProductTitleCase(product.name)}
                                            </h3>
                                            <div className="mb-1 min-h-[1.25rem] shrink-0">
                                                {product.short_description ? (
                                                    <p className="truncate text-xs text-gray-500">
                                                        {formatProductTitleCase(product.short_description)}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between gap-2">
                                                <p className="text-gray-900 text-base font-bold">
                                                    <span>₹{getEffectivePrice(product)}</span>
                                                    {showStrikeBaseOnCard(product) && (
                                                        <span className="text-gray-500 font-medium line-through ml-1">₹{getBasePrice(product)}</span>
                                                    )}
                                                </p>
                                                <FaChevronRight className="mr-1.5 text-gray-400 text-sm flex-shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No products available</p>
                            )}
                        </div>
                    </GpDailyHomeSection>

                    <GpDailyHomeSection
                        title="Best Sellers"
                        headerRight={
                            filteredBestSellers.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => navigate("/gp-store/products")}
                                    className={gpDailyHome.exploreMore}
                                >
                                    <span>Explore More {">"}</span>
                                </button>
                            ) : null
                        }
                    >
                        <div className={gpDailyHome.productStrip}>
                            {filteredBestSellers.length > 0 ? (
                                filteredBestSellers.map((bestSeller) => (
                                    <div
                                        key={bestSeller.id}
                                        className="relative gp-store-card-scroll"
                                        onClick={() => handleBestSellerClick(bestSeller)}
                                    >
                                        <div className="relative aspect-square bg-[#f8f6f1] overflow-hidden">
                                            <ProductImageTag labels={bestSeller.labels} />
                                            <img
                                                src={bestSeller.primary_image || "/placeholder.svg"}
                                                alt={bestSeller.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                                                }}
                                            />
                                        </div>
                                        <div className="gp-store-card-scroll-inner">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                                {formatProductTitleCase(bestSeller.name)}
                                            </h3>
                                            <div className="mb-1 min-h-[1.25rem] shrink-0">
                                                {bestSeller.short_description ? (
                                                    <p className="truncate text-xs text-gray-500">
                                                        {formatProductTitleCase(bestSeller.short_description)}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between gap-2">
                                                <p className="text-gray-900 text-base font-bold">
                                                    <span>₹{getEffectivePrice(bestSeller)}</span>
                                                    {showStrikeBaseOnCard(bestSeller) && (
                                                        <span className="text-gray-500 font-medium line-through ml-1">₹{getBasePrice(bestSeller)}</span>
                                                    )}
                                                </p>
                                                <FaChevronRight className="mr-1.5 text-gray-400 text-sm flex-shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    No best sellers available
                                </div>
                            )}
                        </div>
                    </GpDailyHomeSection>

                    <GpDailyHomeSection
                        title="Premium Packs"
                        headerRight={
                            premiumProducts.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => navigate("/gp-store/products")}
                                    className={gpDailyHome.exploreMore}
                                >
                                    <span>Explore More {">"}</span>
                                </button>
                            ) : null
                        }
                    >
                        <div className={gpDailyHome.productStrip}>
                            {premiumProducts.length > 0 ? (
                                premiumProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="gp-store-card-scroll"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="relative aspect-square bg-[#f8f6f1] overflow-hidden">
                                        <ProductImageTag labels={product.labels} />
                                        <img
                                            src={getImageUrl(product.primary_image)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="gp-store-card-scroll-inner">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                            {formatProductTitleCase(product.name)}
                                        </h3>
                                        <div className="mb-1 min-h-[1.25rem] shrink-0">
                                            {product.short_description ? (
                                                <p className="truncate text-xs text-gray-500">
                                                    {formatProductTitleCase(product.short_description)}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="mt-auto flex items-center justify-between gap-2">
                                            <p className="text-gray-900 text-base font-bold">
                                                <span>₹{getEffectivePrice(product)}</span>
                                                {showStrikeBaseOnCard(product) && (
                                                    <span className="text-gray-500 font-medium line-through ml-1">₹{getBasePrice(product)}</span>
                                                )}
                                            </p>
                                            <FaChevronRight className="mr-1.5 text-gray-400 text-sm flex-shrink-0" />
                                        </div>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    No premium products available
                                </div>
                            )}
                        </div>
                    </GpDailyHomeSection>

                    {/* <GpDailyHomeSection title="Quote Of The Day">
                        <img
                            src={bottomBannerSvg}
                            alt=""
                            className="h-auto w-full"
                            aria-hidden
                        />
                    </GpDailyHomeSection> */}
                    </div>
                </div>

            </div>
        </ErrorBoundary>
    );
};

export default GpStore_Homepage;

