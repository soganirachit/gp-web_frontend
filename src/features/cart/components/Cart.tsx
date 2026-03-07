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
import BottomNav from '../../../components/layout/BottomNav';
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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const token = localStorage.getItem('token');
  const res = await fetch('http://185.137.122.250:8083/api/v1/cart/coupons/', {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to fetch coupons');
  const json = await res.json();
  // Response shape: { success: true, message: "...", data: [...] }
  return Array.isArray(json) ? json : (json.data ?? json.results ?? json.coupons ?? []);
};

const applyCouponAPI = async (couponCode: string): Promise<ApplyCouponResponse> => {
  const token = localStorage.getItem('token');
  const res = await fetch('http://185.137.122.250:8083/api/v1/cart/apply-coupon/', {
    method: 'POST',
    headers: {
      accept: '*/*',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ coupon_code: couponCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.detail || 'Invalid or expired promo code');
  }
  return res.json();
};

const removeCouponAPI = async (): Promise<void> => {
  const token = localStorage.getItem('token');
  const res = await fetch('http://185.137.122.250:8083/api/v1/cart/remove-coupon/', {
    method: 'POST',
    headers: {
      accept: '*/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
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
      {/* Backdrop — covers everything including bottom nav */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" style={{ zIndex: 48 }} onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-20 left-0 right-0 z-50 bg-white rounded-t-[28px] shadow-2xl max-h-[calc(100vh-5rem)] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Promo Codes</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FaTimes className="text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Manual entry */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Enter Promo Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
                placeholder="e.g. POOJA10"
                className="flex-1 border-2 border-gray-200 focus:border-[#19411F] rounded-xl px-4 py-2.5 text-sm font-medium uppercase tracking-wider outline-none transition-colors"
              />
              <button
                onClick={handleManualApply}
                disabled={!manualCode.trim() || isApplying}
                className="bg-[#19411F] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1e5a1c] transition-colors flex items-center justify-center"
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
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
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
  const { isLoggedIn } = useAuth();
  const { feature } = useFeatureTheme();
  const {
    items,
    deliveryInfo,
    removeFromCart,
    updateQuantity,
    updateCustomizedMessage,
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('8-11 AM');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Check authentication and redirect if session expired
  useEffect(() => {
    const token = localStorage.getItem('token');
    const phoneNumber = localStorage.getItem('phoneNumber');
    if (!isLoggedIn || !token || !phoneNumber) {
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
  const [editQuantity, setEditQuantity] = useState<number>(1);
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  // Trigger Razorpay button
  useEffect(() => {
    if (!shouldTriggerPayment) return;
    const timer = setTimeout(() => {
      if (paymentButtonRef.current) paymentButtonRef.current.click();
    }, 200);
    return () => clearTimeout(timer);
  }, [shouldTriggerPayment]);

  const timeSlots = ['8-11 AM', '11-2 PM', '2-6 PM', '6-9 PM'];

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
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      setIsInitialLoading(false);
    }
  }, [isLoggedIn, isLoadingAddress, isLoadingCartTotals, isSyncing]);

  // Fetch cart totals
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
      }
    };
    fetchCartTotals();
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

  // Init delivery info
  useEffect(() => {
    if (!deliveryInfo) {
      const tomorrow = addDays(new Date(), 1);
      updateDeliveryInfo({ deliveryDate: format(tomorrow, 'dd MMM yyyy'), timeSlot: '8-11 AM', selectedDate: tomorrow });
      setSelectedDateOption('tomorrow');
      setSelectedTimeSlot('8-11 AM');
    } else {
      if (deliveryInfo.selectedDate) {
        const dateObj = deliveryInfo.selectedDate instanceof Date ? deliveryInfo.selectedDate : new Date(deliveryInfo.selectedDate);
        if (isToday(dateObj)) setSelectedDateOption('today');
        else if (isTomorrow(dateObj)) setSelectedDateOption('tomorrow');
        else {
          const dayAfter = addDays(new Date(), 2);
          setSelectedDateOption(format(dateObj, 'yyyy-MM-dd') === format(dayAfter, 'yyyy-MM-dd') ? 'dayAfter' : 'pickDate');
        }
      }
      setSelectedTimeSlot(deliveryInfo.timeSlot);
    }
  }, [deliveryInfo, updateDeliveryInfo]);

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'dayAfter' | 'pickDate') => {
    setSelectedDateOption(option);
    if (option === 'pickDate') { setShowDatePicker(true); return; }
    const dateMap = { today: new Date(), tomorrow: addDays(new Date(), 1), dayAfter: addDays(new Date(), 2) };
    const selectedDate = dateMap[option];
    updateDeliveryInfo({ deliveryDate: format(selectedDate, 'dd MMM yyyy'), timeSlot: selectedTimeSlot, selectedDate });
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
      setShowDatePicker(false);
      updateDeliveryInfo({ deliveryDate: format(date, 'dd MMM yyyy'), timeSlot: selectedTimeSlot, selectedDate: date });
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

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    if (deliveryInfo) updateDeliveryInfo({ ...deliveryInfo, timeSlot: slot });
  };

  const handleEditItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) { setEditingItemId(itemId); setEditQuantity(item.quantity); setEditMessage(item.customizedMessage || ''); }
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    try {
      // Update both quantity and special instructions together in a single API call
      await updateQuantity(itemId, editQuantity, editMessage.trim());
      setEditingItemId(null);
      toast.success('Item updated successfully');
    } catch (error: any) {
      // Prefer API message like "Only 55 units available" when present
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message;
      toast.error(apiMessage || 'Failed to update item. Please try again.');
    }
  };

  const handleCancelEdit = () => { setEditingItemId(null); setEditQuantity(1); setEditMessage(''); };

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
      toast.success('Cart synced successfully');
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
      toast.error('Failed to sync cart. Please try again.');
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
      const checkoutData = {
        delivery_address_id: Number(defaultAddress.id),
        delivery_date: deliveryDateFormatted,
        delivery_instructions: deliveryInfo.deliveryDate ? `${deliveryInfo.deliveryDate} - ${deliveryInfo.timeSlot}` : deliveryInfo.timeSlot,
        customer_notes: '',
      };
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required. Please login again.');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    payment_status: string;
  }) => {
    setIsProcessingPayment(true);
    setShouldTriggerPayment(false);
    try {
      const verifyResponse = await paymentService.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      if (verifyResponse.order && verifyResponse.payment) {
        clearCart();
        toast.success('Order placed successfully!');
        const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
        navigate(`${basePath}/payment-success`, {
          state: { orderId: verifyResponse.order.order_number, orderNumber: verifyResponse.order.order_number, amount: razorpayAmount / 100 },
        });
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify payment. Please contact support.');
      if (paymentData.razorpay_order_id) {
        try {
          const statusResponse = await paymentService.getPaymentStatus(paymentData.razorpay_order_id);
          if (statusResponse.status === 'completed' && statusResponse.order_number) {
            clearCart();
            toast.success('Order placed successfully!');
            const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
            navigate(`${basePath}/payment-success`, {
              state: { orderId: statusResponse.order_number, orderNumber: statusResponse.order_number, amount: parseFloat(statusResponse.amount) },
            });
            return;
          }
        } catch (_) {}
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

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

  // Auth guard
  const token = localStorage.getItem('token');
  const phoneNumber = localStorage.getItem('phoneNumber');
  if (!isLoggedIn || !(token && phoneNumber)) {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    return <Navigate to={`${basePath}/login`} state={{ returnUrl: location.pathname, fromCart: true }} replace />;
  }

  // Show loader until all data is loaded
  const isPageLoading = isInitialLoading || (isLoggedIn && (isLoadingAddress || isLoadingCartTotals || isSyncing));
  
  if (isPageLoading) {
    return (
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto pb-20">
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
                <div key={item.id} className="bg-white rounded-[25px] p-4 shadow-sm relative">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-base">{item.name} x{item.quantity}</h3>
                        <div className="relative">
                          <button onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <FaEllipsisV className="text-gray-600" />
                          </button>
                          {openMenuId === item.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                                <button onClick={() => handleEditItem(item.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">Edit</button>
                                <button onClick={() => handleDeleteItem(item.id)} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {deliveryInfo && (
                        <div className="text-sm text-gray-600 mb-1">
                          <div>Delivery: {deliveryInfo.deliveryDate}</div>
                          <div>Time Slot: {deliveryInfo.timeSlot}</div>
                        </div>
                      )}
                      <div className="text-lg font-bold text-gray-900 mb-2">₹{item.price} each</div>
                      {item.customizedMessage && !editingItemId && (
                        <div className="text-sm text-gray-600">Customized Message: {item.customizedMessage}</div>
                      )}
                    </div>
                  </div>

                  {editingItemId === item.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <FaMinus className="text-gray-600 text-xs" />
                          </button>
                          <span className="text-base font-semibold text-gray-900 min-w-[2rem] text-center">{editQuantity}</span>
                          <button onClick={() => setEditQuantity(editQuantity + 1)} className="w-8 h-8 rounded-full bg-[#19411F] hover:bg-[#1e5a1c] text-white flex items-center justify-center transition-colors">
                            <FaPlus className="text-white text-xs" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Customized Message (optional)</label>
                        <textarea
                          value={editMessage}
                          onChange={(e) => { if (e.target.value.length <= 500) setEditMessage(e.target.value); }}
                          placeholder="Add a personalized message..."
                          className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-[#19411F] focus:outline-none resize-none text-sm"
                          rows={3}
                          maxLength={500}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">{editMessage.length}/500</div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleCancelEdit} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center">Cancel</button>
                        <button onClick={() => handleSaveEdit(item.id)} className="flex-1 px-4 py-2 bg-[#19411F] text-white rounded-lg hover:bg-[#1e5a1c] transition-colors text-sm font-medium flex items-center justify-center">Save</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Delivery Date and Time */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm relative">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Delivery Date</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(['today', 'tomorrow', 'dayAfter', 'pickDate'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleDateOptionSelect(opt)}
                      className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1 ${
                        selectedDateOption === opt ? 'bg-[#19411F] text-white' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {opt === 'pickDate' && <BsCalendar4 className="text-xs" />}
                      {opt === 'today' ? 'Today' : opt === 'tomorrow' ? 'Tomorrow' : opt === 'dayAfter' ? 'Day After' : 'Pick Date'}
                    </button>
                  ))}
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-3 mt-4">Time Slot</h3>
                
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

                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleTimeSlotSelect(slot)}
                      className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                        selectedTimeSlot === slot ? 'bg-[#19411F] text-white' : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Delivery Details</h3>
                  <button onClick={handleEditAddress} className="text-gray-600 hover:text-gray-800 transition-colors">
                    <IoCreateOutline className="text-xl" />
                  </button>
                </div>
                {isLoadingAddress ? (
                  <p className="text-sm text-gray-500">Loading address...</p>
                ) : defaultAddress ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MdLocationOn className="text-[#19411F] text-lg" />
                      <span className="text-sm font-medium text-gray-900">{defaultAddress.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-7">{formatAddress(defaultAddress)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">No address found</p>
                    <button onClick={handleEditAddress} className="text-sm text-[#19411F] font-medium hover:underline">Add Address</button>
                  </div>
                )}
              </div>

              {/* ── Promo Code ─────────────────────────────────────────────── */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm border-2 border-[#19411F]">
                {appliedPromoCode ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#f0f7f0] flex items-center justify-center">
                        <FaCheck className="text-[#19411F] text-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">"{appliedPromoCode}" applied</p>
                        {promoDiscount > 0 && (
                          <p className="text-xs text-[#19411F] font-medium">You save ₹{promoDiscount.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={handleRemovePromoCode} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <FaTimes className="text-gray-500 text-sm" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowPromoModal(true)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaTag className="text-[#19411F] text-lg" />
                      <span className="text-base font-medium text-gray-900">Add Promo Code</span>
                    </div>
                    <FaPlus className="text-[#19411F] text-lg" />
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
                    customerContact={customerInfo.contact}
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
                className="w-full bg-[#19411F] text-white py-4 rounded-[25px] text-base font-semibold hover:bg-[#1e5a1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessingPayment ? 'Processing...' : 'Checkout'}
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

      <BottomNav />
    </div>
  );
};

export default Cart;