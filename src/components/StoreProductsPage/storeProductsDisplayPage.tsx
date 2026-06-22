import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { SEO } from "../SEO";
import { trackViewContent, trackAddToCart } from "../../lib/metaPixel";
import "react-datepicker/dist/react-datepicker.css";
import { walletService } from "../../services/wallet.service";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import WalletImage from "../../assets/icon/Wallet.png";
import ProfileImage from "../../assets/icon/Profile.png";
import logo from "../../assets/All/logo.png";
import { ProductDetailSkeleton } from "../common/PageSkeletons";
import { pickPrimaryImageUrl } from "../../utils/pickPrimaryImageUrl";
import { SessionCachedImage } from "../common/SessionCachedImage";
import { IoArrowBack, IoCartOutline } from "react-icons/io5";
import { ShareNodesIcon } from "../common/ShareNodesIcon";
import { resolveProductShareUrl, shareProductLink } from "../../utils/productShare";
import { FaChevronRight, FaMinus, FaPlus } from "react-icons/fa";
import {
  productService,
  getEffectivePrice,
  getBasePrice,
  showStrikeBaseOnCard,
  PRODUCT_AVAILABILITY_STORE,
  formatRupeePdpAmount,
  buildCatalogPdpGalleryImages,
} from "../../services/product.service";
import DatePicker from "react-datepicker";
import clockIcon from "../../assets/svg/gp_store_svg/clock.svg";
import deliveryIcon from "../../assets/svg/gp_store_svg/delivery.svg";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { formatProductTitleCase } from "../../lib/formatProductTitleCase";
import { gpDailyHome } from "../../utils/gpDailyHomeDesignSystem";
import { ProductImageTag } from "../common/ProductImageTag";
import { HorizontalScrollSection } from "../common/HorizontalScrollSection";
import { errorMessageFromCatch } from "../../utils/apiErrorMessage";
import {
  extractCartStockApiMessage,
  formatCartStockInlineMessage,
  isCartStockOrAvailabilityInlineError,
} from "../../utils/cartStockInlineMessage";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import {
  GUEST_STORE_UPDATED_EVENT,
  storeService,
  DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES,
  formatFreeDeliveryThresholdForDisplay,
} from "../../services/store.service";
import { useOrderingStoreOffline } from "../../hooks/useOrderingStoreOffline";
import {
  STORE_OFFLINE_CART_BODY,
  STORE_OFFLINE_ORDER_BUTTON_LABEL,
} from "../../config/homeHeroStatusCopy";

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
  /** From product detail API when backend includes store pricing rules */
  free_delivery_threshold?: string;
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
  product_type?: string;  // Optional: removed from backend Product model
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
  sub_products?: any[];  // Optional: replaced by BOM in backend refactor
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
  is_available?: boolean;  // Auto-managed from BOM (backend refactor)
  available_quantity: number;
  store_info: StoreInfo;
  view_count: number;
  order_count: number;
  created_at: string;
}

type SubscriptionType = "Daily" | "custom";

const gallerySlideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const StorePage: React.FC = () => {
  const orderingStoreOffline = useOrderingStoreOffline();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, addToCart, updateQuantity, removeFromCart, updateCustomizedMessage } =
    useCart();
  const { isLoggedIn } = useAuth();
  const { theme, basePath } = useFeatureTheme();
  const [guestStoreEpoch, setGuestStoreEpoch] = useState(0);
  const [selectedType] = useState<SubscriptionType>("Daily");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [freeDeliveryThresholdDisplay, setFreeDeliveryThresholdDisplay] =
    useState<string>(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
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
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [isUpdatingBasket, setIsUpdatingBasket] = useState(false);
  const [stockLimitMessage, setStockLimitMessage] = useState<string | null>(null);
  const [pdpStockShakeNonce, setPdpStockShakeNonce] = useState(0);

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  /** 1 = next (slide from right), -1 = prev (slide from left) */
  const [gallerySlideDir, setGallerySlideDir] = useState(1);
  const gallerySwipeStartX = useRef<number | null>(null);
  const selectedImageIndexRef = useRef(0);

  useEffect(() => {
    selectedImageIndexRef.current = selectedImageIndex;
  }, [selectedImageIndex]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariant?.id]);

  const activeCartLine = useMemo(() => {
    if (!product) return null;
    const selectedVariantId = selectedVariant?.id ?? null;
    return (
      items.find(
        (item) =>
          item.productId === product.id &&
          (item.variant?.id ?? null) === selectedVariantId,
      ) ?? null
    );
  }, [items, product, selectedVariant?.id]);
  const basketQuantity = activeCartLine?.quantity ?? 0;

  const isBouquetCategory = Boolean(
    product?.category_slug?.toLowerCase().includes("bouquet"),
  );

  useEffect(() => {
    if (!isBouquetCategory) return;
    const msg = (activeCartLine?.customizedMessage ?? "").trim();
    setCustomMessage(msg);
  }, [isBouquetCategory, activeCartLine?.id, activeCartLine?.customizedMessage]);

  const resolveFreeDeliveryDisplay = useCallback(
    async (pd: ProductDetail | null) => {
      if (!pd) {
        setFreeDeliveryThresholdDisplay(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
        return;
      }
      const fromProduct = formatFreeDeliveryThresholdForDisplay(
        pd.store_info?.free_delivery_threshold,
      );
      if (fromProduct) {
        setFreeDeliveryThresholdDisplay(fromProduct);
        return;
      }
      const storeId =
        storeService.getStoreIdForProducts() || pd.store_info?.store_id;
      if (!storeId) {
        setFreeDeliveryThresholdDisplay(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
        return;
      }
      try {
        const stores = await storeService.getAllStores();
        const row = stores.find((s) => s.id === storeId);
        const fmt = formatFreeDeliveryThresholdForDisplay(
          row?.free_delivery_threshold,
        );
        setFreeDeliveryThresholdDisplay(
          fmt ?? DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES,
        );
      } catch {
        setFreeDeliveryThresholdDisplay(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
      }
    },
    [],
  );

  const fetchProductBySlug = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!slug) {
        setError("No product slug provided");
        setFreeDeliveryThresholdDisplay(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
        return;
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

      // Best Sellers — same as homepage: GET /products/?label=best-seller&ordering=-order_count
      try {
        const { storeService } = await import("../../services/store.service");
        const storeId = storeService.getStoreIdForProducts() || productData.store_info?.store_id;
        const bestSellerList = await productService.getProductsByLabel(
          "best-seller",
          storeId || undefined,
          undefined,
          "-order_count",
          PRODUCT_AVAILABILITY_STORE,
        );
        const filtered = bestSellerList
          .filter((p: any) => p.slug !== slug && p.id !== productData.id)
          .slice(0, 12);
        setRelatedProducts(filtered);
      } catch (err) {
        console.error("Error fetching best sellers:", err);
        setRelatedProducts([]);
      }

      await resolveFreeDeliveryDisplay(productData);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      setError(error.message || "Failed to fetch product details");
      setFreeDeliveryThresholdDisplay(DEFAULT_FREE_DELIVERY_THRESHOLD_RUPEES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductBySlug();
    setSelectedImageIndex(0); // reset gallery when slug changes
  }, [slug, navigate, guestStoreEpoch]);

  useEffect(() => {
    if (isLoggedIn) return;
    const h = () => setGuestStoreEpoch((e) => e + 1);
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, h);
    return () => window.removeEventListener(GUEST_STORE_UPDATED_EVENT, h);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!product) return;
    const onFocus = () => {
      void resolveFreeDeliveryDisplay(product);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [product, resolveFreeDeliveryDisplay]);

  // Fire ViewContent pixel when product data loads (any product, any category)
  useEffect(() => {
    if (product) {
      trackViewContent({
        id: product.id,
        name: product.name,
        category: product.category_name,
        price: product.current_price,
      });
    }
  }, [product?.id]);

  const getPriceDisplay = () => {
    if (!product) return { price: 0, originalPrice: 0, savings: 0, discountPercentage: 0, showStrike: false };
    let price: number;
    let originalPrice: number;
    if (selectedVariant) {
      const sv = selectedVariant as Record<string, unknown>;
      const rawSale = sv.final_price ?? sv.price ?? sv.sale_price ?? sv.current_price;
      price = Number(rawSale);
      if (!Number.isFinite(price)) {
        price = parseFloat(String(product.effective_price)) || Number(product.current_price) || 0;
      }
      const rawOrig = sv.base_price ?? sv.list_price ?? sv.mrp ?? sv.original_price;
      const vo = rawOrig != null ? parseFloat(String(rawOrig)) : NaN;
      originalPrice =
        Number.isFinite(vo) && vo > 0 ? vo : parseFloat(String(product.base_price)) || 0;
    } else {
      price = parseFloat(String(product.effective_price)) || Number(product.current_price) || 0;
      originalPrice = parseFloat(String(product.base_price)) || 0;
    }
    const rawDiscountPct =
      product.discount_percentage != null && product.discount_percentage >= 0
        ? Number(product.discount_percentage)
        : originalPrice > 0 && price < originalPrice
          ? ((originalPrice - price) / originalPrice) * 100
          : 0;
    const discountPercentage = Math.round(
      Math.min(100, Math.max(0, Number.isFinite(rawDiscountPct) ? rawDiscountPct : 0)),
    );
    if (discountPercentage > 0 && price > 0 && originalPrice <= price) {
      const inferred = price / (1 - discountPercentage / 100);
      if (Number.isFinite(inferred) && inferred > price) {
        originalPrice = Math.ceil(inferred);
      }
    }
    const showStrike = originalPrice > price && price >= 0;
    const savings = Math.max(0, originalPrice - price);
    return { price, originalPrice, savings, discountPercentage, showStrike };
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

  /** Same ordering as `orderedImages` (primary, then gallery) — keep in sync for cart line image. */
  const getProductImage = () => {
    if (!product) return "/placeholder.svg";
    const p = String(product.primary_image || "").trim();
    if (p) return p;
    if (product.images?.length) {
      const sorted = [...product.images].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
      );
      const u = String(sorted.find((i) => i.image?.trim())?.image || "").trim();
      if (u) return u;
    }
    return "/placeholder.svg";
  };
  const createStoreOrder = async () => {
    if (!product) {
      toast.error("Product information not available", {
        id: "Product information not available",
      });
      return;
    }

    if (orderingStoreOffline) {
      toast.error(STORE_OFFLINE_CART_BODY, { id: STORE_OFFLINE_CART_BODY });
      return;
    }

    if (!isLoggedIn) return;

    const { price } = getPriceDisplay();
    const productImage = getProductImage();

    try {
      await addToCart({
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        image: productImage,
        price: price,
        quantity: 1,
        variant: selectedVariant
          ? {
              id: selectedVariant.id,
              name: selectedVariant.name,
              final_price: selectedVariant.final_price,
            }
          : null,
        categorySlug: product.category_slug,
        customizedMessage: product.category_slug?.toLowerCase().includes("bouquet")
          ? customMessage || undefined
          : undefined,
      });

      toast.success("Added to basket", { id: "Added to basket", duration: 3000 });
      trackAddToCart({ id: product.id, name: product.name, price, quantity: 1 });
    } catch (error: unknown) {
      console.error("Error adding to cart:", error);
      const apiMessage = extractCartStockApiMessage(error);
      if (isCartStockOrAvailabilityInlineError(apiMessage)) {
        setStockLimitMessage(formatCartStockInlineMessage(apiMessage));
      } else {
        const msg =
          apiMessage.trim() ||
          errorMessageFromCatch(error, "Failed to add product to basket. Please try again.");
        toast.error(msg, { id: msg.length > 100 ? msg.slice(0, 100) : msg });
      }
    }
  };

  const savedCartMessage = (activeCartLine?.customizedMessage ?? "").trim();
  const canSaveCustomMessage =
    isBouquetCategory &&
    basketQuantity > 0 &&
    Boolean(activeCartLine) &&
    customMessage.trim() !== savedCartMessage;

  const handleSaveCustomMessage = async () => {
    if (!activeCartLine || !canSaveCustomMessage) return;
    setIsSavingMessage(true);
    try {
      await updateCustomizedMessage(activeCartLine.id, customMessage.trim());
      toast.success("Message saved", { id: "pdp-message-saved" });
    } catch (error: unknown) {
      toast.error(
        errorMessageFromCatch(error, "Failed to save message. Please try again."),
        { id: "pdp-message-save-error" },
      );
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleAdjustBasketQuantity = async (nextQty: number) => {
    if (!activeCartLine || isUpdatingBasket) return;
    if (nextQty > basketQuantity && stockLimitMessage) {
      setPdpStockShakeNonce((n) => n + 1);
      return;
    }
    setIsUpdatingBasket(true);
    setStockLimitMessage(null);
    setPdpStockShakeNonce(0);
    try {
      if (nextQty < 1) {
        await removeFromCart(activeCartLine.id);
      } else {
        const bouquetInstructions = product?.category_slug
          ?.toLowerCase()
          .includes("bouquet")
          ? customMessage.trim() || undefined
          : activeCartLine.customizedMessage;
        await updateQuantity(activeCartLine.id, nextQty, bouquetInstructions);
      }
    } catch (error: unknown) {
      console.error("Error updating basket quantity:", error);
      const apiMessage = extractCartStockApiMessage(error);
      if (isCartStockOrAvailabilityInlineError(apiMessage)) {
        setStockLimitMessage(formatCartStockInlineMessage(apiMessage));
      } else {
        const basketErrMsg =
          apiMessage.trim() ||
          errorMessageFromCatch(error, "Failed to update basket quantity. Please try again.");
        toast.error(basketErrMsg, { id: basketErrMsg });
      }
    } finally {
      setIsUpdatingBasket(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      if (!localStorage.getItem("phoneNumber")) {
        toast.error("Please login to continue", { id: "Please login to continue" });
        navigate(`${basePath}/login`, {
          state: { returnUrl: `${basePath}/product/${slug}` },
        });
        return;
      }
      if (!product || !slug) {
        toast.error("Product information not available", {
          id: "Product information not available",
        });
        return;
      }
      setIsCheckingBalance(true);
      const minDays = 7;
      const sv = selectedVariant as { final_price?: string | number } | null;
      let pricePerPack: number;
      if (sv && sv.final_price != null && String(sv.final_price).trim() !== "") {
        const n = Number(sv.final_price);
        pricePerPack = Number.isFinite(n) ? n : parseFloat(String(product.effective_price)) || Number(product.current_price) || 0;
      } else {
        pricePerPack = parseFloat(String(product.effective_price)) || Number(product.current_price) || 0;
      }
      const checkoutQuantity = basketQuantity > 0 ? basketQuantity : 1;
      const totalPrice = pricePerPack * minDays * checkoutQuantity;
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
      toast.success("Proceeding to address selection", {
        id: "Proceeding to address selection",
      });
    } catch (error: any) {
      if (
        error.message?.includes("Session expired") ||
        error.message?.includes("Authentication required")
      ) {
        const authMsg = error.message || "Please login to continue";
        toast.error(authMsg, { id: authMsg });
        navigate("/login", { state: { returnUrl: `/gp-store/product/${slug}` } });
        return;
      }
      const subFailMsg = error.message || "Failed to proceed with subscription";
      toast.error(subFailMsg, { id: subFailMsg });
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

  const categoryName = product?.category_name || "Products";

  // Build the ordered image list: primary first, then gallery rows (by display_order), deduped by URL.
  // API often sets primary_image and also lists extra files only under images[] — using only one source hides photos.
  const orderedImages = useMemo(() => {
    if (!product) return [];
    return buildCatalogPdpGalleryImages(
      product as unknown as Record<string, unknown>,
      selectedVariant as Record<string, unknown> | null,
    );
  }, [product, selectedVariant]);

  const goToGalleryImage = (idx: number) => {
    if (idx === selectedImageIndex) return;
    const n = orderedImages.length;
    let dir = idx > selectedImageIndex ? 1 : -1;
    if (n > 1) {
      if (selectedImageIndex === n - 1 && idx === 0) dir = 1;
      if (selectedImageIndex === 0 && idx === n - 1) dir = -1;
    }
    setGallerySlideDir(dir);
    setSelectedImageIndex(idx);
  };

  /** Minimum horizontal movement to count as a swipe (touch-friendly, not too loose). */
  const SWIPE_THRESHOLD_PX = 36;

  const resolveGalleryTransitionDir = (prev: number, next: number, n: number): number => {
    if (n <= 1 || prev === next) return 1;
    if (prev === n - 1 && next === 0) return 1;
    if (prev === 0 && next === n - 1) return -1;
    return next > prev ? 1 : -1;
  };

  const handleGalleryPointerDown = (e: React.PointerEvent) => {
    if (orderedImages.length <= 1) return;
    gallerySwipeStartX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleGalleryPointerUp = (e: React.PointerEvent) => {
    if (gallerySwipeStartX.current == null || orderedImages.length <= 1) return;
    const dx = e.clientX - gallerySwipeStartX.current;
    gallerySwipeStartX.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    const n = orderedImages.length;
    const prev = selectedImageIndexRef.current;
    const next =
      dx < 0
        ? (prev + 1) % n
        : (prev - 1 + n) % n;
    if (next === prev) return;
    setGallerySlideDir(resolveGalleryTransitionDir(prev, next, n));
    setSelectedImageIndex(next);
  };

  const handleGalleryPointerCancel = () => {
    gallerySwipeStartX.current = null;
  };

  // Build Schema.org Product structured data from live product fields.
  // Generic — works for all products and categories.
  const productStructuredData = useMemo(() => {
    if (!product) return null;
    const { price } = getPriceDisplay();
    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": product.description || product.short_description,
      "image": orderedImages.map(i => i.src),
      "sku": product.sku,
      "brand": { "@type": "Brand", "name": "Genda Phool" },
      "offers": {
        "@type": "Offer",
        "url": `https://customerapp.mygendaphool.com/gp-store/product/${product.slug}`,
        "priceCurrency": "INR",
        "price": price,
        "availability": product.in_stock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": { "@type": "Organization", "name": "Genda Phool" }
      },
      ...(product.average_rating > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": product.average_rating,
          "reviewCount": product.review_count
        }
      })
    };
  }, [product, orderedImages]);

  const bomDisplayRows = useMemo(() => {
    if (!product) return [];
    const variantOverrides = Array.isArray(selectedVariant?.bom_overrides)
      ? selectedVariant.bom_overrides
      : [];
    if (variantOverrides.length > 0) {
      const baseItems = Array.isArray((product as any).bom_items)
        ? (product as any).bom_items
        : [];
      return variantOverrides.map((row: any, index: number) => {
        const invId = row?.inventory_item_id;
        const base = baseItems.find(
          (b: any) =>
            b?.inventory_item === invId || b?.inventory_item_id === invId,
        );
        return {
          id: row?.id ?? invId ?? `bom-ov-${index}`,
          name:
            row?.inventory_item_name ??
            base?.inventory_item_name ??
            row?.name ??
            "Item",
          quantity: row?.quantity ?? base?.quantity ?? 1,
          unit:
            row?.inventory_item_unit ??
            base?.inventory_item_unit ??
            row?.unit ??
            "",
          isPerishable:
            row?.is_perishable !== undefined
              ? row.is_perishable
              : base?.is_perishable,
        };
      });
    }
    const fallbackItems = Array.isArray((product as any).bom_items)
      ? (product as any).bom_items
      : [];
    return fallbackItems.map((row: any, index: number) => ({
      id: row?.id ?? row?.inventory_item_id ?? `bom-${index}`,
      name:
        row?.inventory_item_name ??
        row?.name ??
        row?.item_name ??
        row?.title ??
        "Item",
      quantity: row?.quantity ?? row?.qty ?? row?.count ?? 1,
      unit: row?.inventory_item_unit ?? row?.unit ?? "",
      isPerishable: row?.is_perishable,
    }));
  }, [product, selectedVariant]);

  if (loading || isCheckingBalance) {
    return <ProductDetailSkeleton />;
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f6f1]">
      <style>{`
        @keyframes gp-pdp-stock-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-7px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
        }
        .gp-pdp-stock-shake {
          animation: gp-pdp-stock-shake 0.45s ease-in-out;
        }
      `}</style>
      {/* SEO — dynamic per product, works for all current and future products */}
      {product && (
        <SEO
          title={`${product.name} — ₹${getPriceDisplay().price}`}
          description={product.short_description || product.description || `Buy ${product.name} online. Same-day delivery in Jaipur from Genda Phool.`}
          canonical={`https://customerapp.mygendaphool.com/gp-store/product/${product.slug}`}
          ogImage={orderedImages[0]?.src}
          ogType="product"
          price={getPriceDisplay().price}
          availability={product.in_stock ? 'InStock' : 'OutOfStock'}
          structuredData={productStructuredData ?? undefined}
        />
      )}
      <div className="relative mx-auto w-full min-w-0 max-w-[min(800px,100vw)] pb-nav-bottom">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="min-w-0 flex-1 text-2xl font-bold font-serif text-gray-900 truncate">
              {categoryName}
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4">
          {/* Product Image Gallery */}
          <div className="mt-4">
            <div
              className={`relative aspect-square w-full overflow-hidden rounded-xl border-0 ${
                orderedImages.length > 1
                  ? 'cursor-grab touch-none active:cursor-grabbing'
                  : ''
              }`}
              onPointerDown={handleGalleryPointerDown}
              onPointerUp={handleGalleryPointerUp}
              onPointerCancel={handleGalleryPointerCancel}
              role={orderedImages.length > 1 ? 'region' : undefined}
              aria-label={
                orderedImages.length > 1
                  ? 'Product images — swipe left for next, right for previous; loops from last to first'
                  : undefined
              }
            >
              <ProductImageTag labels={product.labels} />
              <AnimatePresence initial={false} custom={gallerySlideDir} mode="sync">
                <motion.div
                  key={selectedImageIndex}
                  role="img"
                  aria-label={orderedImages[selectedImageIndex]?.alt || product.name}
                  custom={gallerySlideDir}
                  variants={gallerySlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'tween', duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="pointer-events-none absolute inset-0 select-none"
                >
                  <img
                    src={orderedImages[selectedImageIndex]?.src || '/placeholder.svg'}
                    alt={orderedImages[selectedImageIndex]?.alt || product.name}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full border-0 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Thumbnails + pagination dots (dots sit below thumbnails, right-aligned — matches product UI) */}
            {orderedImages.length > 1 && (
              <>
                <HorizontalScrollSection
                  trackClassName="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                  prevLabel="Previous image"
                  nextLabel="Next image"
                >
                  {orderedImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToGalleryImage(idx)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        idx === selectedImageIndex
                          ? 'border-[#2A6B28]'
                          : 'border-gray-200'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </button>
                  ))}
                </HorizontalScrollSection>
                <div
                  className="mt-2 flex justify-center gap-1.5"
                  aria-hidden
                >
                  {orderedImages.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === selectedImageIndex
                          ? 'w-5 bg-[#19411F]'
                          : 'w-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Product Name and Badge */}
          <div className="mt-4 flex items-start justify-between gap-3">
            <h1 className="font-ibm-plex-serif text-2xl font-bold text-gray-900 flex-1 min-w-0 [overflow-wrap:anywhere]">
              {formatProductTitleCase(product.name)}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              {getPriceDisplay().showStrike && getPriceDisplay().discountPercentage > 0 && (
                <span className="bg-[#19411F] text-white text-sm font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Save {getPriceDisplay().discountPercentage}%
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const shareUrl = resolveProductShareUrl(product, product.slug);
                  if (!shareUrl) return;
                  void shareProductLink({
                    name: product.name,
                    shareUrl,
                    description: product.short_description || product.description,
                  });
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-[#374151] hover:bg-black/5 rounded-full"
                aria-label="Share product"
              >
                <ShareNodesIcon className="text-xl text-[#374151]" size={20} />
              </button>
            </div>
          </div>

          {/* Offer price first, then struck MRP when discounted */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900">₹{formatRupeePdpAmount(getPriceDisplay().price)}</span>
            {getPriceDisplay().showStrike && (
              <span className="text-xl font-medium text-gray-500 line-through">
                ₹{formatRupeePdpAmount(getPriceDisplay().originalPrice)}
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
                  <p className="text-sm text-gray-600 mt-0.5">
                    Above ₹{freeDeliveryThresholdDisplay}/-
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Select Size Section */}
          {getActiveVariants().length > 0 && (
            <div>
              <div className="mb-3">
                <span className="text-base font-medium text-gray-900">Select Size</span>
              </div>
              <HorizontalScrollSection trackClassName="overflow-x-auto pb-2 -mx-1 no-scrollbar">
                <div className="flex gap-3 min-w-max">
                {getActiveVariants().map((variant: any) => {
                  const chipSale = Number(
                    variant.final_price ??
                      variant.price ??
                      variant.sale_price ??
                      variant.current_price,
                  );
                  const vt = String(variant.variant_type || "size").toLowerCase();
                  const subLabel =
                    vt === "size"
                      ? "Size"
                      : formatProductTitleCase(String(variant.variant_type || "Size"));
                  const selected = selectedVariant?.id === variant.id;
                  return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setStockLimitMessage(null);
                      setSelectedVariant(variant);
                    }}
                    className={`flex min-h-[5.5rem] min-w-[108px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                      selected
                        ? "border-[#19411F] bg-[#E6F4EA]"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold leading-tight ${
                        selected ? "text-[#19411F]" : "text-gray-900"
                      }`}
                    >
                      {formatProductTitleCase(String(variant.name ?? ""))}
                    </span>
                    <span className="text-xs font-medium leading-none text-gray-500">
                      {subLabel}
                    </span>
                    <span className="text-base font-bold leading-tight text-gray-900">
                      ₹{formatRupeePdpAmount(Number.isFinite(chipSale) ? chipSale : 0)}
                    </span>
                  </button>
                  );
                })}
                </div>
              </HorizontalScrollSection>
            </div>
          )}

          {/* Customized Message (bouquet) — matches app `ProductDetailScreen` messageCard + textArea */}
          {product.category_slug?.toLowerCase().includes('bouquet') && (
            <div className="mt-3 w-full self-end">
              <div className="w-full rounded-xl border border-gray-200 bg-white p-3">
                <p className="mb-1 text-base font-medium text-gray-900">
                  Customized Message (optional)
                </p>
                <textarea
                  value={customMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setCustomMessage(e.target.value);
                    }
                  }}
                  placeholder="Add a personalized message..."
                  className="min-h-[48px] w-full resize-y border-0 bg-transparent p-3 text-sm leading-5 text-gray-900 placeholder:text-[#9CA3AF] focus:outline-none focus:ring-0"
                  maxLength={500}
                  aria-label="Customized message"
                />
          <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#19411F]">
                    {customMessage.length}/500
                  </p>
                  {basketQuantity > 0 ? (
                    <button
                      type="button"
                      onClick={() => void handleSaveCustomMessage()}
                      disabled={!canSaveCustomMessage || isSavingMessage}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#19411F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1e5a1c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingMessage ? "Saving…" : "Save"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Add to Basket / Quantity Controls */}
          {basketQuantity > 0 ? (
            <div className="mb-4 mt-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-base font-medium text-gray-900">Quantity</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="touch-target-compact flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60"
                    onTouchEnd={(e) => {
                      if (isUpdatingBasket) return;
                      /* iOS Safari fires a synthetic click after touchend; without this the click runs
                         after state updates and applies basketQuantity+1 twice (1→3). */
                      e.preventDefault();
                      void handleAdjustBasketQuantity(basketQuantity - 1);
                    }}
                    onClick={() => handleAdjustBasketQuantity(basketQuantity - 1)}
                    aria-label="Decrease quantity"
                    disabled={isUpdatingBasket}
                  >
                    <FaMinus className="block text-[9px] leading-none" aria-hidden />
                  </button>
                  <span className="min-w-[1.125rem] px-0.5 text-center text-base font-semibold tabular-nums leading-none text-gray-900">
                    {basketQuantity}
                  </span>
                  <button
                    type="button"
                    className="touch-target-compact flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#19411F] text-white transition-colors hover:bg-[#1e5a1c] disabled:opacity-60"
                    onTouchEnd={(e) => {
                      if (isUpdatingBasket) return;
                      e.preventDefault();
                      void handleAdjustBasketQuantity(basketQuantity + 1);
                    }}
                    onClick={() => handleAdjustBasketQuantity(basketQuantity + 1)}
                    aria-label="Increase quantity"
                    disabled={isUpdatingBasket}
                  >
                    <FaPlus className="block text-[9px] leading-none" aria-hidden />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/basket`)}
                className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#19411F] px-5 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#1e5a1c] active:scale-[0.99]"
              >
                <IoCartOutline className="text-xl shrink-0" aria-hidden />
                View basket
                <FaChevronRight className="text-sm opacity-90" aria-hidden />
              </button>
              {stockLimitMessage && (
                <p
                  key={pdpStockShakeNonce}
                  className={`mt-2 text-sm font-medium text-red-600 ${
                    pdpStockShakeNonce > 0 ? "gp-pdp-stock-shake" : ""
                  }`}
                >
                  {stockLimitMessage}
                </p>
              )}
            </div>
          ) : !isLoggedIn ? (
            <button
              type="button"
              onClick={() =>
                navigate(`${basePath}/login`, {
                  state: { returnUrl: `${basePath}/product/${slug}` },
                })
              }
              className={`w-full mt-6 py-3.5 rounded-[25px] text-base font-semibold mb-6 flex items-center justify-center ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
              disabled={
                !product ||
                product.in_stock === false ||
                product.is_available === false
              }
            >
              {product?.in_stock !== false && product?.is_available !== false
                ? "Log in to add to basket"
                : "Out of Stock"}
            </button>
          ) : (
            <button
              onClick={createStoreOrder}
              className="w-full bg-[#19411F] mt-6 text-white py-3.5 rounded-[25px] text-base font-semibold mb-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={
                !product ||
                product.in_stock === false ||
                product.is_available === false ||
                orderingStoreOffline
              }
            >
              {orderingStoreOffline
                ? STORE_OFFLINE_ORDER_BUTTON_LABEL
                : product?.in_stock !== false && product?.is_available !== false
                  ? "Add to Basket"
                  : "Out of Stock"}
            </button>
          )}

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
                  {product.short_description?.trim() || "No short description available."}
                </div>
              )}
              {activeTab === "Details" && (
                <div className="space-y-3 text-sm text-gray-700">
                  {bomDisplayRows.length > 0 ? (
                    bomDisplayRows.map((row: any) => {
                      const parsedQty = parseFloat(String(row.quantity).replace(/,/g, ""));
                      const qtyStr = Number.isFinite(parsedQty)
                        ? Math.abs(parsedQty % 1) < 1e-6
                          ? String(Math.round(parsedQty))
                          : String(parsedQty)
                        : String(row.quantity);
                      const unit = String(row.unit ?? "").trim();
                      const qtyDisplay = unit ? `${qtyStr} ${unit}` : qtyStr;
                      return (
                        <div key={row.id} className="border-b border-gray-100 pb-2">
                          <div>
                            <span className="font-semibold">{row.name}</span>
                            <span> · {qtyDisplay}</span>
                          </div>
                          {row.isPerishable === true && (
                            <p className="text-xs text-gray-500 mt-1">Perishable</p>
                          )}
                          {row.isPerishable === false && (
                            <p className="text-xs text-gray-500 mt-1">Non-perishable</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p>No ingredient list for this product.</p>
                  )}
                </div>
              )}
              {activeTab === "More" && (
                <div className="text-sm text-gray-700 leading-relaxed">
                  {product.description?.trim() || "No additional description."}
                </div>
              )}
            </div>
          </div>
          {/* Best Sellers Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-10 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className={gpDailyHome.sectionHeading}>Best Sellers</h2>
                <button
                  type="button"
                  onClick={() => navigate("/gp-store/products")}
                  className="inline-flex shrink-0 items-center gap-0.5 py-1"
                >
                  <span className={gpDailyHome.exploreMore}>Explore More</span>
                  <FaChevronRight className={`${gpDailyHome.exploreMore} opacity-80`} />
                </button>
              </div>
              <HorizontalScrollSection trackClassName="gp-h-scroll-track">
                {relatedProducts.map((item) => (
                  <div
                    key={item.id || item.slug}
                    className="gp-store-card-scroll hover:shadow-md transition-shadow"
                    onClick={() => handleProductClick(item)}
                  >
                    <div className="relative aspect-square bg-[#f8f6f1] overflow-hidden">
                      <ProductImageTag labels={item.labels} />
                      <SessionCachedImage
                        src={
                          pickPrimaryImageUrl(item, "card") ||
                          (item.images && item.images.length > 0
                            ? item.images[0].image
                            : "/placeholder.svg")
                        }
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="gp-store-card-scroll-inner">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {formatProductTitleCase(item.name)}
                      </h3>
                      <div className="mb-1 min-h-[1.25rem] shrink-0">
                        {item.short_description ? (
                          <p className="truncate text-xs text-gray-500">
                            {formatProductTitleCase(item.short_description)}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-gray-900">
                          <span>₹{getEffectivePrice(item)}</span>
                          {showStrikeBaseOnCard(item) && (
                            <span className="text-gray-500 font-medium line-through ml-1">₹{getBasePrice(item)}</span>
                          )}
                        </p>
                        <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </HorizontalScrollSection>
            </div>
          )}
        </div>
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
