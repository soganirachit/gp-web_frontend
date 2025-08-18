import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { basePackService } from "../../services/basepack.service";
import { BasePack } from "../../services/basepack.service";
import { walletService } from "../../services/wallet.service";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { productService } from "../../services/product.service";
import { Product } from "../../services/product.service";
// Import icons from assets
import WalletImage from "../../assets/icon/Wallet.png";
import ProfileImage from "../../assets/icon/Profile.png";
import logo from "../../assets/All/logo.png";
import Spinner from "../common/Spinner";
import { IoArrowBack } from "react-icons/io5";
import BottomNav from "../layout/BottomNav";

// Add interface for content items
// interface ContentItem {
//   id: string;
//   name: string;
//   quantity: number;
//   description?: string;
// }

// Define base pack content type from the service
interface BasePackContent {
  id: string;
  name: string;
  quantity: number;
}

// Update BasePack interface
interface ExtendedBasePack extends Omit<BasePack, "description" | "contents"> {
  surcharge: number;
  description: string;
  contents: (BasePackContent & { description?: string })[];
  mrpPerPackDaily: number;
  mrpPerPackAlternate: number;
  sellingPricePerPackDaily: number;
  sellingPricePerPackAlternate: number;
}

// Define subscription types to match exactly what's expected by the API
type SubscriptionType = "DAILY" | "CUSTOM";

// interface SubscriptionData {
//   customerId: string;
//   basePackId: string;
//   type: SubscriptionType;
//   startDate: Date;
//   selectedDays: string[];
// }

// interface PaymentDetails {
//   sellingPrice: number;
//   minDays: number;
//   recommendedDays: number;
//   amount: number;
//   recommendedAmount: number;
// }

// Add interface for existing subscription
interface ExistingSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSubscription: () => void;
  subscription: any;
}

// Update GarlandProduct interface to match Product type
interface GarlandProduct extends Product {
  type: "GARLAND";
}

// Add ExistingSubscriptionModal component
const ExistingSubscriptionModal: React.FC<ExistingSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onViewSubscription,
  subscription,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
        >
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Existing Subscription Found
            </h3>
            <p className="text-gray-600">
              You already have an active subscription for this base pack
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Status</span>
              <span className="font-semibold capitalize">
                {subscription?.status?.toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Type</span>
              <span className="font-semibold capitalize">
                {subscription?.type?.toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Start Date</span>
              <span className="font-semibold">
                {new Date(subscription?.startDate).toLocaleDateString()}
              </span>
            </div>
            {subscription?.endDate && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">End Date</span>
                <span className="font-semibold">
                  {new Date(subscription?.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onViewSubscription}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              View Subscription
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Add quantity state
  const [quantity, setQuantity] = useState(1);

  // State management
  const [selectedType, setSelectedType] = useState<SubscriptionType>("DAILY");
  const [startDate] = useState<Date>(new Date());
  // const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [basePack, setBasePack] = useState<ExtendedBasePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] =
    useState(false);
  const [balanceDetails, setBalanceDetails] = useState<{
    currentBalance: number;
    requiredAmount: number;
    shortageAmount: number;
    subscriptionType: SubscriptionType;
    days: number;
  }>({
    currentBalance: 0,
    requiredAmount: 0,
    shortageAmount: 0,
    subscriptionType: "DAILY",
    days: 7,
  });
  // const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  // const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showExistingSubscriptionModal, setShowExistingSubscriptionModal] =
    useState(false);
  const [existingSubscription] = useState<any>(null);
  const [otherBasePacks, setOtherBasePacks] = useState<BasePack[]>([]);
  const [, setExoticFlowers] = useState<Product[]>([]);
  const [products, setProducts] = useState<GarlandProduct[]>([]);

  // Add new state for custom days
  const [showDeliveryDays, setShowDeliveryDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const weekDays = [
    { day: "Mon", enabled: true },
    { day: "Tue", enabled: true },
    { day: "Wed", enabled: true },
    { day: "Thu", enabled: true },
    { day: "Fri", enabled: true },
    { day: "Sat", enabled: true },
    { day: "Sun", enabled: true },
  ];

  // Fetch base pack data
  const fetchBasePack = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError("No product ID provided");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", {
          state: {
            returnUrl: `/product/${id}`,
          },
        });
        return;
      }

      const data = await basePackService.getProductById(id);
      // Transform the data to match ExtendedBasePack interface
      const extendedData: ExtendedBasePack = {
        ...data,
        // Calculate MRP as 20% more than selling price if not provided
        mrpPerPackDaily: Math.ceil(data.sellingPrice * 1.2),
        mrpPerPackAlternate: Math.ceil(data.sellingPrice * 1.2),
        description: data.description || "",
        contents: data.contents || [],
        sellingPricePerPackDaily: 0,
        sellingPricePerPackAlternate: 0,
        surcharge: 0,
      };
      setBasePack(extendedData);

      // Fetch other base packs
      const allPacks = await basePackService.getAllBasePacks();
      const otherPacks = allPacks.filter((pack) => pack.id !== id).slice(0, 3);
      setOtherBasePacks(otherPacks);
    } catch (error: any) {
      if (error.message === "Session expired. Please login again.") {
        localStorage.removeItem("token");
        navigate("/login", {
          state: {
            returnUrl: `/product/${id}`,
          },
        });
      } else {
        setError("Failed to fetch base pack details");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch other base packs and exotic flowers
  useEffect(() => {
    const fetchOtherPacks = async () => {
      try {
        const allProducts = await productService.getAllProducts();
        const exoticProducts = allProducts.filter(
          (product) => product.type === "EXOTIC"
        );
        setExoticFlowers(exoticProducts.slice(0, 3));
      } catch (error) {
        console.error("Error fetching other packs:", error);
      }
    };

    if (id) {
      fetchOtherPacks();
    }
  }, [id]);

  // Fetch base pack data on mount
  useEffect(() => {
    fetchBasePack();
  }, [id, navigate]);

  // Format date for display
  // const formatDate = (date: Date): string => {
  //   return date.toLocaleDateString('en-IN', {
  //     day: 'numeric',
  //     month: 'short',
  //     year: 'numeric'
  //   });
  // };

  // Add function to calculate price display
  const getPriceDisplay = () => {
    if (!basePack) return { price: 0, originalPrice: 0, savings: 0 };

    let price = 0;
    let originalPrice = 0;

    if (selectedType === "DAILY") {
      price = basePack.sellingPrice;
      originalPrice = basePack.sellingPrice + (basePack.surcharge ?? 0);
    } else if (selectedType === "CUSTOM") {
      price = selectedDays.length * basePack.sellingPrice;
      originalPrice = selectedDays.length * (basePack.sellingPrice + (basePack.surcharge ?? 0));
    }

    const savings = originalPrice - price;

    return { price, originalPrice, savings };
  };


  // Handle subscription initiation
  const handleSubscribe = async () => {
    try {
      // const { id } = useParams<{ id: string }>();

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login", {
          state: {
            returnUrl: `/product/${id}`,
          },
        });
        return;
      }

      if (!basePack || !id) {
        toast.error("Product information not available");
        return;
      }

      setIsCheckingBalance(true);

      // Set minimum days and calculate price
      const minDays = selectedType === "CUSTOM" ? selectedDays.length : 7;
      const pricePerPack =
        selectedType === "DAILY"
          ? basePack.sellingPricePerPackDaily
          : basePack.sellingPricePerPackAlternate;

      const totalPrice = pricePerPack * minDays * quantity;



      // First ensure wallet exists and check balance
      const walletResponse = await walletService.getWalletBalance();
      const { balance } = walletResponse || {};

      if (balance < totalPrice) {

        // Update balance details and show modal
        setBalanceDetails({
          currentBalance: balance,
          requiredAmount: totalPrice,
          shortageAmount: totalPrice - balance,
          subscriptionType: selectedType,
          days: minDays,
        });
        setShowInsufficientBalanceModal(true);
        setIsCheckingBalance(false);
        return;
      }

      // If we have sufficient balance, prepare subscription details
      const subscriptionDetails = {
        basePackId: id,
        type: selectedType, // This will be either "DAILY" or "CUSTOM"
        startDate: startDate.toISOString(),
        amount: pricePerPack,
        quantity: quantity,
        packDetails: {
          name: basePack.name,
          description: basePack.description,
          imageUrl: basePack.imagesUrl,
          contents: basePack.contents,
        },
        deliveryCount: minDays,
        pricePerPack: pricePerPack,
        deliveryPattern: selectedType === "DAILY"
          ? "Every day"
          : `Custom (${selectedDays.join(", ")})`,
        walletBalance: balance,
        // Format days to uppercase and ensure they match backend expectations
        selectedDays: selectedType === "CUSTOM"
          ? selectedDays.map((day) => day.toUpperCase())
          : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      };

      // Validate CUSTOM subscription has at least one delivery day
      if (selectedType === "CUSTOM" && (!selectedDays || selectedDays.length === 0)) {
        toast.error("Please select at least one delivery day for custom subscription");
        return;
      }

      localStorage.setItem(
        "currentSubscription",
        JSON.stringify(subscriptionDetails)
      );

      // Navigate to address selection with subscription details
      navigate("/address-selection", {
        state: {
          subscriptionDetails,
          basePackId: id,
        },
      });
      toast.success("Proceeding to address selection");
    } catch (error: any) {
      if (
        error.message?.includes("Session expired") ||
        error.message?.includes("Authentication required")
      ) {
        if (error.message?.includes("Session expired")) {
          localStorage.removeItem("token");
        }
        toast.error(error.message || "Please login to continue");
        navigate("/login", {
          state: { returnUrl: `/product/${id}` },
        });
        return;
      }

      toast.error(error.message || "Failed to proceed with subscription");
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleRechargeWallet = () => {
    setShowInsufficientBalanceModal(false);
    navigate("/wallet", {
      state: {
        requiredAmount: balanceDetails.shortageAmount,
        currentBalance: balanceDetails.currentBalance,
        returnUrl: `/product/${id}`,
        subscriptionType: balanceDetails.subscriptionType,
        minimumDays: 7,
        maximumDays: selectedType === "DAILY" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const handleViewSubscription = () => {
    setShowExistingSubscriptionModal(false);
    navigate("/subscriptions");
  };

  // Add handler for day selection
  const handleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Add function to handle product click
  const handleProductClick = (product: GarlandProduct | BasePack) => {
    navigate(`/product/${product.id}`);
  };

  // Update the fetchGarlandProducts function
  const fetchGarlandProducts = async () => {
    try {
      const allProducts = await productService.getAllProducts();
      const garlandProducts = allProducts.filter(
        (product): product is GarlandProduct => product.type === "GARLAND"
      );
      setProducts(garlandProducts);
    } catch (error) {
      console.error("Error fetching garland products:", error);
    }
  };

  // Add useEffect to fetch garland products
  useEffect(() => {
    fetchGarlandProducts();
  }, []);

  if (loading || isCheckingBalance) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size={400} />
      </div>
    );
  }

  if (error || !basePack) {
    return (
      <div className="flex flex-col items-center justify-center container h-screen">
        <div className="text-red-500 mb-4">
          {error || "Base pack not found"}
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-green-500 hover:text-green-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto relative">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">Puja Pakcs</h1>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={WalletImage}
              alt="Wallet"
              className="w-10 h-10 md:w-10 md:h-10"
              onClick={() => navigate("/wallet")}
            />
            <img
              src={ProfileImage}
              alt="Profile"
              className="w-6 h-6 md:w-8 md:h-8"
              onClick={() => navigate("/account")}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="md:flex md:gap-6 md:flex-col">
          {/* Product Image and Basic Info */}
          <div className="md:flex md:gap-6">
            {/* Left Column - Image */}
            <div className="md:w-1/2">
              <div className="aspect-square w-full">
                <img
                  src={basePack?.imagesUrl}
                  alt={basePack?.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Column - Basic Info */}
            <div className="md:w-1/2 md:pr-4">
              <div className="px-4 py-4">
                <div className="flex justify-between items-start">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {basePack?.name}
                  </h1>
                  <span className="text-sm text-gray-600">120 gms</span>
                </div>

                {/* Includes Section */}
                <div className="mt-3">
                  <p className="text-sm text-gray-700 mb-2">Includes</p>
                  <div className="flex flex-wrap gap-2">
                    {basePack?.contents?.map((item, index) => (
                      <span
                        key={index}
                        className={`text-sm px-3 py-1 rounded-full ${index % 4 === 0
                            ? "bg-[#FFF7E6] text-[#664D03]"
                            : index % 4 === 1
                              ? "bg-[#FFF1F2] text-[#881337]"
                              : index % 4 === 2
                                ? "bg-[#FFF7ED] text-[#9A3412]"
                                : "bg-[#ECFDF5] text-[#065F46]"
                          }`}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price Section */}
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xl font-bold text-[#015D3A]">
                    ₹{getPriceDisplay().price}/Pack
                  </span>
                  <span className="text-gray-500 line-through">
                    ₹{getPriceDisplay().originalPrice}
                  </span>
                  <span className="text-[#015D3A] text-sm">
                    Save ₹{getPriceDisplay().savings}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="px-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-[15px] font-medium mb-4">Details</h3>
              <div className="text-sm text-gray-600 space-y-2">
                {basePack?.description && <p>{basePack.description}</p>}
                {basePack?.contents?.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      {item.name} - {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Quantity and Delivery Selection */}
          <div className="px-4 mt-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              {/* Quantity Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-medium">Quantity</h3>
                  <div className="flex items-center gap-4">
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      −
                    </button>
                    <span className="text-lg font-medium w-4 text-center">
                      {quantity}
                    </span>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-xl"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {showDeliveryDays ? (
                <>
                  {/* Delivery Days Selection */}
                  <div className="mb-6">
                    <h4 className="text-[15px] font-medium mb-4">
                      Select delivery days
                    </h4>
                    <div className="flex gap-2 justify-between">
                      {weekDays.map((day) => (
                        <button
                          key={day.day}
                          onClick={() => day.enabled && handleDaySelection(day.day)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                            ${!day.enabled
                              ? "bg-gray-100 text-gray-400"
                              : selectedDays.includes(day.day)
                                ? "bg-[#015D3A] text-white"
                                : "bg-white border border-gray-200 text-gray-700 hover:border-[#015D3A]"
                            }`}
                          disabled={!day.enabled}
                        >
                          {day.day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subscribe Button */}
                  <button
  onClick={() => {
    setSelectedType("CUSTOM");
    handleSubscribe();
  }}
  className={`w-full py-3.5 rounded-lg text-[15px] font-medium mb-3
    ${selectedDays.length >= 3 
      ? "bg-[#F15A22] text-white" 
      : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
  disabled={selectedDays.length < 3} // ✅ Require minimum 3 days
>
  {selectedDays.length >= 3
    ? `Subscribe ${selectedDays.length} days/wk for ₹${getPriceDisplay().price}/Pack`
    : "Select at least 3 days to subscribe"}
</button>


                  {/* Toggle Days Button */}
                  <button
                    onClick={() => {
                      setSelectedType("DAILY");
                      setShowDeliveryDays(false);
                    }}
                    className="w-full text-[#015D3A] text-[15px] font-medium"
                  >
                    Subscribe Daily
                  </button>
                </>
              ) : (
                <>
                  {/* Subscribe Button */}
                  <button
                    onClick={() => {
                      setSelectedType("DAILY");
                      handleSubscribe();
                    }}
                    className="w-full bg-[#F15A22] text-white py-3.5 rounded-full text-[15px] font-medium mb-3"
                  >
                    Subscribe Daily for ₹{getPriceDisplay().price}/Pack
                  </button>

                  {/* Toggle Days Button */}
                  <button
                    onClick={() => {
                      setSelectedType("CUSTOM");
                      setShowDeliveryDays(true);
                    }}
                    className="w-full text-[#015D3A] text-[15px] font-medium"
                  >
                    Customise Days
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Garlands Section */}
          <div className="mb-8 md:mb-12 ml-4">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 ml-4 mt-4">
                Garlands
              </h2>
            </div>
            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
              {products
                .filter((item) => item.type === "GARLAND")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProductClick(item)}
                  >
                    <div className="p-3">
                      <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                        <img
                          src={
                            item.imagesUrl || "https://via.placeholder.com/160"
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
                          className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>



          {/* Popular Packs Section */}
          <div className="mb-8 md:mb-12 ml-4">
            <div className="flex justify-between items-center mb-4 md:mb-6 ">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mt-4 ml-4">
                Combo Puja Packs
              </h2>
            </div>
            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
              {otherBasePacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(pack)}
                >
                  <div className="p-3">
                    <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                      <img
                        src={
                          pack.imagesUrl || "https://via.placeholder.com/160"
                        }
                        alt={pack.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                      {otherBasePacks.map((pack) => (
                        <div
                          key={pack.id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleProductClick(pack)}
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
                              {/* <p className="text-[14px] text-gray-500 truncate">
                                Basepack
                              </p> */}
                              <p className="text-pink-600 text-[16px] font-bold">
                                ₹{pack.sellingPrice}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(pack);
                                }}
                                className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logo */}
          <div className="mt-[290px] mb-9 md:mb-9 flex justify-center">
            <img
              src={logo}
              alt=""
              className="text-[#231F20] opacity-50 md:h-24 md:mb-9"
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
        {/* Existing modals */}
        <AnimatePresence>
          {showInsufficientBalanceModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInsufficientBalanceModal(false)}
            >
              <motion.div
                className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Insufficient Balance
                  </h3>
                  <p className="text-gray-600">
                    You need additional balance to subscribe for{" "}
                    {balanceDetails.days} days of{" "}
                    {balanceDetails.subscriptionType.toLowerCase()} delivery
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Current Balance</span>
                    <span className="font-semibold">
                      ₹{balanceDetails.currentBalance}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Required Amount</span>
                    <span className="font-semibold">
                      ₹{balanceDetails.requiredAmount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b bg-red-50 px-2 rounded">
                    <span className="text-red-600">Shortage Amount</span>
                    <span className="font-semibold text-red-600">
                      ₹{balanceDetails.shortageAmount}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInsufficientBalanceModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRechargeWallet}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Recharge Wallet
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ExistingSubscriptionModal
          isOpen={showExistingSubscriptionModal}
          onClose={() => setShowExistingSubscriptionModal(false)}
          onViewSubscription={handleViewSubscription}
          subscription={existingSubscription}
        />
      </div>
    </div>
  );
};

export default ProductPage;
