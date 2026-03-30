import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

/** Home page reference styling */
const SEARCH_BAR_CLASSES =
  'w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 bg-white shadow-sm border border-[#808080] text-left';

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
  /** Optional: navigate to search page with query on Enter when no suggestion selected */
  searchPagePath?: string;
  /** Controlled: parent can filter list by query */
  value?: string;
  onChange?: (query: string) => void;
  className?: string;
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
  searchPagePath = '/search',
  value,
  onChange,
  className = '',
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
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProductSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      setLoading(true);
      const { productService } = await import('../../services/product.service');
      const results = await productService.searchProducts(q.trim(), storeId ?? undefined);
      setSuggestions((results || []).slice(0, MAX_SUGGESTIONS));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const close = () => setShowSuggestions(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);
  useEffect(() => {
    return () => {
      if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
    };
  }, []);


  const handleProductSuggestionClick = (item: ProductSuggestion) => {
    setShowSuggestions(false);
    setQuery('');
    const identifier = productBasePath === '/gp-daily' ? String(item.id) : (item.slug || String(item.id));
    navigate(`${productBasePath}/product/${identifier}`, { state: { product: item } });
  };

  const handleOrderSuggestionClick = (order: OrderSuggestion) => {
    setShowSuggestions(false);
    setQuery('');
    onOrderSelect?.(order);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0 && mode === 'product') {
        handleProductSuggestionClick(suggestions[0] as ProductSuggestion);
      } else if (suggestions.length > 0 && mode === 'order' && onOrderSelect) {
        handleOrderSuggestionClick(suggestions[0] as OrderSuggestion);
      } else if (query.trim()) {
        navigate(`${searchPagePath}?q=${encodeURIComponent(query.trim())}`);
        setShowSuggestions(false);
      }
    }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const hasSuggestions = suggestions.length > 0 && query.trim().length >= MIN_CHARS;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={SEARCH_BAR_CLASSES}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (blurCloseRef.current) {
              clearTimeout(blurCloseRef.current);
              blurCloseRef.current = null;
            }
            if (query.trim()) setShowSuggestions(true);
          }}
          onBlur={() => {
            blurCloseRef.current = setTimeout(() => setShowSuggestions(false), 180);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-gray-900 text-sm sm:text-base font-medium placeholder:text-[#808080] focus:outline-none min-w-0 text-left"
          aria-label="Search"
        />
        <FaSearch className="text-[#808080] w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      </div>

      {showSuggestions && hasSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[60] max-h-64 overflow-y-auto">
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
