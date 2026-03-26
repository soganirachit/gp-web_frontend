import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IoArrowBack, IoCreateOutline } from 'react-icons/io5';
import { BsCalendar4 } from 'react-icons/bs';
import { MdLocationOn } from 'react-icons/md';
import { FaTag, FaPlus, FaMinus, FaEllipsisV, FaTimes, FaCheck } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useFeatureTheme } from '../../../context/FeatureThemeContext';
import { addressService, Address } from '../../../services/address.service';
import { storeService } from '../../../services/store.service';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';
import CartRazorpayPayment from '../../../components/Payment/Rezorpay/CartRazorpayPayment';
import { paymentService } from '../../../services/payment.service';
import { orderService } from '../../../services/order.service';
import { customerService } from '../../../services/getcustomer.service';
import { cartService } from '../../../services/cart.service';
import Spinner from '../../../components/common/Spinner';
import api from '../../../services/api';
import { getApiUrl } from '../../../config/api.config';
import { useNetworkRecovery } from '../../../hooks/useNetworkRecovery';
import { SEO } from '../../../components/SEO';
import { trackInitiateCheckout, trackPurchase } from '../../../lib/metaPixel';
import { loadRazorpayScript } from '../../../lib/razorpayLoader';
import { formatPhoneForDisplay } from '../../../utils/phoneDisplay';

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

interface ApplyCouponResponse {
  message?: string;
  discount_amount?: number | string;
  coupon_code?: string;
  subtotal?: number | string;
  total?: number | string;
  tax_amount?: number | string;
  delivery_fee?: number | string;
  [key: string]: any;
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
  const storeId = storeService.getStoreIdForProducts() ?? 4;
  const res = await api.get(`${getApiUrl()}/cart/coupons/?store_id=${storeId}`);
  const json = res.data;
  return Array.isArray(json) ? json : (json.data ?? json.results ?? json.coupons ?? []);
};

const applyCouponAPI = async (couponCode: string): Promise<ApplyCouponResponse> => {
  try {
    const res = await api.post(`${getApiUrl()}/cart/apply-coupon/`, { coupon_code: couponCode });
    return res.data;
  } catch (error: any) {
    const err = error?.response?.data || {};
    throw new Error(err?.message || err?.detail || 'Invalid or expired promo code');
  }
};

const removeCouponAPI = async (): Promise<void> => {
  try {
    await api.post(`${getApiUrl()}/cart/remove-coupon/`, {});
  } catch (error: any) {
    const err = error?.response?.data || {};
    throw new Error(err?.message || err?.detail || 'Failed to remove promo code');
  }
};

// ─── PromoCodeModal ───────────────────────────────────────────────────────────

interface PromoCodeModalProps {
  onClose: () => void;
  onApply: (code: string) => Promise<void>;
  isApplying: boolean;
  appliedCode: string | null;
}

const PromoCodeModal: React.FC<PromoCodeModalProps> = ({ onClose, onApply, isApplying, appliedCode }) => {
  const [manualCode, setManualCode] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isFetchingCoupons, setIsFetchingCoupons] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  const handleManualApply = () => {
    if (manualCode.trim()) onApply(manualCode.trim().toUpperCase());
  };

  return (
    <>
      {/* Backdrop above app chrome (bottom nav z-50) */}
      <div className="fixed inset-0 z-[90] bg-black/40" onClick={onClose} aria-hidden />

      {/* Bottom sheet — flush to safe bottom so it isn’t fighting the nav */}
      <div
        className="fixed inset-x-0 bottom-0 z-[100] flex max-h-[min(88dvh,100vh)] flex-col rounded-t-[24px] bg-white pb-safe-bottom shadow-2xl sm:rounded-t-[28px]"
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

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3 sm:space-y-5 sm:py-4">

          {/* Manual entry */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm">Enter Promo Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
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
                        onClick={() => onApply(coupon.code)}
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
  const { feature } = useFeatureTheme();
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
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'dayAfter' | 'pickDate'>('tomorrow');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Check authentication and redirect if session expired
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('access_token')) {
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string>('');
  const datePickerRef = useRef<HTMLDivElement>(null);
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

  const [cartTotals, setCartTotals] = useState<{
    subtotal: number;
    taxAmount: number;
    deliveryFee: number;
    discountAmount: number;
    total: number;
  } | null>(null);
  const [isLoadingCartTotals, setIsLoadingCartTotals] = useState(false);
  /** After first totals fetch, refreshes (e.g. during checkout) must not show the full-page loader */
  const [hasLoadedCartTotalsOnce, setHasLoadedCartTotalsOnce] = useState(false);
  /** After first successful address + totals + sync idle, checkout must not full-screen when sync runs again */
  const [basketHydratedOnce, setBasketHydratedOnce] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showAddressSavedBanner, setShowAddressSavedBanner] = useState(false);

  useEffect(() => {
    if ((location.state as { addressUpdated?: boolean } | null)?.addressUpdated) {
      setShowAddressSavedBanner(true);
      navigate('.', { replace: true, state: {} });
    }
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
  const handleApplyPromoCode = async (code: string) => {
    if (!code) return;
    try {
      setIsApplyingPromo(true);
      const response = await applyCouponAPI(code);

      const discountAmt = parseFloat(String(response.discount_amount ?? 0));
      setPromoDiscount(isNaN(discountAmt) ? 0 : discountAmt);

      // If the response contains updated totals, use them directly
      if (response.total !== undefined || response.subtotal !== undefined) {
        setCartTotals({
          subtotal: parseFloat(String(response.subtotal ?? cartTotals?.subtotal ?? 0)),
          taxAmount: parseFloat(String(response.tax_amount ?? cartTotals?.taxAmount ?? 0)),
          deliveryFee: parseFloat(String(response.delivery_fee ?? cartTotals?.deliveryFee ?? 0)),
          discountAmount: isNaN(discountAmt) ? 0 : discountAmt,
          total: parseFloat(String(response.total ?? cartTotals?.total ?? 0)),
        });
      } else {
        // Otherwise re-fetch cart totals so the summary reflects the coupon
        try {
          const cartData = await cartService.getCartData();
          setCartTotals({
            subtotal: parseFloat(cartData.subtotal || '0'),
            taxAmount: parseFloat(cartData.tax_amount || '0'),
            deliveryFee: parseFloat(cartData.delivery_fee || '0'),
            discountAmount: parseFloat(cartData.discount_amount || '0'),
            total: parseFloat(cartData.total || '0'),
          });
        } catch (_) {}
      }

      setAppliedPromoCode(code);
      setShowPromoModal(false);
      toast.success(`Promo code "${code}" applied!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply promo code');
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
      const cartData = await cartService.getCartData();
      setCartTotals({
        subtotal: parseFloat(cartData.subtotal || '0'),
        taxAmount: parseFloat(cartData.tax_amount || '0'),
        deliveryFee: parseFloat(cartData.delivery_fee || '0'),
        discountAmount: parseFloat(cartData.discount_amount || '0'),
        total: parseFloat(cartData.total || '0'),
      });
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
    setIsLoadingSlots(true);
    try {
      const storeId = storeService.getStoreIdForProducts() ?? 4;
      const params = new URLSearchParams();
      params.set('store_id', String(storeId));
      const response = await api.get(`/delivery/slots/available/?${params.toString()}`);
      const raw = Array.isArray(response.data) ? response.data : (response.data?.data ?? response.data?.results ?? []);
      // API returns [{ slot: { id, slot_name, start_time, end_time }, is_available }, ...] — flatten and filter
      const slots: DeliverySlot[] = raw
        .filter((item: any) => item?.is_available !== false && item?.slot)
        .map((item: any) => {
          const s = item.slot;
          return { id: s.id, slot_name: s.slot_name, start_time: s.start_time, end_time: s.end_time };
        });
      setAvailableSlots(slots);
      // Auto-select first slot, or restore previously selected slot if still available
      if (slots.length > 0) {
        const restored = deliveryInfo?.slotId
          ? slots.find(s => s.id === deliveryInfo.slotId)
          : null;
        const toSelect = restored ?? slots[0];
        setSelectedSlotId(toSelect.id);
        setSelectedTimeSlot(toSelect.slot_name);
        updateDeliveryInfo({
          ...(deliveryInfo ?? { deliveryDate: format(date, 'dd MMM yyyy'), selectedDate: date }),
          timeSlot: toSelect.slot_name,
          slotId: toSelect.id,
        });
      } else {
        setSelectedSlotId(null);
        setSelectedTimeSlot('');
      }
    } catch {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setSelectedTimeSlot('');
    } finally {
      setIsLoadingSlots(false);
    }
  };

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

  // Fetch cart totals
  // Depend on `items` so the summary auto-refreshes when quantities or items change
  useEffect(() => {
    const fetchCartTotals = async () => {
      if (!isLoggedIn) return;
      try {
        setIsLoadingCartTotals(true);
        const cartData = await cartService.getCartData();
        setCartTotals({
          subtotal: parseFloat(cartData.subtotal || '0'),
          taxAmount: parseFloat(cartData.tax_amount || '0'),
          deliveryFee: parseFloat(cartData.delivery_fee || '0'),
          discountAmount: parseFloat(cartData.discount_amount || '0'),
          total: parseFloat(cartData.total || '0'),
        });
      } catch (_) {
        setCartTotals(null);
      } finally {
        setIsLoadingCartTotals(false);
        setHasLoadedCartTotalsOnce(true);
      }
    };
    fetchCartTotals();
  }, [isLoggedIn, items]);

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
      const dateObj = deliveryInfo.selectedDate instanceof Date
        ? deliveryInfo.selectedDate
        : deliveryInfo.selectedDate
          ? new Date(deliveryInfo.selectedDate)
          : tomorrow;
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

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'dayAfter' | 'pickDate') => {
    setSelectedDateOption(option);
    if (option === 'pickDate') { setShowDatePicker(true); return; }
    const dateMap = { today: new Date(), tomorrow: addDays(new Date(), 1), dayAfter: addDays(new Date(), 2) };
    const selectedDate = dateMap[option];
    updateDeliveryInfo({ deliveryDate: format(selectedDate, 'dd MMM yyyy'), timeSlot: '', slotId: undefined, selectedDate });
    fetchSlotsForDate(selectedDate);
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
      setShowDatePicker(false);
      updateDeliveryInfo({ deliveryDate: format(date, 'dd MMM yyyy'), timeSlot: '', slotId: undefined, selectedDate: date });
      fetchSlotsForDate(date);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
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
    setSelectedSlotId(slot.id);
    setSelectedTimeSlot(slot.slot_name);
    if (deliveryInfo) updateDeliveryInfo({ ...deliveryInfo, timeSlot: slot.slot_name, slotId: slot.id });
  };

  const isBouquetItem = (item: (typeof items)[number]) => {
    const slug = item.categorySlug?.toLowerCase() ?? '';
    if (slug.includes('bouquet')) return true;
    return item.name.toLowerCase().includes('bouquet');
  };

  const handleEditItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || !isBouquetItem(item)) return;
    setEditingItemId(itemId);
    setEditMessage(item.customizedMessage || '');
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await updateQuantity(itemId, item.quantity, editMessage.trim());
      setEditingItemId(null);
      toast.success('Message updated');
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message;
      toast.error(apiMessage || 'Failed to update message. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditMessage('');
  };

  const handleQuantityDelta = async (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity && delta < 0) return;
    try {
      await updateQuantity(itemId, next, item.customizedMessage || '');
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message;
      toast.error(apiMessage || 'Could not update quantity.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      setOpenMenuId(null);
      toast.success('Item removed from cart');
    } catch (_) {
      toast.error('Failed to remove item. Please try again.');
    }
  };

  const handleEditAddress = () => {
    const addressPath = feature === 'gpStore' ? '/gp-store/address-selection' : '/gp-daily/address-selection';
    navigate(addressPath, { state: { fromCart: true } });
  };

  const handleCheckout = async () => {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (!deliveryInfo) { toast.error('Please select delivery date and time'); return; }
    if (!isLoggedIn) {
      navigate(`${basePath}/login`, { state: { returnUrl: `${basePath}/basket`, fromCart: true } });
      return;
    }

    try {
      await syncCartToAPI();
      await loadCartFromAPI();
      try {
        setIsLoadingCartTotals(true);
        const cartData = await cartService.getCartData();
        setCartTotals({
          subtotal: parseFloat(cartData.subtotal || '0'),
          taxAmount: parseFloat(cartData.tax_amount || '0'),
          deliveryFee: parseFloat(cartData.delivery_fee || '0'),
          discountAmount: parseFloat(cartData.discount_amount || '0'),
          total: parseFloat(cartData.total || '0'),
        });
      } catch (_) {} finally { setIsLoadingCartTotals(false); }
    } catch (_) {
      toast.error("We couldn't update your basket. Check your connection and try checkout again.");
      return;
    }

    if (!defaultAddress) { toast.error('Please add a delivery address'); navigate(`${basePath}/addresses`); return; }

    try {
      setIsProcessingPayment(true);
      let deliveryDateFormatted: string | undefined;
      if (deliveryInfo.selectedDate) {
        deliveryDateFormatted = format(deliveryInfo.selectedDate, 'yyyy-MM-dd');
      } else if (deliveryInfo.deliveryDate) {
        try { deliveryDateFormatted = format(new Date(deliveryInfo.deliveryDate), 'yyyy-MM-dd'); }
        catch { deliveryDateFormatted = format(addDays(new Date(), 1), 'yyyy-MM-dd'); }
      }
      if (!selectedSlotId) {
        toast.error('Please select a delivery time slot');
        setIsProcessingPayment(false);
        return;
      }
      const checkoutData = {
        delivery_address_id: Number(defaultAddress.id),
        delivery_slot_id: selectedSlotId,
        delivery_date: deliveryDateFormatted,
        delivery_instructions: '',
        customer_notes: '',
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
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
        toast.error('We received your payment but could not confirm your order. Please check your orders or contact support.');
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
    setShouldTriggerPayment(false);
  };

  // Order summary
  const localSubtotal = getTotalPrice();
  const subtotal = cartTotals?.subtotal ?? localSubtotal;
  const deliveryFee = cartTotals?.deliveryFee ?? 0;
  const tax = cartTotals?.taxAmount ?? 0;
  const discount = cartTotals?.discountAmount ?? 0;
  const total = cartTotals?.total ?? (subtotal + deliveryFee + tax - discount);

  const formatAddress = (address: Address | null): string => {
    if (!address) return '';
    return [address.houseNo, address.streetName, address.area, address.city, address.state, address.pincode].filter(Boolean).join(', ');
  };

  const razorpayPrefillContact =
    customerInfo.contact ||
    formatPhoneForDisplay(authPhoneNumber || localStorage.getItem('phoneNumber') || '') ||
    undefined;

  // Auth guard
  if (!isLoggedIn || !localStorage.getItem('access_token')) {
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
    return (
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title="My Basket — Genda Phool"
        description="Your Genda Phool basket"
        canonical="https://customerapp.mygendaphool.com/gp-store/basket"
        noIndex={true}
      />
      <div className="mx-auto w-full max-w-[min(800px,100vw)] pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">My Basket</h1>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {showAddressSavedBanner && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-[#19411F]/20 bg-[#E6F4EA] px-4 py-3"
              role="status"
            >
              <FaCheck className="mt-0.5 flex-shrink-0 text-[#19411F]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Delivery address updated</p>
                <p className="text-xs text-gray-600 mt-0.5">We deliver to this location.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressSavedBanner(false)}
                className="flex-shrink-0 rounded-full p-1 text-gray-500 hover:bg-black/5"
                aria-label="Dismiss"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Your cart is empty</p>
              <button
                onClick={() => navigate('/gp-store/products')}
                className="mt-4 mx-auto bg-[#19411F] text-white px-6 py-2 rounded-lg hover:bg-[#1e5a1c] transition-colors flex items-center justify-center"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <>
              {/* Product Items */}
              {items.map((item) => (
                <div key={item.id} className="relative rounded-[25px] bg-white p-4 shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-gray-900 [overflow-wrap:anywhere]">
                          {item.name}
                          {item.variant?.name && (
                            <span className="font-normal text-gray-600"> ({item.variant.name})</span>
                          )}
                        </h3>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="rounded-full p-1 transition-colors hover:bg-gray-100"
                            aria-label="Item actions"
                          >
                            <FaEllipsisV className="text-gray-600" />
                          </button>
                          {openMenuId === item.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg">
                                {isBouquetItem(item) && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditItem(item.id)}
                                    className="w-full rounded-t-lg px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    Edit message
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className={`w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 ${isBouquetItem(item) ? 'rounded-b-lg' : 'rounded-lg'}`}
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {deliveryInfo && (
                        <div className="mb-1 text-sm text-gray-600">
                          <div>Delivery: {deliveryInfo.deliveryDate}</div>
                          <div>Time Slot: {deliveryInfo.timeSlot}</div>
                        </div>
                      )}
                      <div className="mb-2 text-lg font-bold text-gray-900">₹{item.price} each</div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Qty</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityDelta(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <FaMinus className="text-xs text-gray-600" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-base font-semibold text-gray-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityDelta(item.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#19411F] text-white transition-colors hover:bg-[#1e5a1c]"
                          aria-label="Increase quantity"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                      {isBouquetItem(item) && item.customizedMessage && editingItemId !== item.id && (
                        <div className="text-sm text-gray-600 [overflow-wrap:anywhere]">
                          <span className="font-medium text-gray-700">Message: </span>
                          {item.customizedMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {editingItemId === item.id && isBouquetItem(item) && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Customized message (optional)</label>
                        <textarea
                          value={editMessage}
                          onChange={(e) => { if (e.target.value.length <= 500) setEditMessage(e.target.value); }}
                          placeholder="Add a personalized message for the bouquet..."
                          className="w-full resize-none rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-[#19411F] focus:outline-none"
                          rows={3}
                          maxLength={500}
                        />
                        <div className="mt-1 text-right text-xs text-gray-500">{editMessage.length}/500</div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="flex flex-1 items-center justify-center rounded-lg bg-[#19411F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e5a1c]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Delivery Date and Time */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm relative">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Delivery Date</h3>
                <div className="grid grid-cols-2 gap-2 xs:grid-cols-4 mb-4">
                  {(['today', 'tomorrow', 'dayAfter', 'pickDate'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleDateOptionSelect(opt)}
                      className={`px-2 py-2 min-h-[40px] xs:min-h-[36px] rounded-xl text-[10px] xs:text-[10px] font-medium transition-colors flex items-center justify-center gap-1 text-center leading-tight ${
                        selectedDateOption === opt ? 'bg-[#19411F] text-white' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {opt === 'pickDate' && <BsCalendar4 className="flex-shrink-0 text-[10px]" aria-hidden />}
                      <span className="min-w-0 [overflow-wrap:anywhere]">
                        {opt === 'today' ? 'Today' : opt === 'tomorrow' ? 'Tomorrow' : opt === 'dayAfter' ? 'Day After' : 'Pick Date'}
                      </span>
                    </button>
                  ))}
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-3 mt-4">
                  Time Slot
                  {isLoadingSlots && <span className="ml-2 text-xs font-normal text-gray-400">Loading...</span>}
                </h3>
                
                {showDatePicker && (
                  <>
                    <div
                      className="fixed inset-0 bg-black bg-opacity-20 z-40"
                      onClick={() => setShowDatePicker(false)}
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
                      `}</style>
                      <DatePicker
                        selected={deliveryInfo?.selectedDate || null}
                        onChange={handleDatePickerChange}
                        minDate={new Date()}
                        inline
                        calendarClassName="!border-0 !shadow-none"
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                <div className="w-full">
                  {isLoadingSlots ? (
                    <div className="text-xs text-gray-400 py-2 text-center">Checking availability...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-xs text-red-500 py-2 text-center">No slots available for this date</div>
                  ) : (
                    <div className="grid gap-2 w-full" style={{ gridTemplateColumns: `repeat(${availableSlots.length}, 1fr)` }}>
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleTimeSlotSelect(slot)}
                          className={`w-full min-w-0 px-2.5 py-2 min-h-[36px] rounded-xl text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5 ${
                            selectedSlotId === slot.id ? 'bg-[#19411F] text-white' : 'bg-white text-gray-700 border border-gray-200'
                          }`}
                        >
                          {slot.start_time && slot.end_time ? formatSlotTimeRange(slot.start_time, slot.end_time) : (slot.slot_name || 'Slot')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Details — fixed visual height; full address on Edit */}
              <div className="h-[7.25rem] overflow-hidden rounded-[25px] bg-white p-3 shadow-sm sm:h-[7.5rem] sm:p-4">
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
                  <div className="min-h-0">
                    <div className="mb-1 flex items-center gap-2">
                      <MdLocationOn className="flex-shrink-0 text-lg text-[#19411F]" />
                      <span className="truncate text-sm font-medium text-gray-900">{defaultAddress.type}</span>
                    </div>
                    <p className="line-clamp-2 pl-7 text-sm leading-snug text-gray-600">
                      {formatAddress(defaultAddress)}
                    </p>
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

              {/* ── Promo Code ─────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl py-2.5 px-3 shadow-sm border-2 border-[#19411F]">
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

              {/* Order Summary */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Tax</span>
                    <span>₹{tax}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Discount</span>
                    <span>-₹{discount}</span>
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
                  <span className="text-xl font-bold text-[#19411F]">₹{total.toLocaleString('en-IN')}</span>
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
                disabled={isProcessingPayment}
                className="w-full bg-[#19411F] text-white py-4 rounded-[25px] text-base font-semibold hover:bg-[#1e5a1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingPayment && (
                  <Spinner size={22} variant="light" className="!inline-flex" />
                )}
                {isProcessingPayment ? 'Preparing payment…' : 'Checkout'}
              </button>
            </>
          )}
        </div>
      </div>

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