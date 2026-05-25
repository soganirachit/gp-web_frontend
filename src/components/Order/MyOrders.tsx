import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SEO } from '../SEO';
import { useNavigate } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import { OrdersListSkeleton } from '../common/PageSkeletons';
import { SearchBar } from '../common/SearchBar';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { UniformPageHeader } from '../layout/UniformPageHeader';
import {
  getCustomerOrderStatusLabel,
  getCustomerOrderStatusTextClass,
  toCustomerOrderStatusKey,
} from '../../utils/customerOrderStatus';
import {
  cleanSubscriptionProductDisplayName,
  extractFirstItemNameFromOrderRaw,
  extractSecondItemImageFromOrderRaw,
  formatOrderListProductLabel,
  resolveOrderItemsCount,
} from '../../utils/orderListDisplay';
import { OrderListThumb } from './OrderListThumb';

const ORDER_LIST_PAGE_SIZE = 6;

interface Order {
  id: string;
  order_number?: string;
  /** Backend list field — used to hide subscription rows on GP Store “My Orders”. */
  order_type?: string;
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryTime?: string;
  total_amount?: string;
  preview_image?: string;
  /** Card title: first item name, or "Name + N more" */
  productListLabel?: string;
  product?: {
    name: string;
    image: string[];
    imagesUrl?: string[];
    price: number;
    sellingPrice?: number;
  };
  quantity: number;
  secondItemImage?: string;
}

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  /** Max filtered rows to show; steps by 6 per “Load more” (6 → 12 → 18 …). */
  const [displayLimit, setDisplayLimit] = useState(ORDER_LIST_PAGE_SIZE);

  const subscriptionListOnly = feature === "gpDaily";

  useEffect(() => {
    void fetchOrders();
  }, [feature]);

  useEffect(() => {
    setDisplayLimit(ORDER_LIST_PAGE_SIZE);
  }, [searchQuery]);

  const mapRawToOrders = (fetchedOrders: any[]): Order[] =>
    fetchedOrders.map((order: any) => {
      const itemsCount = resolveOrderItemsCount(order);
      const productListLabel =
        (typeof order.product_list_label === "string" &&
          order.product_list_label.trim()) ||
        formatOrderListProductLabel(
          extractFirstItemNameFromOrderRaw(order),
          itemsCount,
        ) ||
        undefined;
      const cardTitle = productListLabel || order.order_number || "Order";
      return {
        id: order.id?.toString() || order.order_number || Math.random().toString(),
        order_number: order.order_number || `Order #${order.id}`,
        order_type: String(order.order_type ?? order.orderType ?? "").trim() || undefined,
        status: order.status || "pending",
        createdAt: order.created_at || order.createdAt || new Date().toISOString(),
        deliveryDate: order.delivery_date || order.deliveryDate,
        deliveryTime: order.delivery_time_slot || order.deliveryTime,
        total_amount: order.total_amount || order.total || "0",
        preview_image: order.preview_image || null,
        productListLabel,
        product: {
          name: cardTitle,
          image: order.preview_image ? [order.preview_image] : [],
          imagesUrl: order.preview_image ? [order.preview_image] : [],
          price: parseFloat(order.total_amount || order.total || "0"),
          sellingPrice: parseFloat(order.total_amount || order.total || "0"),
        },
        quantity: itemsCount,
        secondItemImage:
          extractSecondItemImageFromOrderRaw(order as Record<string, unknown>) ||
          (typeof order.second_item_image === "string"
            ? order.second_item_image
            : undefined),
      };
    });

  const filterOrdersForFeature = (sorted: Order[]): Order[] => {
    const isSubscriptionRow = (o: Order) =>
      String(o.order_type || "").toLowerCase() === "subscription";
    return subscriptionListOnly
      ? sorted.filter((o) => isSubscriptionRow(o))
      : sorted.filter((o) => !isSubscriptionRow(o));
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setNextPageUrl(null);
      const { orders: raw, nextUrl } = await orderService.getOrdersFirstPage(
        subscriptionListOnly ? { order_type: "subscription" } : undefined,
      );
      const enrichedRaw = await orderService.enrichOrderListProductLabels(
        (raw || []) as Record<string, unknown>[],
      );
      const transformedOrders = mapRawToOrders(enrichedRaw);
      const sortedOrders = transformedOrders.sort(
        (a: Order, b: Order) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      let merged = filterOrdersForFeature(sortedOrders);
      let url = nextUrl;
      let prefetchGuard = 0;
      while (
        merged.length < ORDER_LIST_PAGE_SIZE &&
        url &&
        prefetchGuard < 25
      ) {
        prefetchGuard += 1;
        const { orders: raw2, nextUrl: n } = await orderService.getOrdersNextPage(
          url,
          subscriptionListOnly,
        );
        url = n;
        const enrichedBatch = await orderService.enrichOrderListProductLabels(
          (raw2 || []) as Record<string, unknown>[],
        );
        const batch = filterOrdersForFeature(
          mapRawToOrders(enrichedBatch).sort(
            (a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
        merged = [...merged, ...batch].sort(
          (a: Order, b: Order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      setOrders(merged);
      setNextPageUrl(url);
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setOrders([]);
      setNextPageUrl(null);
    } finally {
      setDisplayLimit(ORDER_LIST_PAGE_SIZE);
      setLoading(false);
    }
  };

  const filterBySearch = (list: Order[], q: string): Order[] => {
    const ql = q.toLowerCase();
    return list.filter(
      (order) =>
        (order.order_number || "").toLowerCase().includes(ql) ||
        (order.productListLabel || order.product?.name || "").toLowerCase().includes(ql),
    );
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;

    const filteredNow = filterBySearch(orders, searchQuery);
    const shown = Math.min(displayLimit, filteredNow.length);
    const nextTarget = shown + ORDER_LIST_PAGE_SIZE;

    if (nextTarget <= filteredNow.length) {
      setDisplayLimit(nextTarget);
      return;
    }

    if (!nextPageUrl) return;

    setLoadingMore(true);
    try {
      let merged = orders;
      let url: string | null = nextPageUrl;
      let fetchGuard = 0;
      while (url && fetchGuard < 25) {
        fetchGuard += 1;
        const len = filterBySearch(merged, searchQuery).length;
        if (len >= nextTarget) break;

        const { orders: raw, nextUrl } = await orderService.getOrdersNextPage(
          url,
          subscriptionListOnly,
        );
        url = nextUrl;
        const enrichedMore = await orderService.enrichOrderListProductLabels(
          (raw || []) as Record<string, unknown>[],
        );
        const batch = filterOrdersForFeature(
          mapRawToOrders(enrichedMore).sort(
            (a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
        merged = [...merged, ...batch].sort(
          (a: Order, b: Order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setOrders(merged);
        setNextPageUrl(nextUrl);
        if (!nextUrl) break;
      }

      const finalLen = filterBySearch(merged, searchQuery).length;
      setDisplayLimit(Math.min(nextTarget, finalLen));
    } catch (error) {
      console.error("Failed to load more orders", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const getStatusText = (order: Order) => {
    const key = toCustomerOrderStatusKey(order.status ?? '');
    const date = format(new Date(order.createdAt), 'MMM d');

    if (key === 'delivered') return `Delivered on ${date}`;
    if (key === 'cancelled') return `Canceled on ${date}`;
    if (key === 'failed') return `Failed on ${date}`;
    if (key === 'out_for_delivery') return 'Out for Delivery';
    if (key === 'preparing') return 'Preparing';
    if (key === 'confirmed') return 'Confirmed';
    return `Ordered on ${date}`;
  };

  const filteredOrders = orders.filter(
    (order) =>
      (order.order_number || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (order.productListLabel || order.product?.name || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const visibleOrders = filteredOrders.slice(0, displayLimit);
  const canRevealMoreLocally = displayLimit < filteredOrders.length;
  const showLoadMore = canRevealMoreLocally || Boolean(nextPageUrl);

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const handleLoadMoreRef = useRef(handleLoadMore);
  handleLoadMoreRef.current = handleLoadMore;

  useEffect(() => {
    if (!showLoadMore) return;
    const el = loadMoreSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore) return;
        void handleLoadMoreRef.current();
      },
      { root: null, rootMargin: "160px 0px", threshold: 0 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [showLoadMore, loadingMore, displayLimit, filteredOrders.length, nextPageUrl, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f1]">
        <SEO
          title="My Orders — Genda Phool"
          description="View your Genda Phool order history"
          canonical="https://customerapp.mygendaphool.com/gp-store/orders"
          noIndex={true}
        />
        <OrdersListSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title="My Orders — Genda Phool"
        description="View your Genda Phool order history"
        canonical="https://customerapp.mygendaphool.com/gp-store/orders"
        noIndex={true}
      />
      <div className="max-w-[800px] mx-auto min-h-screen flex flex-col">
        <div className="sticky top-0 z-10 bg-[#f8f6f1] px-4 pt-6">
          <UniformPageHeader
            title="My Orders"
            onBack={() => navigate(`${basePath}/account`)}
            padXClassName="px-0"
            padYClassName="py-0 pb-4"
            className="mb-6 bg-transparent"
          />

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
            {/* Filter button — not wired; keep search full width */}
            {/*
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
            */}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-x-hidden bg-[#f8f6f1] px-4 pb-nav-bottom">
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {visibleOrders.map((order, index) => {
                const statusColor = getCustomerOrderStatusTextClass(order.status);
                const productImg =
                  order.preview_image ||
                  order.product?.imagesUrl?.[0] ||
                  order.product?.image?.[0] ||
                  null;

                return (
                  <div
                    key={order.id || index}
                    onClick={() => order.order_number && navigate(`${basePath}/orders/${order.order_number}`)}
                    className="flex w-full max-w-full min-w-0 gap-4 border-b border-gray-200 p-4 cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <OrderListThumb
                      primaryImageUrl={productImg}
                      itemsCount={order.quantity}
                      secondImageUrl={order.secondItemImage}
                    />

                    {/* Details */}
                    <div className="relative min-w-0 w-0 max-w-full flex-1 overflow-hidden pr-5">
                      <p className={`mb-1 text-sm font-semibold ${statusColor}`}>
                        {getStatusText(order)}
                      </p>
                      <p
                        className="mb-1 text-base font-medium leading-snug text-gray-900"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}
                      >
                        {(subscriptionListOnly
                          ? cleanSubscriptionProductDisplayName
                          : (s: string) => s)(
                          order.productListLabel ||
                            order.product?.name ||
                            order.order_number ||
                            "Order",
                        )}
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        ₹{order.total_amount || order.product?.sellingPrice || '0.00'}
                      </p>
                      <FaChevronRight
                        className="absolute right-0 top-1 text-gray-400"
                        size={14}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })}

              {showLoadMore && (
                <div
                  ref={loadMoreSentinelRef}
                  className="w-full py-2 flex items-center justify-center min-h-[40px]"
                >
                  {loadingMore ? (
                    <span className="text-gray-500 text-sm">Loading…</span>
                  ) : null}
                </div>

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
