import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IoCreateOutline, IoStorefrontOutline, IoTrashOutline, IoWarning } from 'react-icons/io5';
import { BsCalendar4 } from 'react-icons/bs';
import { MdLocationOn } from 'react-icons/md';
import { FaTag, FaPlus, FaMinus, FaTimes, FaCheck } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useFeatureTheme } from '../../../context/FeatureThemeContext';
import { addressService, Address } from '../../../services/address.service';
import { storeService, storeIsWithinDeliveryRadius } from '../../../services/store.service';
import { subscriptionCartService } from '../../../services/subscriptionCart.service';
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
import api from '../../../services/api';
import { getApiUrl } from '../../../config/api.config';
import { useNetworkRecovery } from '../../../hooks/useNetworkRecovery';
import { SEO } from '../../../components/SEO';
import { trackInitiateCheckout, trackPurchase } from '../../../lib/metaPixel';
import { loadRazorpayScript } from '../../../lib/razorpayLoader';
import { formatPhoneForDisplay } from '../../../utils/phoneDisplay';
import { errorMessageFromCatch } from '../../../utils/apiErrorMessage';
import {
  extractCartStockApiMessage,
  formatCartStockInlineMessage,
  isCartStockOrAvailabilityInlineError,
} from '../../../utils/cartStockInlineMessage';
import { validateGpDailyDeliveryArea } from '../../../services/subscriptionZone.service';
import { GpDailyOutOfZoneBanner } from '../../../components/daily/GpDailyOutOfZoneBanner';
import { UniformPageHeader } from '../../../components/layout/UniformPageHeader';
import { DELIVERY_DATE_MAX_DAYS_FROM_TODAY } from '../../../constants/deliveryBooking';
import { computeFirstSubscriptionDeliveryDateFromWeekdayInts } from '../../../utils/subscriptionFirstDeliveryDate';
import emptyCartSvg from '../../../assets/svg/gp_store_svg/cart-empty.svg';
import deliveryTruckIcon from "../../../assets/svg/gp_daily svg/delivery_truck.svg";


/**
 * Survives component remounts (e.g. React Strict Mode) so we only show one toast per
 * navigation that includes `addressUpdated`, then still clear location.state.
 */
let addressUpdatedToastConsumed = false;

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

// Parse "HH:mm:ss" / "HH:mm" into minutes from midnight
const toMinutes = (timeStr: string): number => {
  const [h = '0', m = '0'] = (timeStr || '').split(':');
  return Number(h) * 60 + Number(m);
};

/** For formatSlotTimeRange after normalizing minutes. */
const minutesToTimeStr = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

/**
 * Same-day slot window in minutes from midnight.
 * Fixes common backend typo: 1 PM stored as "01:00:00" for Afternoon (e.g. 13:00–16:00).
 */
function getSlotWindowMinutes(slot: DeliverySlot): { start: number; end: number } {
  const rawStart = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  let start = rawStart;
  if (end <= start) return { start, end };

  const name = (slot.slot_name || '').toLowerCase();
  const startsVeryEarly = rawStart < 7 * 60;
  const endsAfternoon = end >= 13 * 60;
  const afternoonLike =
    name.includes('afternoon') || name.includes('evening') || name.includes('noon');

  if (startsVeryEarly && endsAfternoon && (afternoonLike || rawStart <= 2 * 60)) {
    const parts = (slot.start_time || '').split(':');
    const h = Number(parts[0] ?? 0);
    const mi = Number(parts[1] ?? 0);
    if (Number.isFinite(h) && h >= 0 && h <= 6) {
      const shifted = (h + 12) * 60 + (Number.isFinite(mi) ? mi : 0);
      if (shifted < end) start = shifted;
    }
  }
  return { start, end };
}

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
  /** GP Daily cart — must match mobile `eligible_for_gp_daily`. */
  eligible_for_gp_daily?: boolean;
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
  /** When true, coupons not flagged for Daily cannot be applied (mobile parity). */
  isDailyMode: boolean;
}

const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  onClose,
  onApply,
  isApplying,
  appliedCode,
  isDailyMode,
}) => {
  const { theme } = useFeatureTheme();
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
      const sorted = isDailyMode
        ? [...data].sort((a, b) => {
          const ea = a.eligible_for_gp_daily === true ? 1 : 0;
          const eb = b.eligible_for_gp_daily === true ? 1 : 0;
          if (ea !== eb) return eb - ea;
          return String(a.code).localeCompare(String(b.code), "en", {
            sensitivity: "base",
          });
        })
        : data;
      setCoupons(sorted);
    } catch {
      setFetchError('Could not load available coupons.');
    } finally {
      setIsFetchingCoupons(false);
    }
  };

  // Fetch as soon as the modal mounts
  useEffect(() => {
    void loadCoupons();
  }, [isDailyMode]);

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
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    if (isDailyMode) {
      const match = coupons.find(
        (c) => String(c.code).trim().toUpperCase() === code,
      );
      if (match && match.eligible_for_gp_daily !== true) {
        setApplyHint({
          kind: "error",
          text: "This promo is not valid on Genda Phool Daily.",
        });
        return;
      }
    }
    void runApply(code);
  };

  return (
    <>
      {/* Backdrop above all app chrome, including bottom nav */}
      <div className="fixed inset-0 z-[99998] bg-black/40" onClick={onClose} aria-hidden />

      {/* Bottom sheet — bottom/maxHeight follow visualViewport so content stays above the keyboard */}
      <div
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] z-[99999] flex min-h-0 flex-col rounded-t-[24px] bg-white pb-[max(5.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:bottom-0 sm:rounded-t-[28px]"
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
                className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-medium uppercase tracking-wider outline-none transition-colors sm:px-4 sm:py-2.5"
                style={{ borderColor: '#e5e7eb' }}
              />
              <button
                onClick={handleManualApply}
                disabled={!manualCode.trim() || isApplying}
                className="flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5"
                style={{ backgroundColor: theme.colors.primary, color: 'black' }}
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>
            {applyHint ? (
              <p
                role="status"
                className={`mt-2.5 text-xs font-medium leading-snug sm:text-sm ${applyHint.kind === 'success' ? 'text-green-700' : 'text-red-600'
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
                  className="mt-2 text-sm font-medium hover:underline"
                  style={{ color: theme.colors.primary }}
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
                  const ineligibleDaily =
                    isDailyMode && coupon.eligible_for_gp_daily !== true;
                  return (
                    <div
                      key={coupon.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border-2 p-3 transition-colors sm:rounded-2xl sm:p-4 ${isApplied
                        ? 'bg-[#f8f6f1]'
                        : ineligibleDaily
                          ? 'border border-gray-200 bg-gray-100/80 opacity-90'
                          : 'border-dashed border-gray-300 bg-gray-50'
                        }`}
                      style={isApplied ? { borderColor: theme.colors.primary } : undefined}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FaTag
                          className="text-base flex-shrink-0"
                          style={{ color: isApplied ? theme.colors.primary : '#9ca3af' }}
                        />
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
                          {ineligibleDaily ? (
                            <p className="mt-1 text-xs font-semibold text-red-600">
                              Not valid on Daily
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!isApplied && ineligibleDaily) return;
                          void runApply(coupon.code);
                        }}
                        disabled={isApplying || (!isApplied && ineligibleDaily)}
                        className={`ml-3 flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${isApplied
                          ? 'text-black'
                          : ineligibleDaily
                            ? 'cursor-not-allowed border border-gray-300 bg-gray-200 text-gray-500'
                            : 'bg-white'
                          }`}
                        style={
                          isApplied
                            ? { backgroundColor: theme.colors.primary }
                            : !ineligibleDaily
                              ? { border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary }
                              : undefined
                        }
                      >
                        {isApplied ? (
                          <><FaCheck className="text-xs" /> Applied</>
                        ) : isApplying ? (
                          'Applying...'
                        ) : ineligibleDaily ? (
                          'N/A'
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
  const { theme } = useFeatureTheme();
  // CartDaily should always follow gp-daily theming + routing.
  const basePath = '/gp-daily';
  const browseProductsPath = '/gp-daily/Products';
  const { storePendingPayment, getPendingPayments, removePendingPayment, retryWithBackoff } = useNetworkRecovery();
  const {
    // Keep context around for shared helpers (e.g. clear after checkout),
    // but Daily cart data is fetched from subscription cart APIs.
    deliveryInfo,
    updateDeliveryInfo,
    loadCartFromAPI,
    clearCart,
    isSyncing,
  } = useCart();

  const [dailyCart, setDailyCart] = useState<import('../../../services/subscriptionCart.service').DailyCart | null>(null);
  const [isLoadingDailyCart, setIsLoadingDailyCart] = useState(true);

  const refreshDailyCart = useCallback(async () => {
    try {
      setIsLoadingDailyCart(true);
      const cart = await subscriptionCartService.getDailyCart();
      setDailyCart(cart);
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, 'Failed to fetch daily cart'));
      setDailyCart(null);
    } finally {
      setIsLoadingDailyCart(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('access_token')) return;
    void refreshDailyCart();
  }, [isLoggedIn, refreshDailyCart]);

  const items = useMemo(() => {
    const raw = dailyCart?.items ?? [];
    return raw.map((it) => {
      const anyIt = it as any;
      const p = (anyIt?.product ?? null) as any;
      const unit =
        Number(anyIt?.unit_price ?? (p?.current_price ?? p?.sale_price ?? p?.base_price ?? 0));
      const qty = Number.parseFloat(String(anyIt?.quantity ?? 0));
      return {
        id: String(it.id),
        apiCartItemId: it.id,
        productId: Number(p?.id ?? anyIt?.product_id ?? 0),
        productSlug: String(p?.slug ?? anyIt?.product_slug ?? ''),
        name: String(p?.name ?? anyIt?.product_name ?? 'Product'),
        image: String(p?.primary_image ?? anyIt?.primary_image ?? ''),
        price: Number.isFinite(unit) ? unit : 0,
        quantity: Number.isFinite(qty) ? qty : 0,
        // Fields used by shared Cart UI (gp-store parity) — not provided by daily cart API.
        variant: null as any,
        customizedMessage: undefined as any,
        categorySlug: String(p?.category_slug ?? ''),
      };
    });
  }, [dailyCart]);

  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerRangeMessage, setDatePickerRangeMessage] = useState<string | null>(null);
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'dayAfter' | 'pickDate'>('tomorrow');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  /** Recompute "today" slot eligibility as the clock moves (same calendar day). */
  const [slotsNowTick, setSlotsNowTick] = useState(0);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [deliveryFrequency, setDeliveryFrequency] = useState<'Daily' | 'Mon-Sat' | 'Customize'>('Daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  // (Bouquet message editing uses inline UI; no overflow menu needed)

  // Check authentication and redirect if session expired
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('access_token')) {
      navigate(`${basePath}/login`, {
        state: { returnUrl: location.pathname, fromCart: true },
        replace: true
      });
    }
  }, [isLoggedIn, navigate, location.pathname, basePath]);

  // Listen for tokenRemoved event (session expiration)
  useEffect(() => {
    const handleTokenRemoved = () => {
      navigate(`${basePath}/login`, {
        state: { returnUrl: location.pathname, fromCart: true },
        replace: true
      });
    };

    window.addEventListener('tokenRemoved', handleTokenRemoved);
    return () => {
      window.removeEventListener('tokenRemoved', handleTokenRemoved);
    };
  }, [navigate, location.pathname, basePath]);

  useEffect(() => {
    const id = window.setInterval(() => setSlotsNowTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string>('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const lastZoneCheckedAddressIdRef = useRef<number | null>(null);
  const zoneCheckInFlightAddressIdRef = useRef<number | null>(null);
  const lastSubscriptionCartAddressSetRef = useRef<number | null>(null);
  const subscriptionCartAddressSetInFlightRef = useRef(false);
  const [subscriptionZoneEligible, setSubscriptionZoneEligible] = useState<boolean | null>(null);
  const [subscriptionDeliveryFee, setSubscriptionDeliveryFee] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [shouldTriggerPayment, setShouldTriggerPayment] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [razorpayAmount, setRazorpayAmount] = useState<number>(0);
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string; contact?: string }>({});
  const paymentButtonRef = useRef<HTMLButtonElement | null>(null);

  // Promo code state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);

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
  /** True when selected address is outside GP Daily subscription zone (check-zone / store-by-zone). */
  const [addressOutsideDelivery, setAddressOutsideDelivery] = useState<boolean | null>(null);
  const [isCheckingDeliveryCoverage, setIsCheckingDeliveryCoverage] = useState(false);
  /** After first totals fetch, refreshes (e.g. during checkout) must not show the full-page loader */
  const [hasLoadedCartTotalsOnce, setHasLoadedCartTotalsOnce] = useState(false);
  /** After first successful address + totals + sync idle, checkout must not full-screen when sync runs again */
  const [basketHydratedOnce, setBasketHydratedOnce] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  /** Inline stock message per line item (e.g. after insufficient stock). */
  const weekDays = useMemo(
    () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const,
    [],
  );

  const activeDeliveryDays = useMemo(() => {
    if (deliveryFrequency === 'Daily') return [...weekDays];
    if (deliveryFrequency === 'Mon-Sat') return weekDays.filter((d) => d !== 'Sun');
    return selectedDays;
  }, [deliveryFrequency, selectedDays, weekDays]);

  const activeDeliveryDayInts = useMemo(() => {
    const map: Record<(typeof weekDays)[number], number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    return activeDeliveryDays
      .map((d) => map[d as (typeof weekDays)[number]])
      .filter((n) => Number.isInteger(n));
  }, [activeDeliveryDays, weekDays]);

  const toggleDeliveryDay = (day: (typeof weekDays)[number]) => {
    if (deliveryFrequency !== 'Customize') return;
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  useEffect(() => {
    // Persist delivery-day preferences locally for gp-daily cart UI.
    const payload = { deliveryFrequency, selectedDays: activeDeliveryDays };
    localStorage.setItem('gp_daily_cart_delivery_days', JSON.stringify(payload));
  }, [deliveryFrequency, selectedDays, activeDeliveryDays]);
  const [lineStockErrorByItemId, setLineStockErrorByItemId] = useState<Record<string, string>>({});
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
    const slug = item.productSlug?.trim();
    if (slug) {
      navigate(`${basePath}/product/${encodeURIComponent(slug)}`);
      return;
    }
    if (!item.productId) return;
    navigate(`${basePath}/product/${encodeURIComponent(String(item.productId))}`);
  };

  const isSlotSelectable = (slot: DeliverySlot, date: Date) => {
    // For non-today dates, all API-available slots stay selectable.
    if (!isToday(date)) return true;
    // For today: bookable until normalized window ends (handles 01:00→13:00 afternoon typo).
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const { end } = getSlotWindowMinutes(slot);
    return end > nowMinutes;
  };

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
    // Avoid double toasts; zone check below will show the relevant message.
    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

  // Subscription zone eligibility check (on cart load + address change)
  useEffect(() => {
    if (!isLoggedIn) return;
    const rawId = defaultAddress?.id;
    if (rawId == null) return;
    const addressId = Number(rawId);
    if (!Number.isFinite(addressId)) return;

    // Avoid duplicate requests/toasts (StrictMode can run effects twice).
    if (zoneCheckInFlightAddressIdRef.current === addressId) return;
    zoneCheckInFlightAddressIdRef.current = addressId;

    let cancelled = false;
    const backupDismiss: { id?: number } = {};
    (async () => {
      const prev = lastZoneCheckedAddressIdRef.current;
      const isFirstCheck = prev == null;
      const isChanged = prev != null && prev !== addressId;

      try {
        const res = await subscriptionCartService.checkSubscriptionZone(addressId);
        if (cancelled) return;

        lastZoneCheckedAddressIdRef.current = addressId;

        const eligible = Boolean((res as any)?.eligible);
        const msg =
          typeof (res as any)?.message === 'string' ? String((res as any).message).trim() : '';
        const feeRaw = (res as any)?.delivery_fee;
        const feeNum = feeRaw == null ? null : Number(feeRaw);

        setSubscriptionZoneEligible(eligible);
        setSubscriptionDeliveryFee(Number.isFinite(feeNum as number) ? (feeNum as number) : null);

        // If eligible, set address on subscription cart so fees/totals match checkout.
        if (
          eligible &&
          lastSubscriptionCartAddressSetRef.current !== addressId &&
          subscriptionCartAddressSetInFlightRef.current === false
        ) {
          subscriptionCartAddressSetInFlightRef.current = true;
          try {
            await subscriptionCartService.setDeliveryAddress(addressId);
            if (!cancelled) {
              lastSubscriptionCartAddressSetRef.current = addressId;
              await refreshDailyCart();
            }
          } catch (e: unknown) {
            if (!cancelled) {
              toast.error(errorMessageFromCatch(e, 'Could not set delivery address for subscription cart.'), {
                id: `sub-zone:set-address:${addressId}`,
              });
            }
          } finally {
            subscriptionCartAddressSetInFlightRef.current = false;
          }
        }

        if (isFirstCheck || isChanged) {
          if (eligible) {
            const zoneToastId = `sub-zone:${addressId}`;
            if (!cancelled) {
              toast.success(msg || 'Great! This address is within our subscription delivery zone.', {
                duration: 2600,
                id: zoneToastId,
              });
              /** Backup dismiss — avoids stuck toast if height timers reset library auto-dismiss. */
              backupDismiss.id = window.setTimeout(() => {
                toast.dismiss(zoneToastId);
              }, 2800);
            }
          }
          // Out-of-zone: no error toast — same as app; basket shows the red inline alert.
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const prevId = lastZoneCheckedAddressIdRef.current;
        const shouldToast = prevId == null || prevId !== addressId;
        setSubscriptionZoneEligible(null);
        setSubscriptionDeliveryFee(null);
        if (shouldToast) {
          toast.error(errorMessageFromCatch(e, 'Could not check delivery zone.'), {
            duration: 3000,
            id: `sub-zone:${addressId}`,
          });
        }
      } finally {
        if (zoneCheckInFlightAddressIdRef.current === addressId) {
          zoneCheckInFlightAddressIdRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (backupDismiss.id != null) {
        clearTimeout(backupDismiss.id);
        backupDismiss.id = undefined;
      }
    };
  }, [isLoggedIn, defaultAddress?.id, refreshDailyCart]);

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
      setIsApplyingPromo(true);
      const upper = code.trim().toUpperCase();
      const list = await fetchCoupons();
      const match = list.find(
        (c) => String(c.code).trim().toUpperCase() === upper,
      );
      if (match && match.eligible_for_gp_daily !== true) {
        throw new Error("This promo is not valid on Genda Phool Daily.");
      }
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
        } catch (_) { }
      }

      setAppliedPromoCode(code);
      return {
        successMessage: typeof response.message === 'string' ? response.message.trim() : undefined,
      };
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = async () => {
    try {
      setIsApplyingPromo(true);
      await removeCouponAPI();
      setAppliedPromoCode(null);
      setPromoDiscount(0);
      const raw = await cartService.getCartData();
      const cartData = await reconcileCartStoreWithAccountSelection(raw);
      applyServerCartData(cartData, setCartTotals, setCartStoreName, setCartStoreId);
      toast.success('Promo code removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Automatically remove applied promo when leaving the basket page
  useEffect(() => {
    return () => {
      if (appliedPromoCode) {
        removeCouponAPI().catch((err) => {
          console.error('Failed to auto-remove promo code on navigation:', err);
        });
      }
    };
  }, [appliedPromoCode]);

  // Preload Razorpay SDK when basket opens so checkout is not blocked on first load
  useEffect(() => {
    loadRazorpayScript().catch(() => { });
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

  // Daily cart: initial loading is based on subscription cart fetch + address load.
  // We do NOT call gp-store GET /cart/ here (avoids multiple cart calls).
  useEffect(() => {
    if (!isLoggedIn) {
      setIsInitialLoading(false);
      setBasketHydratedOnce(true);
      return;
    }
    if (isLoadingDailyCart || isLoadingAddress) return;
    setIsInitialLoading(false);
    setBasketHydratedOnce(true);
  }, [isLoggedIn, isLoadingDailyCart, isLoadingAddress]);

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
        const operational = await storeService.getNearestStore(coords.lat, coords.lng);
        if (cancelled) return;
        if (operational) {
          setDeliveryStoreOffline(false);
          if (cartStoreId != null && operational.id !== cartStoreId) {
            const storesList = await storeService.getAllStores(coords.lat, coords.lng);
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
        const stores = await storeService.getAllStores(coords.lat, coords.lng);
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
    // Daily cart should not sync address to gp-store cart.
    return;
    if (!isLoggedIn || !defaultAddress?.id) return;
    const id = parseInt(String(defaultAddress?.id), 10);
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

  // GP Daily: subscription zone only (POST check-zone + GET store-by-zone when needed), not stores/validate-coverage.
  useEffect(() => {
    if (!isLoggedIn) {
      setAddressOutsideDelivery(null);
      return;
    }
    const addrId = defaultAddress?.id
      ? parseInt(String(defaultAddress.id), 10)
      : NaN;
    const useAddressId = Number.isFinite(addrId) && addrId > 0;
    const coords = defaultAddress?.coordinates;
    const coordsOk =
      !!coords && addressService.validateCoordinatesFormat(coords);
    if (!useAddressId && !coordsOk) {
      setAddressOutsideDelivery(null);
      return;
    }
    let cancelled = false;
    setIsCheckingDeliveryCoverage(true);
    void validateGpDailyDeliveryArea(
      useAddressId ? { addressId: addrId } : { coordinates: coords! },
    )
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
      .catch(() => { });
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
          setDefaultAddress(JSON.parse(storedAddress));
          setIsLoadingAddress(false);
          return;
        } catch (_) { }
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
        const dayAfter = addDays(new Date(), 2);
        setSelectedDateOption(format(dateObj, 'yyyy-MM-dd') === format(dayAfter, 'yyyy-MM-dd') ? 'dayAfter' : 'pickDate');
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

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'dayAfter' | 'pickDate') => {
    setSelectedDateOption(option);
    if (option === 'pickDate') {
      setDatePickerRangeMessage(null);
      setShowDatePicker(true);
      return;
    }
    const dateMap = { today: new Date(), tomorrow: addDays(new Date(), 1), dayAfter: addDays(new Date(), 2) };
    const selectedDate = startOfDay(dateMap[option]);
    updateDeliveryInfo({ deliveryDate: format(selectedDate, 'dd MMM yyyy'), timeSlot: '', slotId: undefined, selectedDate });
    fetchSlotsForDate(selectedDate);
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
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
      const today = startOfDay(new Date());
      const dayAfter = addDays(today, 2);
      if (isToday(pickedDate)) setSelectedDateOption('today');
      else if (isTomorrow(pickedDate)) setSelectedDateOption('tomorrow');
      else if (format(pickedDate, 'yyyy-MM-dd') === format(dayAfter, 'yyyy-MM-dd')) setSelectedDateOption('dayAfter');
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
      // Daily cart doesn't support bouquet message edits yet; keep UI consistent (no-op on server).
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

  const handleQuantityDelta = async (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (delta > 0 && lineStockErrorByItemId[itemId]) {
      triggerStockMessageShake(itemId);
      return;
    }
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity && delta < 0) return;
    try {
      await subscriptionCartService.addItem(Number(item.productId), next);
      await refreshDailyCart();
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
      // Daily cart removal should use subscriptions/cart/items/{id}/
      const toRemove = items.find((it) => it.id === itemId);
      const dailyCartItemId = Number((toRemove as any)?.apiCartItemId ?? itemId);
      if (Number.isFinite(dailyCartItemId) && dailyCartItemId > 0) {
        await subscriptionCartService.removeItem(dailyCartItemId);
      }
      await refreshDailyCart();
      toast.success('Item removed from cart');
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, 'Failed to remove item. Please try again.'));
    }
  };

  const handleEditAddress = () => {
    navigate(`${basePath}/address-selection`, { state: { fromCart: true } });
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
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (activeDeliveryDayInts.length === 0) { toast.error('Please select delivery days'); return; }
    if (deliveryFrequency === 'Customize' && activeDeliveryDayInts.length < 3) {
      toast.error('Please select at least 3 days for a 1-week subscription');
      return;
    }
    if (!isLoggedIn) {
      navigate(`${basePath}/login`, { state: { returnUrl: `${basePath}/basket`, fromCart: true } });
      return;
    }

    if (!defaultAddress) { toast.error('Please add a delivery address'); navigate(`${basePath}/addresses`); return; }

    if (addressOutsideDelivery === true) {
      return;
    }

    // Daily cart checkout should use subscriptions/cart/checkout/
    // Prereq: set address on daily cart first.
    try {
      setIsProcessingPayment(true);
      await subscriptionCartService.setDeliveryAddress(Number(defaultAddress.id));
      await subscriptionCartService.setDeliveryDays(activeDeliveryDayInts);
      const subscriptionStartDate = format(
        computeFirstSubscriptionDeliveryDateFromWeekdayInts(activeDeliveryDayInts),
        'yyyy-MM-dd',
      );
      const checkoutRes = await subscriptionCartService.checkout({
        start_date: subscriptionStartDate,
        payment_method: 'wallet',
        delivery_days: activeDeliveryDayInts,
      });
      toast.success('Subscription created successfully!');
      clearCart();
      const firstItem = items[0];
      const subscriptionDetails = {
        basePackId: String(firstItem?.productId ?? ''),
        type: deliveryFrequency === 'Customize' ? 'CUSTOM' : 'DAILY',
        startDate: subscriptionStartDate,
        amount: Number(total ?? 0),
        packDetails: {
          name: String(firstItem?.name ?? 'Pack'),
          description: '',
          imageUrl: String(firstItem?.image ?? ''),
          sellingPrice: Number(firstItem?.price ?? 0),
          contents: [],
        },
        deliveryCount: 7,
        walletBalance: 0,
        sellingPrice: Number(firstItem?.price ?? 0),
        selectedDays: activeDeliveryDays,
      };
      const selectedAddress = defaultAddress
        ? {
          id: String(defaultAddress.id),
          street: String(defaultAddress.streetName ?? ''),
          area: String(defaultAddress.area ?? ''),
          city: String(defaultAddress.city ?? ''),
          state: String(defaultAddress.state ?? ''),
          pincode: String(defaultAddress.pincode ?? ''),
          societyName: String((defaultAddress as any).societyName ?? ''),
          coordinates: String(defaultAddress.coordinates ?? ''),
        }
        : null;
      navigate(`${basePath}/subscription/confirm`, {
        state: {
          isConfirmed: true,
          isStoreProduct: false,
          subscription: (checkoutRes as any)?.data ?? checkoutRes,
          product: firstItem ? { name: firstItem.name, sellingPrice: firstItem.price } : undefined,
          selectedAddress,
          subscriptionDetails,
        },
        replace: true,
      });
      return;
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, 'Checkout failed'));
      return;
    } finally {
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
      } catch (_) { }
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
    setIsProcessingPayment(true);
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

    setIsProcessingPayment(false);
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
        } catch (_) { }

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
    setShouldTriggerPayment(false);
  };

  /** First delivery on or after tomorrow that matches selected `delivery_days`. */
  const basketFirstDeliveryLabel = useMemo(
    () =>
      format(
        computeFirstSubscriptionDeliveryDateFromWeekdayInts(activeDeliveryDayInts),
        'EEE, d MMM yyyy',
      ),
    [activeDeliveryDayInts],
  );

  // Order summary
  const localSubtotal = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
  const subtotal = cartTotals?.subtotal ?? localSubtotal;
  const deliveryFee =
    cartTotals?.deliveryFee ??
    (subscriptionDeliveryFee ?? (Number((dailyCart as any)?.delivery_fee) || 0));
  const tax = cartTotals?.taxAmount ?? 0;
  const discount = cartTotals?.discountAmount ?? 0;
  const surcharge = cartTotals?.surchargeAmount ?? 0;
  const deliveryAddressId =
    cartTotals?.deliveryAddressId ?? (defaultAddress?.id != null ? Number(defaultAddress.id) : null);
  const total =
    cartTotals?.total ??
    subtotal + deliveryFee + tax + surcharge - discount;

  const formatAddress = (address: Address | null): string => {
    if (!address) return '';
    return [address.houseNo, address.streetName, address.area, address.city, address.state, address.pincode].filter(Boolean).join(', ');
  };

  const displayStoreName =
    cartStoreName.trim() || (isLoadingCartTotals ? '' : 'Selected store');
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
  if (!isLoggedIn || !localStorage.getItem('access_token')) {
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
        <div className="sticky top-0 z-10 bg-[#f8f6f1]">
          <UniformPageHeader
            title="My Basket"
            onBack={() => navigate(-1)}
            padXClassName="px-4"
            padYClassName="pt-6 pb-3"
          />
        </div>

        {items.length === 0 ? (
          <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex flex-col items-center text-center">
              <img src={emptyCartSvg} alt="" width={72} height={72} className="mb-3 shrink-0" />
              <p className="mb-2 text-[18px] font-semibold leading-snug text-gray-900">Your basket is empty</p>
              <p className="max-w-sm text-sm text-gray-500">Add some blooms from the store to see them here.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(browseProductsPath)}
              className="w-full rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: theme.colors.primary, color: 'black' }}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            <>
              {/* Product Items */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => navigateToProductDetail(item)}
                      className="shrink-0 self-start rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:ring-offset-2"
                      aria-label={`View ${item.name}`}
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="pointer-events-none h-[5.25rem] w-[5.25rem] rounded-2xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </button>
                    <div className="flex min-h-[5.25rem] min-w-0 flex-1 flex-col">
                      <div className="flex min-h-0 items-center justify-between gap-2">
                        <h3 className="min-w-0 flex-1 pr-1 text-sm font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere]">
                          {item.name}
                          {item.variant?.name && (
                            <span className="font-normal text-gray-600"> ({item.variant.name})</span>
                          )}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="touch-target-compact flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-red-500 transition-colors hover:bg-gray-200"
                          aria-label="Remove item"
                        >
                          <IoTrashOutline className="h-[15px] w-[15px]" aria-hidden />
                        </button>
                      </div>
                      <div className="mt-auto flex w-full min-h-[1.75rem] items-center justify-between gap-2 pt-1">
                        <span className="min-w-0 flex-1 text-base font-semibold leading-none text-gray-900">
                          ₹{Number(item.price).toFixed(2)}
                        </span>
                        <div
                          className="flex shrink-0 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <button
                            type="button"
                            onClick={() => handleQuantityDelta(item.id, -1)}
                            disabled={item.quantity <= 1}
                            className="touch-target-compact flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <FaMinus className="text-[8px]" />
                          </button>
                          <span className="min-w-[1rem] text-center text-xs font-semibold tabular-nums text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityDelta(item.id, 1)}
                            className="touch-target-compact flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800"
                            aria-label="Increase quantity"
                          >
                            <FaPlus className="text-[8px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <p className="text-sm font-medium text-gray-500">
                      First Delivery: {basketFirstDeliveryLabel}
                    </p>
                  </div>
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
                        className="touch-target-compact mt-2 ml-[5.25rem] mr-1 inline-flex h-auto w-auto items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold leading-snug hover:bg-[#f1f7f2] sm:ml-24"
                        style={{ border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary }}
                      >
                        <span
                          className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                          style={{ border: `1px solid ${theme.colors.primary}`, color: theme.colors.primary }}
                        >
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
                        className="min-h-[4.75rem] w-full resize-none rounded-lg border border-gray-200 bg-[#fafafa] px-3 py-2.5 text-xs leading-snug text-gray-900 outline-none"
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
                          className="touch-target-compact inline-flex h-auto items-center rounded-lg px-3.5 py-2 text-xs font-semibold"
                          style={{ backgroundColor: theme.colors.primary, color: 'black' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  {lineStockErrorByItemId[item.id] ? (
                    <p
                      key={stockShakeVersionByItemId[item.id] ?? 0}
                      className={`mt-2  pr-1 text-xs font-medium text-red-600  ${(stockShakeVersionByItemId[item.id] ?? 0) > 0 ? 'gp-cart-stock-shake' : ''
                        }`}
                    >
                      {lineStockErrorByItemId[item.id]}
                    </p>
                  ) : null}
                </div>
              ))}

              {/* Select Delivery Days — matches app `CartScreen` (dailyDeliveryCard + chips + warning) */}
              <div className="relative mb-3.5 rounded-2xl bg-white p-3 shadow-sm" style={{ marginLeft: 2, marginRight: 2 }}>
                <h2 className="mb-2.5 font-ibm-plex-serif text-xl font-semibold text-[#222222]">Select Delivery Days</h2>

                <div className="mb-2.5 flex flex-row flex-wrap gap-2">
                  {(['Daily', 'Mon-Sat', 'Customize'] as const).map((opt) => {
                    const isActive = deliveryFrequency === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setDeliveryFrequency(opt);
                          setSelectedDays([]);
                        }}
                        className={`min-h-[40px] min-w-0 flex-1 rounded-xl border-2 border-[#E9E6E2] px-3 py-2 text-center text-xs font-medium text-[#111827] transition-colors ${
                          isActive ? "border-transparent text-[#111827]" : "bg-white text-gray-500"
                        }`}
                        style={isActive ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : undefined}
                      >
                        {opt === 'Mon-Sat' ? 'Mon-Sat' : opt}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-2.5 flex flex-wrap gap-2">
                  {weekDays.map((day) => {
                    const isSelected =
                      deliveryFrequency === 'Daily'
                        ? true
                        : deliveryFrequency === 'Mon-Sat'
                          ? day !== 'Sun'
                          : activeDeliveryDays.includes(day);
                    const isDisabled = deliveryFrequency !== 'Customize';
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDeliveryDay(day)}
                        disabled={isDisabled}
                        className={`min-w-[2.4rem] flex-1 rounded-lg border-2 px-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "border-transparent font-bold text-[#111827]"
                            : "border-[#E9E6E2] bg-white text-gray-500"
                        } ${isDisabled ? "opacity-90" : ""}`}
                        style={isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : undefined}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {deliveryFrequency === 'Customize' && activeDeliveryDays.length < 3 ? (
                  <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-[#FCE7F3] px-3 py-2.5">
                    <IoWarning className="h-4 w-4 shrink-0 text-[#B91C1C]" aria-hidden />
                    <p className="flex-1 text-left text-xs font-semibold leading-snug text-[#7F1D1D]">
                      Please select at least 3 days for a 1-week subscription.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mb-2 mt-1">
                <div className="flex flex-row items-center gap-3 rounded-2xl border border-amber-200/80 bg-[#FFF4E5] p-4 shadow-sm">
                  <img
                    src={deliveryTruckIcon}
                    alt=""
                    className="h-14 w-14 shrink-0 object-contain"
                  />
                  <p className="flex-1 text-sm font-semibold leading-5 text-[#111827]">
                    Orders placed before 8 PM will be delivered next day. Sunday deliveries available on request.
                  </p>
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
                          className="h-5 w-5 flex-shrink-0"
                          style={{ color: theme.colors.primary }}
                          aria-hidden
                        />
                        <span className="truncate text-sm font-medium text-gray-900">From</span>
                      </div>
                      <p className="line-clamp-3 pl-7 text-sm leading-snug text-gray-600">
                        {isLoadingCartTotals && !cartStoreName.trim() ? (
                          <span className="text-gray-400">Loading store…</span>
                        ) : (
                          displayStoreName
                        )}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <MdLocationOn className="flex-shrink-0 text-lg" style={{ color: theme.colors.primary }} aria-hidden />
                        <span className="truncate text-sm font-medium text-gray-900">To</span>
                      </div>
                      <p className="line-clamp-2 pl-7 text-sm font-medium leading-snug text-gray-900">
                        {defaultAddress.type}
                      </p>
                      <p className="line-clamp-4 pl-7 text-sm leading-snug text-gray-600">
                        {formatAddress(defaultAddress)}
                      </p>
                      {isCheckingDeliveryCoverage && defaultAddress.coordinates && (
                        <p className="mt-2 pl-7 text-xs text-gray-400">Checking delivery area…</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-sm text-gray-500">No address found</p>
                    <button
                      type="button"
                      onClick={handleEditAddress}
                      className="text-sm font-medium hover:underline"
                      style={{ color: theme.colors.primary }}
                    >
                      Add Address
                    </button>
                  </div>
                )}
              </div>

              {showUnifiedDeliveryAlert ? (
                deliveryStoreOffline ? (
                  <div
                    className="min-w-0 rounded-[12px] border border-red-600 bg-red-50 px-3 py-2.5 shadow-sm"
                    role="alert"
                  >
                    <p className="text-[13px] font-semibold leading-snug text-red-900">
                      The nearest store for this area is offline — try another address.
                    </p>
                  </div>
                ) : deliveryBlockedByCoverage ? (
                  <GpDailyOutOfZoneBanner />
                ) : suggestedStoreForAddress ? (
                  <div
                    className="min-w-0 rounded-[12px] border border-red-600 bg-red-50 px-3 py-2.5 shadow-sm"
                    role="alert"
                  >
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
                  </div>
                ) : null
              ) : null}

              {/* ── Promo Code ─────────────────────────────────────────────── */}
              <div
                className="bg-white rounded-2xl py-2.5 px-3 shadow-sm border-2"
                style={{ borderColor: theme.colors.primary }}
              >
                {appliedPromoCode ? (
                  <div className="flex items-center justify-between gap-2 min-h-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-[#f0f7f0] flex items-center justify-center">
                        <FaCheck className="text-xs" style={{ color: theme.colors.primary }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">"{appliedPromoCode}" applied</p>
                        {promoDiscount > 0 && (
                          <p className="text-xs font-medium" style={{ color: theme.colors.primary }}>
                            You save ₹{promoDiscount.toLocaleString('en-IN')}
                          </p>
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
                      <FaTag className="text-sm shrink-0" style={{ color: theme.colors.primary }} aria-hidden />
                      <span className="text-sm font-semibold text-gray-900">Add Promo Code</span>
                    </div>
                    <FaPlus className="text-sm shrink-0" style={{ color: theme.colors.primary }} aria-hidden />
                  </button>
                )}
              </div>

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
                    <div className="flex justify-between text-sm font-medium" style={{ color: theme.colors.primary }}>
                      <span>Promo ({appliedPromoCode})</span>
                      <span>-₹{promoDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                    ₹{total.toLocaleString('en-IN')}
                  </span>
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
                    disabled={isProcessingPayment}
                  />
                </div>
              )}

              {/* Checkout */}
              <button
                onClick={handleCheckout}
                disabled={
                  isProcessingPayment ||
                  deliveryBlockedByCoverage ||
                  deliveryBlockedByStoreMismatch ||
                  deliveryStoreOffline
                }
                className="w-full py-4 rounded-[25px] text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.colors.primary, color: 'black' }}
              >
                {isProcessingPayment && (
                  <Spinner size={22} variant="light" className="!inline-flex" />
                )}
                {isProcessingPayment ? 'Preparing payment…' : 'Checkout'}
              </button>
            </>
          </div>
        )}

      </div>

      {/* Store switch confirmation — same copy/layout as Settings */}
      {showSuggestedStoreSwitchModal && (
        <div className="fixed inset-0 z-[99997] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-center text-lg font-semibold text-gray-900">Switch Store?</h3>
            <p className="mb-6 text-center text-sm text-gray-600">
              Due to the change in store, items in your cart might get affected. Do you want to continue?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                disabled={isSwitchingSuggestedStore}
                onClick={() => void performSwitchToSuggestedStore()}
                className="w-full rounded-lg py-3 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: 'black',
                }}
              >
                {isSwitchingSuggestedStore ? 'Please wait…' : 'Continue'}
              </button>
              <button
                type="button"
                disabled={isSwitchingSuggestedStore}
                onClick={cancelSuggestedStoreSwitchModal}
                className="w-full rounded-lg py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Code Modal */}
      {showPromoModal && (
        <PromoCodeModal
          onClose={() => setShowPromoModal(false)}
          onApply={handleApplyPromoCode}
          isApplying={isApplyingPromo}
          appliedCode={appliedPromoCode}
          isDailyMode
        />
      )}

    </div>
  );
};

export default Cart;