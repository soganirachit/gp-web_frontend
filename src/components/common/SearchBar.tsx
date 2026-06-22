import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

/** Map overlay search input — solid background so map does not show through. */
export const GP_MAP_SEARCH_INPUT_CLASSES =
  "w-full rounded-xl border border-[#808080] bg-white p-3 pl-4 pr-10 text-left text-gray-900 shadow-sm placeholder:text-[#808080] focus:border-[#808080] focus:outline-none focus:ring-2";

/** Bottom sheets align with the app content column on viewports ≥590px. */
export const GP_SHEET_DESKTOP_ALIGN_CLASSES =
  "min-[590px]:left-1/2 min-[590px]:right-auto min-[590px]:w-full min-[590px]:max-w-[min(800px,100vw)] min-[590px]:-translate-x-1/2";

/** Shared search field chrome — map/location inputs should match these tokens. */
export const GP_SEARCH_FIELD_WRAP_CLASSES =
  "w-full rounded-xl border border-[#808080] bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 text-left";

export const GP_SEARCH_FIELD_INPUT_CLASSES =
  "flex-1 min-w-0 bg-transparent text-left text-sm font-medium text-gray-900 placeholder:text-[#808080] focus:outline-none sm:text-base";

export const GP_SEARCH_ICON_CLASSES =
  "h-4 w-4 shrink-0 text-[#808080] sm:h-5 sm:w-5";

/** GP Store / GP Daily home hero search — frosted white, no border. */
export const GP_HOMEPAGE_SEARCH_WRAP_CLASSES =
  "w-full rounded-xl border-0 bg-[#FFFFFFE5] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 text-left";

export type SearchBarMode = 'product' | 'order';

export interface ProductSuggestion {
  id: number;
  name: string;
  slug?: string;
  primary_image?: string;
  sellingPrice?: number;
  effective_price?: number | string;
  current_price?: number;
}

export interface OrderSuggestion {
  id: string | number;
  order_number?: string;
  product?: { name?: string };
  total_amount?: number | string;
}

interface SearchBarProps {
  placeholder?: string;
  mode: SearchBarMode;
  /** Product search: storeId for gp-store, undefined for home/gp-daily */
  storeId?: number | null;
  /** Product navigation: 'gp-store' | 'gp-daily' — which product page to open */
  productBasePath?: '/gp-store' | '/gp-daily';
  /** Order mode: pass orders for client-side filtering */
  orders?: OrderSuggestion[];
  onOrderSelect?: (order: OrderSuggestion) => void;
  /** Controlled: parent can filter list by query */
  value?: string;
  onChange?: (query: string) => void;
  className?: string;
  /** `homepage`: #FFFFFFE5 fill, no border (GP Store / GP Daily home). */
  variant?: "default" | "homepage";
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 1;
const MAX_SUGGESTIONS = 6;

export function SearchBar({
  placeholder = 'Search anything.....',
  mode,
  storeId,
  productBasePath = '/gp-store',
  orders = [],
  onOrderSelect,
  value,
  onChange,
  className = '',
  variant = 'default',
}: SearchBarProps) {
  const navigate = useNavigate();
  const [internalQuery, setInternalQuery] = useState('');
  const isControlled = value !== undefined;
  const query = isControlled ? value : internalQuery;
  const setQuery = (q: string) => {
    if (!isControlled) setInternalQuery(q);
    onChange?.(q);
  };
  const [suggestions, setSuggestions] = useState<ProductSuggestion[] | OrderSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProductSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      setLoading(true);
      const { productService, PRODUCT_AVAILABILITY_GP_DAILY_LIST } = await import(
        '../../services/product.service'
      );
      const availabilityType =
        productBasePath === '/gp-daily' ? PRODUCT_AVAILABILITY_GP_DAILY_LIST : undefined;
      const results = await productService.searchProducts(
        q.trim(),
        storeId ?? undefined,
        undefined,
        availabilityType,
      );
      setSuggestions((results || []).slice(0, MAX_SUGGESTIONS));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, productBasePath]);

  useEffect(() => {
    if (mode === 'product' && query.trim().length >= MIN_CHARS) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchProductSuggestions(query);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    } else if (mode === 'product') {
      setSuggestions([]);
    }
  }, [query, mode, fetchProductSuggestions]);

  useEffect(() => {
    if (mode === 'order' && query.trim()) {
      const q = query.toLowerCase();
      const filtered = orders.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.product?.name?.toLowerCase().includes(q)
      );
      setSuggestions(filtered.slice(0, MAX_SUGGESTIONS));
    } else if (mode === 'order') {
      setSuggestions([]);
    }
  }, [query, mode, orders]);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside, true);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof Node && containerRef.current?.contains(t)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, []);

  const handleProductSuggestionClick = (item: ProductSuggestion) => {
    setShowSuggestions(false);
    setQuery('');
    const identifier =
      productBasePath === '/gp-daily'
        ? String(item.slug ?? item.id)
        : item.slug || String(item.id);
    navigate(`${productBasePath}/product/${encodeURIComponent(identifier)}`, { state: { product: item } });
  };

  const handleOrderSuggestionClick = (order: OrderSuggestion) => {
    setShowSuggestions(false);
    setQuery('');
    onOrderSelect?.(order);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      /** Inline suggestions only — same as mobile: no standalone search results page. */
      e.preventDefault();
      if (mode === 'product' && suggestions.length > 0) {
        handleProductSuggestionClick(suggestions[0] as ProductSuggestion);
      } else if (mode === 'order' && suggestions.length > 0 && onOrderSelect) {
        handleOrderSuggestionClick(suggestions[0] as OrderSuggestion);
      }
      return;
    }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const hasSuggestions = suggestions.length > 0 && query.trim().length >= MIN_CHARS;

  const wrapClasses =
    variant === "homepage"
      ? GP_HOMEPAGE_SEARCH_WRAP_CLASSES
      : GP_SEARCH_FIELD_WRAP_CLASSES;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={wrapClasses}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (query.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={GP_SEARCH_FIELD_INPUT_CLASSES}
          aria-label="Search"
        />
        <FaSearch className={GP_SEARCH_ICON_CLASSES} aria-hidden />
      </div>

      {showSuggestions && hasSuggestions && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[60] max-h-64 overflow-y-auto overscroll-contain touch-pan-y"
          onWheel={(e) => e.stopPropagation()}
        >
          {loading && mode === 'product' ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">Searching...</div>
          ) : mode === 'product' ? (
            (suggestions as ProductSuggestion[]).map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleProductSuggestionClick(item)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
              >
                {item.primary_image && (
                  <img
                    src={item.primary_image}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    ₹{item.effective_price ?? item.current_price ?? item.sellingPrice ?? '—'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            (suggestions as OrderSuggestion[]).map((order) => (
              <button
                key={order.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleOrderSuggestionClick(order)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
              >
                <p className="font-medium text-gray-900 truncate">
                  {order.order_number || order.product?.name || `Order #${order.id}`}
                </p>
                {(order.total_amount != null && order.total_amount !== '') && (
                  <span className="text-sm text-gray-600 flex-shrink-0 ml-2">
                    ₹{order.total_amount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
