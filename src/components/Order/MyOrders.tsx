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
  getCustomerOrderStatusTextClass,
  normalizeOrderStatusKey,
} from '../../utils/customerOrderStatus';
import {
  cleanSubscriptionProductDisplayName,
  extractFirstItemNameFromOrderRaw,
  extractSecondItemImageFromOrderRaw,
  formatOrderListProductLabel,
  resolveOrderItemsCount,
  looksLikeOrderNumberLabel,
  resolveOrderListCardTitle,
} from '../../utils/orderListDisplay';
import { OrderListThumb } from './OrderListThumb';

const ORDER_LIST_PAGE_SIZE = 6;

/** My Orders header — IBM Plex Serif (matches app `UniformPageHeader`). */
const MY_ORDER_HEADER_TITLE_CLASS =
  "font-ibm-plex-serif font-semibold text-[24px] leading-[26px] tracking-normal text-[#111827]";

const ORDER_LIST_STATUS_CLASS =
  "mb-1 text-[11px] font-semibold leading-snug";

const ORDER_LIST_PRODUCT_NAME_CLASS =
  "mb-1 line-clamp-1 text-[16px] font-medium leading-snug text-gray-900";

const ORDER_LIST_PRICE_CLASS = "text-sm font-semibold text-gray-700";
/** Max extra API pages fetched on first load when filtering leaves fewer than 6 rows. */
const ORDER_LIST_PREFETCH_MAX_PAGES = 2;

function formatRawOrderStatus(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .filter(Boolean)
    .join(' ');
}

async function enrichOrdersForList(
  rawRecords: Record<string, unknown>[],
): Promise<void> {
  if (rawRecords.length === 0) return;
  await orderService.enrichOrderListProductLabels(rawRecords, {
    concurrency: 4,
    maxFetches: Math.max(rawRecords.length, ORDER_LIST_PAGE_SIZE),
  });
}

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
      const rawFirstName = extractFirstItemNameFromOrderRaw(order);
      const firstItemName =
        rawFirstName && !looksLikeOrderNumberLabel(rawFirstName)
          ? rawFirstName
          : null;
      const enrichedLabel =
        typeof order.product_list_label === "string" &&
        order.product_list_label.trim() &&
        !looksLikeOrderNumberLabel(order.product_list_label)
          ? order.product_list_label.trim()
          : "";
      const productListLabel =
        enrichedLabel ||
        formatOrderListProductLabel(firstItemName, itemsCount) ||
        undefined;
      const lineName = firstItemName || productListLabel || "Order";
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
          name: lineName,
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
      const rawRecords = ((raw || []) as Record<string, unknown>[]);
      await enrichOrdersForList(rawRecords);
      const transformedOrders = mapRawToOrders(rawRecords);
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
        prefetchGuard < ORDER_LIST_PREFETCH_MAX_PAGES
      ) {
        prefetchGuard += 1;
        const { orders: raw2, nextUrl: n } = await orderService.getOrdersNextPage(
          url,
          subscriptionListOnly,
        );
        url = n;
        const batchRaw = (raw2 || []) as Record<string, unknown>[];
        await enrichOrdersForList(batchRaw);
        const batch = mapRawToOrders(batchRaw);
        const filteredBatch = filterOrdersForFeature(
          batch.sort(
            (a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
        merged = [...merged, ...filteredBatch].sort(
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
        const batchRaw = (raw || []) as Record<string, unknown>[];
        await enrichOrdersForList(batchRaw);
        const batch = filterOrdersForFeature(
          mapRawToOrders(batchRaw).sort(
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
    const s = normalizeOrderStatusKey(order.status ?? '');
    const date = format(new Date(order.createdAt), 'MMM d');

    if (s === 'delivered') return `Delivered on ${date}`;
    if (s.includes('cancel')) return `Canceled on ${date}`;
    if (s === 'failed') return `Failed on ${date}`;
    if (s === 'out_for_delivery') return 'Out for Delivery';
    if (s === 'scheduled') return 'Scheduled';
    if (s === 'confirmed') return 'Confirmed';
    if (s === 'ready') return 'Ready';
    if (s === 'pending' || s === 'processing' || s === 'preparing') {
      return formatRawOrderStatus(order.status);
    }
    if (order.status) return formatRawOrderStatus(order.status);
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
            title="My Order"
            onBack={() => navigate(`${basePath}/account`)}
            padXClassName="px-0"
            padYClassName="py-0 pb-4"
            className="mb-4 bg-transparent"
            titleClassName={MY_ORDER_HEADER_TITLE_CLASS}
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
            <div className="min-w-0">
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
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      order.order_number &&
                      navigate(`${basePath}/orders/${order.order_number}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (order.order_number) {
                          navigate(`${basePath}/orders/${order.order_number}`);
                        }
                      }
                    }}
                    className="flex w-full max-w-full min-w-0 cursor-pointer gap-3 border-b border-gray-200 py-3"
                  >
                    <OrderListThumb
                      primaryImageUrl={productImg}
                      itemsCount={order.quantity}
                      secondImageUrl={order.secondItemImage}
                    />

                    <div className="flex min-w-0 flex-1">
                      <div className="min-w-0 flex-1 pr-2">
                        <p
                          className={`${ORDER_LIST_STATUS_CLASS} ${statusColor}`}
                        >
                          {getStatusText(order)}
                        </p>
                        <p
                          className={ORDER_LIST_PRODUCT_NAME_CLASS}
                          style={{ overflowWrap: 'anywhere' }}
                        >
                          {(subscriptionListOnly
                            ? cleanSubscriptionProductDisplayName
                            : (s: string) => s)(
                            resolveOrderListCardTitle(order),
                          )}
                        </p>
                        <p className={ORDER_LIST_PRICE_CLASS}>
                          ₹{order.total_amount || order.product?.sellingPrice || '0.00'}
                        </p>
                      </div>
                      <FaChevronRight
                        className="mt-1 shrink-0 text-gray-400"
                        size={14}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })}

              {showLoadMore ? (
                <div
                  ref={loadMoreSentinelRef}
                  className="flex min-h-[40px] w-full items-center justify-center py-4"
                >
                  {loadingMore ? (
                    <span className="text-xs font-medium text-gray-500">Loading…</span>
                  ) : null}
                </div>
              ) : null}
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
