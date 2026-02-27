import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { walletService } from "../../services/wallet.service";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import WalletImage from "../../assets/icon/Wallet.png";
import ProfileImage from "../../assets/icon/Profile.png";
import logo from "../../assets/All/logo.png";
import Spinner from "../common/Spinner";
import { IoArrowBack } from "react-icons/io5";
import { FaChevronRight } from "react-icons/fa";
import BottomNav from "../layout/BottomNav";
import { productService } from "../../services/product.service";
import DatePicker from "react-datepicker";
import clockIcon from "../../assets/svg/gp_store_svg/clock.svg";
import deliveryIcon from "../../assets/svg/gp_store_svg/delivery.svg";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  display_order: number;
}

interface StoreInfo {
  store_id: number;
  store_name: string;
  store_price: string;
  available_quantity: number;
  in_stock: boolean;
}

interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  category: number;
  category_name: string;
  category_slug: string;
  product_type: string;
  availability_type: string;
  base_price: string;
  sale_price: string | null;
  current_price: number;
  effective_price: string;
  discount_percentage: number;
  unit: string;
  unit_value: string;
  primary_image: string | null;
  images: ProductImage[];
  sub_products: any[];
  labels: any[];
  variants: any[];
  is_perishable: boolean;
  shelf_life_days: number;
  is_featured: boolean;
  is_best_seller: boolean;
  is_available_for_subscription: boolean;
  average_rating: number;
  review_count: number;
  in_stock: boolean;
  available_quantity: number;
  store_info: StoreInfo;
  view_count: number;
  order_count: number;
  created_at: string;
}

type SubscriptionType = "Daily" | "custom";

const StorePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedType] = useState<SubscriptionType>("Daily");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
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
  
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(new Date(new Date().setHours(12, 0, 0, 0)));
  const [activeTab, setActiveTab] = useState<"Description" | "Details" | "More">("Description");
  const [customMessage, setCustomMessage] = useState<string>("");

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const fetchProductBySlug = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!slug) {
        setError("No product slug provided");
        return;
      }
      
      // Initialize temporary store ID if user is not logged in
      const token = localStorage.getItem("token");
      if (!token) {
        const { storeService } = await import("../../services/store.service");
        const existingTempStoreId = storeService.getTemporaryStoreId();
        if (!existingTempStoreId) {
          try {
            await storeService.getStoreFromLocation();
          } catch (error: any) {
            console.error("Error getting store from location:", error);
            // Continue without store ID - product might still load
          }
        }
      }
      
      // Product fetching works without authentication - token is optional
      const productData = await productService.getProductBySlug(slug);
      setProduct(productData);
      
      // Set default variant (first active variant if variants exist)
      if (productData.variants && productData.variants.length > 0) {
        const activeVariants = productData.variants.filter((v: any) => v.is_active && v.variant_type === 'size');
        if (activeVariants.length > 0) {
          const sortedVariants = activeVariants.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
          setSelectedVariant(sortedVariants[0]);
        } else {
          setSelectedVariant(null);
        }
      } else {
        setSelectedVariant(null);
      }

      // Fetch related products from the same category
      if (productData.category_slug) {
        try {
          const { storeService } = await import("../../services/store.service");
          const storeId = storeService.getStoreIdForProducts() || productData.store_info?.store_id;
          const related = await productService.getProductsByCategory(
            productData.category_slug,
            storeId || undefined,
            "store"
          );
          // Filter out current product and limit to 3
          const filtered = related
            .filter((p: any) => p.slug !== slug && p.id !== productData.id)
            .slice(0, 3);
          setRelatedProducts(filtered);
        } catch (err) {
          console.error("Error fetching related products:", err);
          setRelatedProducts([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      setError(error.message || "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductBySlug();
  }, [slug, navigate]);

  const getPriceDisplay = () => {
    if (!product) return { price: 0, originalPrice: 0, savings: 0, discountPercentage: 0 };
    
    // Use variant price if a variant is selected, otherwise use product price
    const price = selectedVariant ? selectedVariant.final_price : product.current_price;
    const originalPrice = parseFloat(product.base_price);
    const savings = originalPrice - price;
    const discountPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
    return { price, originalPrice, savings, discountPercentage };
  };
  
  const getActiveVariants = () => {
    if (!product || !product.variants) return [];
    return product.variants
      .filter((v: any) => v.is_active && v.variant_type === 'size')
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
  };
  
  const getVariantDescription = (variant: any) => {
    // Use variant name as description (e.g., "200g Pack" becomes "200g Pack")
    if (variant.name) {
      return variant.name;
    }
    // Fallback to unit_value and unit
    if (product) {
      return `${product.unit_value || ''} ${product.unit || ''}`.trim();
    }
    return '';
  };

  const getProductImage = () => {
    if (!product) return "https://via.placeholder.com/400";
    if (product.primary_image) return product.primary_image;
    if (product.images && product.images.length > 0) {
      // Sort by display_order and get the first one
      const sortedImages = [...product.images].sort((a, b) => a.display_order - b.display_order);
      return sortedImages[0].image;
    }
    return "https://via.placeholder.com/400";
  };
  const createStoreOrder = async () => {
    try {
      if (!product) {
        toast.error("Product information not available");
        return;
      }
      
      const { price } = getPriceDisplay();
      
      // Get product image
      const productImage = getProductImage();
      
      // Determine inventory_id - use variant.id if available, otherwise use product.id
      // Note: If variants have inventory_id field, use that instead
      const inventoryId = selectedVariant?.id || product.id;
      
      // Add to cart (works for both logged-in and logged-out users)
      try {
        await addToCart({
          productId: product.id,
          productSlug: product.slug,
          name: product.name,
          image: productImage,
          price: price,
          quantity: quantity,
          variant: selectedVariant ? {
            id: selectedVariant.id,
            name: selectedVariant.name,
            final_price: selectedVariant.final_price,
            inventory_id: selectedVariant.inventory_id || selectedVariant.id, // Use inventory_id if available
          } : null,
          inventoryId: inventoryId, // Store inventory_id for API sync
          customizedMessage: customMessage || undefined,
        });
        
        toast.success("Product added to basket!");
      } catch (error) {
        console.error("Error adding to cart:", error);
        toast.error("Failed to add product to basket. Please try again.");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to basket. Please try again.");
    }
  };

  const handleSubscribe = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login", { state: { returnUrl: `/gp-store/product/${slug}` } });
        return;
      }
      if (!product || !slug) {
        toast.error("Product information not available");
        return;
      }
      setIsCheckingBalance(true);
      const minDays = 7;
      const pricePerPack = product.current_price;
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

      // Navigate to address selection
      navigate("/address-selection", {
        state: { productSlug: slug, product: product },
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
        navigate("/login", { state: { returnUrl: `/gp-store/product/${slug}` } });
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
        returnUrl: `/gp-store/product/${slug}`,
        subscriptionType: balanceDetails.subscriptionType,
        minimumDays: 7,
        maximumDays: selectedType === "Daily" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const handleProductClick = (productItem: any) => {
    const productSlug = productItem.slug || productItem.id;
    navigate(`/gp-store/product/${productSlug}`, { state: { product: productItem } });
  };

  if (loading || isCheckingBalance) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center container h-screen">
        <div className="text-red-500 mb-4">
          {error || "Product not found"}
        </div>
        <button
          onClick={() => navigate("/gp-store")}
          className="text-green-500 hover:text-green-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const categoryName = product?.category_name || "Products";

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto relative pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-[#f8f6f1] z-10 px-4 py-4 flex items-center gap-3 border-b border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="font-ibm-plex-serif text-2xl font-bold text-gray-900">{categoryName}</h1>
        </div>

        {/* Main Content */}
        <div className="px-4">
          {/* Product Image */}
          <div className="mt-4">
            <div className="aspect-square w-full rounded-xl overflow-hidden border-2 border-blue-200">
              <img
                src={getProductImage()}
                alt={product.name || "Product"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/400";
                }}
              />
            </div>
          </div>

          {/* Product Name and Badge */}
          <div className="mt-4 flex items-start justify-between gap-3">
            <h1 className="font-ibm-plex-serif text-2xl font-bold text-gray-900 flex-1">
              {product.name}
            </h1>
            {getPriceDisplay().discountPercentage > 0 && (
              <span className="bg-[#19411F] text-white text-sm font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap">
                Save {getPriceDisplay().discountPercentage}%
              </span>
            )}
          </div>

          {/* Price Section */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900">
              ₹{getPriceDisplay().price}
            </span>
            {getPriceDisplay().savings > 0 && (
              <span className="text-xl font-medium text-gray-500 line-through">
                ₹{getPriceDisplay().originalPrice.toFixed(0)}
              </span>
            )}
          </div>

          {/* Delivery Information Card */}
          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0">
                  <img src={clockIcon} alt="Clock" className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#19411F]">Same Day Delivery</p>
                  <p className="text-sm text-gray-600 mt-0.5">Order before 1:00 PM</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex-shrink-0">
                  <img src={deliveryIcon} alt="Delivery" className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#19411F]">Free Delivery</p>
                  <p className="text-sm text-gray-600 mt-0.5">On orders above ₹999/-</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between py-4 mt-6">
            <span className="text-base font-medium text-gray-900">Quantity</span>
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-700 text-xl font-medium hover:bg-gray-200 transition-colors"
                onClick={() => setQuantity(Math.max(0, quantity - 1))}
              >
                −
              </button>
              <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                {quantity}
              </span>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#19411F] text-white text-xl font-medium hover:bg-[#1e5a1c] transition-colors"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Select Size Section */}
          {getActiveVariants().length > 0 && (
            <div className="mt-6">
              <div className="mb-3">
                <span className="text-base font-medium text-gray-900">Select Size</span>
              </div>
              <div className="flex justify-center gap-3">
                {getActiveVariants().map((variant: any) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all ${
                      selectedVariant?.id === variant.id
                        ? 'bg-[#E6F4EA] border-[#19411F]'
                        : 'bg-white border-gray-200'
                    }`}
                    style={{ 
                      minWidth: getActiveVariants().length === 2 ? 'calc(50% - 6px)' : 
                                getActiveVariants().length === 3 ? 'calc(33.333% - 8px)' :
                                getActiveVariants().length >= 4 ? '120px' : '100px',
                      flex: getActiveVariants().length <= 3 ? '1' : '0 0 auto'
                    }}
                  >
                    <span className={`text-sm font-semibold mb-1 ${
                      selectedVariant?.id === variant.id ? 'text-[#19411F]' : 'text-gray-900'
                    }`}>
                      {variant.name}
                    </span>
                    <span className="text-base font-bold text-gray-900 mb-1">
                      ₹{variant.final_price}
                    </span>
                    <span className="text-xs text-gray-600">
                      {getVariantDescription(variant)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customized Message Section */}
          <div className="mt-6">
            <div className="mb-3">
              <span className="text-base font-medium text-gray-900">Customized Message (optional)</span>
            </div>
            <div className="relative">
              <textarea
                value={customMessage}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setCustomMessage(e.target.value);
                  }
                }}
                placeholder="Add a personalized message..."
                className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-[#19411F] focus:outline-none resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {customMessage.length}/500
              </div>
            </div>
          </div>

          {/* Add to Basket Button */}
          <button
            onClick={createStoreOrder}
            className="w-full bg-[#19411F] text-white py-3.5 rounded-[25px] text-base font-semibold mt-6 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!product || (isLoggedIn && product.in_stock === false)}
          >
            {!isLoggedIn || product?.in_stock !== false ? "Add to Basket" : "Out of Stock"}
          </button>

          {/* Tabs and Content Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-8">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              {(["Description", "Details", "More"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-[#19411F] border-b-2 border-[#19411F]"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "Description" && (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {product.description || product.short_description || "No description available."}
                </div>
              )}
              {activeTab === "Details" && (
                <div className="space-y-3 text-sm text-gray-700">
                  {product.category_name && (
                    <div>
                      <span className="font-semibold">Category: </span>
                      <span>{product.category_name}</span>
                    </div>
                  )}
                  {product.sku && (
                    <div>
                      <span className="font-semibold">SKU: </span>
                      <span>{product.sku}</span>
                    </div>
                  )}
                  {product.unit && (
                    <div>
                      <span className="font-semibold">Unit: </span>
                      <span>{product.unit_value || "1"} {product.unit}</span>
                    </div>
                  )}
                  {product.is_perishable !== undefined && (
                    <div>
                      <span className="font-semibold">Perishable: </span>
                      <span>{product.is_perishable ? "Yes" : "No"}</span>
                    </div>
                  )}
                  {product.shelf_life_days && (
                    <div>
                      <span className="font-semibold">Shelf Life: </span>
                      <span>{product.shelf_life_days} days</span>
                    </div>
                  )}
                  {isLoggedIn && product.available_quantity !== undefined && product.available_quantity !== null && (
                    <div>
                      <span className="font-semibold">Available Quantity: </span>
                      <span>{product.available_quantity}</span>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "More" && (
                <div className="space-y-3 text-sm text-gray-700">
                  {product.store_info && (
                    <div>
                      <span className="font-semibold">Store: </span>
                      <span>{product.store_info.store_name}</span>
                    </div>
                  )}
                  {product.average_rating > 0 && (
                    <div>
                      <span className="font-semibold">Rating: </span>
                      <span>{product.average_rating.toFixed(1)} ({product.review_count} reviews)</span>
                    </div>
                  )}
                  {product.view_count !== undefined && (
                    <div>
                      <span className="font-semibold">Views: </span>
                      <span>{product.view_count}</span>
                    </div>
                  )}
                  {product.order_count !== undefined && (
                    <div>
                      <span className="font-semibold">Orders: </span>
                      <span>{product.order_count}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Best Sellers Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-10 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Best Sellers</h2>
                <button
                  onClick={() => navigate("/gp-store/products")}
                  className="flex items-center gap-1 text-gray-600 text-sm font-medium hover:text-gray-900"
                >
                  <span>Explore More</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                {relatedProducts.map((item) => (
                  <div
                    key={item.id || item.slug}
                    className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow relative"
                    onClick={() => handleProductClick(item)}
                  >
                    {/* Label Badge */}
                    {item.labels && item.labels.length > 0 && (
                      <div className="absolute top-2 left-2 z-10">
                        <span
                          className="inline-block text-white text-[10px] font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: item.labels[0].color_code || '#19411F' }}
                        >
                          {item.labels[0].name.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="aspect-square bg-[#f8f6f1] overflow-hidden">
                      <img
                        src={
                          item.primary_image ||
                          (item.images && item.images.length > 0
                            ? item.images[0].image
                            : "https://via.placeholder.com/160")
                        }
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://via.placeholder.com/160";
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {item.name}
                      </h3>
                      {item.short_description && (
                        <p className="text-xs text-gray-500 mb-2 truncate">
                          {item.short_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold text-gray-900">
                          ₹{item.current_price || item.effective_price || 0}/
                        </p>
                        <FaChevronRight className="text-gray-400 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
