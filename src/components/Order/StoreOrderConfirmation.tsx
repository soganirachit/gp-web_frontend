import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleMap } from '@react-google-maps/api';
import { FaBox, FaClock, FaMapMarkerAlt, FaRupeeSign } from 'react-icons/fa';
import { MdLocationOn } from 'react-icons/md';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import Spinner from '../common/Spinner';
import { OrderConfirmationSkeleton } from '../common/PageSkeletons';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import allsetLogo from '../../assets/All/allset_logo.png';
import flowerCnfSvg from '../../assets/svg/gp_daily svg/flower_cnf.svg';
import savingsCnfSvg from '../../assets/svg/gp_daily svg/savings_cnf.svg';

interface MapAddress {
  coordinates?: string | null;
}

interface DeliveryAddress {
  address_type?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coordinates?: string | null;
}

interface OrderItem {
  product: { name: string };
  quantity: number;
}

interface OrderDetails {
  order_number: string;
  delivery_address?: DeliveryAddress | null;
  delivery_date?: string | null;
  delivery_time_slot?: string;
  items: OrderItem[];
  total_amount?: string;
  subtotal?: string;
  discount_amount?: string;
  created_at?: string;
}

const SuccessCheckmark: React.FC = () => {
  return (
    <motion.div
      className="relative w-20 h-20 mx-auto mb-2"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.2,
      }}
    >
      {/* Using the existing confirmation logo asset keeps visual consistency */}
      <img
        src={allsetLogo}
        alt="Success"
        className="w-20 h-20 object-contain select-none"
        style={{
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0) scale(1)',
        }}
      />
    </motion.div>
  );
};

const MapView: React.FC<{ address: MapAddress | null; themeColor: string }> = ({
  address,
  themeColor,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className="w-full h-[170px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-[170px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <FaMapMarkerAlt className="text-gray-400 text-4xl" />
      </div>
    );
  }

  // Default to India center; if coordinates exist, use them.
  let center = { lat: 20.5937, lng: 78.9629 };
  if (address?.coordinates) {
    const [lat, lng] = address.coordinates.split(',').map(Number);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      center = { lat, lng };
    }
  }

  return (
    <div className="w-full h-[170px] rounded-lg overflow-hidden relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={16}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          disableDefaultUI: true,
          gestureHandling: 'none',
          clickableIcons: false,
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <MdLocationOn className="text-4xl drop-shadow-lg" style={{ color: themeColor }} />
        </div>
      </GoogleMap>
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};

const StoreOrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const state = (location.state ?? {}) as {
    orderNumber?: string;
    orderId?: string;
    amount?: number;
  };

  const orderNumber = state.orderNumber || state.orderId;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderNumber) {
        setError('Order confirmation not available.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await orderService.getOrderByOrderNumber(orderNumber);
        if (!cancelled) {
          setOrder(data as OrderDetails | null);
          if (!data) setError('Order not found.');
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load order confirmation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const addressText = useMemo(() => {
    if (!order?.delivery_address) return '';
    const a = order.delivery_address;
    const line1 = [a.address_line1, a.address_line2].filter(Boolean).join(', ');
    const landmark = a.landmark ? `, ${a.landmark}` : '';
    const tail = [a.city, a.state, a.pincode].filter(Boolean).join(', ');
    const typePrefix = a.address_type ? `${a.address_type === 'work' ? 'Work' : 'Home'}: ` : '';
    return `${typePrefix}${line1}${landmark}${tail ? `, ${tail}` : ''}`.replace(/^,\s*/, '');
  }, [order?.delivery_address]);

  const savingsPercent = useMemo(() => {
    const subtotal = parseFloat(order?.subtotal || '0');
    const discount = parseFloat(order?.discount_amount || '0');
    const listing = subtotal + discount;
    if (!listing || listing <= 0 || !discount || discount <= 0) return 0;
    return Math.round((discount / listing) * 100);
  }, [order?.subtotal, order?.discount_amount]);

  const deliveryDateLabel = useMemo(() => {
    const raw = order?.delivery_date || order?.created_at || '';
    if (!raw) return '';
    try {
      return format(new Date(raw), 'd MMM yyyy');
    } catch {
      return raw;
    }
  }, [order?.delivery_date, order?.created_at]);

  const firstItem = order?.items?.[0];

  if (loading) {
    return <OrderConfirmationSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-700 mb-4">{error || 'Order not found'}</p>
        <button
          onClick={() => navigate(`${basePath}`)}
          className="bg-[#19411F] text-white px-6 py-2 rounded-full font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] px-4 pt-6 pb-nav-bottom">
        <div className="pt-8 pb-4 text-center">
          <SuccessCheckmark />
          <motion.h1
            className="text-2xl font-bold text-gray-900 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Thank you
          </motion.h1>
          <motion.p
            className="text-gray-900 text-sm sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Your order has been confirmed.
          </motion.p>
        </div>

        {/* Main confirmation card */}
        <motion.div
          className="bg-white rounded-[18px] mx-auto shadow-sm p-4 sm:p-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Address + Map */}
          <div className="flex items-start gap-3">
            <FaMapMarkerAlt className="text-[#19411F] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-gray-900 text-sm font-semibold">{addressText || 'Address not available'}</div>
            </div>
          </div>
          <div className="mt-3 -mx-4 sm:-mx-5">
            <MapView
              address={{ coordinates: order.delivery_address?.coordinates ?? null }}
              themeColor={theme.colors.primary}
            />
          </div>

          {/* Delivery + Item + Total */}
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <FaClock className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-gray-600 text-xs font-semibold">Delivery date & Time slot</div>
                <div className="text-gray-900 text-sm font-semibold">
                  {deliveryDateLabel}
                  {order.delivery_time_slot ? `, ${order.delivery_time_slot}` : ''}
                </div>
              </div>
            </div>

            {firstItem && (
              <div className="flex items-start gap-3">
                <FaBox className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-gray-600 text-xs font-semibold">Charh Bouquet</div>
                  <div className="text-gray-900 text-sm font-semibold">
                    {firstItem.product?.name || 'Product'} &nbsp;x {firstItem.quantity}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FaRupeeSign className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-gray-600 text-xs font-semibold">Total Amount</div>
                <div className="text-gray-900 text-sm font-semibold">₹{order.total_amount}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Savings banner (matches the gp-daily confirmation style) */}
        {savingsPercent > 0 && (
          <motion.div
            className="bg-opacity-20 rounded-xl p-4 mt-4 mb-3 flex items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: `${theme.colors.primary}33` }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src={flowerCnfSvg}
              alt="Flower"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 opacity-70"
            />

            <div className="relative z-10 px-2">
              {savingsPercent === 50 ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-900 text-sm font-medium">You're saving</span>
                  <img src={savingsCnfSvg} alt="50" className="w-12 h-12" />
                  <span className="text-gray-900 text-sm font-medium">this month!</span>
                </div>
              ) : (
                <span className="text-gray-900 text-sm font-medium">
                  You're saving {savingsPercent}% this month!
                </span>
              )}
            </div>

            <img
              src={flowerCnfSvg}
              alt="Flower"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 opacity-70 rotate-180"
            />
          </motion.div>
        )}

        {/* Explore more */}
        <div className="px-2">
          <button
            onClick={() => navigate(`${basePath}/products`)}
            className="w-full bg-[#19411F] text-white py-3.5 rounded-full text-[15px] font-semibold hover:bg-[#1e5a1c] transition-colors"
          >
            Explore More
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-3">
          Our customer care is available 24/7
        </p>

      </div>
    </div>
  );
};

export default StoreOrderConfirmation;

