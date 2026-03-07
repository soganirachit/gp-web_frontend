import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight, FaSearch } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { motion } from "framer-motion";
import { useFeatureTheme } from "../context/FeatureThemeContext";
import { addressService } from "../services/address.service";
import { customerService } from "../services/getcustomer.service";
import { productService, Category, BestSeller, getEffectivePrice, getBasePrice, showStrikeBase } from "../services/product.service";
import { storeService } from "../services/store.service";
import { toast } from "react-hot-toast";
import Spinner from "../components/common/Spinner";
import ErrorBoundary from "../components/ErrorBoundary";
import SearchIcon from "../assets/icon/Search.png";
// Note: If truckstore.svg doesn't exist, rename truckhome.svg to truckstore.svg
import truckStoreIcon from "../assets/svg/gp_store_svg/truckhome.svg";
import storeGreenBanner from "../assets/svg/gp_store_svg/greenbanner.svg";
import storeWhiteLogo from "../assets/svg/gp_store_svg/whitelogo.svg";
import locationhomeIcon from "../assets/svg/gp_daily svg/locationhome.svg";
import profilehomeIcon from "../assets/svg/gp_daily svg/profilehome.svg";
import profilelogoIcon from "../assets/svg/gp_daily svg/profilelogo.svg";
import bottomBannerSvg from "../assets/svg/gp_daily svg/bottom_banner.svg";
import bannerSvg from "../assets/svg/gp_store_svg/banner.svg";
import BottomNavigation from "../components/layout/BottomNav";
import namasteSvg from '../assets/svg/namaste.svg';



const GpStore_Homepage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, feature } = useFeatureTheme();
    const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

    const [deliveryLocation, setDeliveryLocation] = useState<string>("");
    const [addressType, setAddressType] = useState<string>("Home");
    const [isLoadingAddress, setIsLoadingAddress] = useState(true);
    const [products, setProducts] = useState<BestSeller[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [userFirstName, setUserFirstName] = useState<string>("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
    const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [submittedSearchQuery, setSubmittedSearchQuery] = useState(''); // only set on Enter or search icon click
    const [allProductsForSearch, setAllProductsForSearch] = useState<BestSeller[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchResultsRef = useRef<HTMLDivElement>(null);

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
            // Use productService instead of storeProductService
            // Get best sellers or all products based on store ID
            const storeId = storeService.getStoreIdForProducts();
            
            // Ensure store ID is available before fetching (especially for non-logged-in users)
            if (!storeId) {
                console.warn("Store ID not available, products may not load correctly");
            }
            
            const fetchedProducts = await productService.getBestSellers(storeId || undefined, signal);
            // Best sellers are already filtered, but ensure we have products
            setProducts(fetchedProducts || []);
        } catch (error: any) {
            // Don't log error if request was aborted (component unmounted)
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('Products request was canceled');
                return;
            }
            console.error("Error fetching products:", error);
            // If 401 error, user might not be authenticated - this is OK for non-logged-in users
            // Products should still be accessible without auth if store_id is provided
            if (error?.response?.status === 401) {
                console.warn("Products endpoint returned 401 - store_id might be required");
            }
            setProducts([]);
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

    const fetchBestSellers = async (signal?: AbortSignal) => {
        try {
            setIsLoadingBestSellers(true);
            const storeId = storeService.getStoreIdForProducts();
            
            // Ensure store ID is available before fetching
            if (!storeId) {
                console.warn("Store ID not available, best sellers may not load correctly");
            }
            
            const fetchedBestSellers = await productService.getBestSellers(storeId || undefined, signal);
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
            setDeliveryLocation(localStorage.getItem("userLocation") || "");
            setAddressType("Home");
        } finally {
            setIsLoadingAddress(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();
        
        const initializeStore = async () => {
            const token = localStorage.getItem("token");
            
            if (token) {
                // User is logged in
                if (isMounted) {
                    fetchCustomerName();
                    fetchLatestAddress();
                }
            } else {
                // User is not logged in - set address loading to false immediately
                if (isMounted) {
                    setIsLoadingAddress(false);
                }
                
                // Get temporary store ID from location FIRST before fetching products
                const existingTempStoreId = storeService.getTemporaryStoreId();
                if (!existingTempStoreId) {
                    try {
                        await storeService.getStoreFromLocation();
                        // Wait a bit to ensure store ID is set
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error: any) {
                        console.error("Error getting store from location:", error);
                        // Continue without store ID - products might still load
                    }
                }
            }
            
            // Only fetch if component is still mounted
            if (isMounted) {
                // Fetch data after store ID is available (especially important for non-logged-in users)
                // Small delay to ensure store ID is set in localStorage
                setTimeout(() => {
                    if (isMounted) {
                        fetchProducts(abortController.signal);
                        fetchCategories(abortController.signal);
                        fetchBestSellers(abortController.signal);
                        
                        // Fetch all products for search
                        const fetchAllProductsForSearch = async () => {
                            try {
                                const storeId = storeService.getStoreIdForProducts();
                                const allProducts = await productService.getProductsByOrdering(undefined, storeId || undefined, abortController.signal);
                                if (isMounted) {
                                    setAllProductsForSearch(allProducts || []);
                                }
                            } catch (error: any) {
                                if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED' && isMounted) {
                                    console.error("Error fetching all products for search:", error);
                                }
                            }
                        };
                        fetchAllProductsForSearch();
                    }
                }, token ? 0 : 200); // Small delay for non-logged-in users to ensure store ID is set
            }
        };

        initializeStore();
        
        // Cleanup function to cancel requests and prevent state updates if component unmounts
        return () => {
            isMounted = false;
            abortController.abort();
        };
        // Only run once on mount, fetchLatestAddress is stable due to useCallback
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLocationClick = () => {
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
        if (!image) return "https://via.placeholder.com/160";
        if (Array.isArray(image)) {
            return image[0] || "https://via.placeholder.com/160";
        }
        return image;
    };

    // Scroll search results into view only after user has submitted search (Enter or icon)
    useEffect(() => {
        if (submittedSearchQuery && !isSearching && searchResultsRef.current) {
            searchResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [submittedSearchQuery, isSearching]);

    // Run search via API only (called on Enter or search icon click)
    const runSearch = useCallback(async () => {
        const query = searchQuery.trim();
        if (!query) return;

        setSubmittedSearchQuery(query);
        try {
            setIsSearching(true);
            const storeId = storeService.getStoreIdForProducts();
            const results = await productService.searchProducts(query, storeId || undefined);
            setAllProductsForSearch(results || []);
        } catch (error) {
            console.error("Error searching products:", error);
            toast.error("Failed to search products. Please try again.");
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') runSearch();
    };

    const isPageLoading = isLoadingAddress || isLoadingProducts || isLoadingCategories || isLoadingBestSellers;

    if (isPageLoading) {
        return (
            <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
                <Spinner size={400} />
            </div>
        );
    }

    // Get premium products (fallback to products if best sellers not available)
    const premiumProducts = products.slice(3, 6);

    // Search results only after user has submitted (Enter or search icon)
    const filteredAllProducts = submittedSearchQuery ? allProductsForSearch : [];

    const filteredBestSellers = bestSellers;
    const filteredPremiumProducts = premiumProducts;

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-[#f8f6f1] ">
                <div className="max-w-[800px] mx-auto">
                    {/* Top Header with Green Background */}
                    <div className="relative px-3 sm:px-4 pt-0 pb-8 sm:pb-12" style={{
                        background: 'linear-gradient(to bottom, #DAFFD9, #D8F0D7)',
                        minHeight: '280px'
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

                            {/* Search Bar - search only on Enter or search icon click */}
                            <div className="mt-4 sm:mt-5">
                                <div className="bg-white rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-sm border-none">
                                    <input
                                        type="text"
                                        placeholder="Search anything...."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (e.target.value.trim() === '') setSubmittedSearchQuery('');
                                        }}
                                        onKeyDown={handleSearchKeyDown}
                                        className="flex-1 bg-transparent text-gray-900 text-sm sm:text-base font-medium focus:outline-none placeholder:text-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={runSearch}
                                        className="p-1 -mr-1 rounded-md hover:bg-gray-100 transition-colors"
                                        aria-label="Search"
                                    >
                                        <FaSearch className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    </button>
                                </div>
                            </div>

                            {/* Delivery Banner - Inside the green header */}
                            <div className="mt-4 sm:mt-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <p className="text-gray-800 text-lg md:text-xl lg:text-2xl font-medium">
                                            Order in <span className="font-bold">2hrs</span> and get it by tomorrow <span className="font-bold">12PM!</span>
                                        </p>
                                    </div>
                                    <img
                                        src={truckStoreIcon}
                                        alt="Delivery Truck"
                                        className="w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32 object-contain flex-shrink-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Results Section - only after Enter or search icon */}
                    {submittedSearchQuery && (
                        <div ref={searchResultsRef} className="px-4 py-4 bg-[#f8f6f1]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800">
                                    Search Results
                                </h2>
                                <span className="text-sm text-gray-500">
                                    {isSearching
                                        ? 'Searching...'
                                        : `${filteredAllProducts.length} ${filteredAllProducts.length === 1 ? 'result' : 'results'}`}
                                </span>
                            </div>
                            {isSearching ? (
                                <div className="min-h-[120px] flex items-center justify-center">
                                    <Spinner size={80} />
                                </div>
                            ) : filteredAllProducts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {filteredAllProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => handleProductClick(product)}
                                        >
                                            <div className="aspect-square bg-[#f8f6f1] overflow-hidden relative">
                                                {product.labels && product.labels.length > 0 && (
                                                    <div className="absolute top-2 left-0 z-10">
                                                        <span
                                                            className="inline-block text-white text-[10px] font-semibold px-2 py-1 rounded-r bg-[#19411F]"
                                                        >
                                                            {product.labels[0].name.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <img
                                                    src={getImageUrl(product.primary_image)}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/160";
                                                    }}
                                                />
                                            </div>
                                            <div className="p-3">
                                                <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                                    {product.name}
                                                </h3>
                                                {product.short_description && (
                                                    <p className="text-xs text-gray-500 mb-1 truncate">
                                                        {product.short_description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between gap-2 mt-2">
                                                    <p className="text-gray-900 text-base font-bold">
                                                        {showStrikeBase(product) && (
                                                            <span className="text-gray-500 font-medium line-through mr-1">₹{getBasePrice(product)}</span>
                                                        )}
                                                        ₹{getEffectivePrice(product)}
                                                    </p>
                                                    <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 sm:py-12">
                                    <p className="text-gray-500 text-sm sm:text-base md:text-lg">No products found matching &quot;{submittedSearchQuery}&quot;</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSubmittedSearchQuery(''); }}
                                        className="mt-3 sm:mt-4 text-[#19411F] text-xs sm:text-sm font-medium hover:underline touch-target"
                                    >
                                        Clear search
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Welcome Section - hide when showing search results */}
                    {!submittedSearchQuery && (
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
                                <p className="text-gray-600 text-sm sm:text-base">
                                    We are Genda Phool! Your partner<br></br> for everyday floral needs.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                    )}

                    {/* Pick your Blooms Section - hide when showing search results */}
                    {!submittedSearchQuery && (
                    <div className="px-4 py-4">
                        <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800 mb-6">Pick your Blooms</h2>
                        <div className="grid grid-cols-4 gap-3">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex flex-col items-center cursor-pointer"
                                    onClick={() => navigate(`${basePath}/products?category=${category.slug}`, { state: { categoryName: category.name, categorySlug: category.slug } })}
                                >
                                    <div 
                                        className="w-full aspect-square bg-white rounded-2xl overflow-hidden mb-2 shadow-sm flex items-center justify-center"
                                        style={{ backgroundColor: category.color_code || '#ffffff' }}
                                    >
                                        {category.icon ? (
                                            <img
                                                src={category.icon}
                                                alt={category.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Fallback to placeholder if image fails to load
                                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/160";
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                {category.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight">
                                        {category.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {!submittedSearchQuery && (
                    <div className="px-4 py-4">
                        <div className="relative w-full rounded-2xl overflow-hidden bg-[#F1FCF0]">
                            <div className="absolute inset-0 flex flex-col justify-center pl-6 sm:pl-10 z-10 w-3/4 sm:w-2/3">
                                <h2 className="font-ibm-plex-serif text-xl sm:text-3xl font-semibold text-[#1A1A1A] leading-tight mb-4 sm:mb-6">
                                    Wedding Bliss,
                                    <br />
                                    Wrapped in Gifts
                                </h2>
                                <button
                                    onClick={() => navigate(`${basePath}/Products`)}
                                    className="w-fit bg-[#19411F] text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-medium text-sm sm:text-base tracking-wide hover:bg-[#1e4d1c] transition-colors shadow-sm flex items-center justify-center"
                                >
                                    SHOP NOW
                                </button>
                            </div>
                            <img
                                src={bannerSvg}
                                alt="Wedding Bliss"
                                className="w-full h-auto object-cover ml-auto"
                            />
                        </div>
                    </div>
                    )}

                    {/* all Packs Section - Hide when showing search results */}
                      {!submittedSearchQuery && (
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800">All Packs</h2>
                            <button
                                onClick={() => navigate(`${basePath}/explore-more?category=All&section=All Packs`)}
                                className="flex items-center gap-1 text-gray-500 text-sm font-medium"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="aspect-square bg-[#f8f6f1] overflow-hidden">
                                        <img
                                            src={getImageUrl(product.primary_image)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                            {product.name}
                                        </h3>
                                        {product.short_description && (
                                            <p className="text-xs text-gray-500 mb-1 truncate">
                                                {product.short_description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-gray-900 text-base font-bold">
                                                {showStrikeBase(product) && (
                                                    <span className="text-gray-500 font-medium line-through mr-1">₹{getBasePrice(product)}</span>
                                                )}
                                                ₹{getEffectivePrice(product)}/{product.unit || "box"}
                                            </p>
                                            <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                    {/* Best Section - Hide when showing search results */}
                    {!submittedSearchQuery && (
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800">Best Sellers</h2>
                            <button
                               onClick={() => navigate(`${basePath}/explore-more?category=Best&section=Best Sellers`)}
                                className="flex items-center gap-1 text-gray-500 text-sm font-medium"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                            {filteredBestSellers.length > 0 ? (
                                filteredBestSellers.map((bestSeller) => (
                                    <div
                                        key={bestSeller.id}
                                        className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer relative"
                                        onClick={() => handleBestSellerClick(bestSeller)}
                                    >
                                        <div className="aspect-square bg-[#f8f6f1] overflow-hidden relative">
                                            {/* Label Badge - positioned over image */}
                                            {bestSeller.labels && bestSeller.labels.length > 0 && (
                                                <div className="absolute top-2 left-2 z-10">
                                                    <span
                                                        className="inline-block text-white text-[10px] font-semibold px-2 py-1 rounded bg-[#19411F]"
                                                    >
                                                        {bestSeller.labels[0].name.toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <img
                                                src={bestSeller.primary_image || "https://via.placeholder.com/160"}
                                                alt={bestSeller.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/160";
                                                }}
                                            />
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                                {bestSeller.name}
                                            </h3>
                                            {bestSeller.short_description && (
                                                <p className="text-xs text-gray-500 mb-1 truncate">
                                                    {bestSeller.short_description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-gray-900 text-base font-bold">
                                                    {showStrikeBase(bestSeller) && (
                                                        <span className="text-gray-500 font-medium line-through mr-1">₹{getBasePrice(bestSeller)}</span>
                                                    )}
                                                    ₹{getEffectivePrice(bestSeller)}
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
                    )}

                    {/* Premium Packs Section - Hide when showing search results */}
                    {!submittedSearchQuery && (
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800">Premium Packs</h2>
                            <button
                                onClick={() => navigate("/gp-store/explore-more?category=Premium&section=Premium Packs")}
                                className="flex items-center gap-1 text-gray-500 text-sm font-medium"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                            {filteredPremiumProducts.length > 0 ? (
                                filteredPremiumProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="aspect-square bg-[#f8f6f1] overflow-hidden">
                                        <img
                                            src={getImageUrl(product.primary_image)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                            {product.name}
                                        </h3>
                                        {product.short_description && (
                                            <p className="text-xs text-gray-500 mb-1 truncate">
                                                {product.short_description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-gray-900 text-base font-bold">
                                                {showStrikeBase(product) && (
                                                    <span className="text-gray-500 font-medium line-through mr-1">₹{getBasePrice(product)}</span>
                                                )}
                                                ₹{getEffectivePrice(product)}/{product.unit || "box"}
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
                    )}

                    {/* Quote of the Day Section - hide when showing search results */}
                    {!submittedSearchQuery && (
                    <div>
                        <img
                            src={bottomBannerSvg}
                            alt="Quote of the Day"
                            className="w-full h-auto"
                        />
                    </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                <BottomNavigation />
            </div>
        </ErrorBoundary>
    );
};

export default GpStore_Homepage;

