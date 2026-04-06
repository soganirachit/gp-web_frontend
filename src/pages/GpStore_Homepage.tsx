import React, { useEffect, useState, useCallback, useRef } from "react";
import { SEO } from "../components/SEO";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight, FaSearch } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { motion } from "framer-motion";
import { useFeatureTheme } from "../context/FeatureThemeContext";
import { addressService } from "../services/address.service";
import { customerService } from "../services/getcustomer.service";
import { productService, Category, BestSeller, getEffectivePrice, getBasePrice, showStrikeBaseOnCard } from "../services/product.service";
import { storeService, GUEST_STORE_UPDATED_EVENT } from "../services/store.service";
import { GP_OPEN_GUEST_AREA_MODAL_EVENT } from "../config/guestAreaModalCopy";
import { toast } from "react-hot-toast";
import { StoreHomeSkeleton } from "../components/common/PageSkeletons";
import { SearchBar } from "../components/common/SearchBar";
import ErrorBoundary from "../components/ErrorBoundary";
import SearchIcon from "../assets/icon/Search.png";
import { useAuth } from "../context/AuthContext";
// Note: If truckstore.svg doesn't exist, rename truckhome.svg to truckstore.svg
import truckStoreIcon from "../assets/svg/gp_store_svg/truckhome.svg";
import storeGreenBanner from "../assets/svg/gp_store_svg/greenbanner.svg";
import storeWhiteLogo from "../assets/svg/gp_store_svg/whitelogo.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
// Large banner served from public/ for better caching
const bannerSvg = '/gp_store_banner.svg';
import { formatProductTitleCase } from "../lib/formatProductTitleCase";
import { ProductImageTag } from "../components/common/ProductImageTag";
import namasteSvg from '../assets/svg/namaste.svg';



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
                productService.getProductsByOrdering(undefined, sid, signal),
                productService.getProductsByLabel("premium", sid, signal, "-order_count"),
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
                "-order_count"
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
                // Logged out: never show a previously-saved address in the header.
                setDeliveryLocation("");
                setAddressType("Home");
                return;
            }
            const addresses = await addressService.getAllAddresses();
            // Get default address first, otherwise get the latest address
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
                    setDeliveryLocation("");
                    setAddressType("Home");
                    setIsLoadingAddress(false);
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

    const handleLocationClick = () => {
        if (!isLoggedIn) {
            window.dispatchEvent(
                new CustomEvent(GP_OPEN_GUEST_AREA_MODAL_EVENT, {
                    detail: { dismissible: true, variant: "need_location" },
                }),
            );
            return;
        }
        navigate(`${basePath}/addresses`);
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
                    <div className="relative px-4 pt-0 pb-8" style={{
                        background: 'linear-gradient(to bottom, #DAFFD9, #D8F0D7)',
                        minHeight: 'clamp(220px, 42vw, 280px)'
                    }}>
                        {/* Content Overlay */}
                        <div className="relative z-10 pt-0">
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
                                                {isLoadingAddress
                                                  ? 'Loading...'
                                                  : isLoggedIn
                                                  ? (deliveryLocation || 'Tap to set address')
                                                  : 'Tap to set address'}
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
                                        className="absolute inset-0 w-12 h-12 object-contain cursor-pointer self-center justify-self-center"
                                        onClick={() => navigate(`${basePath}/account`)}
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
                                    storeId={storeId}
                                    productBasePath="/gp-store"
                                    searchPagePath="/search"
                                />
                            </div>

                            {/* Delivery Banner - Inside the green header */}
                            <div className="mt-4 sm:mt-5">
                                <div className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
                                    <div className="flex-1 min-w-0 pr-0 xs:pr-3">
                                        <p className="text-gray-800 text-sm xs:text-base md:text-lg lg:text-xl font-medium leading-snug [overflow-wrap:anywhere]">
                                            Order in <span className="font-bold">2hrs</span> and get it by tomorrow <span className="font-bold">12PM!</span>
                                        </p>
                                    </div>
                                    <img
                                        src={truckStoreIcon}
                                        alt="Delivery Truck"
                                        className="w-36 h-20 xs:w-40 xs:h-24 md:w-48 md:h-28 object-contain flex-shrink-0 self-center xs:self-auto"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Welcome Section */}
                    <div className="px-4 pb-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="pt-6 sm:pt-8 pb-3 sm:pb-4"
                        >
                            <div className="text-left">
                                <img
                                    src={namasteSvg}
                                    alt="Namaste"
                                    className="h-8 sm:h-14 w-auto mb-2 sm:mb-3"
                                />
                                <p className="text-gray-600 text-sm sm:text-base leading-snug [overflow-wrap:anywhere]">
                                    We are Genda Phool! Your partner for everyday floral needs.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Pick your Blooms — 4 columns; square tiles = same aspect ratio at every phone width (360–420px+) */}
                    <div className="px-4 py-4">
                        <h2 className="font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-gray-800 mb-4">Pick your Blooms</h2>
                        <div className="grid grid-cols-4 gap-x-2 gap-y-5 xs:gap-x-2.5 sm:gap-x-3">
                            {categories.map((category) => (
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
                                    <span className="block w-full min-h-[2.75rem] px-0.5 text-center text-[10px] xs:text-xs text-gray-700 font-medium leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                                        {category.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="px-4 py-3 xs:py-4">
                        {/* Single mint panel: copy left, art merged on right — no empty white strip */}
                        <div className="relative isolate min-h-[9.5rem] overflow-hidden rounded-2xl bg-[#F2FEF4] sm:min-h-[11rem] lg:min-h-[12.5rem]">
                            <img
                                src={bannerSvg}
                                alt="Wedding Bliss"
                                className="pointer-events-none absolute -right-4 bottom-0 top-0 z-0 h-full w-[min(58%,200px)] object-cover object-right sm:-right-2 sm:w-[min(52%,240px)] md:w-[min(48%,280px)] lg:right-0 lg:w-[42%] lg:max-w-[320px]"
                            />
                            <div className="relative z-10 flex min-h-[9.5rem] max-w-[min(100%,20rem)] flex-col justify-center px-4 py-4 pr-[min(42%,9rem)] xs:min-h-[10rem] xs:max-w-[22rem] xs:pr-[min(40%,10rem)] sm:min-h-[11rem] sm:px-6 sm:py-5 sm:pr-[38%] lg:max-w-[55%] lg:px-10 lg:py-8 lg:pr-6">
                                <h2 className="font-ibm-plex-serif text-[1.4rem] font-medium leading-tight text-[#1A1A1A] xs:text-[1.55rem] sm:text-xl md:text-2xl">
                                    Wedding Bliss, Wrapped in Gifts
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => navigate("/gp-store/products")}
                                    className="gp-cta-pill-dark relative z-20 mt-3 w-fit"
                                >
                                    SHOP NOW
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* all Packs Section */}
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-gray-800 min-w-0 pr-2">All Packs</h2>
                            {products.length > 0 && (
                            <button
                                type="button"
                                onClick={() => navigate("/gp-store/products")}
                                className="gp-link-row shrink-0"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                            )}
                        </div>
                        <div className="gp-h-scroll-track">
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
                                                <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">No products available</p>
                            )}
                        </div>
                    </div>

                    {/* Best Section */}
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-gray-800 min-w-0 pr-2">Best Sellers</h2>
                            {filteredBestSellers.length > 0 && (
                            <button
                                type="button"
                                onClick={() => navigate("/gp-store/products")}
                                className="gp-link-row shrink-0"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                            )}
                        </div>
                        <div className="gp-h-scroll-track">
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
                                                <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
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
                    </div>

                    {/* Premium Packs Section */}
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-gp-section font-semibold tracking-normal text-gray-800 min-w-0 pr-2">Premium Packs</h2>
                            {premiumProducts.length > 0 && (
                            <button
                                type="button"
                                onClick={() => navigate("/gp-store/products")}
                                className="gp-link-row shrink-0"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                            )}
                        </div>
                        <div className="gp-h-scroll-track">
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
                                            <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
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
        </ErrorBoundary>
    );
};

export default GpStore_Homepage;

