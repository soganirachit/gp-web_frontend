import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { FaChevronRight } from "react-icons/fa";
import { orderService } from "@/services/order.service";
import { supportService, SupportTicket } from "@/services/support.service";
import { format } from "date-fns";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import Spinner from "../../components/common/Spinner";

const CustomerSupport: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOrderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch eligible orders (delivered in last 12 hours)
      const eligibleOrders = await supportService.getEligibleOrders();
      console.log('Fetched eligible orders:', eligibleOrders);
      setOrders(eligibleOrders);
      
      // Fetch support tickets
      const supportTickets = await supportService.getTickets();
      console.log('Fetched support tickets:', supportTickets);
      setTickets(supportTickets);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (order: any) => {
    if (order) {
      setSelectedOrderNumber(order.order_number);
      setIsOrderDropdownOpen(false);
      // Navigate to question form with order ID
      navigate(`${basePath}/customer-support/questions?order_id=${order.id}&order_number=${order.order_number}`);
    }
  };

  const getSelectedOrderText = () => {
    if (!selectedOrderNumber) {
      return orders.length === 0 ? 'No orders available (delivered in last 12 hours)' : 'Select an order delivered in last 12 hours';
    }
    return selectedOrderNumber;
  };

  const handleTicketClick = (ticketNumber: string) => {
    navigate(`${basePath}/customer-support/chat?ticket=${ticketNumber}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'open' || s === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (s === 'resolved' || s === 'closed') return 'bg-green-100 text-green-800';
    if (s === 'in_progress') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-[#f8f6f1] min-h-screen flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="bg-[#f8f6f1] min-h-screen">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Customer Support</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-nav-bottom">
          {/* Orders Dropdown - Delivered in last 6 hours */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Select Order (Delivered in last 12 hours)
            </label>
            <div ref={dropdownRef} className="relative w-full">
              {/* Custom Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                disabled={orders.length === 0}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-3 sm:pl-4 pr-8 sm:pr-10 rounded-lg text-left text-sm sm:text-base focus:outline-none focus:bg-white focus:border-gray-500 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">
                  {getSelectedOrderText()}
                </span>
                <FaChevronRight 
                  className={`transform transition-transform flex-shrink-0 text-xs text-gray-400 ${isOrderDropdownOpen ? 'rotate-180' : 'rotate-90'}`}
                  style={{ marginLeft: '8px' }}
                />
              </button>

              {/* Custom Dropdown Options */}
              {isOrderDropdownOpen && orders.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsOrderDropdownOpen(false)}
                  />
                  <div 
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderNumber('');
                        setIsOrderDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 sm:px-4 py-3 text-sm sm:text-base transition-colors truncate ${
                        !selectedOrderNumber 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Select an order to create support ticket
                    </button>
                    {orders.map((order) => {
                      const orderDate = formatDate(order.delivered_at);
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => handleOrderSelect(order)}
                          className={`w-full text-left px-3 sm:px-4 py-3 text-sm sm:text-base transition-colors ${
                            selectedOrderNumber === order.order_number 
                              ? 'bg-gray-100 text-gray-900 font-medium' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{order.order_number}</span>
                            {order.items_preview && (
                              <span className="text-xs text-gray-500 truncate mt-1">
                                {order.items_preview}
                              </span>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                              <span className="text-xs text-gray-500">{orderDate}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {orders.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No orders available.
              </p>
            )}
          </div>

          {/* Support Ticket History */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Support Ticket History</h2>
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.ticket_number)}
                    className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {ticket.has_unread_by_customer && (
                            <span
                              className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500"
                              aria-label="unread messages"
                            />
                          )}
                          <h3 className="font-semibold text-gray-900 text-base">
                            {ticket.subject}
                          </h3>
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                        {ticket.messages_count !== undefined && (
                          <p className="text-xs text-gray-500 mb-1">
                            {ticket.messages_count} message{ticket.messages_count !== 1 ? 's' : ''}
                          </p>
                        )}
                        {ticket.order_number && (
                          <p className="text-xs text-gray-500 mb-1">
                            Order: {ticket.order_number}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No support tickets found.</p>
                <p className="text-sm mt-2">Select an order above to create a new support ticket.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerSupport;
