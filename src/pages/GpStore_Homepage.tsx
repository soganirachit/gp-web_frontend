import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { motion } from "framer-motion";
import { useFeatureTheme } from "../context/FeatureThemeContext";
import { addressService } from "../services/address.service";
import { storeProductService, Product } from "../services/storeProduct.service";
import { customerService } from "../services/getcustomer.service";
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
import midBannerPng from "../assets/svg/gp_store_svg/mid_banner.png";
import BottomNavigation from "../components/layout/BottomNav";
import namasteSvg from '../assets/svg/namaste.svg';

// Category cards data
const categoryCards = [
    { id: 1, name: "Exotic Flowers & Bouquets", image: "https://via.placeholder.com/160" },
    { id: 2, name: "Pooja Flowers & Leaves", image: "https://via.placeholder.com/160" },
    { id: 3, name: "Festival Season", image: "https://via.placeholder.com/160" },
    { id: 4, name: "Wedding Specials", image: "https://via.placeholder.com/160" },
    { id: 5, name: "Pooja Samagri", image: "https://via.placeholder.com/160" },
    { id: 6, name: "Customized Orders", image: "https://via.placeholder.com/160" },
    { id: 7, name: "Pooja Garlands", image: "https://via.placeholder.com/160" },
    { id: 8, name: "Customized Design", image: "https://via.placeholder.com/160" },
];

const GpStore_Homepage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, feature } = useFeatureTheme();
    const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

    const [deliveryLocation, setDeliveryLocation] = useState<string>("");
    const [isLoadingAddress, setIsLoadingAddress] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [userFirstName, setUserFirstName] = useState<string>("");

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

    const fetchProducts = async () => {
        try {
            setIsLoadingProducts(true);
            const fetchedProducts = await storeProductService.getAllStoreProducts();
            const activeProducts = fetchedProducts.filter((p) => p.isAvailable);
            setProducts(activeProducts);
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    };

    const fetchLatestAddress = useCallback(async () => {
        try {
            setIsLoadingAddress(true);
            const addresses = await addressService.getAllAddresses();
            const latestAddress = addresses
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

            if (latestAddress) {
                const formattedAddress = [
                    latestAddress.houseNo,
                    latestAddress.streetName,
                    latestAddress.area,
                    latestAddress.city,
                    latestAddress.state,
                    latestAddress.pincode
                ].filter(Boolean).join(', ');
                setDeliveryLocation(formattedAddress);
            } else {
                setDeliveryLocation("");
            }
        } catch (error) {
            console.error("Error fetching address:", error);
            setDeliveryLocation(localStorage.getItem("userLocation") || "");
        } finally {
            setIsLoadingAddress(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            fetchCustomerName();
        }
        fetchProducts();
        fetchLatestAddress();
    }, [fetchLatestAddress]);

    const handleLocationClick = () => {
        navigate(`${basePath}/location`, { state: { returnUrl: basePath } });
    };

    const handleProductClick = (product: Product) => {
        navigate(`${basePath}/product/${product.id}`, { state: { product } });
    };

    const getImageUrl = (imagesUrl?: string | string[]): string => {
        if (!imagesUrl) return "https://via.placeholder.com/160";
        if (Array.isArray(imagesUrl)) {
            return imagesUrl[0] || "https://via.placeholder.com/160";
        }
        return imagesUrl;
    };

    const isPageLoading = isLoadingAddress || isLoadingProducts;

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-[#F0F8F0] flex items-center justify-center">
                <Spinner size={400} />
            </div>
        );
    }

    // Get best products (first 3)
    const bestProducts = products.slice(0, 3);
    const premiumProducts = products.slice(3, 6);

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-[#FFFBEB] pb-24">
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
                                            <span className="text-sm sm:text-base font-bold text-gray-800">Home</span>
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
                                <p className="text-gray-600 text-sm sm:text-base">
                                    We are Genda Phool! Your partner<br></br> for everyday floral needs.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Pick your Blooms Section */}
                    <div className="px-4 py-4">
                        <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800 mb-6">Pick your Blooms</h2>
                        <div className="grid grid-cols-4 gap-3">
                            {categoryCards.map((card) => (
                                <div
                                    key={card.id}
                                    className="flex flex-col items-center cursor-pointer"
                                    onClick={() => navigate(`${basePath}/Products`)}
                                >
                                    <div className="w-full aspect-square bg-white rounded-2xl overflow-hidden mb-2 shadow-sm">
                                        <img
                                            src={card.image}
                                            alt={card.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-xs text-center text-gray-700 font-medium leading-tight">
                                        {card.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Promotional Banner */}
                    <div className="px-4 py-4">
                        <div className="relative rounded-2xl overflow-hidden">
                            <img
                                src={midBannerPng}
                                alt="Wedding Bliss, Wrapped in Gifts"
                                className="w-full h-auto"
                            />
                            <button
                                onClick={() => navigate(`${basePath}/Products`)}
                                className="absolute bottom-6 left-6 bg-[#2A6B28] text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-[#1e4d1c] transition-colors shadow-lg"
                            >
                                SHOP NOW
                            </button>
                        </div>
                    </div>

                    {/* Best Section */}
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-ibm-plex-serif text-[22px] font-semibold leading-[28px] tracking-normal text-gray-800">Best Sellers</h2>
                            <button
                                onClick={() => navigate("/gp-store/explore-more?category=Best&section=Best Sellers")}
                                className="flex items-center gap-1 text-gray-500 text-sm font-medium"
                            >
                                <span>Explore More</span>
                                <FaChevronRight className="text-xs" />
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                            {bestProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="aspect-square bg-[#FFFBEB] overflow-hidden">
                                        <img
                                            src={getImageUrl(product.imagesUrl)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                            {product.name}
                                        </h3>
                                        <p className="text-[#2A6B28] text-base font-bold">
                                            ₹{product.sellingPrice}/{product.type === "LEAVES" ? "kg" : "box"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Premium Packs Section */}
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
                            {premiumProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="aspect-square bg-[#FFFBEB] overflow-hidden">
                                        <img
                                            src={getImageUrl(product.imagesUrl)}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                            {product.name}
                                        </h3>
                                        <p className="text-[#2A6B28] text-base font-bold">
                                            ₹{product.sellingPrice}/{product.type === "LEAVES" ? "kg" : "box"}
                                        </p>
                                    </div>
                                </div>
                            ))}
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

                {/* Bottom Navigation */}
                <BottomNavigation />
            </div>
        </ErrorBoundary>
    );
};

export default GpStore_Homepage;

