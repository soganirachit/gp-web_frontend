import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IoArrowBack, IoCreateOutline, IoStorefrontOutline, IoTrashOutline } from 'react-icons/io5';
import { BsCalendar4 } from 'react-icons/bs';
import { MdLocationOn } from 'react-icons/md';
import { FaTag, FaPlus, FaMinus, FaTimes, FaCheck } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useFeatureTheme } from '../../../context/FeatureThemeContext';
import { addressService, Address } from '../../../services/address.service';
import {
  storeService,
  storeIsWithinDeliveryRadius,
  isCartStoreOffline,
} from '../../../services/store.service';
import {
  STORE_OFFLINE_CART_BODY,
  STORE_OFFLINE_CART_TITLE,
} from '../../../config/homeHeroStatusCopy';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isAfter, isBefore, isToday, isTomorrow, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import CartRazorpayPayment from '../../../components/Payment/Rezorpay/CartRazorpayPayment';
import { paymentService } from '../../../services/payment.service';
import { orderService } from '../../../services/order.service';
import { customerService } from '../../../services/getcustomer.service';
import { cartService, type CartData } from '../../../services/cart.service';
import Spinner from '../../../components/common/Spinner';
import { CartPageSkeleton } from '../../../components/common/PageSkeletons';
import { GP_SHEET_DESKTOP_ALIGN_CLASSES } from '../../../components/common/SearchBar';
import api from '../../../services/api';
import { getApiUrl } from '../../../config/api.config';
import { useNetworkRecovery } from '../../../hooks/useNetworkRecovery';
import { SEO } from '../../../components/SEO';
import { trackInitiateCheckout, trackPurchase } from '../../../lib/metaPixel';
import { loadRazorpayScript } from '../../../lib/razorpayLoader';
import { formatPhoneForDisplay } from '../../../utils/phoneDisplay';
import { formatCartDeliveryAddress } from '../../../utils/formatCartDeliveryAddress';
import { CartConfirmModal } from '../../../components/cart/CartConfirmModal';
import {
  SWITCH_STORE_CONFIRM_MESSAGE,
  SWITCH_STORE_CONFIRM_TITLE,
} from '../../../utils/cartConfirmCopy';
import { errorMessageFromCatch, isCartLineUnavailableMessage } from '../../../utils/apiErrorMessage';
import {
  extractCartStockApiMessage,
  formatCartStockInlineMessage,
  isCartStockOrAvailabilityInlineError,
} from '../../../utils/cartStockInlineMessage';
import { DELIVERY_DATE_MAX_DAYS_FROM_TODAY } from '../../../constants/deliveryBooking';
import {
  getSlotWindowMinutes,
  isDeliverySlotSelectableForDate,
} from '../../../utils/deliverySlotSelection';
import emptyCartSvg from '../../../assets/svg/gp_store_svg/cart-empty.svg';

/**
 * Survives component remounts (e.g. React Strict Mode) so we only show one toast per
 * navigation that includes `addressUpdated`, then still clear location.state.
 */
let addressUpdatedToastConsumed = false;
const DELIVERY_DATE_LIMIT_MESSAGE_TEMPLATE =
  'Please choose a delivery date within the next {N} days.';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliverySlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
}

// Format "07:00:00"–"11:00:00" as "7-11am", "12:00:00"–"16:00:00" as "12-4pm"
const formatSlotTimeRange = (start: string, end: string): string => {
  const parse = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    const period = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { h: h12, m: m || 0, period };
  };
  const s = parse(start);
  const e = parse(end);
  const startStr = s.m > 0 ? `${s.h}:${String(s.m).padStart(2, '0')}` : `${s.h}`;
  const endStr = e.m > 0 ? `${e.h}:${String(e.m).padStart(2, '0')}` : `${e.h}`;
  return `${startStr}-${endStr}${e.period}`;
};

const getSlotDisplayLabel = (slot: DeliverySlot): string => {
  if (!slot.start_time || !slot.end_time) return slot.slot_name || '';
  const { start, end } = getSlotWindowMinutes(slot);
  return formatSlotTimeRange(minutesToTimeStr(start), minutesToTimeStr(end));
};

/** For formatSlotTimeRange after normalizing minutes. */
const minutesToTimeStr = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

interface ApplyCouponResponse {
  message?: string;
  discount_amount?: number | string;
  coupon_code?: string;
  subtotal?: number | string;
  total?: number | string;
  tax_amount?: number | string;
  delivery_fee?: number | string;
  surcharge_amount?: number | string;
  delivery_address_id?: number | null;
  [key: string]: any;
}

type CartTotalsState = {
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  surchargeAmount: number;
  total: number;
  deliveryAddressId: number | null;
};

function totalsFromCartData(cartData: CartData): CartTotalsState {
  const id = cartData.delivery_address_id;
  return {
    subtotal: parseFloat(cartData.subtotal || '0') || 0,
    taxAmount: parseFloat(cartData.tax_amount || '0') || 0,
    deliveryFee: parseFloat(cartData.delivery_fee || '0') || 0,
    discountAmount: parseFloat(cartData.discount_amount || '0') || 0,
    surchargeAmount: parseFloat(cartData.surcharge_amount || '0') || 0,
    total: parseFloat(cartData.total || '0') || 0,
    deliveryAddressId: id === undefined || id === null ? null : Number(id),
  };
}

function applyServerCartData(
  cartData: CartData,
  setTotals: React.Dispatch<React.SetStateAction<CartTotalsState | null>>,
  setStoreName: React.Dispatch<React.SetStateAction<string>>,
  setStoreId: React.Dispatch<React.SetStateAction<number | null>>,
) {
  setTotals(totalsFromCartData(cartData));
  setStoreName((cartData.store_name || '').trim());
  const sid = cartData.store;
  if (sid == null) {
    setStoreId(null);
  } else {
    const n = Number(sid as number | string);
    setStoreId(Number.isFinite(n) ? n : null);
  }
}

function promoDiscountFromCartData(cartData: CartData): number {
  const fromCoupon = parseFloat(String(cartData.coupon_discount ?? ''));
  if (Number.isFinite(fromCoupon) && fromCoupon > 0) return fromCoupon;
  return parseFloat(String(cartData.discount_amount ?? '0')) || 0;
}

function cartProductSignatureFromItems(
  items: Array<{
    productId?: number | string;
    variant?: { id?: number } | null;
  }>,
): string {
  return items
    .map((it) => `${it.productId ?? 0}:${it.variant?.id ?? 0}`)
    .sort()
    .join('|');
}

function parseAddressCoordinates(address: Address | null): { lat: number; lng: number } | null {
  const raw = address?.coordinates?.trim();
  if (!raw) return null;
  const [a, b] = raw.split(',').map((s) => parseFloat(s.trim()));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return { lat: a, lng: b };
}

function mergeTotalsFromApplyResponse(
  response: ApplyCouponResponse,
  prev: CartTotalsState | null,
  discountAmt: number
): CartTotalsState {
  const safeDiscount = Number.isFinite(discountAmt) ? discountAmt : parseFloat(String(response.discount_amount ?? 0)) || 0;
  const daid = response.delivery_address_id;
  return {
    subtotal: parseFloat(String(response.subtotal ?? prev?.subtotal ?? 0)) || 0,
    taxAmount: parseFloat(String(response.tax_amount ?? prev?.taxAmount ?? 0)) || 0,
    deliveryFee: parseFloat(String(response.delivery_fee ?? prev?.deliveryFee ?? 0)) || 0,
    discountAmount: safeDiscount,
    surchargeAmount: parseFloat(String(response.surcharge_amount ?? prev?.surchargeAmount ?? 0)) || 0,
    total: parseFloat(String(response.total ?? prev?.total ?? 0)) || 0,
    deliveryAddressId:
      daid === undefined ? (prev?.deliveryAddressId ?? null) : daid === null ? null : Number(daid),
  };
}

// Matches the exact shape returned by GET /api/v1/cart/coupons/
interface Coupon {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | string;
  discount_value: string;
  max_discount_amount: string | null;
  min_order_amount: string;
  valid_to: string;
  first_order_only: boolean;
  scope: string;
  discount_label: string;  // e.g. "10% off (up to ₹100)" – use this directly
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchCoupons = async (): Promise<Coupon[]> => {
  const storeId = storeService.getStoreIdForProducts();
  if (storeId == null) return [];
  const res = await api.get(`${getApiUrl()}/cart/coupons/?store_id=${storeId}`);
  const json = res.data;
  return Array.isArray(json) ? json : (json.data ?? json.results ?? json.coupons ?? []);
};

const applyCouponAPI = async (couponCode: string): Promise<ApplyCouponResponse> => {
  try {
    const res = await api.post(`${getApiUrl()}/cart/apply-coupon/`, { coupon_code: couponCode });
    const body = res.data as { data?: ApplyCouponResponse } | ApplyCouponResponse;
    return (body as { data?: ApplyCouponResponse }).data ?? (body as ApplyCouponResponse);
  } catch (error: unknown) {
    throw new Error(errorMessageFromCatch(error, "Invalid or expired promo code"));
  }
};

const removeCouponAPI = async (): Promise<void> => {
  try {
    await api.post(`${getApiUrl()}/cart/remove-coupon/`, {});
  } catch (error: unknown) {
    throw new Error(errorMessageFromCatch(error, "Failed to remove promo code"));
  }
};

// ─── PromoCodeModal ───────────────────────────────────────────────────────────

interface PromoCodeModalProps {
  onClose: () => void;
  onApply: (code: string) => Promise<{ successMessage?: string } | void>;
  isApplying: boolean;
  appliedCode: string | null;
}

const PromoCodeModal: React.FC<PromoCodeModalProps> = ({ onClose, onApply, isApplying, appliedCode }) => {
  const [manualCode, setManualCode] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  /** Inline feedback below manual entry (replaces toast for apply success/error) */
  const [applyHint, setApplyHint] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  /** Keep sheet anchored to bottom like app; only adapt maxHeight for keyboard/view changes. */
  const [sheetMaxHeight, setSheetMaxHeight] = useState('88dvh');
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const maxH = Math.max(220, Math.min(vv.height * 0.92, window.innerHeight * 0.88));
      setSheetMaxHeight(`${maxH}px`);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  const loadCoupons = async () => {
    try {
      setIsFetchingCoupons(true);
      setFetchError(null);
      const data = await fetchCoupons();
      setCoupons(data);
    } catch {
      setFetchError('Could not load available coupons.');
    } finally {
      setIsFetchingCoupons(false);
    }
  };

  // Fetch as soon as the modal mounts
  useEffect(() => { loadCoupons(); }, []);

  const runApply = async (code: string) => {
    setApplyHint(null);
    try {
      const result = await onApply(code);
      const serverMsg = result && typeof result === 'object' && 'successMessage' in result ? result.successMessage : undefined;
      setApplyHint({
        kind: 'success',
        text: (typeof serverMsg === 'string' && serverMsg.trim()) || `“${code}” applied successfully.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not apply this code.';
      setApplyHint({ kind: 'error', text: msg });
    }
  };

  const handleManualApply = () => {
    if (manualCode.trim()) void runApply(manualCode.trim().toUpperCase());
  };

  return (
    <>
      {/* Backdrop above all app chrome, including bottom nav */}
      <div className="fixed inset-0 z-[99998] bg-black/40" onClick={onClose} aria-hidden />

      {/* Bottom sheet — bottom/maxHeight follow visualViewport so content stays above the keyboard */}
      <div
        className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] z-[99999] flex min-h-0 flex-col rounded-t-[24px] bg-white pb-[max(5.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:bottom-0 sm:rounded-t-[28px] ${GP_SHEET_DESKTOP_ALIGN_CLASSES}`}
        style={{ maxHeight: sheetMaxHeight }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-title"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100">
          <h2 id="promo-modal-title" className="text-base font-bold text-gray-900 sm:text-lg">
            Promo Codes
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FaTimes className="text-gray-600" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3 sm:space-y-5 sm:py-4">

          {/* Manual entry */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm">Enter Promo Code</label>
            <div className="flex gap-2">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.toUpperCase());
                  setApplyHint(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
                onFocus={(e) => {
                  window.setTimeout(() => {
                    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }, 300);
                }}
                placeholder="e.g. POOJA10"
                className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-medium uppercase tracking-wider outline-none transition-colors focus:border-[#19411F] sm:px-4 sm:py-2.5"
              />
              <button
                onClick={handleManualApply}
                disabled={!manualCode.trim() || isApplying}
                className="flex shrink-0 items-center justify-center rounded-xl bg-[#19411F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e5a1c] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5"
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>
            {applyHint ? (
              <p
                role="status"
                className={`mt-2.5 text-xs font-medium leading-snug sm:text-sm ${
                  applyHint.kind === 'success' ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {applyHint.text}
              </p>
            ) : null}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or choose below</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Coupon list from API */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Available Codes</label>

            {isFetchingCoupons ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-[80px] rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : fetchError ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">{fetchError}</p>
                <button
                  onClick={loadCoupons}
                  className="mt-2 text-sm text-[#19411F] font-medium hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No coupons available right now.</p>
            ) : (
              <div className="space-y-3">
                {coupons.map((coupon) => {
                  const isApplied = appliedCode === coupon.code;
                  return (
                    <div
                      key={coupon.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border-2 p-3 transition-colors sm:rounded-2xl sm:p-4 ${
                        isApplied
                          ? 'border-[#19411F] bg-[#f0f7f0]'
                          : 'border-dashed border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FaTag className={`text-base flex-shrink-0 ${isApplied ? 'text-[#19411F]' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          {/* Code + discount badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 tracking-wider text-sm">{coupon.code}</p>
                            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                              {coupon.discount_label}
                            </span>
                          </div>
                          {/* Description */}
                          {coupon.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{coupon.description}</p>
                          )}
                          {/* Min order */}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Min. order ₹{coupon.min_order_amount}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => void runApply(coupon.code)}
                        disabled={isApplying}
                        className={`ml-3 flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                          isApplied
                            ? 'bg-[#19411F] text-white'
                            : 'bg-white border border-[#19411F] text-[#19411F] hover:bg-[#19411F] hover:text-white'
                        }`}
                      >
                        {isApplied ? (
                          <><FaCheck className="text-xs" /> Applied</>
                        ) : isApplying ? (
                          'Applying...'
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main Cart Component ──────────────────────────────────────────────────────

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, phoneNumber: authPhoneNumber } = useAuth();
  const { feature, theme } = useFeatureTheme();
  const browseProductsPath = feature === 'gpStore' ? '/gp-store/products' : '/gp-daily/Products';
  const { storePendingPayment, getPendingPayments, removePendingPayment, retryWithBackoff } = useNetworkRecovery();
  const {
    items,
    deliveryInfo,
    removeFromCart,
    updateQuantity,
    updateDeliveryInfo,
    getTotalPrice,
    syncCartToAPI,
    loadCartFromAPI,
    clearCart,
    isSyncing,
  } = useCart();

  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerRangeMessage, setDatePickerRangeMessage] = useState<string | null>(null);
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'pickDate'>('tomorrow');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  /** Recompute "today" slot eligibility as the clock moves (same calendar day). */
  const [slotsNowTick, setSlotsNowTick] = useState(0);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  // (Bouquet message editing uses inline UI; no overflow menu needed)

  // Check authentication — rely on `isLoggedIn` only (token may hydrate after paint).
  useEffect(() => {
    if (!isLoggedIn) {
      const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
      navigate(`${basePath}/login`, {
        state: { returnUrl: location.pathname, fromCart: true },
        replace: true
      });
    }
  }, [isLoggedIn, navigate, location.pathname, feature]);

  // Listen for tokenRemoved event (session expiration)
  useEffect(() => {
    const handleTokenRemoved = () => {
      const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
      navigate(`${basePath}/login`, { 
        state: { returnUrl: location.pathname, fromCart: true },
        replace: true 
      });
    };

    window.addEventListener('tokenRemoved', handleTokenRemoved);
    return () => {
      window.removeEventListener('tokenRemoved', handleTokenRemoved);
    };
  }, [navigate, location.pathname, feature]);

  useEffect(() => {
    const id = window.setInterval(() => setSlotsNowTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string>('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutInlineError, setCheckoutInlineError] = useState<string | null>(null);
  /** After Razorpay succeeds — verify / poll order (avoid “Preparing payment” copy here). */
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [shouldTriggerPayment, setShouldTriggerPayment] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [razorpayAmount, setRazorpayAmount] = useState<number>(0);
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string; contact?: string }>({});
  const paymentButtonRef = useRef<HTMLButtonElement | null>(null);

  // Promo code state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const appliedPromoCodeRef = useRef<string | null>(null);
  const cartProductSignatureRef = useRef('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoInlineMessage, setPromoInlineMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!promoInlineMessage) return;
    const id = window.setTimeout(() => setPromoInlineMessage(null), 3000);
    return () => window.clearTimeout(id);
  }, [promoInlineMessage]);

  const [cartTotals, setCartTotals] = useState<CartTotalsState | null>(null);
  /** Fulfilment store label for basket (from GET /cart/ `store_name`). */
  const [cartStoreName, setCartStoreName] = useState('');
  /** Numeric store on server cart — used for nearest-store suggestion (app parity). */
  const [cartStoreId, setCartStoreId] = useState<number | null>(null);
  const [isLoadingCartTotals, setIsLoadingCartTotals] = useState(false);
  /** Nearest operational store for saved address — user confirms switch (no auto-switch). */
  const [suggestedStoreForAddress, setSuggestedStoreForAddress] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isSwitchingSuggestedStore, setIsSwitchingSuggestedStore] = useState(false);
  /** Same confirmation as Account store switch (Settings page modal). */
  const [showSuggestedStoreSwitchModal, setShowSuggestedStoreSwitchModal] = useState(false);
  /** Closest store by distance is offline (ordering unavailable). */
  const [deliveryStoreOffline, setDeliveryStoreOffline] = useState(false);
  /** True when selected address is outside service area for current store (validate-coverage API). */
  const [addressOutsideDelivery, setAddressOutsideDelivery] = useState<boolean | null>(null);
  const [isCheckingDeliveryCoverage, setIsCheckingDeliveryCoverage] = useState(false);
  /** After first totals fetch, refreshes (e.g. during checkout) must not show the full-page loader */
  const [hasLoadedCartTotalsOnce, setHasLoadedCartTotalsOnce] = useState(false);
  /** After first successful address + totals + sync idle, checkout must not full-screen when sync runs again */
  const [basketHydratedOnce, setBasketHydratedOnce] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  /** Inline stock message per line item (e.g. after insufficient stock). */
  const [lineStockErrorByItemId, setLineStockErrorByItemId] = useState<Record<string, string>>({});
  /** Product / cart line missing on server — OOS overlay until user deletes the line. */
  const [lineCartStaleByItemId, setLineCartStaleByItemId] = useState<Record<string, boolean>>({});
  /** Remount key so the shake animation restarts on every repeat tap at limit. */
  const [stockShakeVersionByItemId, setStockShakeVersionByItemId] = useState<Record<string, number>>({});

  const triggerStockMessageShake = (itemId: string) => {
    setStockShakeVersionByItemId((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + 1,
    }));
  };

  const deliveryStoreSyncKey = useRef('');

  /**
   * Account "Select Store" is source of truth when set. If the server cart is still on
   * another store, move the basket to the selected store — do not call switchStore(sid)
   * from the cart (that reverted Account choice and showed Sodala vs Malviya mismatch).
   */
  const reconcileCartStoreWithAccountSelection = useCallback(
    async (cartData: CartData): Promise<CartData> => {
      if (!isLoggedIn) return cartData;
      if (cartData.store == null) return cartData;
      const cartStoreNum = Number(cartData.store as number | string);
      if (!Number.isFinite(cartStoreNum)) return cartData;
      try {
        const persisted = storeService.getSelectedStoreId();
        if (persisted == null) {
          await storeService.switchStore(cartStoreNum);
          return cartData;
        }
        if (persisted === cartStoreNum) return cartData;
        await cartService.switchCartStore(persisted);
        return await cartService.getCartData();
      } catch {
        return cartData;
      }
    },
    [isLoggedIn],
  );

  const navigateToProductDetail = (item: (typeof items)[number]) => {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    if (feature === 'gpStore') {
      const slug = item.productSlug?.trim();
      if (!slug) return;
      navigate(`${basePath}/product/${encodeURIComponent(slug)}`);
      return;
    }
    const dailySlug = item.productSlug?.trim();
    if (dailySlug) {
      navigate(`${basePath}/product/${encodeURIComponent(dailySlug)}`);
      return;
    }
    if (!item.productId) return;
    navigate(`${basePath}/product/${encodeURIComponent(String(item.productId))}`);
  };

  const isSlotSelectable = (slot: DeliverySlot, date: Date) =>
    isDeliverySlotSelectableForDate(slot, date);

  const sortSlotsByStart = (slots: DeliverySlot[]) =>
    [...slots].sort(
      (a, b) => getSlotWindowMinutes(a).start - getSlotWindowMinutes(b).start,
    );

  /** Slots the user can actually book for the currently selected delivery date (past slots for "today" are omitted from UI). */
  const slotsToShow = useMemo(() => {
    const raw =
      deliveryInfo?.selectedDate instanceof Date
        ? deliveryInfo.selectedDate
        : deliveryInfo?.selectedDate
          ? new Date(deliveryInfo.selectedDate)
          : new Date();
    const day = startOfDay(raw);
    return sortSlotsByStart(availableSlots.filter((slot) => isSlotSelectable(slot, day)));
  }, [availableSlots, deliveryInfo?.selectedDate, slotsNowTick]);

  // If the clock passes a slot start (e.g. 5–8pm after 5:00 PM), drop stale selection.
  useEffect(() => {
    if (isLoadingSlots || slotsToShow.length === 0) return;
    if (selectedSlotId != null && slotsToShow.some((s) => s.id === selectedSlotId)) {
      return;
    }
    const first = slotsToShow[0];
    const label = getSlotDisplayLabel(first);
    setSelectedSlotId(first.id);
    setSelectedTimeSlot(label);
    if (!deliveryInfo?.deliveryDate) return;
    updateDeliveryInfo({
      ...deliveryInfo,
      timeSlot: label,
      slotId: first.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to slot list + selection only
  }, [slotsToShow, selectedSlotId, isLoadingSlots]);

  /** True when at least one slot can still be booked for today (after load). */
  const hasSelectableTodaySlots = useMemo(() => {
    const today = startOfDay(new Date());
    return availableSlots.some((slot) => isSlotSelectable(slot, today));
  }, [availableSlots, slotsNowTick]);

  const deliveryDateMaxStart = useMemo(
    () => startOfDay(addDays(new Date(), DELIVERY_DATE_MAX_DAYS_FROM_TODAY)),
    [slotsNowTick],
  );

  /** Matches `DatePicker` minDate (today vs tomorrow when today has no bookable slots). */
  const datePickerMinStart = useMemo(
    () =>
      isLoadingSlots || hasSelectableTodaySlots
        ? startOfDay(new Date())
        : addDays(startOfDay(new Date()), 1),
    [isLoadingSlots, hasSelectableTodaySlots, slotsNowTick],
  );

  const datePickerSelected = useMemo(() => {
    if (!deliveryInfo?.selectedDate) return null;
    const d = startOfDay(
      deliveryInfo.selectedDate instanceof Date
        ? deliveryInfo.selectedDate
        : new Date(deliveryInfo.selectedDate),
    );
    return isAfter(d, deliveryDateMaxStart) ? deliveryDateMaxStart : d;
  }, [deliveryInfo?.selectedDate, deliveryDateMaxStart]);

  useEffect(() => {
    const state = location.state as { addressUpdated?: boolean } | null;
    if (!state?.addressUpdated) {
      addressUpdatedToastConsumed = false;
      return;
    }
    if (addressUpdatedToastConsumed) {
      navigate('.', { replace: true, state: {} });
      return;
    }
    addressUpdatedToastConsumed = true;
    toast.success('Address updated.', { duration: 2200 });
    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!showPromoModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPromoModal]);

  // Apply promo code
  const handleApplyPromoCode = async (code: string): Promise<{ successMessage?: string } | void> => {
    if (!code) return;
    try {
      setPromoInlineMessage(null);
      setIsApplyingPromo(true);
      const response = await applyCouponAPI(code);

      const discountAmt = parseFloat(String(response.discount_amount ?? 0));
      setPromoDiscount(Number.isFinite(discountAmt) ? discountAmt : 0);

      // If the response contains updated totals, use them directly
      if (response.total !== undefined || response.subtotal !== undefined) {
        const d = Number.isFinite(discountAmt) ? discountAmt : 0;
        setCartTotals((prev) => mergeTotalsFromApplyResponse(response, prev, d));
      } else {
        try {
          const raw = await cartService.getCartData();
          const cartData = await reconcileCartStoreWithAccountSelection(raw);
          applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
        } catch (_) {}
      }

      setAppliedPromoCode(code);
      setPromoInlineMessage({ kind: 'success', text: 'Coupon applied successfully' });
      return {
        successMessage: typeof response.message === 'string' ? response.message.trim() : undefined,
      };
    } catch (error: any) {
      setPromoInlineMessage({
        kind: 'error',
        text: error?.message || 'Failed to apply promo code',
      });
      throw new Error(error?.message || 'Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = async () => {
    try {
      setPromoInlineMessage(null);
      setIsApplyingPromo(true);
      await removeCouponAPI();
      setAppliedPromoCode(null);
      setPromoDiscount(0);
      const raw = await cartService.getCartData();
      const cartData = await reconcileCartStoreWithAccountSelection(raw);
      applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
      setPromoInlineMessage({ kind: 'success', text: 'Coupon removed' });
    } catch (error: any) {
      setPromoInlineMessage({
        kind: 'error',
        text: error.message || 'Failed to remove promo code',
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Automatically remove applied promo when leaving the basket page
  useEffect(() => {
    appliedPromoCodeRef.current = appliedPromoCode;
  }, [appliedPromoCode]);

  useEffect(() => {
    return () => {
      if (appliedPromoCodeRef.current) {
        removeCouponAPI().catch((err) => {
          console.error('Failed to auto-remove promo code on navigation:', err);
        });
      }
    };
  }, []);

  useEffect(() => {
    const sig = cartProductSignatureFromItems(items);
    const prev = cartProductSignatureRef.current;
    if (prev) {
      const prevSet = new Set(prev.split('|').filter(Boolean));
      const addedNew = sig
        .split('|')
        .filter(Boolean)
        .some((key) => !prevSet.has(key));
      if (addedNew && appliedPromoCodeRef.current) {
        void handleRemovePromoCode();
      }
    }
    cartProductSignatureRef.current = sig;
  }, [items]);

  // Preload Razorpay SDK when basket opens so checkout is not blocked on first load
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  // Open Razorpay only after SDK is ready (avoids "Payment gateway is not ready")
  useEffect(() => {
    if (!shouldTriggerPayment) return;
    let cancelled = false;
    (async () => {
      try {
        await loadRazorpayScript();
        if (cancelled) return;
        requestAnimationFrame(() => paymentButtonRef.current?.click());
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Payment could not start. Please try again.');
        setShouldTriggerPayment(false);
        setIsProcessingPayment(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldTriggerPayment]);

  // Fetch available delivery slots for a given date from the backend.
  // Falls back to empty array on error — checkout button will show a message.
  const fetchSlotsForDate = async (date: Date) => {
    const normalizedDate = startOfDay(date);
    const formattedDate = format(normalizedDate, 'dd MMM yyyy');
    setIsLoadingSlots(true);
    try {
      const storeId = cartStoreId ?? storeService.getStoreIdForProducts();
      if (storeId == null) {
        setAvailableSlots([]);
        setSelectedSlotId(null);
        setSelectedTimeSlot('');
        return;
      }
      const params = new URLSearchParams();
      params.set('store_id', String(storeId));
      const response = await api.get(`/delivery/slots/available/?${params.toString()}`);
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data ?? response.data?.results ?? []);
      // API returns [{ slot: { id, slot_name, start_time, end_time }, is_available }, ...] — flatten and filter
      const slots: DeliverySlot[] = sortSlotsByStart(
        raw
          .filter((item: any) => item?.is_available !== false && item?.slot)
          .map((item: any) => {
            const s = item.slot;
            return { id: s.id, slot_name: s.slot_name, start_time: s.start_time, end_time: s.end_time };
          }),
      );
      setAvailableSlots(slots);
      const selectableSlots = slots.filter((slot) => isSlotSelectable(slot, normalizedDate));
      // Auto-select only selectable slots for today; keep existing behavior for other dates.
      if (selectableSlots.length > 0) {
        const restored = deliveryInfo?.slotId
          ? selectableSlots.find(s => s.id === deliveryInfo.slotId)
          : null;
        const toSelect = restored ?? selectableSlots[0];
        setSelectedSlotId(toSelect.id);
        setSelectedTimeSlot(getSlotDisplayLabel(toSelect));
        updateDeliveryInfo({
          ...(deliveryInfo ?? {}),
          deliveryDate: formattedDate,
          selectedDate: normalizedDate,
          timeSlot: getSlotDisplayLabel(toSelect),
          slotId: toSelect.id,
        });
      } else {
        setSelectedSlotId(null);
        setSelectedTimeSlot('');
        updateDeliveryInfo({
          ...(deliveryInfo ?? {}),
          deliveryDate: formattedDate,
          selectedDate: normalizedDate,
          timeSlot: '',
          slotId: undefined,
        });
      }
    } catch {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setSelectedTimeSlot('');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // If "Today" has no bookable slots, hide it and move selection off "today" (e.g. to tomorrow).
  useEffect(() => {
    if (isLoadingSlots) return;
    const today = startOfDay(new Date());
    const hasTodaySlots = availableSlots.some((s) => isSlotSelectable(s, today));
    if (hasTodaySlots) return;
    if (selectedDateOption !== 'today') return;
    const tomorrow = addDays(new Date(), 1);
    setSelectedDateOption('tomorrow');
    updateDeliveryInfo({
      ...(deliveryInfo ?? {}),
      deliveryDate: format(tomorrow, 'dd MMM yyyy'),
      timeSlot: '',
      slotId: undefined,
      selectedDate: tomorrow,
    });
    fetchSlotsForDate(tomorrow);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when slot data proves today is unavailable
  }, [isLoadingSlots, availableSlots, selectedDateOption]);

  // Load cart from API on mount
  useEffect(() => {
    const loadCart = async () => {
      if (isLoggedIn) {
        setIsInitialLoading(true);
        const fromCart = location.state?.fromCart;
        const hasTempCart = localStorage.getItem('gp_store_temp_cart');
        if (fromCart && hasTempCart) {
          let attempts = 0;
          const maxAttempts = 20;
          const checkSync = setInterval(async () => {
            attempts++;
            const stillHasTempCart = localStorage.getItem('gp_store_temp_cart');
            const hasLocalItems = items.length > 0;
            if ((!stillHasTempCart && !isSyncing) || (hasLocalItems && !isSyncing && attempts > 3)) {
              clearInterval(checkSync);
              setTimeout(async () => { 
                await loadCartFromAPI();
              }, 500);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkSync);
              await loadCartFromAPI();
            }
          }, 200);
          return () => clearInterval(checkSync);
        } else {
          await loadCartFromAPI();
        }
      } else {
        setIsInitialLoading(false);
      }
    };
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, location.state]);

  // Set initial loading to false once cart, address, and totals are all loaded
  useEffect(() => {
    if (isLoggedIn) {
      if (!isLoadingAddress && !isLoadingCartTotals && !isSyncing) {
        // Small delay to ensure all state updates are complete
        const timer = setTimeout(() => {
          setIsInitialLoading(false);
          setBasketHydratedOnce(true);
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      setIsInitialLoading(false);
      setBasketHydratedOnce(true);
    }
  }, [isLoggedIn, isLoadingAddress, isLoadingCartTotals, isSyncing]);

  // Fetch cart totals — debounce so rapid `items` updates (context/local sync) don't spam GET /cart/.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        if (!isLoggedIn) return;
        try {
          setIsLoadingCartTotals(true);
          const raw = await cartService.getCartData();
          const cartData = await reconcileCartStoreWithAccountSelection(raw);
          const activeCode = appliedPromoCodeRef.current;
          if (activeCode) {
            try {
              const response = await applyCouponAPI(activeCode);
              const discountAmt = parseFloat(String(response.discount_amount ?? 0));
              setPromoDiscount(Number.isFinite(discountAmt) ? discountAmt : 0);
              if (response.total !== undefined || response.subtotal !== undefined) {
                const d = Number.isFinite(discountAmt) ? discountAmt : 0;
                setCartTotals((prev) => mergeTotalsFromApplyResponse(response, prev, d));
              } else {
                applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
              }
              setAppliedPromoCode(activeCode);
              return;
            } catch {
              await removeCouponAPI().catch(() => {});
              setAppliedPromoCode(null);
              setPromoDiscount(0);
            }
          }
          applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
          if (cartData.coupon_code) {
            setAppliedPromoCode(String(cartData.coupon_code));
            setPromoDiscount(promoDiscountFromCartData(cartData));
          } else if (!appliedPromoCodeRef.current) {
            setAppliedPromoCode(null);
            setPromoDiscount(0);
          }
        } catch (_) {
          setCartTotals(null);
          setCartStoreName('');
          setCartStoreId(null);
        } finally {
          setIsLoadingCartTotals(false);
          setHasLoadedCartTotalsOnce(true);
        }
      })();
    }, 320);
    return () => clearTimeout(id);
  }, [isLoggedIn, items, reconcileCartStoreWithAccountSelection]);

  // Nearest operational store vs cart store — suggest switch (app parity; no auto-switch).
  useEffect(() => {
    if (!isLoggedIn || !defaultAddress || isLoadingCartTotals) return;
    const addrId = String(defaultAddress.id ?? '');
    const key = `${addrId}:${cartStoreId ?? ''}`;
    if (deliveryStoreSyncKey.current === key) return;

    const coords = parseAddressCoordinates(defaultAddress);
    if (!coords) {
      setDeliveryStoreOffline(false);
      setSuggestedStoreForAddress(null);
      deliveryStoreSyncKey.current = key;
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const storesList = await storeService.getAllStores(coords.lat, coords.lng);
        if (cancelled) return;

        if (cartStoreId != null && isCartStoreOffline(cartStoreId, storesList)) {
          setDeliveryStoreOffline(true);
          const operational = await storeService.getNearestStore(coords.lat, coords.lng);
          if (operational && operational.id !== cartStoreId) {
            setSuggestedStoreForAddress({ id: operational.id, name: operational.name });
          } else {
            setSuggestedStoreForAddress(null);
          }
          deliveryStoreSyncKey.current = key;
          return;
        }

        const operational = await storeService.getNearestStore(coords.lat, coords.lng);
        if (cancelled) return;
        if (operational) {
          setDeliveryStoreOffline(false);
          if (cartStoreId != null && operational.id !== cartStoreId) {
            const currentRow = storesList.find((s) => s.id === cartStoreId);
            if (currentRow && storeIsWithinDeliveryRadius(currentRow)) {
              setSuggestedStoreForAddress(null);
            } else {
              setSuggestedStoreForAddress({ id: operational.id, name: operational.name });
            }
          } else {
            setSuggestedStoreForAddress(null);
          }
          deliveryStoreSyncKey.current = key;
          return;
        }

        setSuggestedStoreForAddress(null);
        const stores = storesList;
        if (cancelled) return;
        const sorted = [...stores].sort((a, b) => {
          const da = Number(a.distance_km);
          const db = Number(b.distance_km);
          const na = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
          const nb = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
          return na - nb;
        });
        const nearestAny = sorted[0];
        if (!nearestAny) {
          setDeliveryStoreOffline(false);
          deliveryStoreSyncKey.current = key;
          return;
        }
        if (nearestAny.is_online === false) {
          setDeliveryStoreOffline(true);
          deliveryStoreSyncKey.current = key;
          return;
        }
        setDeliveryStoreOffline(false);
        deliveryStoreSyncKey.current = key;
      } catch {
        if (!cancelled) {
          setDeliveryStoreOffline(false);
          setSuggestedStoreForAddress(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, defaultAddress, isLoadingCartTotals, cartStoreId]);

  // Sync selected profile address to server cart so delivery_fee matches checkout (distance-based).
  useEffect(() => {
    if (!isLoggedIn || !defaultAddress?.id) return;
    const id = parseInt(String(defaultAddress.id), 10);
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await cartService.setCartDeliveryAddress(id);
        if (!cancelled) {
          const cartData = await reconcileCartStoreWithAccountSelection(raw);
          applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
        }
      } catch (e) {
        console.warn('cart delivery-address sync failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, defaultAddress?.id, reconcileCartStoreWithAccountSelection]);

  // Selected address vs store coverage (same API as address save flow).
  useEffect(() => {
    if (!isLoggedIn) {
      setAddressOutsideDelivery(null);
      return;
    }
    const coords = defaultAddress?.coordinates;
    if (!coords || !addressService.validateCoordinatesFormat(coords)) {
      setAddressOutsideDelivery(null);
      return;
    }
    let cancelled = false;
    setIsCheckingDeliveryCoverage(true);
    void addressService
      .validateAddressInDeliveryArea(coords)
      .then((res) => {
        if (!cancelled) setAddressOutsideDelivery(!res.isValid);
      })
      .catch(() => {
        if (!cancelled) setAddressOutsideDelivery(null);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingDeliveryCoverage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, defaultAddress?.coordinates, defaultAddress?.id]);

  // If cart payload omits `store_name`, resolve label from cart / selected store id.
  useEffect(() => {
    if (!isLoggedIn || cartStoreName.trim()) return;
    const sid = cartStoreId ?? storeService.getStoreIdForProducts();
    if (!sid) return;
    let cancelled = false;
    void storeService
      .getAllStores()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((s) => s.id === sid);
        if (found?.name) setCartStoreName(found.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, cartStoreName, cartStoreId, items.length]);

  // Prefill Razorpay contact/name/email from profile (state was never set before → empty mobile on Razorpay)
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const customers = await customerService.getAllCustomers();
        const c = customers[0];
        if (!c || cancelled) return;
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
        const email = (c.emailAddress || '').trim();
        const contact = formatPhoneForDisplay(c.phoneNumber);
        setCustomerInfo((prev) => ({
          ...prev,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(contact ? { contact } : {}),
        }));
      } catch (_) {
        /* profile optional for checkout; fallbacks below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Fetch address
  useEffect(() => {
    const fetchAddress = async () => {
      if (!isLoggedIn) { 
        setIsLoadingAddress(false);
        return; 
      }
      if (location.state?.selectedAddress) {
        setDefaultAddress(location.state.selectedAddress);
        setIsLoadingAddress(false);
        return;
      }
      const storedAddress = localStorage.getItem('selectedDeliveryAddress');
      if (storedAddress) {
        try {
          const parsed = JSON.parse(storedAddress);
          const currentUserId = localStorage.getItem('userId');
          const addrUserId = parsed?.userId?.toString();
          if (currentUserId && addrUserId && addrUserId !== currentUserId) {
            // Stale address from a different user session — discard it
            localStorage.removeItem('selectedDeliveryAddress');
          } else {
            setDefaultAddress(parsed);
            setIsLoadingAddress(false);
            return;
          }
        } catch (_) {}
      }
      try {
        setIsLoadingAddress(true);
        const addresses = await addressService.getAllAddresses();
        setDefaultAddress(addresses.find(a => a.isDefault) || addresses[0] || null);
      } catch (_) {
        setDefaultAddress(null);
      } finally {
        setIsLoadingAddress(false);
      }
    };
    fetchAddress();
  }, [isLoggedIn, location.state]);

  // Init delivery info and fetch slots for the current/default date
  useEffect(() => {
    const tomorrow = addDays(new Date(), 1);
    if (!deliveryInfo) {
      updateDeliveryInfo({ deliveryDate: format(tomorrow, 'dd MMM yyyy'), timeSlot: '', selectedDate: tomorrow });
      setSelectedDateOption('tomorrow');
      fetchSlotsForDate(tomorrow);
    } else {
      let dateObj = deliveryInfo.selectedDate instanceof Date
        ? deliveryInfo.selectedDate
        : deliveryInfo.selectedDate
          ? new Date(deliveryInfo.selectedDate)
          : tomorrow;
      const maxStart = startOfDay(addDays(new Date(), DELIVERY_DATE_MAX_DAYS_FROM_TODAY));
      if (isAfter(startOfDay(dateObj), maxStart)) {
        dateObj = maxStart;
        updateDeliveryInfo({
          ...(deliveryInfo ?? {}),
          deliveryDate: format(dateObj, 'dd MMM yyyy'),
          timeSlot: '',
          slotId: undefined,
          selectedDate: dateObj,
        });
      }
      if (isToday(dateObj)) setSelectedDateOption('today');
      else if (isTomorrow(dateObj)) setSelectedDateOption('tomorrow');
      else {
        setSelectedDateOption('pickDate');
      }
      // Restore display label from stored slot, then fetch fresh slots
      if (deliveryInfo.timeSlot) setSelectedTimeSlot(deliveryInfo.timeSlot);
      if (deliveryInfo.slotId) setSelectedSlotId(deliveryInfo.slotId);
      fetchSlotsForDate(dateObj);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Lets users tap greyed days and see why (react-datepicker does not call onChange for disabled days). */
  const renderDeliveryDayContents = useCallback(
    (dayOfMonth: number, date?: Date) => {
      if (!date) return dayOfMonth;
      const d = startOfDay(date);
      const tooEarly = isBefore(d, datePickerMinStart);
      const tooLate = isAfter(d, deliveryDateMaxStart);
      if (!tooEarly && !tooLate) {
        return dayOfMonth;
      }
      return (
        <span
          className="inline-flex size-full min-h-[2.5rem] min-w-[2.5rem] items-center justify-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tooLate) {
              setDatePickerRangeMessage(
                `You can only pre-order up to ${DELIVERY_DATE_MAX_DAYS_FROM_TODAY} days in advance.`,
              );
            } else {
              setDatePickerRangeMessage("That date isn’t available for delivery.");
            }
          }}
        >
          {dayOfMonth}
        </span>
      );
    },
    [datePickerMinStart, deliveryDateMaxStart],
  );

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'pickDate') => {
    setCheckoutInlineError(null);
    setSelectedDateOption(option);
    if (option === 'pickDate') {
      setDatePickerRangeMessage(null);
      setShowDatePicker(true);
      return;
    }
    const dateMap = { today: new Date(), tomorrow: addDays(new Date(), 1) } as const;
    const selectedDate = startOfDay(dateMap[option]);
    updateDeliveryInfo({ deliveryDate: format(selectedDate, 'dd MMM yyyy'), timeSlot: '', slotId: undefined, selectedDate });
    fetchSlotsForDate(selectedDate);
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
      setCheckoutInlineError(null);
      const pickedDate = startOfDay(date);
      if (isBefore(pickedDate, datePickerMinStart)) {
        setDatePickerRangeMessage("That date isn’t available for delivery.");
        return;
      }
      if (isAfter(pickedDate, deliveryDateMaxStart)) {
        setDatePickerRangeMessage(
          `You can only pre-order up to ${DELIVERY_DATE_MAX_DAYS_FROM_TODAY} days in advance.`,
        );
        return;
      }
      setDatePickerRangeMessage(null);
      setShowDatePicker(false);
      if (isToday(pickedDate)) setSelectedDateOption('today');
      else if (isTomorrow(pickedDate)) setSelectedDateOption('tomorrow');
      else setSelectedDateOption('pickDate');
      updateDeliveryInfo({ deliveryDate: format(pickedDate, 'dd MMM yyyy'), timeSlot: '', slotId: undefined, selectedDate: pickedDate });
      fetchSlotsForDate(pickedDate);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setDatePickerRangeMessage(null);
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent background scroll while date picker is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [showDatePicker]);

  const handleTimeSlotSelect = (slot: DeliverySlot) => {
    const selectedDate =
      deliveryInfo?.selectedDate instanceof Date
        ? deliveryInfo.selectedDate
        : deliveryInfo?.selectedDate
        ? new Date(deliveryInfo.selectedDate)
        : new Date();
    if (!isSlotSelectable(slot, selectedDate)) return;
    setCheckoutInlineError(null);
    setSelectedSlotId(slot.id);
    setSelectedTimeSlot(getSlotDisplayLabel(slot));
    if (deliveryInfo) updateDeliveryInfo({ ...deliveryInfo, timeSlot: getSlotDisplayLabel(slot), slotId: slot.id });
  };

  /** Must match StoreProductsDisplayPage: only category "bouquet" lines get custom messages on PDP. */
  const isBouquetItem = (item: (typeof items)[number]) => {
    const categorySlug = item.categorySlug?.toLowerCase() ?? '';
    return categorySlug.includes('bouquet');
  };

  const handleEditItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !isBouquetItem(item)) return;
    setEditingItemId(itemId);
    setEditMessage(item.customizedMessage || '');
  };

  const handleSaveEdit = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await updateQuantity(itemId, item.quantity, editMessage.trim());
      setEditingItemId(null);
      toast.success('Message updated');
    } catch (error: unknown) {
      toast.error(errorMessageFromCatch(error, "Failed to update message. Please try again."));
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditMessage('');
  };

  const hasStaleCartLine = useMemo(
    () => items.some((it) => lineCartStaleByItemId[it.id]),
    [items, lineCartStaleByItemId],
  );

  useEffect(() => {
    setLineCartStaleByItemId((prev) => {
      const ids = new Set(items.map((i) => i.id));
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!ids.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const handleQuantityDelta = async (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (lineCartStaleByItemId[itemId]) return;
    if (delta > 0 && lineStockErrorByItemId[itemId]) {
      triggerStockMessageShake(itemId);
      return;
    }
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity && delta < 0) return;
    try {
      await updateQuantity(itemId, next, item.customizedMessage || '');
      setLineCartStaleByItemId((prev) => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
      setLineStockErrorByItemId((prev) => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
      setStockShakeVersionByItemId((prev) => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
    } catch (error: unknown) {
      const apiMessage = extractCartStockApiMessage(error);
      if (isCartLineUnavailableMessage(apiMessage)) {
        setLineCartStaleByItemId((prev) => ({ ...prev, [itemId]: true }));
        return;
      }
      if (isCartStockOrAvailabilityInlineError(apiMessage)) {
        setLineStockErrorByItemId((prev) => ({
          ...prev,
          [itemId]: formatCartStockInlineMessage(apiMessage),
        }));
      } else {
        toast.error(
          apiMessage.trim() || errorMessageFromCatch(error, 'Could not update quantity.'),
        );
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      toast.success('Item removed from cart');
    } catch (_) {
      toast.error('Failed to remove item. Please try again.');
    }
  };

  const handleEditAddress = () => {
    const addressPath = feature === 'gpStore' ? '/gp-store/address-selection' : '/gp-daily/address-selection';
    navigate(addressPath, { state: { fromCart: true } });
  };

  const performSwitchToSuggestedStore = async () => {
    if (!suggestedStoreForAddress) {
      setShowSuggestedStoreSwitchModal(false);
      return;
    }
    const target = suggestedStoreForAddress;
    try {
      setIsSwitchingSuggestedStore(true);
      await cartService.switchCartStore(target.id);
      await storeService.switchStore(target.id);
      deliveryStoreSyncKey.current = '';
      await loadCartFromAPI();
      setIsLoadingCartTotals(true);
      try {
        const raw = await cartService.getCartData();
        const cartData = await reconcileCartStoreWithAccountSelection(raw);
        applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
      } catch (_) {
        setCartTotals(null);
        setCartStoreName('');
        setCartStoreId(null);
      } finally {
        setIsLoadingCartTotals(false);
      }
      setSuggestedStoreForAddress(null);
      setShowSuggestedStoreSwitchModal(false);
      toast.success(`Store switched to ${target.name}.`);
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, 'Could not switch store for this address.'));
    } finally {
      setIsSwitchingSuggestedStore(false);
    }
  };

  const openSuggestedStoreSwitchModal = () => {
    if (!suggestedStoreForAddress) return;
    setShowSuggestedStoreSwitchModal(true);
  };

  const cancelSuggestedStoreSwitchModal = () => {
    setShowSuggestedStoreSwitchModal(false);
  };

  const handleCheckout = async () => {
    setCheckoutInlineError(null);
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (hasStaleCartLine) {
      toast.error('Remove unavailable items from your basket before checkout.');
      return;
    }
    if (!deliveryInfo) { toast.error('Please select delivery date and time'); return; }
    if (!isLoggedIn) {
      navigate(`${basePath}/login`, { state: { returnUrl: `${basePath}/basket`, fromCart: true } });
      return;
    }

    let latestCartData: CartData | null = null;
    try {
      await syncCartToAPI();
      await loadCartFromAPI();
      try {
        setIsLoadingCartTotals(true);
        const raw = await cartService.getCartData();
        const cartData = await reconcileCartStoreWithAccountSelection(raw);
        latestCartData = cartData;
        applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
      } catch (_) {} finally { setIsLoadingCartTotals(false); }
    } catch (_) {
      toast.error("We couldn't update your basket. Check your connection and try checkout again.");
      return;
    }

    if (!defaultAddress) { toast.error('Please add a delivery address'); navigate(`${basePath}/addresses`); return; }

    if (addressOutsideDelivery === true) {
      toast.error(
        'We are not delivering to this address from your current store. Open Account to change store, or choose a different address.',
      );
      return;
    }

    if (suggestedStoreForAddress) {
      toast.error(
        'Use "Switch store" below for this delivery address, or choose another address.',
      );
      return;
    }
    if (deliveryStoreOffline) {
      toast.error(STORE_OFFLINE_CART_BODY);
      setCheckoutInlineError(STORE_OFFLINE_CART_BODY);
      return;
    }

    if (!selectedSlotId) {
      setCheckoutInlineError('Please choose an available delivery time slot.');
      return;
    }

    const selectedDeliveryDay = deliveryInfo.selectedDate
      ? startOfDay(
          deliveryInfo.selectedDate instanceof Date
            ? deliveryInfo.selectedDate
            : new Date(deliveryInfo.selectedDate),
        )
      : null;
    if (
      selectedDeliveryDay &&
      isAfter(selectedDeliveryDay, deliveryDateMaxStart)
    ) {
      setCheckoutInlineError(
        DELIVERY_DATE_LIMIT_MESSAGE_TEMPLATE.replace(
          '{N}',
          String(DELIVERY_DATE_MAX_DAYS_FROM_TODAY),
        ),
      );
      return;
    }

    const checkoutCoords = parseAddressCoordinates(defaultAddress);
    if (!checkoutCoords) {
      toast.error(
        'This delivery address has no map location. Please edit the address and try again.',
      );
      return;
    }

    try {
      const cartForStore = latestCartData ?? (await cartService.getCartData());
      const storeIdForCheckout =
        typeof cartForStore.store === 'number' ? cartForStore.store : null;

      const operational = await storeService.getNearestStore(
        checkoutCoords.lat,
        checkoutCoords.lng,
      );
      if (operational) {
        if (storeIdForCheckout != null && storeIdForCheckout !== operational.id) {
          const storesList = await storeService.getAllStores(
            checkoutCoords.lat,
            checkoutCoords.lng,
          );
          const currentRow = storesList.find((s) => s.id === storeIdForCheckout);
          if (!(currentRow && storeIsWithinDeliveryRadius(currentRow))) {
            toast.error(
              'Use "Switch store" below for this delivery address, or choose another address.',
            );
            return;
          }
        }
        setDeliveryStoreOffline(false);
      } else {
        const storesNear = await storeService.getAllStores(checkoutCoords.lat, checkoutCoords.lng);
        const sorted = [...storesNear].sort((a, b) => {
          const da = Number(a.distance_km);
          const db = Number(b.distance_km);
          const na = Number.isFinite(da) ? da : Number.POSITIVE_INFINITY;
          const nb = Number.isFinite(db) ? db : Number.POSITIVE_INFINITY;
          return na - nb;
        });
        const nearestAny = sorted[0];
        if (nearestAny?.is_online === false) {
          setDeliveryStoreOffline(true);
          toast.error(
            'Sorry — the nearest store for this address is offline.',
          );
          return;
        }
        setDeliveryStoreOffline(false);
      }

      const storesNearAddress = await storeService.getAllStores(
        checkoutCoords.lat,
        checkoutCoords.lng,
      );
      const storeRow = storesNearAddress.find((s) => s.id === storeIdForCheckout);
      if (storeRow && storeRow.is_online === false) {
        setDeliveryStoreOffline(true);
        toast.error('Sorry — this store is currently offline.');
        return;
      }
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, 'Could not verify the store for this delivery address.'));
      return;
    }

    try {
      setIsProcessingPayment(true);
      let deliveryDateFormatted: string | undefined;
      if (deliveryInfo.selectedDate) {
        deliveryDateFormatted = format(deliveryInfo.selectedDate, 'yyyy-MM-dd');
      } else if (deliveryInfo.deliveryDate) {
        try { deliveryDateFormatted = format(new Date(deliveryInfo.deliveryDate), 'yyyy-MM-dd'); }
        catch { deliveryDateFormatted = format(addDays(new Date(), 1), 'yyyy-MM-dd'); }
      }
      const customerNotesFromCart = items
        .map((i) => (i.customizedMessage || '').trim())
        .filter(Boolean)
        .join('\n');

      const checkoutData = {
        delivery_address_id: Number(defaultAddress.id),
        delivery_slot_id: selectedSlotId,
        delivery_date: deliveryDateFormatted,
        delivery_instructions: '',
        customer_notes: customerNotesFromCart,
      };
      const checkoutResponse = await paymentService.createCheckoutOrder(checkoutData);
      const normalizedRazorpayOrderId = checkoutResponse.razorpay_order_id || (checkoutResponse as any).order?.id || checkoutResponse.order_id;
      const normalizedAmount = checkoutResponse.amount ?? (checkoutResponse as any).order?.amount;
      const rpKey = checkoutResponse.key_id || import.meta.env.VITE_RAZORPAY_KEY || '';
      if (!rpKey) throw new Error('Razorpay key not found.');
      if (!normalizedRazorpayOrderId) throw new Error('Failed to start payment: missing Razorpay order id.');
      setRazorpayOrderId(normalizedRazorpayOrderId);
      setRazorpayKey(rpKey);
      setRazorpayAmount(typeof normalizedAmount === 'number' ? normalizedAmount : Math.round(total * 100));
      setShouldTriggerPayment(true);
      setIsProcessingPayment(false);
      // Pixel: InitiateCheckout — fire when Razorpay checkout is triggered
      trackInitiateCheckout(
        items.map(item => ({ id: item.productId, price: item.price, quantity: item.quantity })),
        total
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Failed to initiate payment. Please try again.';
      toast.error(msg);
      setIsProcessingPayment(false);
    }
  };

  // Shared logic: given verified order/payment data, clear cart and navigate to success
  const finalizeOrder = (orderNumber: string, amount: number) => {
    // Pixel: Purchase — fired once per successful order
    trackPurchase(
      orderNumber,
      items.map(item => ({ id: item.productId, price: item.price, quantity: item.quantity })),
      amount
    );
    clearCart();
    toast.success('Order placed successfully!');
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    navigate(`${basePath}/payment-success`, {
      state: { orderId: orderNumber, orderNumber, amount },
    });
  };

  // Poll status endpoint until the order appears or we give up
  const pollPaymentStatus = async (razorpayOrderId: string, amountPaise: number): Promise<boolean> => {
    const MAX_POLLS = 5;
    for (let i = 0; i < MAX_POLLS; i++) {
      try {
        const status = await paymentService.getPaymentStatus(razorpayOrderId);
        const st = status.status?.toLowerCase() ?? '';
        const done =
          (st === 'completed' || st === 'complete' || st === 'paid' || st === 'success') &&
          Boolean(status.order_number);
        if (done && status.order_number) {
          finalizeOrder(status.order_number, parseFloat(status.amount) || amountPaise / 100);
          return true;
        }
      } catch (_) {}
      // Wait 2s between polls (skip wait after last attempt)
      if (i < MAX_POLLS - 1) await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    payment_status: string;
  }) => {
    setIsConfirmingOrder(true);
    setShouldTriggerPayment(false);

    // Persist to localStorage immediately — so a crash/background here doesn't lose the payment
    const pendingId = storePendingPayment({
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_signature: paymentData.razorpay_signature,
      amount: razorpayAmount,
    });

    const verifyPayload = {
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
    };

    // Retry verify up to 3 times — it's fully idempotent on the backend
    const verified = await retryWithBackoff(async () => {
      try {
        const res = await paymentService.verifyPayment(verifyPayload);
        if (res.order && res.payment) {
          finalizeOrder(res.order.order_number, razorpayAmount / 100);
          removePendingPayment(pendingId);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }, 3);

    if (!verified) {
      // Verify retries exhausted — fall back to polling the status endpoint
      const recovered = await pollPaymentStatus(paymentData.razorpay_order_id, razorpayAmount);
      if (!recovered) {
        // Payment was taken by Razorpay but we couldn't confirm the order.
        // Keep the pending payment in localStorage so it can be retried on next app load.
        toast.error('Paid — order not confirmed. Check Orders or support.');
      }
    }

    setIsConfirmingOrder(false);
  };

  // On mount: recover any pending payments from a previous session that crashed after Razorpay SDK
  // success but before /verify/ completed (e.g. app went background, network dropped)
  useEffect(() => {
    const pending = getPendingPayments();
    if (!pending.length) return;

    const recover = async () => {
      for (const payment of pending) {
        const verifyPayload = {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        };

        // Try verify first (idempotent)
        let done = false;
        try {
          const res = await paymentService.verifyPayment(verifyPayload);
          if (res.order && res.payment) {
            finalizeOrder(res.order.order_number, payment.amount / 100);
            removePendingPayment(payment.id);
            done = true;
          }
        } catch (_) {}

        // If verify failed, try status poll
        if (!done) {
          const recovered = await pollPaymentStatus(payment.razorpay_order_id, payment.amount);
          if (recovered) removePendingPayment(payment.id);
        }
      }
    };

    recover();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentError = (error: Error) => {
    toast.error(error.message || 'Payment failed. Please try again.');
    setIsProcessingPayment(false);
    setIsConfirmingOrder(false);
    setShouldTriggerPayment(false);
  };

  // Order summary
  const localSubtotal = getTotalPrice();
  const subtotal = cartTotals?.subtotal ?? localSubtotal;
  const deliveryFee = cartTotals?.deliveryFee ?? 0;
  const tax = cartTotals?.taxAmount ?? 0;
  const discount = cartTotals?.discountAmount ?? 0;
  const surcharge = cartTotals?.surchargeAmount ?? 0;
  const deliveryAddressId = cartTotals?.deliveryAddressId ?? null;
  const total =
    cartTotals?.total ??
    subtotal + deliveryFee + tax + surcharge - discount;

  const displayStoreName = cartStoreName.trim();
  const deliveryBlockedByCoverage = addressOutsideDelivery === true;
  const deliveryBlockedByStoreMismatch = suggestedStoreForAddress != null;

  const showUnifiedDeliveryAlert =
    suggestedStoreForAddress != null ||
    deliveryBlockedByCoverage ||
    deliveryStoreOffline;

  const suggestedStoreNameButtonClass =
    'gp-cart-suggested-store-blink inline border-0 bg-transparent p-0 align-baseline font-semibold text-red-900 underline decoration-red-700 underline-offset-2 hover:text-red-950 disabled:cursor-not-allowed disabled:opacity-55';

  const razorpayPrefillContact =
    customerInfo.contact ||
    formatPhoneForDisplay(authPhoneNumber || localStorage.getItem('phoneNumber') || '') ||
    undefined;

  // Auth guard
  if (!isLoggedIn) {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    return <Navigate to={`${basePath}/login`} state={{ returnUrl: location.pathname, fromCart: true }} replace />;
  }

  // Full-page loader: initial paint + first totals fetch + first-time sync — not checkout-triggered syncCartToAPI()
  const isPageLoading =
    isInitialLoading ||
    (isLoggedIn &&
      (isLoadingAddress ||
        (isLoadingCartTotals && !hasLoadedCartTotalsOnce) ||
        (isSyncing && !basketHydratedOnce)));
  
  if (isPageLoading) {
    return <CartPageSkeleton />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f6f1]">
      <style>{`
        @keyframes gp-cart-stock-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-7px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
        }
        .gp-cart-stock-shake {
          animation: gp-cart-stock-shake 0.45s ease-in-out;
        }
        @keyframes gp-cart-suggested-store-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .gp-cart-suggested-store-blink {
          animation: gp-cart-suggested-store-blink 1.15s ease-in-out infinite;
        }
        .gp-cart-suggested-store-blink:disabled {
          animation: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-cart-suggested-store-blink {
            animation: none;
          }
        }
      `}</style>
      <SEO
        title="My Basket — Genda Phool"
        description="Your Genda Phool basket"
        canonical="https://customerapp.mygendaphool.com/gp-store/basket"
        noIndex={true}
      />
      <div className="mx-auto flex min-h-screen w-full max-w-[min(800px,100vw)] flex-1 flex-col pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Header — matches mobile CartScreen (padding, border, title) */}
        <div className="sticky top-0 z-10 bg-[#f8f6f1] px-4 pb-3 pt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5"
              aria-label="Back"
            >
              <IoArrowBack size={24} className="text-gray-900" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Basket</h1>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4">
            <img src={emptyCartSvg} alt="" width={72} height={72} className="mb-3 shrink-0" />
            <p className="mb-2 text-center text-[18px] font-semibold leading-snug text-gray-900">Your basket is empty</p>
            <p className="mb-4 max-w-sm text-center text-sm text-gray-500">Add some blooms from the store to see them here.</p>
            <button
              type="button"
              onClick={() => navigate(browseProductsPath)}
              className="mt-2 rounded-full bg-[#19411F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e5a1c]"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            <>
              {/* Product Items */}
              {items.map((item) => {
                const lineStale = lineCartStaleByItemId[item.id];
                return (
                <div key={item.id} className="relative mx-0.5 mb-3 overflow-hidden rounded-[25px] bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => void handleDeleteItem(item.id)}
                    className="absolute right-4 top-4 z-30 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-red-500 transition-colors hover:bg-gray-200"
                    aria-label="Remove item"
                  >
                    <IoTrashOutline className="h-[15px] w-[15px]" aria-hidden />
                  </button>

                  {lineStale ? (
                    <div
                      className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-[1px]"
                      aria-hidden
                    >
                      <p className="text-center text-base font-semibold text-red-600">Out of stock</p>
                    </div>
                  ) : null}

                  <div className={`flex items-start gap-3 ${lineStale ? 'pointer-events-none select-none opacity-40' : ''}`}>
                    <button
                      type="button"
                      onClick={() => navigateToProductDetail(item)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="pointer-events-none h-[5.25rem] w-[5.25rem] flex-shrink-0 rounded-[16px] object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="min-w-0 flex-1 pr-10">
                          <h3 className="text-sm font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere]">
                            {item.name} x {item.quantity}
                            {item.variant?.name && (
                              <span className="font-normal text-gray-600"> ({item.variant.name})</span>
                            )}
                          </h3>
                          {deliveryInfo && (
                            <div className="mt-0.5 text-xs leading-snug text-gray-600">
                              <div>Delivery: {deliveryInfo.deliveryDate}</div>
                              <div>Time Slot: {deliveryInfo.timeSlot}</div>
                            </div>
                          )}
                        </div>
                        <div className="mt-1 flex w-full min-h-[1.75rem] items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-gray-900">
                            ₹{Number(item.price).toFixed(2)} each
                          </span>
                          <div
                            className="ml-auto flex shrink-0 items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                          >
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="touch-target-compact flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
                              aria-label="Decrease quantity"
                            >
                              <FaMinus className="text-[7px]" />
                            </button>
                            <span className="min-w-[0.875rem] text-center text-[11px] font-medium tabular-nums text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(item.id, 1)}
                              className="touch-target-compact flex h-6 w-6 items-center justify-center rounded-full bg-[#19411F] text-white transition-colors hover:bg-[#1e5a1c]"
                              aria-label="Increase quantity"
                            >
                              <FaPlus className="text-[7px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  {!lineStale ? (
                  <>
                  {/* Bouquet: custom message */}
                  {isBouquetItem(item) && editingItemId !== item.id && (
                    item.customizedMessage ? (
                      <div className="mt-2 flex items-center justify-between gap-3 pl-[5.25rem] pr-1 sm:pl-24">
                        <p className="min-w-0 flex-1 truncate text-xs leading-snug text-gray-500">
                          <span className="font-medium text-gray-500">Customized Message:</span>{' '}
                          {item.customizedMessage}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleEditItem(item.id)}
                          className="touch-target-compact flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
                          aria-label="Edit custom message"
                        >
                          <IoCreateOutline className="text-lg" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditMessage('');
                        }}
                        className="touch-target-compact mt-2 ml-[5.25rem] mr-1 inline-flex h-auto w-auto items-center gap-2 rounded-full border border-[#19411F] bg-white px-3 py-1.5 text-[11px] font-semibold leading-snug text-[#19411F] hover:bg-[#f1f7f2] sm:ml-24"
                      >
                        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[#19411F] text-[#19411F]">
                          <svg width="10" height="10" viewBox="0 0 20 20" fill="none" aria-hidden>
                            <path d="M10 4.5V15.5M4.5 10H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </span>
                        Add custom message
                      </button>
                    )
                  )}

                  {editingItemId === item.id && isBouquetItem(item) && (
                    <div className="mt-2 pl-[5.25rem] pr-1 sm:pl-24 sm:pr-3">
                      <textarea
                        value={editMessage}
                        onChange={(e) => { if (e.target.value.length <= 500) setEditMessage(e.target.value); }}
                        placeholder="Add a customized message"
                        className="min-h-[4.75rem] w-full resize-none rounded-lg border border-gray-200 bg-[#fafafa] px-3 py-2.5 text-xs leading-snug text-gray-900 outline-none focus:border-[#19411F]"
                        rows={2}
                        maxLength={500}
                      />
                      <div className="mt-2.5 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="touch-target-compact inline-flex h-auto items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="touch-target-compact inline-flex h-auto items-center rounded-lg bg-[#19411F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e5a1c]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  {lineStockErrorByItemId[item.id] ? (
                    <p
                      key={stockShakeVersionByItemId[item.id] ?? 0}
                      className={`mt-2  pr-1 text-xs font-medium text-red-600  ${
                        (stockShakeVersionByItemId[item.id] ?? 0) > 0 ? 'gp-cart-stock-shake' : ''
                      }`}
                    >
                      {lineStockErrorByItemId[item.id]}
                    </p>
                  ) : null}
                  </>
                  ) : null}
                </div>
              );
              })}

              {/* Delivery Date and Time */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm relative">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Delivery Date</h3>
                <div className="mb-4 grid w-full min-w-0 grid-cols-1 gap-2 xs:grid-cols-3">
                  {(['today', 'tomorrow', 'pickDate'] as const).map((opt) => {
                    const isTodayDisabled =
                      opt === 'today' && !isLoadingSlots && !hasSelectableTodaySlots;
                    return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isTodayDisabled}
                      onClick={() => handleDateOptionSelect(opt)}
                      className={`min-h-[44px] w-full min-w-0 rounded-[12px] px-3 py-2.5 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 text-center leading-tight sm:text-sm ${
                        isTodayDisabled
                          ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
                          : selectedDateOption === opt
                            ? 'bg-[#19411F] text-white'
                            : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {opt === 'pickDate' && <BsCalendar4 className="flex-shrink-0 text-[10px]" aria-hidden />}
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {opt === 'today' ? 'Today' : opt === 'tomorrow' ? 'Tomorrow' : 'Pick Date'}
                      </span>
                    </button>
                    );
                  })}
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-3 mt-4">
                  Time Slot
                  {isLoadingSlots && <span className="ml-2 text-xs font-normal text-gray-400">Loading...</span>}
                </h3>
                
                {showDatePicker && (
                  <>
                    <div
                      className="fixed inset-0 bg-black bg-opacity-20 z-40"
                      onClick={() => {
                        setDatePickerRangeMessage(null);
                        setShowDatePicker(false);
                      }}
                    />
                    {/* Centered date picker modal; stays within viewport on all screen sizes */}
                    <div
                      ref={datePickerRef}
                      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.2rem)] max-w-sm bg-white rounded-xl shadow-2xl z-50 p-4 border border-gray-200"
                    >
                      <style>{`
                        .react-datepicker { border: none !important; font-family: inherit; }
                        .react-datepicker__header { background-color: white !important; border-bottom: 1px solid #e5e7eb !important; padding-top: 0.75rem; }
                        .react-datepicker__current-month { font-weight: 600; color: #111827; margin-bottom: 0.5rem; }
                        .react-datepicker__day-name { color: #6b7280; font-weight: 500; width: 2.5rem; line-height: 2.5rem; }
                        .react-datepicker__day { width: 2.5rem; line-height: 2.5rem; margin: 0.125rem; border-radius: 50%; color: #111827; }
                        .react-datepicker__day:hover { border-radius: 50%; background-color: #f3f4f6; }
                        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background-color: #19411F !important; color: white !important; border-radius: 50%; }
                        .react-datepicker__day--today { font-weight: 600; }
                        .react-datepicker__navigation { top: 1rem; }
                        .react-datepicker__navigation-icon::before { border-color: #6b7280; }
                        .react-datepicker__day--disabled { pointer-events: auto; }
                      `}</style>
                      <DatePicker
                        selected={datePickerSelected}
                        onChange={handleDatePickerChange}
                        minDate={datePickerMinStart}
                        maxDate={deliveryDateMaxStart}
                        onMonthChange={() => setDatePickerRangeMessage(null)}
                        renderDayContents={renderDeliveryDayContents}
                        inline
                        calendarClassName="!border-0 !shadow-none"
                        className="w-full"
                      />
                      {datePickerRangeMessage ? (
                        <p
                          className="mt-3 text-center text-sm font-semibold text-amber-800"
                          role="status"
                          aria-live="polite"
                        >
                          {datePickerRangeMessage}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}

                <div className="w-full">
                  {isLoadingSlots ? (
                    <div className="text-xs text-gray-400 py-2 text-center">Checking availability...</div>
                  ) : slotsToShow.length === 0 ? (
                    <div className="text-xs text-red-500 py-2 text-center">No slots available for this date</div>
                  ) : (
                    <div
                      className="grid w-full min-w-0 gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${slotsToShow.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {slotsToShow.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleTimeSlotSelect(slot)}
                          className={`w-full min-w-0 px-1.5 py-2 min-h-[36px] rounded-[12px] text-[10px] xs:text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            selectedSlotId === slot.id
                              ? 'bg-[#19411F] text-white'
                              : 'bg-white text-gray-700 border border-gray-200'
                          }`}
                        >
                          {getSlotDisplayLabel(slot) || 'Slot'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="rounded-[25px] bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Delivery Details</h3>
                  <button
                    type="button"
                    onClick={handleEditAddress}
                    className="shrink-0 text-gray-600 transition-colors hover:text-gray-800"
                    aria-label="Edit delivery address"
                  >
                    <IoCreateOutline className="text-xl" />
                  </button>
                </div>
                {isLoadingAddress ? (
                  <p className="text-sm text-gray-500">Loading address...</p>
                ) : defaultAddress ? (
                  <div className="space-y-5">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <IoStorefrontOutline
                          className="h-5 w-5 flex-shrink-0 text-[#19411F]"
                          aria-hidden
                        />
                        <span className="truncate text-sm font-medium text-gray-900">From</span>
                      </div>
                      <p className="line-clamp-3 pl-7 text-sm leading-snug text-gray-600">
                        {!displayStoreName ? (
                          <span className="text-gray-400">Loading store…</span>
                        ) : (
                          displayStoreName
                        )}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <MdLocationOn className="flex-shrink-0 text-lg text-[#19411F]" aria-hidden />
                        <span className="truncate text-sm font-medium text-gray-900">To</span>
                      </div>
                      <p className="line-clamp-2 pl-7 text-sm font-medium leading-snug text-gray-900">
                        {defaultAddress.type}
                      </p>
                      <p className="line-clamp-4 pl-7 text-sm leading-snug text-gray-600">
                        {formatCartDeliveryAddress(defaultAddress)}
                      </p>
                      {isCheckingDeliveryCoverage && defaultAddress.coordinates && (
                        <p className="mt-2 pl-7 text-xs text-gray-400">Checking delivery area…</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-sm text-gray-500">No address found</p>
                    <button type="button" onClick={handleEditAddress} className="text-sm font-medium text-[#19411F] hover:underline">
                      Add Address
                    </button>
                  </div>
                )}
              </div>

              {showUnifiedDeliveryAlert ? (
                <div
                  className={`min-w-0 rounded-[12px] border px-3 py-2.5 shadow-sm ${
                    deliveryStoreOffline
                      ? "border-amber-500 bg-amber-50"
                      : "border-red-600 bg-red-50"
                  }`}
                  role="alert"
                >
                  {deliveryStoreOffline ? (
                    <div className="space-y-1">
                      <p className="text-[15px] font-bold leading-snug text-amber-900">
                        {STORE_OFFLINE_CART_TITLE}
                      </p>
                      <p className="text-[13px] font-medium leading-snug text-amber-800">
                        {STORE_OFFLINE_CART_BODY}
                      </p>
                    </div>
                  ) : suggestedStoreForAddress ? (
                    <p className="m-0 text-[13px] font-semibold leading-snug text-red-900">
                      This store doesn&apos;t deliver to your address—try the nearest store:{' '}
                      <button
                        type="button"
                        disabled={isSwitchingSuggestedStore}
                        onClick={openSuggestedStoreSwitchModal}
                        title={`Switch to ${suggestedStoreForAddress.name}`}
                        className={suggestedStoreNameButtonClass}
                      >
                        {suggestedStoreForAddress.name}
                      </button>
                    </p>
                  ) : (
                    <p className="m-0 text-[13px] font-semibold leading-snug text-red-900">
                      The current store is not delivering to this address. Update your delivery address or switch store.
                    </p>
                  )}
                </div>
              ) : null}

              {/* ── Promo Code ─────────────────────────────────────────────── */}
              <div className="rounded-[16px] border-2 border-[#19411F] bg-white px-3 py-2.5 shadow-sm">
                {appliedPromoCode ? (
                  <div className="flex items-center justify-between gap-2 min-h-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-[#f0f7f0] flex items-center justify-center">
                        <FaCheck className="text-[#19411F] text-xs" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">"{appliedPromoCode}" applied</p>
                        {promoDiscount > 0 && (
                          <p className="text-xs text-[#19411F] font-medium">You save ₹{promoDiscount.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={handleRemovePromoCode} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                      <FaTimes className="text-gray-500 text-sm" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPromoModal(true)}
                    className="w-full flex items-center justify-between gap-2 py-0.5 min-h-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FaTag className="text-[#19411F] text-sm shrink-0" aria-hidden />
                      <span className="text-sm font-semibold text-gray-900">Add Promo Code</span>
                    </div>
                    <FaPlus className="text-[#19411F] text-sm shrink-0" aria-hidden />
                  </button>
                )}
              </div>
              {promoInlineMessage ? (
                <div
                  className={[
                    'mt-2 rounded-lg border px-3 py-2 text-xs font-medium',
                    promoInlineMessage.kind === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700',
                  ].join(' ')}
                >
                  {promoInlineMessage.text}
                </div>
              ) : null}

              {/* Order Summary */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {surcharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Packaging & other fees</span>
                      <span>₹{surcharge.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-700">
                    <span className="inline-flex flex-col gap-0.5">
                      <span>Delivery fee</span>
                      {deliveryFee === 0 && deliveryAddressId === null && (
                        <span className="text-[11px] font-normal text-gray-400">
                          Confirmed when your delivery address is set on this cart.
                        </span>
                      )}
                    </span>
                    <span>₹{deliveryFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>GST</span>
                    <span>₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Discount</span>
                    <span>-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                  {/* Show promo line only if backend hasn't merged it into discount already */}
                  {appliedPromoCode && promoDiscount > 0 && discount === 0 && (
                    <div className="flex justify-between text-sm text-[#19411F] font-medium">
                      <span>Promo ({appliedPromoCode})</span>
                      <span>-₹{promoDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Razorpay (hidden) */}
              {shouldTriggerPayment && (
                <div className="hidden">
                  <CartRazorpayPayment
                    ref={paymentButtonRef}
                    razorpayOrderId={razorpayOrderId || ''}
                    amount={razorpayAmount}
                    currency="INR"
                    razorpayKey={razorpayKey}
                    customerName={customerInfo.name}
                    customerEmail={customerInfo.email}
                    customerContact={razorpayPrefillContact}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    buttonText=""
                    disabled={isProcessingPayment || isConfirmingOrder}
                  />
                </div>
              )}

              {/* Checkout */}
              {checkoutInlineError ? (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {checkoutInlineError}
                </div>
              ) : null}
              <button
                onClick={handleCheckout}
                disabled={
                  isProcessingPayment ||
                  isConfirmingOrder ||
                  hasStaleCartLine ||
                  deliveryBlockedByCoverage ||
                  deliveryBlockedByStoreMismatch ||
                  deliveryStoreOffline
                }
                className="w-full bg-[#19411F] text-white py-4 rounded-[25px] text-base font-semibold hover:bg-[#1e5a1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isProcessingPayment || isConfirmingOrder) && (
                  <Spinner size={22} variant="light" className="!inline-flex" />
                )}
                {isConfirmingOrder
                  ? 'Confirming your order…'
                  : isProcessingPayment
                    ? 'Preparing payment…'
                    : 'Checkout'}
              </button>
            </>
          </div>
        )}

      </div>

      <CartConfirmModal
        open={showSuggestedStoreSwitchModal}
        title={SWITCH_STORE_CONFIRM_TITLE}
        message={SWITCH_STORE_CONFIRM_MESSAGE}
        loading={isSwitchingSuggestedStore}
        onConfirm={() => void performSwitchToSuggestedStore()}
        onCancel={cancelSuggestedStoreSwitchModal}
        titleId="gp-store-switch-store-title"
      />

      {/* Promo Code Modal */}
      {showPromoModal && (
        <PromoCodeModal
          onClose={() => setShowPromoModal(false)}
          onApply={handleApplyPromoCode}
          isApplying={isApplyingPromo}
          appliedCode={appliedPromoCode}
        />
      )}

    </div>
  );
};

export default Cart;