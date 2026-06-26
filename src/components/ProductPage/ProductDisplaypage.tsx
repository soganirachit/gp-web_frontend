import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";
import { basePackService } from "../../services/basepack.service";
import { BasePack } from "../../services/basepack.service";
import { walletService } from "../../services/wallet.service";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  productService,
  PRODUCT_AVAILABILITY_DAILY,
  PRODUCT_AVAILABILITY_STORE,
  getEffectivePrice,
  getBasePrice,
  getDiscoveryEffectivePrice,
  getDiscoveryBasePrice,
  resolveProductImageUrl,
  buildCatalogPdpGalleryImages,
  formatRupeePdpAmount,
  showStrikeBaseOnCard,
  showStrikeBaseOnDiscoveryCard,
} from "../../services/product.service";
import { formatProductTitleCase } from "../../lib/formatProductTitleCase";
import { gpDailyHome } from "../../utils/gpDailyHomeDesignSystem";
import { Product } from "../../services/product.service";
// Import icons from assets
import WalletImage from "../../assets/icon/Wallet.png";
import ProfileImage from "../../assets/icon/Profile.png";
import logo from "../../assets/All/logo.png";
import { ProductDetailSkeleton } from "../common/PageSkeletons";
import { IoCartOutline } from "react-icons/io5";
import { ShareNodesIcon } from "../common/ShareNodesIcon";
import { FaChevronRight } from "react-icons/fa";
import { ProductImageTag } from "../common/ProductImageTag";
import { HorizontalScrollSection } from "../common/HorizontalScrollSection";
import cautionIcon from "../../assets/svg/gp_daily svg/caution.svg";
import deliveryTruckIcon from "../../assets/svg/gp_daily svg/delivery_truck.svg";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useAuth } from "../../context/AuthContext";
import { storeService } from "../../services/store.service";
import { errorMessageFromCatch } from "../../utils/apiErrorMessage";
import { REQUIRED_TOAST } from "../../constants/requiredToastMessages";
import {
  extractCartStockApiMessage,
  formatCartStockInlineMessage,
  isCartStockOrAvailabilityInlineError,
} from "../../utils/cartStockInlineMessage";
import {
  subscriptionCartService,
  isSubscriptionCartZoneStaleError,
} from "../../services/subscriptionCart.service";
import { notifyDailyCartUpdated } from "../../utils/dailyCartEvents";
import { GP_DAILY_ZONE_STALE_TOAST } from "../../utils/gpDailyCustomerMessages";
import { resolveGpDailyCatalogStoreId } from "../../utils/gpDailyCatalogStore";
import { setGpDailyPendingSubscriptionCheckout } from "../../utils/gpDailyPendingSubscriptionCheckout";
import { navigateToGpDailyWalletForRecharge } from "../../utils/gpDailyWalletRechargeRedirect";
import {
  setPendingProductAddAfterLogin,
  consumePendingProductAddAfterLogin,
} from "../../utils/pendingProductAddAfterLogin";
import {
  InsufficientWalletModal,
  type InsufficientWalletDetails,
} from "../daily/InsufficientWalletModal";
import { UniformPageHeader } from "../layout/UniformPageHeader";
import { resolveProductShareUrl, shareProductLink } from "../../utils/productShare";
import { useOrderingStoreOffline } from "../../hooks/useOrderingStoreOffline";
import {
  STORE_OFFLINE_CART_BODY,
  STORE_OFFLINE_ORDER_BUTTON_LABEL,
} from "../../config/homeHeroStatusCopy";

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
const catalogPdpGallerySlideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { feature, theme } = useFeatureTheme();
  const { isLoggedIn } = useAuth();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const orderingStoreOffline = useOrderingStoreOffline();
  const productListAvailability =
    feature === 'gpStore' ? PRODUCT_AVAILABILITY_STORE : PRODUCT_AVAILABILITY_DAILY;

  // `quantity` state removed — PDP now uses cart quantity (gp-store behavior)

  // State management
  const [selectedType, setSelectedType] = useState<SubscriptionType>("DAILY");
  const [deliveryFrequency, setDeliveryFrequency] = useState<"Daily" | "Mon-Sat" | "Customize">("Daily");
  const [startDate] = useState<Date>(new Date());
  // const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [basePack, setBasePack] = useState<ExtendedBasePack | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Description" | "Details" | "More">("Description");
  const [combineProducts, setCombineProducts] = useState<Product[]>([]);

  const [dailyCart, setDailyCart] = useState<any>(null);
  /** GP Daily — size variants from catalog (same source as gp-store PDP). */
  const [selectedVariant, setSelectedVariant] = useState<Record<string, unknown> | null>(null);
  const activeCartLine = useMemo(() => {
    const productId = (product as any)?.id;
    if (!productId) return null;
    const items = (dailyCart as any)?.items as any[] | undefined;
    if (!Array.isArray(items)) return null;
    const lines = items.filter((it) => {
      const pid = it?.product_id ?? it?.product?.id;
      return pid != null && String(pid) === String(productId);
    });
    if (lines.length === 0) return null;

    if (feature === "gpStore") {
      return lines[0] ?? null;
    }

    // GP Daily: each variant is its own basket line — only the selected variant shows qty / View basket.
    const variants = (product as any)?.variants;
    const activeVariants = Array.isArray(variants)
      ? variants.filter((v: any) => v.is_active && v.variant_type === "size")
      : [];
    const selVid =
      selectedVariant && (selectedVariant as any).id != null
        ? Number((selectedVariant as any).id)
        : null;
    if (activeVariants.length === 0 || selVid == null || !Number.isFinite(selVid)) {
      const noVar = lines.find((it) => {
        const vid = it?.variant_id ?? it?.variant?.id;
        return vid == null || vid === "" || Number(vid) === 0;
      });
      return noVar ?? lines[0] ?? null;
    }
    return (
      lines.find((it) => {
        const vid = Number(it?.variant_id ?? it?.variant?.id);
        return Number.isFinite(vid) && vid === selVid;
      }) ?? null
    );
  }, [dailyCart, product, selectedVariant, feature]);
  const basketQuantity = Number((activeCartLine as any)?.quantity ?? 0);
  const [addingToBasket, setAddingToBasket] = useState(false);
  const [isUpdatingBasket, setIsUpdatingBasket] = useState(false);
  const [stockLimitMessage, setStockLimitMessage] = useState<string | null>(null);
  const [pdpStockShakeNonce, setPdpStockShakeNonce] = useState(0);
  const [pdpImageIndex, setPdpImageIndex] = useState(0);
  const [pdpGalleryDir, setPdpGalleryDir] = useState(1);
  const pdpGallerySwipeStartX = useRef<number | null>(null);
  const pdpImageIndexRef = useRef(0);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  // const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  // const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showExistingSubscriptionModal, setShowExistingSubscriptionModal] =
    useState(false);
  const [insufficientWalletModal, setInsufficientWalletModal] =
    useState<InsufficientWalletDetails | null>(null);
  const [existingSubscription] = useState<any>(null);
  const [, setExoticFlowers] = useState<Product[]>([]);
  const [products, setProducts] = useState<GarlandProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);

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

  /** One request per page load — avoids duplicate GETs cancelled by useEffect cleanup when `product.id` hydrates. */
  const loadBestSellers = async (
    excludeSlug: string,
    excludeProductId?: string | number | null,
    catalogStoreId?: number | null,
  ) => {
    try {
      const storeId =
        catalogStoreId != null && Number.isFinite(Number(catalogStoreId))
          ? Number(catalogStoreId)
          : storeService.getStoreIdForProducts();
      const list = await productService.getProductsByLabel(
        "best-seller",
        storeId ?? undefined,
        undefined,
        "-order_count",
        productListAvailability,
      );
      const filtered = list
        .filter((p: any) => {
          if (String(p.slug ?? "") === excludeSlug) return false;
          if (
            excludeProductId != null &&
            String(p.id) === String(excludeProductId)
          ) {
            return false;
          }
          return true;
        })
        .slice(0, 12);
      setBestSellers(filtered);
    } catch (e) {
      console.error("Error fetching best sellers:", e);
      setBestSellers([]);
    }
  };

  useEffect(() => {
    pdpImageIndexRef.current = pdpImageIndex;
  }, [pdpImageIndex]);

  useEffect(() => {
    setPdpImageIndex(0);
  }, [selectedVariant?.id]);

  useEffect(() => {
    if (feature === "gpStore" || !product) {
      setSelectedVariant(null);
      return;
    }
    const variants = (product as any)?.variants;
    if (!Array.isArray(variants)) {
      setSelectedVariant(null);
      return;
    }
    const activeVariants = variants
      .filter((v: any) => v.is_active && v.variant_type === "size")
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
    if (activeVariants.length === 0) {
      setSelectedVariant(null);
      return;
    }
    setSelectedVariant((prev) => {
      const pid = (prev as any)?.id;
      if (pid != null && activeVariants.some((v: any) => v.id === pid)) {
        return prev;
      }
      return activeVariants[0];
    });
  }, [feature, product]);

  // Fetch product or base pack data
  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!slug) {
        setError("No product slug provided");
        return;
      }

      const catalogSidForDaily =
        feature !== "gpStore"
          ? await resolveGpDailyCatalogStoreId().catch(() => undefined)
          : undefined;
      const catalogStoreId =
        feature !== "gpStore" ? catalogSidForDaily ?? undefined : undefined;

      // Customer API: GET /products/{slug}/ (Postman — not numeric id)
      try {
        const productData = await productService.getProductBySlug(
          slug,
          catalogStoreId != null ? { storeId: catalogStoreId } : undefined,
        );
        setProduct(productData);
        await loadBestSellers(slug, productData?.id ?? null, catalogSidForDaily ?? null);
      } catch (productError) {
        // Legacy base packs only: GET /basepacks/{id}/ — do not call with a product slug (404).
        const legacyNumericId = /^\d+$/.test(String(slug));
        if (!legacyNumericId) {
          setError("Failed to fetch product details");
          return;
        }
        try {
          const data = await basePackService.getProductById(slug);
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
          await loadBestSellers(slug, data?.id ?? null, catalogSidForDaily ?? null);
        } catch (basePackError) {
          setError("Failed to fetch product details");
        }
      }

      // Fetch combine products (other flower packs)
      const sid =
        feature !== "gpStore"
          ? catalogStoreId ?? storeService.getStoreIdForProducts()
          : storeService.getStoreIdForProducts();
      const allProducts = await productService.getAllProducts({
        availabilityType: productListAvailability,
        storeId: sid || undefined,
      });
      const otherProducts = allProducts
        .filter((p) => {
          const pSlug = (p as Product & { slug?: string }).slug;
          if (pSlug && pSlug === slug) return false;
          return String(p.id) !== String(slug) && p.isAvailable && p.isActive;
        })
        .slice(0, 5);
      setCombineProducts(otherProducts);
    } catch (error: any) {
      if (error.message === "Session expired. Please login again.") {
        navigate(`${basePath}/login`, {
          state: {
            returnUrl: `${basePath}/product/${encodeURIComponent(slug ?? "")}`,
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
        const sid =
          feature !== "gpStore"
            ? await resolveGpDailyCatalogStoreId().catch(() => undefined)
            : storeService.getStoreIdForProducts();
        const allProducts = await productService.getAllProducts({
          availabilityType: productListAvailability,
          storeId: sid || undefined,
        });
        const exoticProducts = allProducts.filter(
          (product) => product.type === "EXOTIC"
        );
        setExoticFlowers(exoticProducts.slice(0, 3));
      } catch (error) {
        console.error("Error fetching other packs:", error);
      }
    };

    if (slug) {
      fetchOtherPacks();
    }
  }, [slug, feature, productListAvailability]);

  // Fetch product data on mount
  useEffect(() => {
    fetchProductData();
  }, [slug, navigate]);

  // gp-daily uses subscription cart APIs for basket quantity
  useEffect(() => {
    if (feature === "gpStore") return;
    if (!isLoggedIn) {
      setDailyCart(null);
      return;
    }
    if (!(product as any)?.id) return;
    let mounted = true;
    (async () => {
      try {
        const cart = await subscriptionCartService.getDailyCart();
        if (mounted) setDailyCart(cart as any);
      } catch (e) {
        if (isSubscriptionCartZoneStaleError(e)) {
          toast.error(GP_DAILY_ZONE_STALE_TOAST, { id: "sub-cart-zone-stale" });
          if (mounted) {
            navigate(`${basePath}/address-selection`, { state: { fromCart: true } });
          }
          return;
        }
        // Ignore (e.g., 401 before login) and keep UI functional.
        console.error("Failed to load daily cart:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [feature, product, basePath, navigate, isLoggedIn]);

  const handleBestSellerCardClick = (item: any) => {
    const pathSlug = item.slug ?? item.id;
    navigate(`${basePath}/product/${encodeURIComponent(String(pathSlug))}`, {
      state: { product: item },
    });
  };

  // Format date for display
  // const formatDate = (date: Date): string => {
  //   return date.toLocaleDateString('en-IN', {
  //     day: 'numeric',
  //     month: 'short',
  //     year: 'numeric'
  //   });
  // };

  const getActiveVariants = () => {
    if (!product || feature === "gpStore") return [];
    const variants = (product as any)?.variants;
    if (!Array.isArray(variants)) return [];
    return variants
      .filter((v: any) => v.is_active && v.variant_type === "size")
      .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
  };

  const catalogGallerySlides = useMemo(() => {
    if (!product) return [];
    return buildCatalogPdpGalleryImages(
      product as unknown as Record<string, unknown>,
      selectedVariant as Record<string, unknown> | null,
    );
  }, [product, selectedVariant]);

  const PDP_SWIPE_THRESHOLD_PX = 36;

  const resolvePdpGalleryTransitionDir = (prev: number, next: number, n: number): number => {
    if (n <= 1 || prev === next) return 1;
    if (prev === n - 1 && next === 0) return 1;
    if (prev === 0 && next === n - 1) return -1;
    return next > prev ? 1 : -1;
  };

  const goToPdpGalleryImage = (idx: number) => {
    if (idx === pdpImageIndex) return;
    const n = catalogGallerySlides.length;
    let dir = idx > pdpImageIndex ? 1 : -1;
    if (n > 1) {
      if (pdpImageIndex === n - 1 && idx === 0) dir = 1;
      if (pdpImageIndex === 0 && idx === n - 1) dir = -1;
    }
    setPdpGalleryDir(dir);
    setPdpImageIndex(idx);
  };

  const handlePdpGalleryPointerDown = (e: React.PointerEvent) => {
    if (catalogGallerySlides.length <= 1) return;
    pdpGallerySwipeStartX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePdpGalleryPointerUp = (e: React.PointerEvent) => {
    if (pdpGallerySwipeStartX.current == null || catalogGallerySlides.length <= 1) return;
    const dx = e.clientX - pdpGallerySwipeStartX.current;
    pdpGallerySwipeStartX.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (Math.abs(dx) < PDP_SWIPE_THRESHOLD_PX) return;
    const n = catalogGallerySlides.length;
    const prev = pdpImageIndexRef.current;
    const next = dx < 0 ? (prev + 1) % n : (prev - 1 + n) % n;
    if (next === prev) return;
    setPdpGalleryDir(resolvePdpGalleryTransitionDir(prev, next, n));
    setPdpImageIndex(next);
  };

  const handlePdpGalleryPointerCancel = () => {
    pdpGallerySwipeStartX.current = null;
  };

  // Price row — same fields as gp-store product detail (discount %, strike)
  const getPriceDisplay = () => {
    const currentProduct = product || basePack;
    if (!currentProduct) {
      return {
        price: 0,
        originalPrice: 0,
        savings: 0,
        discountPercentage: 0,
        showStrike: false,
      };
    }

    let pricedEntity: unknown = currentProduct;
    if (feature !== "gpStore" && product && selectedVariant) {
      const sv = selectedVariant as Record<string, unknown>;
      const rawSale =
        sv.final_price ?? sv.price ?? sv.sale_price ?? sv.current_price;
      const vf = Number(rawSale);
      const priceFromVariant = Number.isFinite(vf) && vf >= 0 ? vf : NaN;
      const rawVBase =
        sv.base_price ?? sv.list_price ?? sv.mrp ?? sv.original_price;
      const vBase =
        rawVBase != null && String(rawVBase).trim() !== ""
          ? parseFloat(String(rawVBase))
          : NaN;
      const rawPBase = (product as unknown as { base_price?: unknown }).base_price;
      const pBase =
        rawPBase != null && String(rawPBase).trim() !== ""
          ? parseFloat(String(rawPBase))
          : NaN;
      const bp =
        Number.isFinite(vBase) && vBase > 0
          ? vBase
          : Number.isFinite(pBase) && pBase > 0
            ? pBase
            : NaN;
      const prod = product as unknown as Record<string, unknown>;
      const vDisc = sv.discount_percentage;
      pricedEntity = {
        ...prod,
        effective_price: Number.isFinite(priceFromVariant)
          ? String(priceFromVariant)
          : prod.effective_price,
        current_price: Number.isFinite(priceFromVariant)
          ? priceFromVariant
          : prod.current_price,
        base_price:
          Number.isFinite(bp) && bp > 0 ? String(bp) : prod.base_price,
        discount_percentage:
          vDisc != null && Number(vDisc) >= 0 ? Number(vDisc) : prod.discount_percentage,
      };
    }

    const p = pricedEntity as Record<string, unknown>;
    const price = getEffectivePrice(pricedEntity);
    let originalPrice = getBasePrice(pricedEntity);
    if (originalPrice <= 0 && price > 0) {
      originalPrice = Math.ceil(price * 1.2);
    }
    const rawDiscountPct =
      p.discount_percentage != null && Number(p.discount_percentage) >= 0
        ? Number(p.discount_percentage)
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

  /** BOM lines from catalog product detail (`bom_items`), same shape as store detail. */
  const bomDisplayRows = useMemo(() => {
    if (!product) return [];
    const variantOverrides = Array.isArray((selectedVariant as any)?.bom_overrides)
      ? ((selectedVariant as any).bom_overrides as unknown[])
      : [];
    if (variantOverrides.length > 0) {
      const baseItems = Array.isArray((product as any).bom_items)
        ? ((product as any).bom_items as unknown[])
        : [];
      return variantOverrides.map((row: any, index: number) => {
        const invId = row?.inventory_item_id;
        const base = baseItems.find(
          (b: any) =>
            b?.inventory_item === invId || b?.inventory_item_id === invId,
        ) as Record<string, unknown> | undefined;
        return {
          id: row?.id ?? invId ?? `bom-ov-${index}`,
          name: String(
            row?.inventory_item_name ??
              base?.inventory_item_name ??
              row?.name ??
              "Item",
          ),
          quantity: row?.quantity ?? base?.quantity ?? 1,
          unit: String(
            row?.inventory_item_unit ??
              base?.inventory_item_unit ??
              row?.unit ??
              "",
          ).trim(),
          isPerishable:
            row?.is_perishable !== undefined
              ? row.is_perishable
              : (base?.is_perishable as boolean | undefined),
        };
      });
    }
    const raw = (product as unknown as Record<string, unknown>).bom_items;
    if (!Array.isArray(raw)) return [];
    return raw.map((row: Record<string, unknown>, index: number) => ({
      id: row.id ?? row.inventory_item_id ?? `bom-${index}`,
      name: String(
        row.inventory_item_name ?? row.name ?? row.item_name ?? "Item",
      ),
      quantity: row.quantity ?? row.qty ?? 1,
      unit: String(row.inventory_item_unit ?? row.unit ?? "").trim(),
      isPerishable: row.is_perishable as boolean | undefined,
    }));
  }, [product, selectedVariant]);

  // Get product image — API uses primary_image / images[]; legacy uses imagesUrl
  const getProductImage = () => {
    const currentProduct = product || basePack;
    if (!currentProduct) return "/placeholder.svg";
    return resolveProductImageUrl(currentProduct as unknown as Record<string, unknown>);
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

  /** Legacy base-pack contents only — used when `bom_items` is empty. */
  const getIncludesFallbackLabels = (): string[] => {
    const contents = getProductContents();
    if (contents && contents.length > 0) {
      return contents.map((item) => item.name).filter(Boolean);
    }
    return [];
  };

  // Get product weight
  const getProductWeight = () => {
    const p = product as (Product & { unit_value?: string; unit?: string }) | null;
    if (p?.weight != null && String(p.weight).trim() !== "") {
      return `${p.weight} gms`;
    }
    if (p?.unit_value && p?.unit) {
      return `${p.unit_value} ${p.unit}`.trim();
    }
    if (p?.unit_value) {
      return String(p.unit_value);
    }
    return "120 gms";
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
      if (orderingStoreOffline) {
        toast.error(STORE_OFFLINE_CART_BODY, { id: STORE_OFFLINE_CART_BODY });
        return;
      }

      if (!localStorage.getItem("phoneNumber")) {
        toast.error("Please login to continue", { id: "Please login to continue" });
        navigate(`${basePath}/login`, {
          state: {
            returnUrl: `${basePath}/product/${encodeURIComponent(slug ?? "")}`,
          },
        });
        return;
      }

      const currentProduct = product || basePack;
      if (!currentProduct || !slug) {
        toast.error("Product information not available", {
          id: "Product information not available",
        });
        setIsCheckingBalance(false);
        return;
      }

      const resolvedEntityId = product?.id ?? basePack?.id;

      setIsCheckingBalance(true);

      // Set minimum days and calculate price
      const minDays = selectedType === "CUSTOM" ? selectedDays.length : 7;
      const pricePerPack = getEffectivePrice(currentProduct);
      const totalPrice = pricePerPack * minDays * 1;



      // First ensure wallet exists and check balance
      const walletResponse = await walletService.getWalletBalance();
      const { balance } = walletResponse || {};

      if (balance < totalPrice) {
        setIsCheckingBalance(false);
        redirectToWalletForSubscription({
          currentBalance: balance,
          requiredAmount: totalPrice,
          shortageAmount: totalPrice - balance,
          subscriptionType: selectedType,
          days: minDays,
        });
        return;
      }

      // If we have sufficient balance, prepare subscription details
      const productImage = getProductImage();

      const subscriptionDetails = {
        basePackId: resolvedEntityId,
        productId: product?.id ?? resolvedEntityId,
        type: selectedType, // This will be either "DAILY" or "CUSTOM"
        startDate: startDate.toISOString(),
        amount: pricePerPack,
        quantity: 1,
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
        toast.error("Select at least one delivery day", {
          id: "Select at least one delivery day",
        });
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
          basePackId: resolvedEntityId,
        },
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
        navigate(`${basePath}/login`, {
          state: { returnUrl: `${basePath}/product/${encodeURIComponent(slug ?? "")}` },
        });
        return;
      }

      const subFailMsg = error.message || "Failed to proceed with subscription";
      toast.error(subFailMsg, { id: subFailMsg });
      setIsCheckingBalance(false);
    }
  };

  const handleAddToBasket = async () => {
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
    if (feature === "gpStore") return;
    if (!localStorage.getItem("phoneNumber")) {
      setPendingProductAddAfterLogin(String(slug ?? ""));
      toast.error("Please log in to add items to your basket", {
        id: "Please log in to add items to your basket",
      });
      navigate(`${basePath}/login`, {
        state: { returnUrl: `${basePath}/product/${encodeURIComponent(slug ?? "")}` },
      });
      return;
    }
    setAddingToBasket(true);
    try {
      const variantId =
        selectedVariant && (selectedVariant as any).id != null
          ? Number((selectedVariant as any).id)
          : undefined;
      const cart = await subscriptionCartService.addItem(
        Number((product as any).id),
        1,
        variantId,
      );
      setDailyCart(cart as any);
      notifyDailyCartUpdated(cart);
      toast.success("Added to basket", { id: "Added to basket" });
    } catch (error: unknown) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to basket. Please try again.", {
        id: "Failed to add product to basket. Please try again.",
      });
    } finally {
      setAddingToBasket(false);
    }
  };

  const autoAddAttemptedRef = useRef(false);
  useEffect(() => {
    autoAddAttemptedRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (feature === "gpStore" || !isLoggedIn || !product || autoAddAttemptedRef.current) {
      return;
    }
    const pending = consumePendingProductAddAfterLogin(String(slug ?? ""));
    if (!pending) return;
    autoAddAttemptedRef.current = true;
    void handleAddToBasket();
  }, [feature, isLoggedIn, product, slug]);

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
      if (feature === "gpStore") return;
      const itemId = Number(
        (activeCartLine as any)?.id ?? (activeCartLine as any)?.cart_item_id,
      );
      const productId = Number((product as any)?.id);
      if (!productId) return;

      if (nextQty < 1) {
        if (itemId) await subscriptionCartService.removeItem(itemId);
        const cart = await subscriptionCartService.getDailyCart();
        setDailyCart(cart as any);
        notifyDailyCartUpdated(cart);
      } else {
        const variantId =
          selectedVariant && (selectedVariant as any).id != null
            ? Number((selectedVariant as any).id)
            : undefined;
        const cart = await subscriptionCartService.addItem(
          productId,
          nextQty,
          variantId,
        );
        setDailyCart(cart as any);
        notifyDailyCartUpdated(cart);
      }
    } catch (error: unknown) {
      const apiMessage = extractCartStockApiMessage(error);
      if (isCartStockOrAvailabilityInlineError(apiMessage)) {
        setStockLimitMessage(formatCartStockInlineMessage(apiMessage));
      } else {
        const basketErrMsg =
          apiMessage.trim() ||
          errorMessageFromCatch(error, REQUIRED_TOAST.COULD_NOT_UPDATE_QUANTITY);
        toast.error(basketErrMsg, { id: basketErrMsg });
      }
    } finally {
      setIsUpdatingBasket(false);
    }
  };

  const redirectToWalletForSubscription = (details: {
    currentBalance: number;
    requiredAmount: number;
    shortageAmount: number;
    subscriptionType: SubscriptionType;
    days: number;
  }) => {
    const currentProduct = product || basePack;
    if (!currentProduct || !slug) {
      navigate(`${basePath}/wallet`);
      return;
    }

    const resolvedEntityId = product?.id ?? basePack?.id;
    const minDays = selectedType === "CUSTOM" ? selectedDays.length : 7;
    const pricePerPack = getEffectivePrice(currentProduct);
    const productImage = getProductImage();
    const subscriptionDetails = {
      basePackId: resolvedEntityId,
      productId: product?.id ?? resolvedEntityId,
      type: selectedType,
      startDate: startDate.toISOString(),
      amount: pricePerPack,
      quantity: 1,
      packDetails: {
        name: currentProduct.name,
        description: currentProduct.description,
        imageUrl: productImage,
        contents: getProductContents(),
      },
      deliveryCount: minDays,
      pricePerPack,
      deliveryPattern:
        selectedType === "DAILY"
          ? "Every day"
          : `Custom (${selectedDays.join(", ")})`,
      walletBalance: details.currentBalance,
      selectedDays:
        selectedType === "CUSTOM"
          ? selectedDays.map((day) => day.toUpperCase())
          : [
              "MONDAY",
              "TUESDAY",
              "WEDNESDAY",
              "THURSDAY",
              "FRIDAY",
              "SATURDAY",
              "SUNDAY",
            ],
    };

    setGpDailyPendingSubscriptionCheckout({
      kind: "product_address_flow",
      requiredAmount: details.requiredAmount,
      returnPath: `${basePath}/product/${encodeURIComponent(slug)}`,
      subscriptionDetails,
    });

    setInsufficientWalletModal({
      currentBalance: details.currentBalance,
      requiredAmount: details.requiredAmount,
      shortageAmount: details.shortageAmount,
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
    const pathSlug = "slug" in item && item.slug ? item.slug : item.id;
    navigate(`${basePath}/product/${encodeURIComponent(String(pathSlug))}`);
  };

  // Update the fetchGarlandProducts function
  const fetchGarlandProducts = useCallback(async () => {
    try {
      const sid =
        feature !== "gpStore"
          ? await resolveGpDailyCatalogStoreId().catch(() => undefined)
          : storeService.getStoreIdForProducts();
      const allProducts = await productService.getAllProducts({
        availabilityType: productListAvailability,
        storeId: sid || undefined,
      });
      const garlandProducts = allProducts.filter(
        (product): product is GarlandProduct => product.type === "GARLAND"
      );
      setProducts(garlandProducts);
    } catch (error) {
      console.error("Error fetching garland products:", error);
    }
  }, [feature, productListAvailability]);

  // Add useEffect to fetch garland products
  useEffect(() => {
    void fetchGarlandProducts();
  }, [fetchGarlandProducts]);

  if (loading || isCheckingBalance) {
    return <ProductDetailSkeleton />;
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
  const isGpDaily = feature !== "gpStore";
  const pdp = getPriceDisplay();
  const showPdpSaveBadge = pdp.showStrike && pdp.discountPercentage > 0;

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom overflow-x-clip">
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
      <div className="max-w-[800px] mx-auto relative">
        <div className="sticky top-0 z-10 bg-[#f8f6f1]">
          <UniformPageHeader
            title={categoryName}
            onBack={() => navigate(-1)}
            padXClassName="px-4"
            padYClassName="pt-6 pb-3"
          />
        </div>

        {/* Main Content */}
        <div className="px-4">
          {/* Product image — includes each size-variant `image` URL in the carousel when present */}
          <div className="mt-4">
            {product && catalogGallerySlides.length > 1 ? (
              <>
                <div
                  className="relative isolate aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl border-0 outline-none ring-0 bg-[#f8f6f1] active:cursor-grabbing"
                  onPointerDown={handlePdpGalleryPointerDown}
                  onPointerUp={handlePdpGalleryPointerUp}
                  onPointerCancel={handlePdpGalleryPointerCancel}
                  role="region"
                  aria-label="Product images — swipe or tap a thumbnail below"
                >
                  <ProductImageTag
                    labels={(product as any).labels}
                    variant={feature === "gpStore" ? "store" : "daily"}
                  />
                  <AnimatePresence initial={false} custom={pdpGalleryDir} mode="sync">
                    <motion.div
                      key={pdpImageIndex}
                      role="img"
                      aria-label={catalogGallerySlides[pdpImageIndex]?.alt || getProductName()}
                      custom={pdpGalleryDir}
                      variants={catalogPdpGallerySlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                      className="pointer-events-none absolute inset-0 select-none"
                    >
                      <img
                        src={catalogGallerySlides[pdpImageIndex]?.src || "/placeholder.svg"}
                        alt={catalogGallerySlides[pdpImageIndex]?.alt || getProductName()}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full border-0 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <HorizontalScrollSection
                  trackClassName="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                  prevLabel="Previous image"
                  nextLabel="Next image"
                >
                  {catalogGallerySlides.map((img, idx) => (
                    <button
                      key={`${img.src}-${idx}`}
                      type="button"
                      onClick={() => goToPdpGalleryImage(idx)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        idx === pdpImageIndex
                          ? feature === "gpStore"
                            ? "border-[#2A6B28]"
                            : "border-[#FAA222]"
                          : "border-gray-200"
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </button>
                  ))}
                </HorizontalScrollSection>
                <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
                  {catalogGallerySlides.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === pdpImageIndex
                          ? feature === "gpStore"
                            ? "w-5 bg-[#19411F]"
                            : "w-5 bg-[#FAA222]"
                          : "w-1.5 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="relative isolate aspect-square w-full overflow-hidden rounded-xl border-0 outline-none ring-0 bg-[#f8f6f1]">
                {product && (product as any).labels?.length ? (
                  <ProductImageTag
                    labels={(product as any).labels}
                    variant={feature === "gpStore" ? "store" : "daily"}
                  />
                ) : null}
                <img
                  src={catalogGallerySlides[0]?.src ?? getProductImage()}
                  alt={getProductName()}
                  className="h-full w-full border-0 object-cover"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src.includes("placeholder.svg")) return;
                    el.src = "/placeholder.svg";
                  }}
                />
              </div>
            )}
          </div>

          {isGpDaily ? (
            <>
              <div className="mt-4 flex items-start justify-between gap-3">
                <h1 className="m-0 min-w-0 flex-1 font-sans text-[22px] font-semibold leading-snug text-[#111827] [overflow-wrap:anywhere]">
                  {formatProductTitleCase(getProductName())}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  {showPdpSaveBadge ? (
                    <span className="rounded-lg bg-[#FAA222] px-3 py-1.5 text-sm font-semibold text-[#111827]">
                      Save {pdp.discountPercentage}%
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = resolveProductShareUrl(
                        (product ?? basePack) as { share_url?: string; slug?: string },
                        slug,
                      );
                      if (!shareUrl) return;
                      void shareProductLink({
                        name: getProductName(),
                        shareUrl,
                        description:
                          (product as { short_description?: string } | null)
                            ?.short_description ||
                          (product as { description?: string } | null)?.description,
                      });
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-[#374151] hover:bg-black/5 rounded-full"
                    aria-label="Share product"
                  >
                    <ShareNodesIcon className="text-xl text-[#374151]" size={20} />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">{getProductWeight()}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <span className="text-2xl font-bold text-[#111827]">
                  ₹{formatRupeePdpAmount(pdp.price)}
                </span>
                {pdp.showStrike ? (
                  <span className="text-xl font-semibold text-gray-500 line-through">
                    ₹{formatRupeePdpAmount(pdp.originalPrice)}
                  </span>
                ) : null}
              </div>
              {getActiveVariants().length > 0 && (
                <div className="mt-5">
                  <div className="mb-2.5">
                    <span className="text-base font-medium text-[#111827]">Select Size</span>
                  </div>
                  <HorizontalScrollSection trackClassName="-mx-1 overflow-x-auto pb-2 no-scrollbar">
                    <div className="flex min-w-max gap-3 px-1">
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
                        const selected = (selectedVariant as any)?.id === variant.id;
                        return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setStockLimitMessage(null);
                            setSelectedVariant(variant);
                          }}
                          className={`flex min-h-[5.5rem] min-w-[108px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                            selected
                              ? "border-[#FAA222] bg-[#FFF4E5]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <span
                            className={`text-sm font-semibold leading-tight ${
                              selected ? "text-[#111827]" : "text-gray-900"
                            }`}
                          >
                            {formatProductTitleCase(String(variant.name ?? ""))}
                          </span>
                          <span className="text-xs font-medium leading-none text-gray-500">
                            {subLabel}
                          </span>
                          <span className="text-base font-bold leading-tight text-[#111827]">
                            ₹{formatRupeePdpAmount(Number.isFinite(chipSale) ? chipSale : 0)}
                          </span>
                        </button>
                        );
                      })}
                    </div>
                  </HorizontalScrollSection>
                </div>
              )}
              <div className="mt-5">
                <h2 className="mb-2.5 font-ibm-plex-serif text-2xl font-semibold text-[#222222]">Includes</h2>
                <div className="flex flex-wrap gap-2">
                  {bomDisplayRows.length > 0
                    ? bomDisplayRows.map((row) => (
                        <span
                          key={String(row.id)}
                          className="inline-flex items-center rounded-xl border border-[#FAA222] bg-white px-3 py-1.5 text-xs font-medium text-black"
                        >
                          {row.name}
                        </span>
                      ))
                    : getIncludesFallbackLabels().map((label, index) => (
                        <span
                          key={`${label}-${index}`}
                          className="inline-flex items-center rounded-xl border border-[#FAA222] bg-white px-3 py-1.5 text-xs font-medium text-black"
                        >
                          {label}
                        </span>
                      ))}
                </div>
                {bomDisplayRows.length === 0 && getIncludesFallbackLabels().length === 0 && (
                  <p className="text-sm text-gray-500">No ingredient list for this product.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-start justify-between gap-3">
                <h1 className="m-0 min-w-0 flex-1 font-ibm-plex-serif text-2xl font-bold leading-snug text-gray-900 [overflow-wrap:anywhere]">
                  {formatProductTitleCase(getProductName())}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                  {showPdpSaveBadge ? (
                    <span className="rounded-lg bg-[#19411F] px-3 py-1.5 text-sm font-semibold text-white">
                      Save {pdp.discountPercentage}%
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = resolveProductShareUrl(
                        (product ?? basePack) as { share_url?: string; slug?: string },
                        slug,
                      );
                      if (!shareUrl) return;
                      void shareProductLink({
                        name: getProductName(),
                        shareUrl,
                        description:
                          (product as { short_description?: string } | null)
                            ?.short_description ||
                          (product as { description?: string } | null)?.description,
                      });
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-[#374151] hover:bg-black/5 rounded-full"
                    aria-label="Share product"
                  >
                    <ShareNodesIcon className="text-xl text-[#374151]" size={20} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">₹{formatRupeePdpAmount(pdp.price)}</span>
                {pdp.showStrike ? (
                  <span className="text-xl font-medium text-gray-500 line-through">
                    ₹{formatRupeePdpAmount(pdp.originalPrice)}
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <h3 className="mb-3 text-base font-semibold text-gray-900">Includes</h3>
                <HorizontalScrollSection trackClassName="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar">
                  {bomDisplayRows.length > 0
                    ? bomDisplayRows.map((row) => (
                        <span
                          key={String(row.id)}
                          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-xl border border-[#FAA222] bg-white px-3 py-2 text-sm font-medium text-gray-900"
                        >
                          {row.name}
                        </span>
                      ))
                    : getIncludesFallbackLabels().map((label, index) => (
                        <span
                          key={`${label}-${index}`}
                          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-xl border border-[#FAA222] bg-white px-3 py-2 text-sm font-medium text-gray-900"
                        >
                          {label}
                        </span>
                      ))}
                </HorizontalScrollSection>
                {bomDisplayRows.length === 0 && getIncludesFallbackLabels().length === 0 && (
                  <p className="text-sm text-gray-500">No ingredient list for this product.</p>
                )}
              </div>
            </>
          )}

          {/* Quantity control removed — handled by Add to Basket control below */}

          {/* Combine with Section */}
          {combineProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Combine with</h3>
              <HorizontalScrollSection trackClassName="flex overflow-x-auto gap-3 sm:gap-4 pb-2 no-scrollbar">
                {combineProducts.map((item) => {
                  const itemImage = resolveProductImageUrl(item as unknown as Record<string, unknown>);
                  const itemQty = combineQuantities[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[150px] sm:w-[180px] bg-white rounded-xl shadow-md overflow-hidden"
                    >
                      <div className="h-32 sm:h-40 w-full">
                        <img
                          src={itemImage || "/placeholder.svg"}
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
              </HorizontalScrollSection>
            </div>
          )}

          {/* Add to Basket → same slot as app: Quantity row + View basket after first add */}
          {basketQuantity > 0 ? (
            <div className="mb-6 mt-6">
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="shrink-0 text-base font-medium text-gray-900">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-xl font-medium text-[#374151] transition-colors hover:bg-gray-200 disabled:opacity-60"
                    onClick={() => void handleAdjustBasketQuantity(basketQuantity - 1)}
                    aria-label="Decrease quantity"
                    disabled={isUpdatingBasket}
                  >
                    <span className="leading-none" aria-hidden>
                      −
                    </span>
                  </button>
                  <span className="min-w-9 shrink-0 text-center text-lg font-semibold tabular-nums text-[#111827]">
                    {basketQuantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAA222] text-xl font-medium text-gray-900 transition-colors hover:bg-[#e8941a] disabled:opacity-60"
                    onClick={() => void handleAdjustBasketQuantity(basketQuantity + 1)}
                    aria-label="Increase quantity"
                    disabled={isUpdatingBasket}
                  >
                    <span className="leading-none" aria-hidden>
                      +
                    </span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/basket`)}
                className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FAA222] px-5 py-3.5 text-base font-bold text-gray-900 transition-transform hover:bg-[#e8941a] active:scale-[0.99]"
              >
                <IoCartOutline className="text-xl shrink-0" aria-hidden />
                View basket
                <FaChevronRight className="text-sm opacity-90" aria-hidden />
              </button>
              {stockLimitMessage && (
                <p
                  key={pdpStockShakeNonce}
                  className={`mt-2 text-sm font-semibold text-red-600 ${
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
                  state: {
                    returnUrl: `${basePath}/product/${encodeURIComponent(slug ?? "")}`,
                  },
                })
              }
              className="mb-6 mt-6 flex w-full items-center justify-center rounded-[25px] bg-[#FAA222] py-3.5 text-base font-semibold text-gray-900 transition-colors hover:bg-[#e8941a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!product}
            >
              Log in to add to basket
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleAddToBasket()}
              className="mb-6 mt-6 flex w-full items-center justify-center rounded-[25px] bg-[#FAA222] py-3.5 text-base font-semibold text-gray-900 transition-colors hover:bg-[#e8941a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!product || addingToBasket || orderingStoreOffline}
            >
              {orderingStoreOffline
                ? STORE_OFFLINE_ORDER_BUTTON_LABEL
                : addingToBasket
                  ? "Adding…"
                  : "Add to Basket"}
            </button>
          )}

          {/* Delivery Information Banner — light peach card */}
          {/* <div className="mt-5 sm:mt-6">
            <div className="bg-[#FEF3E2] rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md border border-amber-100/60">
              <img src={deliveryTruckIcon} alt="" className="w-16 h-16 sm:w-[72px] sm:h-[72px] flex-shrink-0 object-contain" />
              <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug flex-1">
                Orders placed before 8 PM will be delivered next day. Sunday deliveries available on request.
              </p>
            </div>
          </div> */}

          {/* Tabs + Content — match gp-store layout (daily accent) */}
          <div className="mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm mb-8">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                {(["Description", "Details", "More"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "text-[#FAA222] border-b-2 border-[#FAA222]"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {isGpDaily && tab === "Details" ? "Product Info" : tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === "Description" && (
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {(product as any)?.short_description?.trim?.() ||
                      getProductDescription() ||
                      "No short description available."}
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
                    {(product as any)?.description?.trim?.() ||
                      (basePack as any)?.description?.trim?.() ||
                      "No additional description."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Best Sellers — same layout as gp-store product detail; daily theme */}
          {bestSellers.length > 0 && (
            <div className="mt-10 mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className={gpDailyHome.sectionHeading}>Best Sellers</h2>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/Products`)}
                  className="inline-flex shrink-0 items-center gap-0.5 py-1"
                >
                  <span className={gpDailyHome.exploreMore}>Explore More</span>
                  <FaChevronRight className={`${gpDailyHome.exploreMore} opacity-80`} />
                </button>
              </div>
              <HorizontalScrollSection trackClassName="gp-h-scroll-track">
                {bestSellers.map((item) => (
                  <div
                    key={item.id ?? item.slug}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleBestSellerCardClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBestSellerCardClick(item);
                      }
                    }}
                    className="gp-store-card-scroll hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#f8f6f1]">
                      <ProductImageTag labels={item.labels} variant="daily" />
                      <img
                        src={resolveProductImageUrl(item as unknown as Record<string, unknown>)}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="gp-store-card-scroll-inner">
                      <h3 className="mb-1 truncate text-sm font-semibold text-gray-900">
                        {formatProductTitleCase(String(item.name ?? ""))}
                      </h3>
                      <div className="mb-1 min-h-[1.25rem] shrink-0">
                        {item.short_description ? (
                          <p className="truncate text-xs text-gray-500">
                            {formatProductTitleCase(String(item.short_description))}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-gray-900">
                          <span>₹{getDiscoveryEffectivePrice(item)}</span>
                          {showStrikeBaseOnDiscoveryCard(item) && (
                            <span className="ml-1 font-medium text-gray-500 line-through">
                              ₹{getDiscoveryBasePrice(item)}
                            </span>
                          )}
                        </p>
                        <FaChevronRight className="flex-shrink-0 text-sm text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </HorizontalScrollSection>
            </div>
          )}
        </div>

        <ExistingSubscriptionModal
          isOpen={showExistingSubscriptionModal}
          onClose={() => setShowExistingSubscriptionModal(false)}
          onViewSubscription={handleViewSubscription}
          subscription={existingSubscription}
        />

        {isGpDaily ? (
          <InsufficientWalletModal
            open={insufficientWalletModal != null}
            details={insufficientWalletModal}
            onClose={() => setInsufficientWalletModal(null)}
            onRecharge={() => {
              const details = insufficientWalletModal;
              setInsufficientWalletModal(null);
              if (!details) return;
              navigateToGpDailyWalletForRecharge(navigate, basePath, {
                shortageAmount: details.shortageAmount,
                currentBalance: details.currentBalance,
                totalRequired: details.requiredAmount,
                returnUrl: `${basePath}/address-selection`,
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ProductPage;
