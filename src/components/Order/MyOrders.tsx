import React, { useEffect, useState } from 'react';
import { SEO } from '../SEO';
import { useNavigate } from 'react-router-dom';
import { FaFilter, FaSearch, FaChevronRight } from 'react-icons/fa';
import { IoArrowBack } from "react-icons/io5";
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import Spinner from '../common/Spinner';
import { SearchBar } from '../common/SearchBar';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

interface Order {
  id: string;
  order_number?: string;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryTime?: string;
  total_amount?: string;
  preview_image?: string;
  product?: {
    name: string;
    image: string[];
    imagesUrl?: string[];
    price: number;
    sellingPrice?: number;
  };
  quantity: number;
}

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await orderService.getOrders();
      if (fetchedOrders && fetchedOrders.length > 0) {
        // Transform API orders to match the component's Order interface
        const transformedOrders: Order[] = fetchedOrders.map((order: any) => {
          // Use the new API response structure with order_number, total_amount, and preview_image
          return {
            id: order.id?.toString() || order.order_number || Math.random().toString(),
            order_number: order.order_number || `Order #${order.id}`,
            status: order.status || 'pending',
            createdAt: order.created_at || order.createdAt || new Date().toISOString(),
            deliveryDate: order.delivery_date || order.deliveryDate,
            deliveryTime: order.delivery_time_slot || order.deliveryTime,
            total_amount: order.total_amount || order.total || '0',
            preview_image: order.preview_image || null,
            product: {
              name: order.order_number || 'Order',
              image: order.preview_image ? [order.preview_image] : [],
              imagesUrl: order.preview_image ? [order.preview_image] : [],
              price: parseFloat(order.total_amount || order.total || '0'),
              sellingPrice: parseFloat(order.total_amount || order.total || '0'),
            },
            quantity: order.items_count || 1,
          };
        });

        // Sort by newest first
        const sortedOrders = transformedOrders.sort((a: Order, b: Order) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    // Correct status mapping based on API
    // The API returns "SCHEDULED" which is technically "Expected"
    const s = status?.toLowerCase() || '';
    if (s === 'delivered') return 'text-[#166534]'; // Green
    if (s === 'canceled' || s === 'cancelled') return 'text-[#EF4444]'; // Red
    return 'text-[#1F2937]'; // Black/Gray for expected/scheduled
  };

  const getStatusText = (order: Order) => {
    const s = order.status?.toLowerCase() || '';
    // Use created_at date since delivery_date is null in the API response
    const date = format(new Date(order.createdAt), 'MMM d');

    if (s === 'delivered') return `Delivered on ${date}`;
    if (s === 'canceled' || s === 'cancelled') return `Canceled on ${date}`;
    // For other statuses, show the order date instead of "Expected Delivery" 
    // since there's no actual delivery_date in the response
    if (s === 'out_for_delivery') return `Out for Delivery`;
    if (s === 'scheduled') return `Scheduled`;
    // Default: show status or order date
    return `Ordered on ${date}`;
  };

  const filteredOrders = orders.filter(order =>
    true
  );

  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const hasMoreOrders = visibleCount < filteredOrders.length;


  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title="My Orders — Genda Phool"
        description="View your Genda Phool order history"
        canonical="https://customerapp.mygendaphool.com/gp-store/orders"
        noIndex={true}
      />
      <div className="max-w-[800px] mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">My Orders</h1>
          </div>

          {/* Search Bar — unified styling, order suggestions as you type */}
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar
                mode="order"
                placeholder="Search your order here"
                orders={orders}
                value={searchQuery}
                onChange={setSearchQuery}
                onOrderSelect={(order) => {
                  if (order.order_number) {
                    navigate(`${basePath}/orders/${order.order_number}`);
                  }
                }}
              />
            </div>
            <button className="w-12 h-[46px] flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_315_18148)">
                  <path d="M13.9997 2.66699H9.33301" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M6.66667 2.66699H2" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M14 8H8" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5.33333 8H2" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M14.0003 13.333H10.667" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M8 13.333H2" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M9.33301 1.33301V3.99967" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5.33301 6.66699V9.33366" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M10.667 12V14.6667" stroke="#222222" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                </g>
                <defs>
                  <clipPath id="clip0_315_18148">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>

            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-nav-bottom relative bg-[#f8f6f1]">
          {loading ? (
            <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
              <Spinner size={400} />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {visibleOrders.map((order, index) => {
                const statusColor = getStatusColor(order.status);
                const productImg = order.preview_image || order.product?.imagesUrl?.[0] || order.product?.image?.[0] || "/placeholder.svg";

                return (
                  <div
                    key={order.id || index}
                    onClick={() => order.order_number && navigate(`${basePath}/orders/${order.order_number}`)}
                    className="flex gap-4 p-4 border-b border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      <img
                        src={productImg}
                        alt={order.order_number || order.product?.name}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm font-semibold mb-1 ${statusColor}`}>
                            {getStatusText(order)}
                          </p>
                          <h3 className="text-base font-medium text-gray-900 mb-1 truncate">
                            {order.order_number || order.product?.name}
                          </h3>
                          <p className="text-sm font-semibold text-gray-700">
                            ₹{order.total_amount || order.product?.sellingPrice || '0.00'}
                          </p>
                        </div>

                        <div className="pt-1 text-gray-400">
                          <FaChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMoreOrders && (
                <button
                  className="w-full py-4 text-center text-gray-500 font-medium underline"
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                >
                  Load More
                </button>
              )}
            </div>
          ) : (
            <div className="text-center pt-20 text-gray-500">
              <p>No orders found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MyOrders;
