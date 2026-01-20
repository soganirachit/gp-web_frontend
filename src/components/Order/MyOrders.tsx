import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFilter, FaSearch, FaStar, FaRegStar, FaChevronRight } from 'react-icons/fa';
import { IoArrowBack } from "react-icons/io5";
import BottomNavigation from '../layout/BottomNav';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import Spinner from '../common/Spinner';

interface Order {
  id: string;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryTime?: string; // Added to match API response
  product?: {
    name: string;
    image: string[]; // Adjust based on actual API response, usually imagesUrl or image
    imagesUrl?: string[];
    price: number;
    sellingPrice?: number;
  };
  quantity: number;
}

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await orderService.getOrdersByCustomerId();
      if (fetchedOrders) {
        // Sort by newest first
        const sortedOrders = fetchedOrders.sort((a: Order, b: Order) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
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
    const dateStr = order.deliveryTime || order.deliveryDate || order.createdAt;
    const date = dateStr ? format(new Date(dateStr), 'MMM d') : '';

    if (s === 'delivered') return `Delivered on ${date}`;
    if (s === 'canceled' || s === 'cancelled') return `Canceled on ${date}`;
    // Map "SCHEDULED" to "Expected Delivery" for UI clarity
    if (s === 'scheduled') return `Expected Delivery on ${date}`;
    return `Expected Delivery on ${date}`;
  };

  const filteredOrders = orders.filter(order =>
    order.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock data for UI testing if no API data matches exactly the screenshot structure
  // In a real scenario, we'd rely on 'orders'. For the purpose of "looking like this", 
  // I will use 'filteredOrders' but fallback to a layout that handles empty states gracefully or uses the type properly.

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#FFFBEB] z-10">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">My Order</h1>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search your order here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f9f9f9] border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-gray-300"
              />
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
            <button className="w-12 h-[46px] flex items-center justify-center bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M7 12H17M10 18H14" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pb-24">
          {loading ? (
            <div className="flex justify-center pt-20">
              <Spinner size={40} />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const statusColor = getStatusColor(order.status);
                const productImg = order.product?.imagesUrl?.[0] || order.product?.image?.[0] || "https://via.placeholder.com/100";

                return (
                  <div key={order.id || index} className="flex gap-4 p-4 bg-white rounded-2xl border-b border-gray-50 shadow-sm">
                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      <img
                        src={productImg}
                        alt={order.product?.name}
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
                            {order.product?.name} {order.quantity > 1 ? `x${order.quantity}` : ''}
                          </h3>

                          {/* Ratings (Only for Delivered) */}
                          {order.status.toLowerCase() === 'delivered' && (
                            <div className="mb-1">
                              <div className="flex gap-0.5 mb-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <FaRegStar key={s} size={14} className="text-gray-400" />
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">Rate this product</p>
                            </div>
                          )}

                          {/* Fallback for non-delivered ratings spacer or other info */}
                          {order.status.toLowerCase() !== 'delivered' && (
                            <div className="h-4"></div>
                          )}
                        </div>

                        <button className="pt-1 text-gray-400">
                          <FaChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button className="w-full py-4 text-center text-gray-500 font-medium underline">
                Load More
              </button>
            </div>
          ) : (
            <div className="text-center pt-20 text-gray-500">
              <p>No orders found.</p>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 pb-2">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};

export default MyOrders;
