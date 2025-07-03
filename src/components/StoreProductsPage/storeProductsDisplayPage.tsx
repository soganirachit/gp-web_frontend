import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { walletService } from "../../services/wallet.service";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import WalletImage from "../../assets/icon/Wallet.png";
import ProfileImage from "../../assets/icon/Profile.png";
import logo from "../../assets/All/logo.png";
import Spinner from "../common/Spinner";
import { IoArrowBack } from "react-icons/io5";
import BottomNav from "../layout/BottomNav";
import {
  storeProductGet,
  storeProducts,
} from "@/services/stroeProductDetails.service";
import { Product, storeProductService } from "@/services/storeProduct.service";

interface BasePackContent {
  id: string;
  name: string;
  quantity: number;
}
interface ExtendedBasePack
  extends Omit<storeProducts, "description" | "contents"> {
  surcharge: number;
  description: string;
  contents: (BasePackContent & { description?: string })[];
  mrpPerPackDaily: number;
  mrpPerPackAlternate: number;
  sellingPricePerPackDaily: number;
  sellingPricePerPackAlternate: number;
  data: {
    imagesUrl: string;
    name: string;
    sellingPrice: number;
    description: string;
    contents: BasePackContent[];
    id: string;
    type: string;
    isStore: boolean;
  };
}
type SubscriptionType = "Daily" | "Alternate";

const StorePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedType] = useState<SubscriptionType>("Daily");
  const [startDate] = useState<Date>(new Date());
  const [basePack, setBasePack] = useState<ExtendedBasePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] =
    useState(false);
  const [balanceDetails, setBalanceDetails] = useState({
    currentBalance: 0,
    requiredAmount: 0,
    shortageAmount: 0,
    subscriptionType: "Daily" as SubscriptionType,
    days: 7,
  });

  const [otherStroePacks, setOtherStorePacks] = useState<storeProducts[]>([]);
  const [, setExoticFlowers] = useState<Product[]>([]);

  const fetchProductsById = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!id) {
        setError("No product ID provided");
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { state: { returnUrl: `/store/${id}` } });
        return;
      }
      const data = await storeProductGet.getProductById(id);

      setBasePack(data as ExtendedBasePack);
      const response = await storeProductGet.getAllStoreProducts();
      const allPacks: storeProducts[] = Array.isArray(response)
        ? response
        : (response as { data: storeProducts[] }).data || [];
      const otherPacks = allPacks
        .filter((pack: any) => pack.id !== id)
        .slice(0, 3);
      setOtherStorePacks(otherPacks);
    } catch (error: any) {
      console.error("Error fetching base pack:", error);
      setError(error.message || "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };
  const fetchOtherPacks = async () => {
    try {
      const allProducts = await storeProductService.getAllStoreProducts();
      const exoticProducts = allProducts.filter(
        (product) => product.type === "EXOTIC"
      );
      setExoticFlowers(exoticProducts.slice(0, 3));
    } catch (error) {
      console.error("Error fetching other packs:", error);
    }
  };

  useEffect(() => {
    if (id) fetchOtherPacks();
  }, [id]);

  useEffect(() => {
    fetchProductsById();
  }, [id, navigate]);

  const getPriceDisplay = () => {
    if (!basePack) return { price: 0, originalPrice: 0, savings: 0 };
    // Use basePack.data for price fields
    const price = selectedType === "Daily" ? basePack.data.sellingPrice : 0;
    const originalPrice =
      selectedType === "Daily"
        ? (basePack.data.sellingPrice ?? 0) + (basePack.surcharge ?? 0)
        : 0;
    const savings = originalPrice - price;
    return { price, originalPrice, savings };
  };
  const createStoreOrder = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to continue");
      navigate("/login", { state: { returnUrl: `/store/${id}` } });
      return;
    }
    const { price, originalPrice, savings } = getPriceDisplay();
    const totalPrice = price * quantity;
    navigate("/storeAddress-selection", {
      state: {
        product: location.state.product,
        metaData: {
          originalPrice,
          savings,
          price,
          totalPrice,
          quantity,
        },
      },
    });
  };

  const handleSubscribe = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login", { state: { returnUrl: `/store/${id}` } });
        return;
      }
      if (!basePack || !id) {
        toast.error("Product information not available");
        return;
      }
      setIsCheckingBalance(true);
      const minDays = 7;
      const pricePerPack =
        selectedType === "Daily"
          ? basePack.sellingPricePerPackDaily
          : basePack.sellingPricePerPackAlternate;
      const totalPrice = pricePerPack * minDays * quantity;
      const { balance } = (await walletService.getWalletBalance()) || {};
      if (balance < totalPrice) {
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

      // Only navigate with basePackId if balance is sufficient
      navigate("/storeAddress-selection", {
        state: { basePackId: id },
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
        navigate("/login", { state: { returnUrl: `/store/${id}` } });
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
        maximumDays: selectedType === "Daily" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const handleProductClick = (product: Product | storeProducts) => {
    navigate(`/store/${product.id}`);
  };

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
            <h1 className="text-xl md:text-2xl font-medium">Store Products</h1>
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
          <div className="md:flex md:gap-6">
            <div className="md:w-1/2">
              <div className="aspect-square w-full">
                <img
                  src={
                    basePack?.data.imagesUrl?.[0] ||
                    "/default-product-image.jpg"
                  }
                  alt={basePack?.data.name || "Product"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:w-1/2 md:pr-4">
              <div className="px-4 py-4">
                <div className="flex justify-between items-start">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {basePack?.data.name}
                  </h1>
                  <span className="text-sm text-gray-600">120 gms</span>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-700 mb-2">Includes</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xl font-bold text-[#015D3A]">
                    ₹{basePack?.data.sellingPrice}/Pack
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
          <div className="px-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-[15px] font-medium mb-4">Details</h3>
              <div className="text-sm text-gray-600 space-y-2">
                {basePack?.data.description}
              </div>
            </div>
          </div>
          <div className="px-4 mt-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
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
              <button
                onClick={
                  basePack.data.isStore ? createStoreOrder : handleSubscribe
                }
                className="w-full bg-[#F15A22] text-white py-3.5 rounded-full text-[15px] font-medium mb-3"
              >
                Buy ₹{getPriceDisplay().price}/Pack
                {/* Add Product ₹{getPriceDisplay().price}/Pack */}
              </button>
            </div>
          </div>
          <div className="mb-8 md:mb-12 ml-4">
            <div className="flex justify-between items-center mb-4 md:mb-6 ">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mt-4 ml-4">
                Combo Puja Packs
              </h2>
            </div>
            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
              {otherStroePacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex-shrink-0 w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(pack)}
                >
                  <div className="p-3">
                    <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                      <img
                        src={
                          Array.isArray(pack.imagesUrl)
                            ? pack.imagesUrl[0]
                            : pack.imagesUrl ||
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
                        Basepack
                      </p>
                      <p className="text-pink-600 text-[16px] font-bold">
                        ₹{pack.sellingPrice}/Day
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
          <div className="mt-[290px] mb-9 md:mb-9 flex justify-center">
            <img
              src={logo}
              alt=""
              className="text-[#231F20] opacity-50 md:h-24 md:mb-9"
            />
          </div>
        </div>
        <BottomNav />
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
      </div>
    </div>
  );
};

export default StorePage;
