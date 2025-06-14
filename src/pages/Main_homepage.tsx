import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPause, FaCalendarPlus } from "react-icons/fa"; // cart icon FaShoppingCart,

import { MdLocationOn } from "react-icons/md";
import { motion } from "framer-motion";
import logo from "../assets/All/logo.png";
import { walletService } from "../services/wallet.service";
import { basePackService, BasePack } from "../services/basepack.service";
import {
  subscriptionService,
  Subscription,
} from "../services/subscription.service";
import ErrorBoundary from "../components/ErrorBoundary";
import useGoogleMaps from "../hooks/useGoogleMaps";
import { productService } from "../services/product.service";
import type { Product as ProductType } from "../services/product.service";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";

// Import flower images
// import flower1 from '../assets/A1/A2.jpeg';
// import flower2 from '../assets/A1/A3.jpeg';
// import flower3 from '../assets/A1/A4.jpeg';
// import flower4 from '../assets/A1/A5.jpeg';
// import flower5 from '../assets/A1/A6.jpeg';
// import flower6 from '../assets/A1/A7.jpeg';
// import flower7 from '../assets/A1/A8.jpeg';
// import lowBalanceImg from '../assets/Low_balance.png';
import lowBalance from "../assets/icon/LowBalance.png";
import WalletIcon from "../assets/icon/Wallet.png";
import searchImage from "../assets/icon/Search.png";
import ProfileIcon from "../assets/icon/Profile.png";
import BottomNavigation from "./../components/layout/BottomNav";
import Spinner from "../components/common/Spinner";

interface DayInfo {
  date: string;
  day: string;
  status: "past" | "active" | "future";
  deliveryStatus?: "pending" | "delivered" | "next";
}

// interface CartItem {
//   id: string;
//   name: string;
//   price: number;
//   image: string;
//   quantity: number;
// }

// // Extended interface for flower items
// interface FlowerItem extends BasePack {
//   category: string;
//   description: string;
//   contents: { id: string; name: string; quantity: number; }[];
// }

// interface Product {
//   id: string;
//   name: string;
//   description: string;
//   imageUrl?: string;
//   sellingPrice: number;
//   type: string;
//   allowedSubscriptionType: string;
//   tags: string[];
//   weight?: number;
//   isAvailable: boolean;
// }

// const BannerSection: React.FC<{ walletBalance: number }> = ({ walletBalance }) => {
//   const bannerImages1 = [flower1, flower2, flower3, flower4];
//   const bannerImages2 = [flower5, flower6, flower7, flower1];
//   const lowBalanceImages = [lowBalanceImg, flower2, flower3]; // Add variety to low balance rotation

//   const [index1, setIndex1] = useState(0);
//   const [index2, setIndex2] = useState(0);
//   const [lowBalanceIndex, setLowBalanceIndex] = useState(0);

//   useEffect(() => {
//     // Continue rotating images even when showing low balance
//     const interval1 = setInterval(() => {
//       setIndex1((prev) => (prev + 1) % bannerImages1.length);
//     }, 3000);

//     const interval2 = setInterval(() => {
//       setIndex2((prev) => (prev + 1) % bannerImages2.length);
//     }, 3000);

//     const intervalLowBalance = setInterval(() => {
//       setLowBalanceIndex((prev) => (prev + 1) % lowBalanceImages.length);
//     }, 3000);

//     return () => {
//       clearInterval(interval1);
//       clearInterval(interval2);
//       clearInterval(intervalLowBalance);
//     };
//   }, []);

//   return (
//     <div className="max-w-[800px] mx-auto px-4 py-4 grid grid-cols-1 gap-4">
//       {/* Banner 1 - Conditional Low Balance or Seasonal Collection */}
//       <div className="relative overflow-hidden rounded-lg shadow-lg w-full h-[200px] md:h-[250px]">
//         {walletBalance < 100 ? (
//           // Low Balance Banner with Animation
//           <motion.div className="relative h-full">
//             <motion.img
//               key={`low-balance-${lowBalanceIndex}`}
//               src={lowBalanceImages[lowBalanceIndex]}
//               alt="Low Balance Warning"
//               className="w-full h-full object-cover rounded-lg"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 1 }}
//             />
//             <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
//               <div className="px-6 py-4 text-white">
//                 <h2 className="text-xl sm:text-2xl font-bold mb-2">Low Balance Alert!</h2>
//                 <p className="text-sm sm:text-base mb-3">Add money to your wallet for seamless shopping</p>
//                 <div className="flex items-center space-x-2 mb-4">
//                   <span className="text-xs bg-red-500 px-2 py-1 rounded">Current Balance: ₹{walletBalance}</span>
//                   <span className="text-xs bg-white/20 px-2 py-1 rounded">Min. Required: ₹100</span>
//                 </div>
//                 <motion.button
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={() => window.location.href = '/wallet'}
//                   className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
//                 >
//                   Add Money
//                 </motion.button>
//               </div>
//             </div>
//           </motion.div>
//         ) : (
//           // Regular Seasonal Collection Banner
//           <motion.div className="relative h-full">
//             <motion.img
//               key={`seasonal-${index1}`}
//               src={bannerImages1[index1]}
//               alt="Seasonal Collection"
//               className="w-full h-full object-cover rounded-lg"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 1 }}
//             />
//             <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center">
//               <div className="px-6 py-4 text-white">
//                 <h2 className="text-xl sm:text-2xl font-bold mb-2">Seasonal Collection</h2>
//                 <p className="text-sm sm:text-base mb-4">Limited Edition Bouquets Available</p>
//                 <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
//                   Explore Now
//                 </button>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </div>

//       {/* Banner 2 - Wedding Collection */}
//       <div className="relative overflow-hidden rounded-lg shadow-lg w-full h-[200px] md:h-[250px]">
//         <motion.div className="relative h-full">
//           <motion.img
//             key={`wedding-${index2}`}
//             src={bannerImages2[index2]}
//             alt="Wedding Collection"
//             className="w-full h-full object-cover rounded-lg"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 1 }}
//           />
//           <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center">
//             <div className="px-6 py-4 text-white">
//               <h2 className="text-xl sm:text-2xl font-bold mb-2">Wedding Collection</h2>
//               <p className="text-sm sm:text-base mb-4">Exclusive Floral Arrangements for Your Special Day</p>
//               <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
//                 View Collection
//               </button>
//             </div>
//           </div>
//         </motion.div>
//       </div>
//     </div>
//   );
// };

const Home2: React.FC = () => {
  const navigate = useNavigate();
  const [, setDays] = useState<DayInfo[]>([]);
  const [deliveryLocation] = useState<string>(
    () => localStorage.getItem("userLocation") || ""
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [, setIsLoadingBalance] = useState(true);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [, setCartItems] = useState<CartItem[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    Subscription[]
  >([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const userName = localStorage.getItem("userName") || "User";
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  useGoogleMaps();

  const fetchWalletBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const balance = await walletService.getWalletBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setIsLoadingSubscriptions(true);
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        // Find active subscription
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

      // If there are active subscriptions, set the first one as selected
      if (active.length > 0) {
        setSelectedSubscription(active[0]);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setActiveSubscriptions([]);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const fetchBasePacks = async () => {
    try {
      setIsLoadingPacks(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { returnUrl: location.pathname } });
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
        navigate("/login", { state: { returnUrl: location.pathname } });
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

      // Normalize product types to uppercase for consistent comparison
      const normalizedProducts = fetchedProducts.map((product) => ({
        ...product,
        type: product.type.toUpperCase(),
      }));

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchNextDelivery = async () => {
    // Fetch next delivery details from the backend
    // This is a placeholder function, replace with actual API call
    return {
      date: "Tuesday, 28 May",
      packs: ["Brahma Pack", "Rudra Pack"],
    };
  };

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
    }

    fetchBasePacks();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (deliveryLocation) {
      localStorage.setItem("userLocation", deliveryLocation);
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

      // Determine delivery status based on active subscription
      let deliveryStatus: "pending" | "delivered" | "next" | undefined =
        undefined;

      if (selectedSubscription) {
        const subscriptionStartDate = new Date(selectedSubscription.startDate);
        const currentDate = new Date(date);

        // Reset time part for accurate date comparison
        currentDate.setHours(0, 0, 0, 0);
        subscriptionStartDate.setHours(0, 0, 0, 0);

        if (currentDate < subscriptionStartDate) {
          // Before subscription start date
          deliveryStatus = undefined;
        } else if (currentDate.getTime() === subscriptionStartDate.getTime()) {
          // On subscription start date
          deliveryStatus = "next";
        } else if (currentDate < new Date()) {
          // Past dates
          deliveryStatus = "delivered";
        } else {
          // Future dates
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

  useEffect(() => {
    fetchNextDelivery().then((delivery) => {
      // Update state with fetched delivery details
      // This is a placeholder, replace with actual state update
      console.log(delivery);
    });
  }, []);

  const handleProductClick = (product: ProductType) => {
    navigate(`/product/${product.id}`);
  };

  // const removeFromCart = (itemId: string) => {
  //   setCartItems(prev => {
  //     const newCart = prev.filter(item => item.id !== itemId);
  //     localStorage.setItem('cartItems', JSON.stringify(newCart));
  //     return newCart;
  //   });
  // };

  // const updateQuantity = (productId: string, newQuantity: number) => {
  //   if (newQuantity < 1) {
  //     setCartItems(prev => prev.filter(item => item.id !== productId));
  //     return;
  //   }
  //   setCartItems(prev =>
  //     prev.map(item =>
  //       item.id === productId ? { ...item, quantity: newQuantity } : item
  //     )
  //   );
  // };

  const handlePause = async () => {
    if (!selectedSubscription || !customStartDate) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const resumeDate = new Date(customStartDate);
      resumeDate.setHours(0, 0, 0, 0);

      const diffTime = resumeDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) {
        toast.error("Resume date must be at least 1 day from today");
        return;
      }

      const response = await subscriptionService.pauseSubscription(
        selectedSubscription.id,
        diffDays
      );

      if (response.success) {
        setShowPauseModal(false);
        fetchActiveSubscriptions();
        toast.success("Subscription paused successfully");
      }
    } catch (error) {
      console.error("Error pausing subscription:", error);
      toast.error("Failed to pause subscription");
    }
  };

  const handleAddToNextDelivery = () => {
    navigate("/products?category=basepacks");
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFFBEB] pb-20 lg:pb-0">
        <div className="max-w-[800px] mx-auto">
          {/* Header */}
          <header className="p-4 md:p-6 bg-[#FFFBEB] z-50">
            <div className="flex items-center justify-between max-w-[800px] mx-auto">
              <div className="flex-1">
                {/* Location section */}
                <motion.div
                  className="flex items-center space-x-2 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate("/location")}
                >
                  <MdLocationOn className="text-[#015D3A] text-xl mt-4" />
                  <span className="text-[#64748B] text-lg mt-4">
                    Delivering to Home
                  </span>
                </motion.div>
                <div className="text-[#64748B] text-base ml-5">
                  {deliveryLocation
                    ? `${deliveryLocation.substring(0, 25)}${
                        deliveryLocation.length > 25 ? "" : ""
                      }`
                    : "B-149, Shilp Residency, Tarsali"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={searchImage}
                  alt="search"
                  className="w-6 h-6 md:w-6 md:h-6"
                  onClick={() => navigate("/search")}
                />
                <button
                  onClick={() => navigate("/wallet")}
                  className="flex items-center"
                >
                  <img src={WalletIcon} alt="Wallet" className="w-12 h-12" />
                  <span className="text-[#015D3A] text-xl">
                    ₹{walletBalance}
                  </span>
                </button>

                <button
                  onClick={() => navigate("/account")}
                  className="flex items-center justify-center"
                >
                  <img src={ProfileIcon} alt="Profile" className="w-10 h-10" />
                </button>
              </div>
            </div>
          </header>

          {/* Greeting Section */}
          <div className="px-4 md:px-6 py-6">
            <h1 className="text-2xl md:text-3xl ml-4 font-bold text-gray-800">
              Namaste, {userName} 🌸
            </h1>
            <p className="text-sm md:text-base ml-4 text-gray-600">
              May your day be blessed!
            </p>
          </div>

          {/* Alert and Promo Banner Container */}
          <div className="grid grid-cols-1 gap-4 px-4 md:px-6 mb-6">
            {/* Low Balance Alert */}
            {walletBalance < 100 && (
              <div className="bg-orange-100 rounded-xl p-7 mb-7 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="rounded-full w-8 h-8">
                      <img src={lowBalance} alt="" className="w-full h-full" />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-orange-800 font-semibold">
                      Low Balance Alert
                    </h3>
                    <p className="text-orange-600 text-sm">
                      Your wallet balance is running low
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-2xl text-sm"
                    onClick={() => navigate("/wallet")}
                  >
                    Recharge Now
                  </motion.button>
                </div>
              </div>
            )}

            {/* Promo Banner Card */}
            <div className="bg-white rounded-xl p-7  shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Promo Banner
                  </h3>
                  <p className="text-gray-600">Premium Lotus & Rose Combo</p>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-gray-800">
                      ₹399
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="bg-orange-500 text-white px-3 py-1 rounded-full">
                    Icon
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery and Wisdom Container */}
          <div className="grid grid-cols-1 gap-4 px-4 md:px-6 mb-6">
            {/* Next Delivery Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-500">
                  YOUR NEXT DELIVERY
                </h3>
                <button
                  className="text-[#006D3B] text-sm font-medium"
                  onClick={() => navigate("/manage-my-subscription")}
                >
                  Manage
                </button>
              </div>

              {isLoadingSubscriptions ? (
                <div className="flex justify-center items-center h-32">
                  <Spinner size={40} />
                </div>
              ) : activeSubscriptions.length > 0 ? (
                <>
                  <p className="text-lg font-bold text-gray-800 mb-3">
                    Tomorrow,{" "}
                    {new Date().toLocaleString("default", { month: "short" })}{" "}
                    {new Date().getDate() + 1}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeSubscriptions.map((subscription) => (
                      <span
                        key={subscription.id}
                        className="bg-[#DCFCE7] text-[#166534] text-xs px-3 py-1 rounded-full"
                      >
                        {subscription.basePackDetails?.name ||
                          "Subscription Pack"}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedSubscription(activeSubscriptions[0]);
                        setShowPauseModal(true);
                      }}
                      className="text-[#FF5722] text-sm font-medium flex items-center border border-[#FF5722] rounded-full px-4 py-2"
                    >
                      <FaPause className="mr-2" /> Pause
                    </button>
                    <button
                      onClick={handleAddToNextDelivery}
                      className="text-[#006D3B] text-sm font-medium flex items-center border border-[#006D3B] rounded-full px-4 py-2"
                    >
                      <FaCalendarPlus className="mr-2" /> Add to next delivery
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">No active subscriptions</p>
                  <button
                    onClick={() => navigate("/products?category=basepacks")}
                    className="text-[#006D3B] text-sm font-medium border border-[#006D3B] rounded-full px-6 py-2"
                  >
                    Subscribe Now
                  </button>
                </div>
              )}
            </div>

            {/* Today's Flower Wisdom Card */}
            <div className="bg-white rounded-xl p-7 shadow-sm">
              <h3 className="text-lg text-[#8B4513] mb-4">
                Today's Flower Wisdom
              </h3>
              <div className="space-y-4">
                <p className="text-gray-700 text-sm italic leading-relaxed">
                  "Like the lotus flower that grows out of the mud and blossoms
                  above the muddy water surface, we too can rise above our
                  defilements."
                </p>
                <p className="text-gray-500">— Buddhist Teaching</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-4 md:px-6">
            {/* Base Packs Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                  Base Packs
                </h2>
                <button
                  className="text-green-600 text-sm md:text-base font-medium"
                  onClick={() => navigate("/products?category=basepacks")}
                >
                  View All
                </button>
              </div>

              {isLoadingPacks && (
                <div className="flex justify-center items-center h-40">
                  <Spinner size={400} />
                </div>
              )}

              {error && (
                <div className="text-red-500 text-center py-4">{error}</div>
              )}

              {/* Card Layout Template - Used for all sections */}
              {!isLoadingPacks && !error && (
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {basePacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
                      onClick={() =>
                        handleProductClick(pack as unknown as ProductType)
                      }
                    >
                      <div className="p-3">
                        <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                          <img
                            src={
                              pack.imageUrl || "https://via.placeholder.com/160"
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
                            {pack.description}
                          </p>
                          <p className="text-pink-600 text-[16px] font-bold">
                            ₹{pack.sellingPricePerPackDaily}/Day
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(
                                pack as unknown as ProductType
                              );
                            }}
                            className="text-green-600 text-[16px] mb-3 font-medium block"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flowers Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Flowers</h2>
                <button
                  className="text-green-600 text-sm font-medium"
                  onClick={() => navigate("/products?category=flowers")}
                >
                  View All
                </button>
              </div>
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-40">
                  <Spinner size={400} />
                </div>
              ) : products.filter((item) => item.type === "FLOWERS").length ===
                0 ? (
                <div className="text-center py-8 text-gray-500">
                  No flowers available at the moment
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {products
                    .filter(
                      (item) => item.type === "FLOWERS" && item.isAvailable
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-[160px] h-[280px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
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
                              ₹{item.sellingPrice}/Day
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(item);
                              }}
                              className="text-green-600 text-[16px] mb-3 font-medium block"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Leaves Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Leaves</h2>
                <button
                  className="text-green-600 text-sm font-medium"
                  onClick={() => navigate("/products?category=leaves")}
                >
                  View All
                </button>
              </div>
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-40">
                  <Spinner size={400} />
                </div>
              ) : products.filter((item) => item.type === "LEAVES").length ===
                0 ? (
                <div className="text-center py-8 text-gray-500">
                  No leaves available at the moment
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {products
                    .filter(
                      (item) => item.type === "LEAVES" && item.isAvailable
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-[160px] h-[280px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
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
                              ₹{item.sellingPrice}/Day
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(item);
                              }}
                              className="text-green-600 text-[16px] mb-3 font-medium block"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Garlands Section */}
            <div className="mb-8 md:mb-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Garlands
                </h2>
                <button
                  className="text-green-600 text-sm font-medium"
                  onClick={() => navigate("/products?category=garlands")}
                >
                  View All
                </button>
              </div>
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-40">
                  <Spinner size={400} />
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                  {products
                    .filter((item) => item.type === "GARLAND")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-[160px] h-[280px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
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
                              ₹{item.sellingPrice}/Day
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(item);
                              }}
                              className="text-green-600 text-[16px] mb-3 font-medium block"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Hide on desktop */}
        <div className="mb-10 md:mb-10">
          <BottomNavigation />
        </div>

        {/* Logo */}
        <div className="flex justify-center items-center max-w-[800px] mx-auto">
          <img src={logo} alt="logo" className="w-32 h-32 opacity-0" />
        </div>

        {/* Pause Modal */}
        {showPauseModal && selectedSubscription && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-medium">Pause Subscription</h2>
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">
                    Resume delivery from
                  </label>
                  <DatePicker
                    selected={customStartDate}
                    onChange={(date) => setCustomStartDate(date)}
                    minDate={new Date()}
                    placeholderText="mm/dd/yyyy"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-3">
                    What happens when you pause?
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Your subscription will be paused immediately</li>
                    <li>• No deliveries will be made until the resume date</li>
                    <li>• You won't be charged during the pause period</li>
                    <li>
                      • Your subscription will automatically resume on the
                      selected date
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPauseModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePause}
                    className="flex-1 py-3 rounded-xl bg-[#FF5722] text-white font-medium"
                    disabled={!customStartDate}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Home2;
