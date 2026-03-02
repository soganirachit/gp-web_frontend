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
import cautionIcon from "../../assets/svg/gp_daily svg/caution.svg";
import deliveryTruckIcon from "../../assets/svg/gp_daily svg/delivery_truck.svg";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

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
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  // Add quantity state
  const [quantity, setQuantity] = useState(1);

  // State management
  const [selectedType, setSelectedType] = useState<SubscriptionType>("DAILY");
  const [deliveryFrequency, setDeliveryFrequency] = useState<"Daily" | "Mon-Sat" | "Customize">("Daily");
  const [startDate] = useState<Date>(new Date());
  // const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [basePack, setBasePack] = useState<ExtendedBasePack | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Description" | "Product Info" | "More">("Description");
  const [combineProducts, setCombineProducts] = useState<Product[]>([]);
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
  const [combineQuantities, setCombineQuantities] = useState<{ [key: string]: number }>({});
  const weekDays = [
    { day: "Mon", enabled: true },
    { day: "Tue", enabled: true },
    { day: "Wed", enabled: true },
    { day: "Thu", enabled: true },
    { day: "Fri", enabled: true },
    { day: "Sat", enabled: true },
    { day: "Sun", enabled: true },
  ];

  // Fetch product or base pack data
  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError("No product ID provided");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        navigate(`${basePath}/login`, {
          state: {
            returnUrl: `${basePath}/product/${id}`,
          },
        });
        return;
      }

      // Try to fetch as Product first
      try {
        const productData = await productService.getProductById(id);
        setProduct(productData);
      } catch (productError) {
        // If product fetch fails, try base pack
        try {
          const data = await basePackService.getProductById(id);
          const extendedData: ExtendedBasePack = {
            ...data,
            mrpPerPackDaily: Math.ceil(data.sellingPrice * 1.2),
            mrpPerPackAlternate: Math.ceil(data.sellingPrice * 1.2),
            description: data.description || "",
            contents: data.contents || [],
            sellingPricePerPackDaily: 0,
            sellingPricePerPackAlternate: 0,
            surcharge: 0,
          };
          setBasePack(extendedData);
        } catch (basePackError) {
          setError("Failed to fetch product details");
        }
      }

      // Fetch combine products (other flower packs)
      const allProducts = await productService.getAllProducts();
      const otherProducts = allProducts
        .filter((p) => p.id !== id && p.isAvailable && p.isActive)
        .slice(0, 5);
      setCombineProducts(otherProducts);

      // Fetch other base packs
      const allPacks = await basePackService.getAllBasePacks();
      const otherPacks = allPacks.filter((pack) => pack.id !== id).slice(0, 3);
      setOtherBasePacks(otherPacks);
    } catch (error: any) {
      if (error.message === "Session expired. Please login again.") {
        localStorage.removeItem("token");
        navigate(`${basePath}/login`, {
          state: {
            returnUrl: `${basePath}/product/${id}`,
          },
        });
      } else {
        setError("Failed to fetch product details");
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

  // Fetch product data on mount
  useEffect(() => {
    fetchProductData();
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
    const currentProduct = product || basePack;
    if (!currentProduct) return { price: 0, originalPrice: 0, savings: 0 };

    let price = 0;
    // Calculate original price as 20% more than selling price (static calculation)
    let originalPrice = 0;

    const basePrice = currentProduct.sellingPrice;

    // Calculate static original price (20% markup)
    const staticOriginalPrice = Math.ceil(basePrice * 1.2);

    // Always show price per pack, not total
    price = basePrice;
    originalPrice = staticOriginalPrice;

    const savings = originalPrice - price;

    return { price, originalPrice, savings };
  };

  // Get product image
  const getProductImage = () => {
    const currentProduct = product || basePack;
    if (!currentProduct) return "";

    if (product?.imagesUrl) {
      if (Array.isArray(product.imagesUrl)) {
        return product.imagesUrl[0] || "";
      }
      return product.imagesUrl;
    }
    return (basePack as any)?.imagesUrl || "";
  };

  // Get product name
  const getProductName = () => {
    return product?.name || basePack?.name || "";
  };

  // Get product description
  const getProductDescription = () => {
    return product?.description || basePack?.description || "";
  };

  // Get product contents
  const getProductContents = () => {
    return product?.contents || basePack?.contents || [];
  };

  // Get includes list - fetch from backend or use static fallback
  const getIncludesList = (): string[] => {
    const contents = getProductContents();

    // If we have contents from backend, extract names
    if (contents && contents.length > 0) {
      return contents.map(item => item.name);
    }

    // Static fallback list (matches screenshot)
    return ["Bel Leaves", "Lotus", "Marigold", "White Lotus"];
  };

  // Get product weight
  const getProductWeight = () => {
    if (product?.weight) {
      return `${product.weight} gms`;
    }
    return "120 gms"; // Default
  };

  // Handle combine product quantity
  const handleCombineQuantity = (productId: string, delta: number) => {
    setCombineQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };


  // Handle subscription initiation
  const handleSubscribe = async () => {
    try {
      // const { id } = useParams<{ id: string }>();

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        navigate(`${basePath}/login`, {
          state: {
            returnUrl: `${basePath}/product/${id}`,
          },
        });
        return;
      }

      const currentProduct = product || basePack;
      if (!currentProduct || !id) {
        toast.error("Product information not available");
        setIsCheckingBalance(false);
        return;
      }

      setIsCheckingBalance(true);

      // Set minimum days and calculate price
      const minDays = selectedType === "CUSTOM" ? selectedDays.length : 7;
      const pricePerPack = currentProduct.sellingPrice;
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
      const productImage = product
        ? (Array.isArray(product.imagesUrl) ? product.imagesUrl[0] : product.imagesUrl)
        : (basePack as any)?.imagesUrl;

      const subscriptionDetails = {
        basePackId: id,
        productId: product?.id || id,
        type: selectedType, // This will be either "DAILY" or "CUSTOM"
        startDate: startDate.toISOString(),
        amount: pricePerPack,
        quantity: quantity,
        packDetails: {
          name: currentProduct.name,
          description: currentProduct.description,
          imageUrl: productImage,
          contents: getProductContents(),
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
        setIsCheckingBalance(false);
        return;
      }

      localStorage.setItem(
        "currentSubscription",
        JSON.stringify(subscriptionDetails)
      );

      // Navigate to address selection with subscription details
      navigate(`${basePath}/address-selection`, {
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
        navigate(`${basePath}/login`, {
          state: { returnUrl: `${basePath}/product/${id}` },
        });
        return;
      }

      toast.error(error.message || "Failed to proceed with subscription");
      setIsCheckingBalance(false);
    }
  };

  const handleRechargeWallet = () => {
    setShowInsufficientBalanceModal(false);
    navigate(`${basePath}/wallet`, {
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
    navigate(`${basePath}/manage-my-subscription`);
  };

  // Add handler for day selection
  const handleDaySelection = (day: string) => {
    // Only allow day selection changes in Customize mode
    if (deliveryFrequency === "Mon-Sat") {
      return; // Prevent any changes in Mon-Sat mode
    }

    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Add function to handle product click
  const handleProductClick = (item: GarlandProduct | BasePack | Product) => {
    navigate(`${basePath}/product/${item.id}`);
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
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  if (error || (!basePack && !product)) {
    return (
      <div className="flex flex-col items-center justify-center container h-screen">
        <div className="text-red-500 mb-4">
          {error || "Product not found"}
        </div>
        <button
          onClick={() => navigate(basePath)}
          className="text-green-500 hover:text-green-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const currentProduct = product || basePack;
  const categoryName = product?.category === "PUJA" ? "Puja Pack" : product?.category === "EXOTIC" ? "Exotic Pack" : "Puja Pack";

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-24">
      <div className="max-w-[800px] mx-auto relative">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">{categoryName}</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4">
          {/* Product Image */}
          <div className="mt-4">
            <div className="aspect-square w-full rounded-xl overflow-hidden">
              <img
                src={getProductImage()}
                alt={getProductName()}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Info - Name, Price, Weight */}
          <div className="mt-4">
            <div className="flex justify-between items-start gap-3">
              <h1 className="text-3xl font-semibold text-gray-900 flex-1">
                {getProductName()}
              </h1>
              <span className="text-base font-medium text-gray-900 bg-[rgb(250,162,34)] px-5 py-2 rounded-2xl whitespace-nowrap">
                {getProductWeight()}
              </span>
            </div>

            {/* Price Section */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">
                ₹{getPriceDisplay().price}/Pack
              </span>
              {getPriceDisplay().originalPrice > getPriceDisplay().price && (
                <span className="text-2xl font-bold text-gray-500 line-through">
                  ₹{getPriceDisplay().originalPrice}
                </span>
              )}
            </div>
          </div>

          {/* Includes Section */}
          <div className="mt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Includes</h3>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {getIncludesList().map((item, index) => (
                <span
                  key={index}
                  className="flex-1 min-w-[calc(50%-0.375rem)] sm:min-w-0 text-xs sm:text-sm font-medium text-gray-900 bg-white border border-[rgb(250,162,34)] px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-center"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Quantity Section */}
          <div className="mt-6 pl-4 pr-12 ">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
              <div className="flex items-center gap-4">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-[rgb(250,162,34)] hover:text-white transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <span className="text-xl leading-none">−</span>
                </button>
                <span className="text-lg font-medium w-8 text-center">
                  {quantity}
                </span>
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-[rgb(250,162,34)] hover:text-white transition-colors"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>
            </div>
          </div>

          {/* Combine with Section */}
          {combineProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Combine with</h3>
              <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-2 no-scrollbar">
                {combineProducts.map((item) => {
                  const itemImage = Array.isArray(item.imagesUrl) ? item.imagesUrl[0] : item.imagesUrl;
                  const itemQty = combineQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[150px] sm:w-[180px] bg-white rounded-xl shadow-md overflow-hidden"
                    >
                      <div className="h-32 sm:h-40 w-full">
                        <img
                          src={itemImage || "https://via.placeholder.com/160"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2.5 sm:p-4">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate mb-1.5 sm:mb-2">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                          <span className="text-xs sm:text-sm text-gray-500 line-through">
                            ₹{Math.ceil(item.sellingPrice * 1.2)}
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-gray-900">
                            ₹{item.sellingPrice}
                          </span>
                        </div>
                        {itemQty > 0 ? (
                          <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <button
                              onClick={() => handleCombineQuantity(item.id, -1)}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-gray-700 text-gray-600 flex items-center justify-center hover:bg-[rgb(250,162,34)] hover:border-[rgb(250,162,34)] hover:text-white transition-colors shadow-sm"
                            >
                              <span className="text-base sm:text-lg leading-none font-medium">−</span>
                            </button>
                            <span className="text-sm sm:text-base font-semibold text-gray-900 min-w-[20px] sm:min-w-[24px] text-center">{itemQty}</span>
                            <button
                              onClick={() => handleCombineQuantity(item.id, 1)}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-gray-700 text-gray-600 flex items-center justify-center hover:bg-[rgb(250,162,34)] hover:border-[rgb(250,162,34)] hover:text-white transition-colors shadow-sm"
                            >
                              <span className="text-base sm:text-lg leading-none font-medium">+</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCombineQuantity(item.id, 1)}
                            className="w-full bg-[rgb(250,162,34)] text-gray-900 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Delivery Days Section */}
          <div className="mt-6">
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Select Delivery Days</h3>

              {/* Delivery Frequency Tabs */}
              <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 w-full sm:w-[70%]">
                <button
                  onClick={() => {
                    setDeliveryFrequency("Daily");
                    setSelectedType("DAILY");
                    setSelectedDays([]);
                  }}
                  className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-colors ${deliveryFrequency === "Daily"
                    ? "bg-[rgb(250,162,34)] text-gray-900"
                    : "bg-white border-2 border-gray-400 text-gray-900"
                    }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => {
                    setDeliveryFrequency("Mon-Sat");
                    setSelectedType("CUSTOM");
                    setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
                  }}
                  className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-colors ${deliveryFrequency === "Mon-Sat"
                    ? "bg-[rgb(250,162,34)] text-gray-900"
                    : "bg-white border-2 border-gray-400 text-gray-900"
                    }`}
                >
                  Mon-Sat
                </button>
                <button
                  onClick={() => {
                    setDeliveryFrequency("Customize");
                    setSelectedType("CUSTOM");
                    // Pre-select all days when switching to Customize mode
                    setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
                  }}
                  className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-colors ${deliveryFrequency === "Customize"
                    ? "bg-[rgb(250,162,34)] text-gray-900"
                    : "bg-white border-2 border-gray-400 text-gray-900"
                    }`}
                >
                  Customize
                </button>
              </div>

              {/* Individual Day Selectors */}
              {(deliveryFrequency === "Customize" || deliveryFrequency === "Mon-Sat") && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex gap-0.5 sm:gap-1 justify-between">
                    {weekDays.map((day) => (
                      <button
                        key={day.day}
                        onClick={() => {
                          if (deliveryFrequency === "Customize" && day.enabled) {
                            handleDaySelection(day.day);
                          }
                        }}
                        className={`w-14 sm:w-20 h-8 sm:h-10 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors ${!day.enabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : selectedDays.includes(day.day)
                            ? "bg-[rgb(250,162,34)] text-gray-900"
                            : "bg-white border-2 border-gray-400 text-gray-900"
                          }`}
                        disabled={!day.enabled || deliveryFrequency === "Mon-Sat"}
                      >
                        {day.day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Message */}
              {deliveryFrequency === "Customize" && selectedDays.length > 0 && selectedDays.length < 3 && (
                <div className="mb-3 sm:mb-4 bg-pink-100 rounded-2xl p-2.5 sm:p-3 flex items-start gap-1.5 sm:gap-2">
                  <img src={cautionIcon} alt="Warning" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-bold text-gray-700">
                    Please select at least 3 days for a 1-week subscription
                  </p>
                </div>
              )}

              {/* Subscribe Button */}
              <button
                onClick={() => {
                  if (deliveryFrequency === "Daily") {
                    setSelectedType("DAILY");
                  } else {
                    setSelectedType("CUSTOM");
                  }
                  handleSubscribe();
                }}
                disabled={deliveryFrequency === "Customize" && selectedDays.length < 3}
                className={`w-full py-3 sm:py-3.5 rounded-2xl text-sm sm:text-[15px] font-semibold ${deliveryFrequency === "Customize" && selectedDays.length < 3
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[rgb(250,162,34)] text-black hover:opacity-90"
                  }`}
              >
                {deliveryFrequency === "Daily"
                  ? `Subscribe for ₹${getPriceDisplay().price}/Pack`
                  : deliveryFrequency === "Mon-Sat"
                    ? `Subscribe for ₹${getPriceDisplay().price}/Pack`
                    : selectedDays.length >= 3
                      ? `Subscribe for ₹${getPriceDisplay().price}/Pack`
                      : "Select at least 3 days to subscribe"}
              </button>
            </div>
          </div>

          {/* Delivery Information Banner */}
          <div className="mt-6">
            <div className="bg-[rgb(250,162,34)] bg-opacity-20 rounded-lg p-4 flex items-center gap-3">
              <img src={deliveryTruckIcon} alt="Delivery" className="w-20 h-20 flex-shrink-0" />
              <p className="text-base font-bold text-gray-800 flex-1">
                Orders placed before 8 PM will be delivered next day. Sunday deliveries available on request.
              </p>
            </div>
          </div>

          {/* Description Section with Tabs */}
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-sm">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {(["Description", "Product Info", "More"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === tab
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === "Description" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {getProductDescription() || "No description available."}
                    </p>
                    {getProductContents().map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-gray-600">•</span>
                        <span className="text-sm text-gray-600">
                          {item.name} {item.description && `- ${item.description}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === "Product Info" && (
                  <div className="text-sm text-gray-600">
                    <p>Product information coming soon.</p>
                  </div>
                )}
                {activeTab === "More" && (
                  <div className="text-sm text-gray-600">
                    <p>Additional information coming soon.</p>
                  </div>
                )}
              </div>
            </div>
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
