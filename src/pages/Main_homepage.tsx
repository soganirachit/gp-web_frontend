import React, { useEffect, useState, useCallback } from "react";
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
import { orderService } from "@/services/order.service";
import ErrorBoundary from "../components/ErrorBoundary";
import useGoogleMaps from "../hooks/useGoogleMaps";
import { productService } from "../services/product.service";
import type { Product as ProductType } from "../services/product.service";
import { addressService } from "../services/address.service";
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
import { parseISO, addDays, format, isToday } from "date-fns";

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
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
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
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const userName = localStorage.getItem("userName") || "User";
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
        type: product?.type?.toUpperCase(),
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

  const validateDeliveryZone = async (showToast = false) => {
    try {
      setIsValidatingDeliveryZone(true);
      // Get coordinates from localStorage
      const storedCoordinates = localStorage.getItem("userCoordinates");
      if (storedCoordinates) {
        let coordinates: string;

        // Handle both string format and JSON object format
        try {
          const parsedCoords = JSON.parse(storedCoordinates);
          if (parsedCoords.lat && parsedCoords.lng) {
            coordinates = `${parsedCoords.lat},${parsedCoords.lng}`;
          } else {
            coordinates = storedCoordinates; // Use as is if it's already a string
          }
        } catch {
          coordinates = storedCoordinates; // Use as is if parsing fails
        }

        const validation = await addressService.validateAddressInDeliveryArea(
          coordinates
        );
        setDeliveryZoneStatus(validation);

        // Show toast only for manual refreshes
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

  // Function to fetch the latest address from API
  const fetchLatestAddress = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();
      
      // Sort by updatedAt in descending order and get the most recent address
      const latestAddress = addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        [0];
      
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
      // Fallback to localStorage if API fails
      setDeliveryLocation(localStorage.getItem("userLocation") || "");
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

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes in the current tab
    const checkLocalStorage = () => {
      const location = localStorage.getItem("userLocation") || "";
      if (location !== deliveryLocation) {
        setDeliveryLocation(location);
      }
    };
    
    // Check every second for changes
    const interval = setInterval(checkLocalStorage, 1000);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [deliveryLocation]);

  useEffect(() => {
    if (deliveryLocation) {
      localStorage.setItem("userLocation", deliveryLocation);
      // Re-validate delivery zone when location changes
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
    navigate("/store");
  };

  // const handleCancelOrder = async (orderId: string) => {
  //   try {
  //     const response = await orderService.cancelOrder(orderId);
  //     if (response.success) {
  //       fetchOrdersByCustomerId();
  //       toast.success("Order cancelled successfully");
  //     }
  //   } catch (error) {
  //     console.error("Error cancelling order:", error);
  //     toast.error("Failed to cancel order");
  //   }
  // };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FFFBEB] pb-20 lg:pb-0">
        <div className="max-w-[800px] mx-auto">
          {/* Header */}
          {/* <header className="p-4 md:p-6 bg-[#FFFBEB] z-50">
          
            <div className="flex-1 space-y-1"> */}
              {/* Location clickable row */}
              {/*<motion.div
                className="flex items-center gap-2 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate("/location")}
              >
                <MdLocationOn className="text-[#015D3A] text-xl mt-1" />
                <span className="text-[#64748B] text-lg mt-1">
                  Delivering to Home
                </span>
              </motion.div> */}

              {/* Refresh Button and Address */}
              {/* <div className="flex items-center ">
                <button
                  onClick={() => validateDeliveryZone(true)}
                  disabled={isValidatingDeliveryZone}
                  className="text-[#015D3A] hover:text-[#015D3A]/80 disabled:opacity-50"
                  title="Refresh delivery zone status"
                >
                  <MdLocationOn  className="text-lg" />
                </button>

                <div className="text-[#64748B] text-sm truncate max-w-xs">
                  {deliveryLocation}
                </div>
              </div>

              {/* Delivery Zone Status */}
              {/* <div className="ml-6">
                {isValidatingDeliveryZone ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-[#015D3A]"></div>
                    <span>Checking delivery zone...</span>
                  </div>
                ) : (
                  deliveryZoneStatus && (
                    <div
                      className={`text-xs px-3 py-1 rounded-full inline-block ${
                        deliveryZoneStatus.isValid
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {deliveryZoneStatus.isValid
                        ? " Delivery Available"
                        : "Outside Delivery Area"}
                    </div>
                  )
                )}
              </div>
            </div>
          </header> */} 

          {/* Greeting Section */}
          <div className="px-4 md:px-6 mb-6">
            <h1 className="text-2xl md:text-3xl ml-4 font-bold text-gray-800">
              Namaste, {userName} 🌸
            </h1>
            <p className="text-sm md:text-base ml-4 text-gray-600">
              May your day be blessed!
            </p>
          </div>

          {/* Main Content with consistent spacing */}
          <div className="px-4 md:px-6 space-y-6">
            {/* Alert and Promo Banner Container */}
            <div className="space-y-6">
              {/* Low Balance Alert
              {walletBalance < 100 && (
                <div className="bg-orange-100 rounded-xl p-6 shadow-sm">
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
              )} */}

              {/* Promo Banner Card */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
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

            {/* Delivery Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-500">
                  YOUR NEXT DELIVERY
                </h3>
              </div>

              {isLoadingOrders ? (
                <div className="flex justify-center items-center h-32">
                  <Spinner size={40} />
                </div>
              ) : orders.filter((order) => order.status === "SCHEDULED").length >
                0 ? (
                <div className="flex flex-col gap-4">
                  {orders
                    .filter((order) => order.status === "SCHEDULED")
                    .map((order) => {
                      const formattedDate = format(
                        new Date(order.createdAt),
                        "MMM d, yyyy"
                      );
                      const isScheduled = order.status === "SCHEDULED";

                      return (
                        <div
                          key={order.orderId}
                          className="bg-white rounded-[16px] p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                              {order.product.imagesUrl?.length > 0 ? (
                                <img
                                  src={order.product.imagesUrl[0]}
                                  alt={order.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                  <span className="text-xl font-medium text-gray-400">
                                    {order.product.name?.charAt(0) || "M"}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                                      {order.product.name}
                                    </h3>

                                    {isScheduled && (
                                      <span className="px-2 py-0.5 bg-yellow-200 text-yellow-600 text-xs font-medium rounded-full">
                                        Scheduled
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[#666666] text-sm">
                                    {order.product.isDaily ? "Daily" : "One-time"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H15.8333C16.7538 18.3334 17.5 17.5872 17.5 16.6667V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337Z"
                                    stroke="#666666"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M13.3333 1.66663V4.99996"
                                    stroke="#666666"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M6.66669 1.66663V4.99996"
                                    stroke="#666666"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M2.5 8.33337H17.5"
                                    stroke="#666666"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <p className="text-[#666666] text-xs">
                                  Date: {formattedDate}
                                </p>
                              </div>

                              <p className="text-[#FF5722] font-medium text-sm mb-3">
                                ₹{order.quantity * order.product.sellingPrice}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg mb-4">
                    No scheduled orders
                  </p>
                  <button
                    onClick={handleAddToNextDelivery}
                    className="text-[#006D3B] text-sm font-medium border border-[#006D3B] rounded-full px-6 py-2 hover:bg-[#006D3B] hover:text-white transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>

            {/* Subscribe Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                  Subscribe Packs
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
                              pack.imagesUrl ||
                              "https://via.placeholder.com/160"
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
                            ₹{pack.sellingPrice}
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
            <div>
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
                                item.imagesUrl ||
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
                              ₹{item.sellingPrice}
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
            <div>
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
                                item.imagesUrl ||
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
                              ₹{item.sellingPrice}
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
                                item.imagesUrl ||
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
                              ₹{item.sellingPrice}
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