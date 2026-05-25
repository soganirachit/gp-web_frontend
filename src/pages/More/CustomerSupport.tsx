import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import {
  supportService,
  SupportTicket,
  formatSupportStatusLabel,
  normalizeSupportStatus,
  type EligibleOrder,
} from "@/services/support.service";
import { formatItemsPreviewAsProductLabel } from "@/utils/orderListDisplay";
import { format } from "date-fns";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { SettingsListSkeleton } from "../../components/common/PageSkeletons";
import { UniformPageHeader } from "../../components/layout/UniformPageHeader";

function normalizeOrderNumber(n: string | null | undefined): string {
  return String(n ?? "").trim().toLowerCase();
}

/** Orders cannot open a duplicate ticket while one of these is still open. */
function isActiveSupportTicketStatus(status: string | undefined): boolean {
  const s = normalizeSupportStatus(status);
  if (
    s === "closed" ||
    s === "close" ||
    s === "resolved" ||
    s === "solved" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return false;
  }
  return (
    s === "open" ||
    s === "pending" ||
    s === "new" ||
    s === "in_progress" ||
    s === "processing" ||
    s === "assigned" ||
    s === "working" ||
    s === "reopened" ||
    s === "awaiting_reply" ||
    s === "awaiting_customer" ||
    s === "active" ||
    s === "answered" ||
    s === "waiting_on_customer"
  );
}

function orderNumbersWithActiveTickets(tickets: SupportTicket[]): Set<string> {
  const set = new Set<string>();
  for (const t of tickets) {
    if (!isActiveSupportTicketStatus(t.status)) continue;
    const on = normalizeOrderNumber(t.order_number ?? undefined);
    if (on) set.add(on);
  }
  return set;
}

const CustomerSupport: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsNext, setTicketsNext] = useState<string | null>(null);
  const [ticketsPrevious, setTicketsPrevious] = useState<string | null>(null);
  const [ticketsTotalCount, setTicketsTotalCount] = useState(0);
  const [ticketsLoadingMore, setTicketsLoadingMore] = useState(false);
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
      // Fetch eligible orders (preparing/OOD anytime; delivered within 12h)
      const eligibleOrders = await supportService.getEligibleOrders();
      console.log('Fetched eligible orders:', eligibleOrders);
      setOrders(eligibleOrders);
      
      const page = await supportService.getTicketsPage();
      setTickets(page.results);
      setTicketsNext(page.next);
      setTicketsPrevious(page.previous);
      setTicketsTotalCount(page.count);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketsAtUrl = async (url: string | null) => {
    if (!url?.trim()) return;
    try {
      setTicketsLoadingMore(true);
      const page = await supportService.getTicketsPage(url);
      setTickets(page.results);
      setTicketsNext(page.next);
      setTicketsPrevious(page.previous);
      setTicketsTotalCount(page.count);
    } catch (err) {
      console.error("Failed to load tickets page:", err);
    } finally {
      setTicketsLoadingMore(false);
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
      return orders.length === 0
        ? 'No orders available for support'
        : 'Select an order (active or delivered in last 12 hours)';
    }
    const match = orders.find(
      (o) => normalizeOrderNumber(o.order_number) === normalizeOrderNumber(selectedOrderNumber),
    );
    if (match) {
      return orderProductLabel(match);
    }
    return "Selected order";
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
    const s = normalizeSupportStatus(status);
    if (
      s === "open" ||
      s === "pending" ||
      s === "new" ||
      s === "reopened" ||
      s === "awaiting_reply" ||
      s === "awaiting_customer" ||
      s === "active"
    ) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (
      s === "resolved" ||
      s === "closed" ||
      s === "close" ||
      s === "solved" ||
      s === "cancelled" ||
      s === "canceled"
    ) {
      return "bg-green-100 text-green-800";
    }
    if (
      s === "in_progress" ||
      s === "processing" ||
      s === "assigned" ||
      s === "working" ||
      s === "answered" ||
      s === "waiting_on_customer"
    ) {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const blockedOrderNumbers = useMemo(
    () => orderNumbersWithActiveTickets(tickets),
    [tickets],
  );

  const productLabelByOrderNumber = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of orders) {
      const key = normalizeOrderNumber(order.order_number);
      if (!key) continue;
      const label =
        formatItemsPreviewAsProductLabel(order.items_preview) || "Your order";
      map.set(key, label);
    }
    return map;
  }, [orders]);

  const orderProductLabel = (order: EligibleOrder) =>
    formatItemsPreviewAsProductLabel(order.items_preview) || "Your order";

  const ticketProductLabel = (ticket: SupportTicket) => {
    const key = normalizeOrderNumber(ticket.order_number);
    if (key && productLabelByOrderNumber.has(key)) {
      return productLabelByOrderNumber.get(key)!;
    }
    return ticket.subject?.trim() || "Support ticket";
  };

  if (loading) {
    return <SettingsListSkeleton />;
  }

  return (
    <div className="min-h-0 flex-1 bg-[#f8f6f1]">
      <div className="mx-auto max-w-[800px]">
        <UniformPageHeader
          title="Customer Support"
          onBack={() => navigate(`${basePath}/account`, { replace: true })}
          padYClassName="pt-6 pb-4"
          className="sticky top-0 z-10 mb-4"
        />

        {/* Content */}
        <div className="px-4 pb-4">
          {/* Orders Dropdown — preparing/OOD anytime; delivered within 12h */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Select Order
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
                      const blocked = blockedOrderNumbers.has(
                        normalizeOrderNumber(order.order_number),
                      );
                      return (
                        <button
                          key={order.id}
                          type="button"
                          disabled={blocked}
                          onClick={() => {
                            if (blocked) return;
                            handleOrderSelect(order);
                          }}
                          className={`w-full text-left px-3 sm:px-4 py-3 text-sm sm:text-base transition-colors ${
                            blocked
                              ? 'opacity-50 cursor-not-allowed text-gray-500'
                              : selectedOrderNumber === order.order_number
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{orderProductLabel(order)}</span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                              <span className="text-xs text-gray-500">{orderDate}</span>
                            </div>
                            {blocked ? (
                              <span className="text-xs text-amber-700 mt-1.5 font-medium">
                                Support ticket already open for this order
                              </span>
                            ) : null}
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
              <>
              {ticketsTotalCount > tickets.length || ticketsNext || ticketsPrevious ? (
                <p className="text-xs text-gray-500 mb-3">
                  {ticketsTotalCount > 0
                    ? `Showing ${tickets.length} of ${ticketsTotalCount} tickets`
                    : `Showing ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
                </p>
              ) : null}
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
                        {(ticket.order_number || ticket.subject) && (
                          <p className="text-xs text-gray-500 mb-1">
                            {ticketProductLabel(ticket)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}
                      >
                        {formatSupportStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {(ticketsPrevious || ticketsNext) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    disabled={!ticketsPrevious || ticketsLoadingMore}
                    onClick={() => void loadTicketsAtUrl(ticketsPrevious)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!ticketsNext || ticketsLoadingMore}
                    onClick={() => void loadTicketsAtUrl(ticketsNext)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {ticketsLoadingMore ? "Loading…" : "Next"}
                  </button>
                </div>
              )}
              </>
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
