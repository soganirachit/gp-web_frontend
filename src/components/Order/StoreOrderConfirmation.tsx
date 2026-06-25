import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { FaBox, FaCheck, FaClock, FaMapMarkerAlt, FaRupeeSign } from 'react-icons/fa';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { OrderConfirmationSkeleton } from '../common/PageSkeletons';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { orderService } from '../../services/order.service';
import { formatDeliveryAddressOrFallback } from '../../utils/formatDeliveryAddress';
import {
  formatDeliverySchedule,
  type DeliverySlotInfo,
  type OrderConfirmationSnapshot,
} from '../../utils/orderConfirmationDisplay';
import { formatOrderListProductLabel } from '../../utils/orderListDisplay';

interface DeliveryAddress {
  address_type?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coordinates?: string | null;
  lat_lng?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  location?: Record<string, unknown> | null;
}

function parseCoordString(raw: unknown): { lat: number; lng: number } | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const parts = s.split(',').map((x) => Number(String(x).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}

function pickLatLngFromDeliveryAddress(
  addr: DeliveryAddress | null | undefined,
): { lat: number; lng: number } | null {
  if (!addr) return null;
  const a = addr as Record<string, unknown>;
  const tryObj = (o: Record<string, unknown> | null | undefined) => {
    if (!o) return null;
    return (
      parseCoordString(o.coordinates) ||
      parseCoordString(o.lat_lng) ||
      parseCoordString(o.coordinate) ||
      (() => {
        const lat = Number(o.latitude ?? o.lat);
        const lng = Number(o.longitude ?? o.lng ?? o.lon);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      })()
    );
  };
  let r = tryObj(a as Record<string, unknown>);
  if (r) return r;
  const loc = a.location;
  if (loc && typeof loc === 'object') {
    r = tryObj(loc as Record<string, unknown>);
  }
  return r;
}

interface OrderItem {
  product?: {
    name?: string;
    category_name?: string;
  };
  quantity: number;
  special_instructions?: string;
}

interface OrderDetails {
  order_number: string;
  delivery_address?: DeliveryAddress | null;
  delivery_date?: string | null;
  delivery_time_slot?: string;
  delivery_slot_info?: DeliverySlotInfo;
  items: OrderItem[];
  total_amount?: string;
  created_at?: string;
}

type LocationState = {
  orderNumber?: string;
  orderId?: string;
  amount?: number;
  snapshot?: OrderConfirmationSnapshot;
};

type DisplayModel = {
  delivery_address: DeliveryAddress | null;
  deliverySchedule: string;
  items: Array<{
    key: string;
    name: string;
    message?: string;
  }>;
  total_amount: string;
};

function formatRupeeAmount(raw: string | number | undefined | null): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function modelFromSnapshot(snapshot: OrderConfirmationSnapshot): DisplayModel {
  return {
    delivery_address: (snapshot.delivery_address as DeliveryAddress) ?? null,
    deliverySchedule: formatDeliverySchedule(
      snapshot.delivery_date,
      snapshot.delivery_slot_info ?? null,
      snapshot.delivery_time_slot,
    ),
    items: (snapshot.items ?? []).map((item, i) => ({
      key: `snap-${i}`,
      name: item.name || 'Product',
      message: item.customizedMessage?.trim() || undefined,
    })),
    total_amount: formatRupeeAmount(snapshot.total_amount),
  };
}

function modelFromOrder(order: OrderDetails): DisplayModel {
  return {
    delivery_address: order.delivery_address ?? null,
    deliverySchedule: formatDeliverySchedule(
      order.delivery_date,
      order.delivery_slot_info ?? null,
      order.delivery_time_slot,
      order.created_at,
    ),
    items: (order.items ?? []).map((item, i) => ({
      key: `api-${item.product?.name ?? i}`,
      name: item.product?.name || 'Product',
      message: item.special_instructions?.trim() || undefined,
    })),
    total_amount: formatRupeeAmount(order.total_amount),
  };
}

const SuccessCheckmark: React.FC = () => (
  <motion.div
    className="relative w-20 h-20 mx-auto mb-2"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
  >
    <div className="w-20 h-20 rounded-full bg-[#19411f] flex items-center justify-center">
      <FaCheck className="text-white text-3xl" />
    </div>
  </motion.div>
);

const MapView: React.FC<{ deliveryAddress: DeliveryAddress | null | undefined }> = ({
  deliveryAddress,
}) => {
  const { isLoaded, loadError } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className="w-full h-[170px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
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

  const picked = pickLatLngFromDeliveryAddress(deliveryAddress ?? null);
  let center = { lat: 20.5937, lng: 78.9629 };
  let hasValidCoords = false;
  if (picked) {
    center = picked;
    hasValidCoords = true;
  }

  return (
    <div className="w-full h-[170px] rounded-lg overflow-hidden relative">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={hasValidCoords ? 16 : 4}
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
        {hasValidCoords ? <Marker position={center} /> : null}
      </GoogleMap>
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};

const StoreOrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const state = (location.state ?? {}) as LocationState;
  const orderNumber = state.orderNumber || state.orderId;
  const initialSnapshot = state.snapshot ?? null;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialSnapshot);
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
        if (!initialSnapshot) setLoading(true);
        setError(null);
        const data = await orderService.getOrderByOrderNumber(orderNumber);
        if (!cancelled) {
          if (data) {
            setOrder(data as OrderDetails);
          } else if (!initialSnapshot) {
            setError('Order not found.');
          }
        }
      } catch (e: unknown) {
        if (!cancelled && !initialSnapshot) {
          setError(e instanceof Error ? e.message : 'Failed to load order confirmation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, initialSnapshot]);

  const display = useMemo((): DisplayModel | null => {
    if (order) return modelFromOrder(order);
    if (initialSnapshot) return modelFromSnapshot(initialSnapshot);
    return null;
  }, [order, initialSnapshot]);

  const productSummary = useMemo(() => {
    if (!display?.items.length) return '';
    const firstName = display.items[0]?.name?.trim() || 'Product';
    return formatOrderListProductLabel(firstName, display.items.length);
  }, [display?.items]);

  const addressText = useMemo(() => {
    if (!display?.delivery_address) return '';
    const a = display.delivery_address;
    const body = formatDeliveryAddressOrFallback(a as Record<string, unknown>);
    const typePrefix = a.address_type
      ? `${a.address_type === 'work' ? 'Work' : 'Home'}: `
      : '';
    return `${typePrefix}${body}`.trim();
  }, [display?.delivery_address]);

  if (loading && !display) {
    return <OrderConfirmationSkeleton />;
  }

  if ((error || !display) && !order && !initialSnapshot) {
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

  if (!display) return <OrderConfirmationSkeleton />;

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] px-4 pt-6 pb-nav-bottom">
        <div className="pt-8 pb-4 text-center">
          <SuccessCheckmark />
          <motion.h1
            className="font-ibm-plex-serif text-[28px] font-semibold leading-8 text-gray-900 mb-2"
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

        <motion.div
          className="bg-white rounded-[18px] mx-auto shadow-sm p-4 sm:p-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-start gap-3">
            <FaMapMarkerAlt className="text-[#19411F] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-gray-900 text-sm font-semibold">
                {addressText || 'Address not available'}
              </div>
            </div>
          </div>
          <div className="mt-3 -mx-4 sm:-mx-5">
            <MapView deliveryAddress={display.delivery_address} />
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3">
              <FaClock className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-gray-600 text-xs font-semibold">Delivery date &amp; time slot</div>
                <div className="text-gray-900 text-sm font-semibold">
                  {display.deliverySchedule || '—'}
                </div>
              </div>
            </div>

            {productSummary && (
              <div className="flex items-start gap-3">
                <FaBox className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-gray-600 text-xs font-semibold">Order items</div>
                  <div className="text-gray-900 text-sm font-semibold">{productSummary}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FaRupeeSign className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-gray-600 text-xs font-semibold">Total Amount</div>
                <div className="text-gray-900 text-sm font-semibold">₹{display.total_amount}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="px-2 mt-6">
          <button
            onClick={() => navigate(`${basePath}/products`)}
            className="w-full bg-[#19411F] text-white py-3.5 rounded-full text-[15px] font-semibold hover:bg-[#1e5a1c] transition-colors"
          >
            Explore More
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderConfirmation;
