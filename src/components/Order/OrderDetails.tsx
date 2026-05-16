import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  IoDownloadOutline,
  IoStorefrontOutline,
  IoPersonOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import { MdLocationOn } from 'react-icons/md';
import { FaCopy } from 'react-icons/fa';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import { OrderDetailSkeleton } from '../common/PageSkeletons';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import supportIcon from '../../assets/svg/gp_store_svg/support.svg';
import orderTickIcon from '../../assets/svg/gp_store_svg/ordertick.svg';
import orderDeliveredIcon from '../../assets/svg/gp_store_svg/orderdelivered.svg';
import truckStoreIcon from '../../assets/svg/gp_store_svg/truckhome.svg';
import { formatPhoneForDisplay } from '../../utils/phoneDisplay';
import { invoiceService, type OrderInvoicePayload } from '../../services/invoice.service';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { UniformPageHeader } from '../layout/UniformPageHeader';

interface OrderItem {
  id: number;
  product: {
    id: number;
    name: string;
    slug?: string;
    primary_image: string;
    category_name: string;
    unit: string;
    unit_value: string;
    short_description: string;
  };
  quantity: number;
  unit_price: string;
  subtotal: string;
  special_instructions: string;
}

interface TimelineEvent {
  id: number;
  status: string;
  notes: string;
  created_by_name: string;
  created_at: string;
  metadata: any;
}

interface DeliveryAddress {
  address_type: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  receiver_name: string;
  receiver_phone: string;
}

/** Street / locality line from API fields. */
function buildStreetLineFromDelivery(addr: DeliveryAddress): string {
  return [addr.address_line1, addr.address_line2, addr.landmark].filter(Boolean).join(', ');
}

/**
 * City + state + pin line only when it adds information (API often duplicates this in line1).
 */
function cityStatePinLineIfDistinct(addr: DeliveryAddress, street: string): string | null {
  const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
  const pin = (addr.pincode || '').trim();
  const line =
    !cityState && !pin ? '' : !cityState ? pin : !pin ? cityState : `${cityState} - ${pin}`;
  if (!line) return null;
  const st = street.replace(/\s+/g, ' ').trim().toLowerCase();
  const ln = line.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!st) return line;
  if (st.includes(ln)) return null;
  const loose = (s: string) => s.replace(/[\s,:-]+/g, '');
  if (loose(st).includes(loose(ln)) && loose(ln).length >= 8) return null;
  return line;
}

interface SubscriptionInfo {
  subscription_id: number;
  plan_name: string;
  scheduled_date: string;
  subscription_status: string;
  quantity: string;
}

interface OrderDetails {
  id: number;
  order_number: string;
  store_name: string;
  delivery_address: DeliveryAddress | null;
  order_type: string;
  order_type_label?: string;
  subscription_info?: SubscriptionInfo | null;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  delivery_fee: string;
  /** Packaging / surcharges — backend may use `total_surcharge` or `surcharge_amount`. */
  total_surcharge?: string;
  surcharge_amount?: string;
  total_amount: string;
  delivery_date: string | null;
  delivery_time_slot: string;
  delivery_instructions: string;
  customer_notes: string;
  items: OrderItem[];
  timeline: TimelineEvent[];
  can_be_cancelled: boolean;
  can_be_modified: boolean;
  confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
  /** Optional — when API returns invoice metadata for footer line */
  invoice_number?: string;
  invoice_date?: string;
}

function formatRupee(amount: string | number | undefined | null): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function formatOrderDeliverySchedule(
  deliveryDate: string | null | undefined,
  timeSlot: string | null | undefined,
): string | null {
  const parts: string[] = [];
  const rawDate = (deliveryDate || '').trim();
  if (rawDate) {
    try {
      parts.push(format(new Date(rawDate), 'd MMM yyyy'));
    } catch {
      parts.push(rawDate);
    }
  }
  const slot = (timeSlot || '').trim();
  if (slot) parts.push(slot);
  return parts.length > 0 ? parts.join(', ') : null;
}

function formatPaymentMethodLabel(raw: string | undefined): string {
  if (!raw || raw.trim() === '') return 'N/A';
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'pos_cash') return 'Cash';
  if (normalized === 'wallet') return 'Wallet';
  if (normalized === 'razorpay') return 'Razor Pay';
  if (normalized === 'cod') return 'Cod';
  return raw;
}

const SUPPORT_TICKET_WINDOW_MS = 12 * 60 * 60 * 1000;

function isWithinSupportWindowAfterDelivery(
  status: string,
  deliveredAtIso: string | null | undefined,
): boolean {
  if (status?.toLowerCase() !== 'delivered') return false;
  if (!deliveredAtIso) return false;
  const deliveredMs = new Date(deliveredAtIso).getTime();
  if (!Number.isFinite(deliveredMs) || deliveredMs <= 0) return false;
  return Date.now() - deliveredMs < SUPPORT_TICKET_WINDOW_MS;
}

type OrderDetailsLocationState = { fromSubscriptionHistory?: boolean };

const OrderDetails: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const isDaily = feature === 'gpDaily';
  const linkAccentClass =
    isDaily
      ? 'text-[#FAA222] decoration-[#FAA222] hover:text-[#DD7600] hover:decoration-[#DD7600] focus-visible:ring-[#FAA222]/30'
      : 'text-[#19411f] decoration-[#19411f] hover:text-[#145028] hover:decoration-[#145028] focus-visible:ring-[#19411f]/30';
  const freeDeliveryHighlightClass = isDaily ? 'text-[#FAA222]' : 'text-[#19411F]';
  const discountHighlightClass = isDaily ? 'text-[#DD7600]' : 'text-green-600';
  const timelineAccentClass = isDaily ? 'bg-[#FAA222]' : 'bg-[#16A249]';
  const fromSubscriptionHistory = Boolean(
    (location.state as OrderDetailsLocationState | null)?.fromSubscriptionHistory,
  );

  const navigateToProductDetail = useCallback(
    (slug: string | undefined | null) => {
      const s = (slug || '').trim();
      if (!s) return;
      navigate(`${basePath}/product/${encodeURIComponent(s)}`);
    },
    [navigate, basePath],
  );
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceInfo, setInvoiceInfo] = useState<OrderInvoicePayload | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails();
    }
  }, [orderNumber]);

  /** GET /invoices/order/<order_number>/ whenever order is loaded (no post-delivery delay). */
  useEffect(() => {
    if (!orderNumber || !order) return;
    let cancelled = false;
    (async () => {
      setInvoiceLoading(true);
      try {
        const inv = await invoiceService.getInvoiceByOrderNumber(orderNumber);
        if (!cancelled) setInvoiceInfo(inv);
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, order?.id]);

  const openInvoicePdf = useCallback(() => {
    if (!invoiceInfo?.pdf_file || !order) return;
    const href = resolveMediaUrl(invoiceInfo.pdf_file);
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `Invoice-${order.order_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [invoiceInfo, order]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderService.getOrderByOrderNumber(orderNumber!);
      if (orderData) {
        setOrder(orderData);
      } else {
        setError('Order not found');
      }
    } catch (err: any) {
      console.error('Failed to fetch order details', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'delivered') {
      return isDaily ? 'bg-[#FAA222] text-black' : 'bg-[#16A249] text-white';
    }
    if (s === 'canceled' || s === 'cancelled') return 'bg-[#EF4444] text-white';
    if (s === 'out_for_delivery') return 'bg-[#3B82F6] text-white';
    return 'bg-gray-500 text-white';
  };

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'delivered') return 'Delivered';
    if (s === 'canceled' || s === 'cancelled') return 'Cancelled';
    if (s === 'out_for_delivery') return 'Out for Delivery';
    if (s === 'confirmed') return 'Confirmed';
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEE MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, 'EEE MMM, d'),
        time: format(date, 'h:mm a'),
      };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  /** Daily subscription deliveries: back to Manage My Subscription → Delivery History, not My Orders. */
  const navigateBackToOrderList = (o: OrderDetails | null) => {
    const type = (o?.order_type || "").toLowerCase();
    const isSubscription =
      type === "subscription" ||
      Boolean(o?.subscription_info) ||
      fromSubscriptionHistory;
    if (basePath === "/gp-daily" && isSubscription) {
      navigate(`${basePath}/manage-my-subscription?tab=history`);
      return;
    }
    navigate(`${basePath}/orders`);
  };

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
          <button
            type="button"
            onClick={() =>
              navigate(
                fromSubscriptionHistory
                  ? `${basePath}/manage-my-subscription?tab=history`
                  : `${basePath}/orders`,
              )
            }
            className={`px-4 py-2 rounded-lg ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get timeline events
  const confirmedEvent = order.timeline.find(e => e.status === 'confirmed' || e.status === 'order_confirmed');
  const outForDeliveryEvent = order.timeline.find(e => e.status === 'out_for_delivery');
  const deliveredEvent = order.timeline.find(e => e.status === 'delivered');
  const cancelledEvent = order.timeline.find(e => e.status === 'cancelled' || e.status === 'canceled');

  // Determine timeline points to show
  const timelinePoints: Array<{
    label: string;
    icon: string;
    date: string;
    time: string;
    status: string;
  }> = [];

  // Always show confirmed
  if (confirmedEvent) {
    timelinePoints.push({
      label: 'Order Confirmed',
      icon: orderTickIcon,
      date: formatDateTime(confirmedEvent.created_at).date,
      time: formatDateTime(confirmedEvent.created_at).time,
      status: 'confirmed'
    });
  } else {
    timelinePoints.push({
      label: 'Order Confirmed',
      icon: orderTickIcon,
      date: formatDateTime(order.created_at).date,
      time: formatDateTime(order.created_at).time,
      status: 'confirmed'
    });
  }

  if (outForDeliveryEvent) {
    timelinePoints.push({
      label: 'Out for Delivery',
      icon: truckStoreIcon,
      date: formatDateTime(outForDeliveryEvent.created_at).date,
      time: formatDateTime(outForDeliveryEvent.created_at).time,
      status: 'out_for_delivery'
    });
  }

  // Show delivered if exists (before cancelled)
  if (deliveredEvent) {
    timelinePoints.push({
      label: 'Delivered',
      icon: orderDeliveredIcon,
      date: formatDateTime(deliveredEvent.created_at).date,
      time: formatDateTime(deliveredEvent.created_at).time,
      status: 'delivered'
    });
  }

  // Show cancelled if exists (after delivered or if no delivery)
  if (order.cancelled_at || cancelledEvent) {
    const cancelledDate = cancelledEvent?.created_at || order.cancelled_at;
    if (cancelledDate) {
      timelinePoints.push({
        label: 'Cancelled',
        icon: 'cancel',
        date: formatDateTime(cancelledDate).date,
        time: formatDateTime(cancelledDate).time,
        status: 'cancelled'
      });
    }
  }

  const supportDeliveredAtIso = order.delivered_at || deliveredEvent?.created_at || null;
  const showSupportTicketSection = isWithinSupportWindowAfterDelivery(
    order.status,
    supportDeliveredAtIso,
  );

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto min-h-screen flex flex-col">
        <UniformPageHeader
          title="Order Details"
          onBack={() => navigateBackToOrderList(order)}
          padYClassName="pt-6 pb-4"
          className="sticky top-0 z-10"
        />

        {/* Content */}
        <div className="flex-1 px-4 pb-nav-bottom relative bg-[#f8f6f1]">
          <div className="space-y-4">
            {/* Order Item Card */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(order.status)} flex-shrink-0`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const slug = (item.product.slug || '').trim();
                  const inner = (
                    <>
                      <div className="w-16 h-16 flex-shrink-0">
                        <img
                          src={item.product.primary_image || '/placeholder.svg'}
                          alt={item.product.name}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600">x{item.quantity}</p>
                          <p className="text-sm font-semibold text-gray-900">₹{item.subtotal}</p>
                        </div>
                      </div>
                    </>
                  );
                  if (!slug) {
                    return (
                      <div key={item.id || index} className="flex gap-3">
                        {inner}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={item.id || index}
                      type="button"
                      onClick={() => navigateToProductDetail(slug)}
                      className="flex w-full gap-3 rounded-xl p-2 -m-2 text-left cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Timeline */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Timeline</h2>
              <div className="relative">
                {/* Horizontal Timeline Line - centered vertically with circles */}
                {timelinePoints.length > 1 && (
                  <div className={`absolute left-12 right-12 top-4 h-0.5 ${timelineAccentClass}`}></div>
                )}

                <div className={`flex ${timelinePoints.length === 1 ? 'justify-center' : 'justify-between'} items-start`}>
                  {timelinePoints.map((point, index) => (
                    <div key={index} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${timelineAccentClass}`}
                      >
                        {point.icon === 'cancel' ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <img
                            src={point.icon}
                            alt={point.label}
                            className={`w-8 h-6 ${
                              isDaily
                                ? 'brightness-0 invert'
                                : point.status === 'out_for_delivery'
                                  ? 'brightness-0 invert'
                                  : ''
                            }`}
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900 text-sm mb-1">{point.label}</p>
                        <p className="text-xs text-gray-600">{point.date}</p>
                        <p className="text-xs text-gray-600">{point.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            {(order.delivery_address ||
              order.store_name ||
              formatOrderDeliverySchedule(order.delivery_date, order.delivery_time_slot)) && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Details</h2>
                <div className="space-y-5">
                  {order.store_name ? (
                    <div className="flex min-w-0 items-start gap-2">
                      <IoStorefrontOutline
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500"
                        aria-hidden
                      />
                      <p className="min-w-0 flex-1 text-sm leading-snug text-gray-600">
                        <span className="font-semibold text-gray-900">Store </span>
                        {order.store_name}
                      </p>
                    </div>
                  ) : null}
                  {order.delivery_address ? (
                    <>
                      <div className="flex min-w-0 items-start gap-2">
                        <MdLocationOn
                          className="mt-0.5 flex-shrink-0 text-lg text-gray-500"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-gray-900">
                            {order.delivery_address.address_type === 'home'
                              ? 'Home'
                              : order.delivery_address.address_type === 'work'
                                ? 'Work'
                                : 'Other'}
                          </p>
                          {(() => {
                            const addr = order.delivery_address;
                            if (!addr) return null;
                            const street = buildStreetLineFromDelivery(addr);
                            const cityLine = cityStatePinLineIfDistinct(addr, street);
                            return (
                              <>
                                {street ? (
                                  <p className="mt-0.5 text-sm leading-snug text-gray-600">{street}</p>
                                ) : null}
                                {cityLine ? (
                                  <p className="mt-0.5 text-sm leading-snug text-gray-600">{cityLine}</p>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="mt-3 flex min-w-0 items-start gap-2">
                        <IoPersonOutline
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-gray-900">
                            {order.delivery_address.receiver_name}
                          </p>
                          <p className="mt-0.5 text-sm leading-snug text-gray-600">
                            {formatPhoneForDisplay(order.delivery_address.receiver_phone) ||
                              order.delivery_address.receiver_phone}
                          </p>
                        </div>
                      </div>
                      {formatOrderDeliverySchedule(order.delivery_date, order.delivery_time_slot) ? (
                        <div className="mt-3 flex min-w-0 items-start gap-2">
                          <IoTimeOutline
                            className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500"
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">Delivery date & slot</p>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                              {formatOrderDeliverySchedule(order.delivery_date, order.delivery_time_slot)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {!order.delivery_address &&
                  formatOrderDeliverySchedule(order.delivery_date, order.delivery_time_slot) ? (
                    <div className="flex min-w-0 items-start gap-2">
                      <IoTimeOutline
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">Delivery date & slot</p>
                        <p className="mt-0.5 text-sm leading-snug text-gray-600">
                          {formatOrderDeliverySchedule(order.delivery_date, order.delivery_time_slot)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Price breakdown — labels left, values right (matches mobile reference) */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-gray-600">Item Total</span>
                  <span className="text-right font-medium text-gray-900 tabular-nums">
                    ₹{formatRupee(order.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-gray-600">Delivery Charges</span>
                  <span
                    className={`text-right font-medium tabular-nums ${
                      parseFloat(order.delivery_fee || '0') === 0
                        ? 'text-[#19411F]'
                        : 'text-gray-900'
                    }`}
                  >
                    {parseFloat(order.delivery_fee || '0') === 0
                      ? 'Free'
                      : `₹${formatRupee(order.delivery_fee)}`}
                  </span>
                </div>
                {(() => {
                  const sur =
                    parseFloat(order.total_surcharge ?? order.surcharge_amount ?? '0') || 0;
                  return sur > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-gray-600">Packaging & other fees</span>
                      <span className="text-right font-medium text-gray-900 tabular-nums">
                        ₹{formatRupee(sur)}
                      </span>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-gray-600">Tax</span>
                  <span className="text-right font-medium text-gray-900 tabular-nums">
                    ₹{formatRupee(order.tax_amount)}
                  </span>
                </div>
                {parseFloat(order.discount_amount || '0') > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-gray-600">Discount</span>
                    <span className="text-right font-medium text-green-600 tabular-nums">
                      -₹{formatRupee(order.discount_amount)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-gray-900">Total Amount</span>
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    ₹{formatRupee(order.total_amount)}
                  </span>
                </div>
              </div>
              <div className="mt-3 px-3 py-2.5 border-t border-gray-200 text-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Payment Method: {formatPaymentMethodLabel(order.payment_method)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Information — label left / value right, values bold */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="mb-4 flex flex-nowrap items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-lg font-bold leading-none text-gray-900">
                  Order Information
                </h2>
                <div className="flex shrink-0 items-center">
                  {invoiceLoading && (
                    <span className="text-xs leading-none text-gray-500">Loading…</span>
                  )}
                  {!invoiceLoading &&
                    invoiceInfo &&
                    invoiceInfo.is_generated &&
                    invoiceInfo.pdf_file && (
                      <button
                        type="button"
                        onClick={openInvoicePdf}
                        className="inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-sm font-semibold leading-none text-[#19411f] underline decoration-[#19411f] underline-offset-[3px] transition-colors hover:text-[#145028] hover:decoration-[#145028] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19411f]/30 focus-visible:ring-offset-2"
                      >
                        <IoDownloadOutline className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate text-decoration-underline">Invoice</span>
                      </button>
                    )}
                  {!invoiceLoading &&
                    invoiceInfo &&
                    !(invoiceInfo.is_generated && invoiceInfo.pdf_file) && (
                      <span className="max-w-[11rem] text-right text-xs font-medium leading-none text-gray-500 sm:max-w-none">
                        Invoice being prepared
                      </span>
                    )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm text-gray-600">Order ID</span>
                  {/* Pull past card p-4 so value + copy sit flush to the card’s right edge */}
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-0 -mr-4 pr-0">
                    <span className="min-w-0 truncate text-right text-sm font-semibold text-gray-900">
                      {order.order_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.order_number)}
                      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                      aria-label="Copy order ID"
                    >
                      <FaCopy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {(order.order_type_label || order.order_type) && (
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-sm text-gray-600">Order Type</span>
                    <span className="min-w-0 flex-1 pl-2 text-right text-sm font-semibold text-gray-900">
                      {order.order_type_label ||
                        (order.order_type === 'online'
                          ? 'Store Order'
                          : order.order_type === 'pos'
                            ? 'POS Order'
                            : order.order_type === 'subscription'
                              ? 'Subscription Order'
                              : order.order_type)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm text-gray-600">Placed On</span>
                  <span className="min-w-0 flex-1 pl-2 text-right text-sm font-semibold text-gray-900">
                    {formatDate(order.created_at)}
                  </span>
                </div>
              </div>
              {(order.invoice_number || order.invoice_date) && (
                <p className="mt-4 text-xs leading-relaxed text-gray-400">
                  {order.invoice_number}
                  {order.invoice_number && order.invoice_date ? ' · ' : ''}
                  {order.invoice_date ? formatDate(order.invoice_date) : ''}
                </p>
              )}
            </div>

            {/* Subscription Info - only for subscription orders */}
            {order.order_type === 'subscription' && order.subscription_info && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Subscription</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <span className="text-sm font-medium text-gray-900">{order.subscription_info.plan_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Scheduled Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(order.subscription_info.scheduled_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {order.subscription_info.subscription_status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantity</span>
                    <span className="text-sm font-medium text-gray-900">{order.subscription_info.quantity}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Shop More Button */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate(`${basePath}`)}
                type="button"
                className={`min-w-[200px] rounded-full px-10 py-3 text-base font-semibold transition-colors ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
              >
                Shop More
              </button>
            </div>

            {/* Support Section — only within 12 hours of delivery timestamp */}
            {showSupportTicketSection && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="mb-3 flex items-start gap-3">
                  <img
                    src={supportIcon}
                    alt=""
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <p className="flex-1 text-left text-sm leading-relaxed text-gray-600">
                    Support requests can only be raised within 12 hours after delivery.
                  </p>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/customer-support`)}
                    className={`text-base font-medium underline underline-offset-2 ${linkAccentClass}`}
                  >
                    Raise a Support Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderDetails;

