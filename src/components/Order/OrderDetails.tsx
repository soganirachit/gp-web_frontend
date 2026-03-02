import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { FaCopy } from 'react-icons/fa';
import BottomNavigation from '../layout/BottomNav';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import Spinner from '../common/Spinner';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import supportIcon from '../../assets/svg/gp_store_svg/support.svg';
import orderTickIcon from '../../assets/svg/gp_store_svg/ordertick.svg';
import orderCnfIcon from '../../assets/svg/gp_daily svg/ordercnf.svg';
import orderDeliveredIcon from '../../assets/svg/gp_store_svg/orderdelivered.svg';
import deliveryIcon from '../../assets/svg/gp_store_svg/delivery.svg';
import detailshomeIcon from '../../assets/svg/gp_store_svg/detailshome.svg';
import detailsuserIcon from '../../assets/svg/gp_store_svg/detailsuser.svg';

interface OrderItem {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
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
}

const OrderDetails: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails();
    }
  }, [orderNumber]);

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
    if (s === 'delivered') return 'bg-[#16A249] text-white';
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

  const calculateListingPrice = () => {
    if (!order) return '0.00';
    const subtotal = parseFloat(order.subtotal || '0');
    const discount = parseFloat(order.discount_amount || '0');
    return (subtotal + discount).toFixed(2);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#166534] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get the first item for the main display image
  const mainItem = order.items[0];
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Get timeline events
  const confirmedEvent = order.timeline.find(e => e.status === 'confirmed' || e.status === 'order_confirmed');
  const deliveredEvent = order.timeline.find(e => e.status === 'delivered');
  const outForDeliveryEvent = order.timeline.find(e => e.status === 'out_for_delivery');
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

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Order Details</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-24 relative bg-[#f8f6f1]">
          <div className="space-y-4">
            {/* Order Item Card */}
            <div className="p-4">
              {/* <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(order.status)} flex-shrink-0`}>
                  {getStatusText(order.status)}
                </span>
              </div> */}
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.id || index} className="flex gap-3">
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={item.product.primary_image || 'https://via.placeholder.com/100'}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* First row: name + status */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product.name}
                        </p>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(
                            order.status
                          )} flex-shrink-0`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      {/* Second row: quantity + price */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">x{item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900">₹{item.subtotal}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Timeline */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Timeline</h2>
              <div className="relative">
                {/* Horizontal Timeline Line - centered vertically with circles */}
                {timelinePoints.length > 1 && (
                  <div className="absolute left-12 right-12 top-4 h-0.5 bg-[#16A249]"></div>
                )}

                <div className={`flex ${timelinePoints.length === 1 ? 'justify-center' : 'justify-between'} items-start`}>
                  {timelinePoints.map((point, index) => (
                    <div key={index} className="flex flex-col items-center relative z-10">
                      <div className="w-8 h-8 bg-[#16A249] rounded-full flex items-center justify-center mb-2">
                        {point.icon === 'cancel' ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <img src={point.icon} alt={point.label} className="w-4 h-4" />
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
            {order.delivery_address && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Details</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <img src={detailshomeIcon} alt="Home" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {order.delivery_address.address_type === 'home' ? 'Home' :
                          order.delivery_address.address_type === 'work' ? 'Work' : 'Other'}{' '}
                        <span className="text-sm font-normal text-gray-600">
                          {order.delivery_address.address_line1}
                          {order.delivery_address.address_line2 && `, ${order.delivery_address.address_line2}`}
                          {order.delivery_address.landmark && `, ${order.delivery_address.landmark}`}
                          {`, ${order.delivery_address.city}, ${order.delivery_address.state} - ${order.delivery_address.pincode}`}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <img src={detailsuserIcon} alt="User" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {order.delivery_address.receiver_name}{' '}
                        <span className="text-sm font-normal text-gray-600">{order.delivery_address.receiver_phone}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price Details */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Price Details</h2>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Listing Price</span>
                  <span className="text-gray-600 line-through">₹{calculateListingPrice()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Selling Price</span>
                  <span className="text-gray-900">₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Charges</span>
                  <span className="text-gray-900">{parseFloat(order.delivery_fee) === 0 ? 'Free' : `₹${order.delivery_fee}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">₹{order.tax_amount}</span>
                </div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-₹{order.discount_amount}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="font-bold text-gray-900">₹{order.total_amount}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-sm text-gray-600">
                  Payment Method: {order.payment_method === 'wallet' ? 'Wallet' :
                    order.payment_method === 'razorpay' ? 'Razor Pay' :
                      order.payment_method === 'cod' ? 'Cod' :
                        order.payment_method?.charAt(0).toUpperCase() + order.payment_method?.slice(1) || 'N/A'}
                </span>
              </div>
            </div>

            {/* Order Information */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Order ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                    <button
                      onClick={() => copyToClipboard(order.order_number)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaCopy size={14} />
                    </button>
                  </div>
                </div>
                {(order.order_type_label || order.order_type) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Order Type</span>
                    <span className="text-sm font-medium text-gray-900">
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Placed On</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(order.created_at)}</span>
                </div>
              </div>
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
                className="px-8 py-3 bg-[#19411f] text-white rounded-xl font-semibold hover:bg-[#145028] transition-colors"
              >
                Shop More from Genda Phool Store
              </button>
            </div>

            {/* Support Section */}
            {order.status === 'delivered' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={supportIcon}
                    alt="Support"
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-lg text-[#19411F] flex-1">
                    Support requests can only be raised within 4 hours after delivery.
                  </p>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => navigate(`${basePath}/customer-support`)}
                    className="text-base text-[#19411F] underline"
                  >
                    Raise a Support Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="sticky bottom-0 z-20">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;

