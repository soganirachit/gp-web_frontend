import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { getDiscoveryEffectivePrice } from '../../services/product.service';

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

type MapSearchEndIconProps = {
  hasText: boolean;
  onClear?: () => void;
  className?: string;
};

/** Map search trailing icon — magnifier when empty, clear when typing (mobile parity). */
export const MapSearchEndIcon: React.FC<MapSearchEndIconProps> = ({
  hasText,
  onClear,
  className = GP_SEARCH_ICON_CLASSES,
}) => {
  const wrapClass = `absolute right-3 top-1/2 -translate-y-1/2 ${className}`;

  if (hasText) {
    return (
      <button
        type="button"
        aria-label="Clear search"
        onClick={onClear}
        className={`${wrapClass} cursor-pointer`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className={wrapClass} aria-hidden>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
};

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
const HOMEPAGE_DROPDOWN_MAX_HEIGHT_PX = 360;
const HOMEPAGE_DROPDOWN_Z_INDEX = 99990;

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
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const useHomepagePortal = variant === 'homepage' && mode === 'product';

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
      setLoading(false);
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

  const updateDropdownPosition = useCallback(() => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: HOMEPAGE_DROPDOWN_Z_INDEX,
      maxHeight: HOMEPAGE_DROPDOWN_MAX_HEIGHT_PX,
    });
  }, []);

  useLayoutEffect(() => {
    if (!useHomepagePortal || !showSuggestions || query.trim().length < MIN_CHARS) return;
    updateDropdownPosition();
    const vv = window.visualViewport;
    window.addEventListener('resize', updateDropdownPosition);
    vv?.addEventListener('resize', updateDropdownPosition);
    vv?.addEventListener('scroll', updateDropdownPosition);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      vv?.removeEventListener('resize', updateDropdownPosition);
      vv?.removeEventListener('scroll', updateDropdownPosition);
    };
  }, [useHomepagePortal, showSuggestions, query, updateDropdownPosition]);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside, true);
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

  const hasQuery = query.trim().length >= MIN_CHARS;
  const hasSuggestions = suggestions.length > 0 && hasQuery;
  const showDropdown = showSuggestions && hasQuery;

  const wrapClasses =
    variant === "homepage"
      ? GP_HOMEPAGE_SEARCH_WRAP_CLASSES
      : GP_SEARCH_FIELD_WRAP_CLASSES;

  const dropdownPanelClasses =
    "bg-white rounded-lg shadow-lg border border-gray-200 py-2 overflow-y-auto overscroll-contain touch-pan-y scroll-smooth";

  const inlineDropdownClasses = `absolute top-full left-0 right-0 mt-1 ${dropdownPanelClasses} z-[60] max-h-64`;
  const portalDropdownClasses = `${dropdownPanelClasses}`;

  const dropdownBody = showDropdown ? (
    <>
      {loading && mode === 'product' ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">Searching...</div>
      ) : mode === 'product' ? (
        hasSuggestions ? (
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
                  ₹{(() => {
                    const p = getDiscoveryEffectivePrice(item);
                    return p > 0 ? p : '—';
                  })()}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No search results found</div>
        )
      ) : hasSuggestions ? (
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
      ) : (
        <div className="px-4 py-6 text-center text-sm text-gray-500">No search results found</div>
      )}
    </>
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div ref={inputWrapRef} className={wrapClasses}>
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
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        <FaSearch className={GP_SEARCH_ICON_CLASSES} aria-hidden />
      </div>

      {showDropdown && !useHomepagePortal ? (
        <div
          className={inlineDropdownClasses}
          onWheel={(e) => e.stopPropagation()}
          role="listbox"
        >
          {dropdownBody}
        </div>
      ) : null}

      {showDropdown && useHomepagePortal && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={dropdownRef}
              className={portalDropdownClasses}
              style={dropdownStyle}
              onWheel={(e) => e.stopPropagation()}
              role="listbox"
            >
              {dropdownBody}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default SearchBar;
