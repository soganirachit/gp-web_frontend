import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SEO } from "../SEO";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { IoSwapVerticalOutline } from "react-icons/io5";
import {
  productService,
  Category,
  getEffectivePrice,
  getBasePrice,
  showStrikeBaseOnCard,
  availabilityTypeForChannel,
  parseProductAvailabilityChannel,
  type ProductAvailabilityChannel,
} from "../../services/product.service";
import { ProductAvailabilityFilterChips } from "../common/ProductAvailabilityFilterChips";
import { ProductBrowseSkeleton } from "../common/PageSkeletons";
import { SearchBar } from "../common/SearchBar";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useAuth } from "../../context/AuthContext";
import { GUEST_STORE_UPDATED_EVENT, storeService } from "../../services/store.service";
import { getApiUrl } from "../../config/api.config";
import { formatProductTitleCase } from "../../lib/formatProductTitleCase";
import { ProductImageTag } from "../common/ProductImageTag";
import { UniformPageHeader } from "../layout/UniformPageHeader";

function storeSortByToApiOrdering(sortType: string): string | undefined {
  switch (sortType) {
    case "Price":
      return "current_price";
    case "New":
      return "-created_at";
    default:
      return undefined;
  }
}

const StoreProductsPages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { feature, theme } = useFeatureTheme();
  const { isLoggedIn } = useAuth();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";
  const [guestStoreEpoch, setGuestStoreEpoch] = useState(0);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [categoryName, setCategoryName] = useState<string>("All Products");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [nextProductPageUrl, setNextProductPageUrl] = useState<string | null>(null);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize the category slug from URL
  const categorySlug = useMemo(() => searchParams.get('category'), [searchParams]);
  const availabilityChannel = useMemo(
    () => parseProductAvailabilityChannel(searchParams.get("channel"), "store"),
    [searchParams],
  );
  const stateCategoryName = useMemo(() => location.state?.categoryName, [location.state?.categoryName]);
  const chipActive = "bg-[#19411f] text-white";
  const chipInactive = "bg-transparent text-[#222222]";

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const storeId = storeService.getStoreIdForProducts();
        const fetchedCategories = await productService.getCategories(
          storeId || undefined,
          availabilityTypeForChannel(availabilityChannel),
        );
        const activeCategories = fetchedCategories
          .filter((cat) => cat.is_active)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setCategories(activeCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [guestStoreEpoch, availabilityChannel]);

  useEffect(() => {
    if (isLoggedIn) return;
    const onPick = () => setGuestStoreEpoch((e) => e + 1);
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, onPick);
    return () => window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onPick);
  }, [isLoggedIn]);

  // Fetch products — first API page only (6 items); scroll loads `next` pages (same pattern as My Orders).
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setNextProductPageUrl(null);

        if (stateCategoryName) {
          setCategoryName(stateCategoryName);
        } else if (categorySlug) {
          const formattedName = categorySlug.split('-').map((word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          setCategoryName(formattedName);
        } else {
          setCategoryName("All Products");
        }

        setSelectedCategorySlug(categorySlug);

        const storeId = storeService.getStoreIdForProducts();
        const ordering = storeSortByToApiOrdering(sortBy);

        const { products: firstBatch, nextUrl } =
          await productService.getStoreProductListFirstPage({
            categorySlug: categorySlug || undefined,
            ordering,
            storeId: storeId || undefined,
            availabilityType: availabilityTypeForChannel(availabilityChannel),
          });
        setProducts(firstBatch || []);
        setNextProductPageUrl(nextUrl);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load products");
        setProducts([]);
        setNextProductPageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [categorySlug, stateCategoryName, isLoggedIn, guestStoreEpoch, sortBy, availabilityChannel]);

  const getItemPrice = (item: any): number => getEffectivePrice(item);

  const sortProducts = (items: any[], sortType: string) => {
    return [...items].sort((a, b) => {
      switch (sortType) {
        case "Price": {
          const priceA = getItemPrice(a);
          const priceB = getItemPrice(b);
          return priceA - priceB;
        }
        case "Popularity":
          return 0;
        case "New":
          const idA = a.id?.toString() || a.slug || '';
          const idB = b.id?.toString() || b.slug || '';
          return idB.localeCompare(idA);
        case "Special":
          return 0;
        default:
          return 0;
      }
    });
  };

  const handleProductClick = (product: any) => {
    const productIdentifier = product.slug || product.id;
    const productBase =
      availabilityChannel === "daily" ? "/gp-daily/product" : "/gp-store/product";
    navigate(`${productBase}/${productIdentifier}`, { state: { product } });
  };

  const updateBrowseSearchParams = (
    patch: (next: URLSearchParams) => void,
  ) => {
    const next = new URLSearchParams(searchParams);
    patch(next);
    setSearchParams(next);
  };

  const handleAvailabilityChannelClick = (channel: ProductAvailabilityChannel) => {
    updateBrowseSearchParams((next) => {
      next.set("channel", channel);
    });
  };

  const handleCategoryClick = (slug: string | null) => {
    updateBrowseSearchParams((next) => {
      if (slug) next.set("category", slug);
      else next.delete("category");
    });
  };

  const loadNextProductPageRef = useRef<() => void>(() => {});
  const loadingMoreRef = useRef(false);
  const loadNextProductPage = useCallback(() => {
    void (async () => {
      const url = nextProductPageUrl;
      if (!url || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMoreProducts(true);
      try {
        const { products: batch, nextUrl } =
          await productService.getStoreProductListNextPage(url);
        setProducts((prev) => [...prev, ...batch]);
        setNextProductPageUrl(nextUrl);
      } catch (e) {
        console.error("Error loading more products:", e);
      } finally {
        loadingMoreRef.current = false;
        setLoadingMoreProducts(false);
      }
    })();
  }, [nextProductPageUrl]);

  loadNextProductPageRef.current = loadNextProductPage;

  const getProductImageUrl = (item: any): string => {
    // Helper to convert relative path to full URL
    const convertToFullUrl = (imagePath: string): string => {
      // If it's already a full URL, use it directly
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      // Get API base URL and remove /api/v1 to get server root
      const apiUrl = getApiUrl(); // e.g., "http://185.137.122.250:8083/api/v1"
      const baseUrl = apiUrl.replace('/api/v1', ''); // e.g., "http://185.137.122.250:8083"
      
      // Handle paths like "src/assets/A1/A5.jpeg"
      if (imagePath.startsWith('src/')) {
        // Remove 'src/' prefix and serve from /media/ endpoint (like Django media files)
        const cleanPath = imagePath.replace('src/', '');
        return `${baseUrl}/media/${cleanPath}`;
      }
      
      // If path doesn't start with src/, try /media/ endpoint
      return `${baseUrl}/media/${imagePath}`;
    };

    // Check if primary_image exists
    if (item.primary_image) {
      return convertToFullUrl(item.primary_image);
    }
    
    // Fallback to images array
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0].image || item.images[0];
      if (firstImage) {
        return convertToFullUrl(firstImage);
      }
    }
    
    return "/placeholder.svg";
  };

  const sortedProducts = sortProducts(products, sortBy);
  
  // Filter products based on search query
  const filteredProducts = searchQuery.trim() === ''
    ? sortedProducts
    : sortedProducts.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const visibleProducts = filteredProducts;
  const hasMoreFromApi = Boolean(nextProductPageUrl);

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMoreFromApi) return;
    const el = loadMoreSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextProductPageRef.current();
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [hasMoreFromApi, products.length, categorySlug, sortBy]);

  /** Fallback when `next` exists but the sentinel does not intersect (nested scroll, IO quirks). */
  useEffect(() => {
    if (!hasMoreFromApi) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const el = document.documentElement;
        const remaining =
          el.scrollHeight - window.innerHeight - window.scrollY;
        if (remaining < 480) loadNextProductPageRef.current();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMoreFromApi, products.length, categorySlug, sortBy]);

  // Combined loading state for full-screen loader
  const isPageLoading = isLoading || isLoadingCategories;

  // Build SEO meta dynamically from the active category.
  // Must be declared before any early return (Rules of Hooks).
  const seoDescription = useMemo(() => {
    if (!categorySlug) {
      return 'Shop all fresh flowers, garlands, bouquets and pooja items online. Same-day delivery in Jaipur from Genda Phool.';
    }
    const cat = categories.find(c => c.slug === categorySlug);
    const catLabel = cat?.name || categoryName;
    return `Shop ${catLabel} online — fresh quality products delivered same-day in Jaipur by Genda Phool.`;
  }, [categorySlug, categories, categoryName]);

  // Show skeleton while initial data is loading
  if (isPageLoading) {
    return <ProductBrowseSkeleton />;
  }

  const seoTitle = categoryName && categoryName !== 'All Products'
    ? `${categoryName} — Genda Phool`
    : 'All Products — Genda Phool';

  const canonicalUrl = categorySlug
    ? `https://customerapp.mygendaphool.com/gp-store/products?category=${categorySlug}`
    : 'https://customerapp.mygendaphool.com/gp-store/products';

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalUrl}
      />
      <div className="mx-auto min-h-screen w-full min-w-0 max-w-[min(800px,100vw)] overflow-x-hidden bg-[#f8f6f1] pb-nav-bottom">
        {/* Top bar: back + title (matches app StoreProductsScreen) */}
        <div className="sticky top-0 z-20 bg-[#f8f6f1]">
          <div className="px-4 pt-6 pb-3">
            <UniformPageHeader
              title="Products"
              onBack={() => navigate(-1)}
              className="mb-3"
              padXClassName="px-0"
              padYClassName="py-0"
            />

            <SearchBar
              mode="product"
              storeId={storeService.getStoreIdForProducts() ?? undefined}
              productBasePath={
                availabilityChannel === "daily" ? "/gp-daily" : "/gp-store"
              }
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {/* Category chips — sizing matches Sort/Filter below */}
          <div className="px-4 pb-3">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              <ProductAvailabilityFilterChips
                value={availabilityChannel}
                onChange={handleAvailabilityChannelClick}
                chipActiveClass={chipActive}
                chipInactiveClass={chipInactive}
              />
              <button
                type="button"
                onClick={() => handleCategoryClick(null)}
                className={`touch-target-compact inline-flex flex-shrink-0 items-center rounded-lg px-3.5 py-2 text-xs leading-snug font-medium transition-colors ${
                  !selectedCategorySlug ? chipActive : chipInactive
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={`touch-target-compact inline-flex flex-shrink-0 items-center rounded-lg px-3.5 py-2 text-xs leading-snug font-medium transition-colors whitespace-nowrap ${
                    selectedCategorySlug === category.slug ? chipActive : chipInactive
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Sort (filter button commented out until wired) — same padding/typography as category chips */}
            <div className="mt-2.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="touch-target-compact inline-flex items-center gap-1.5 rounded-lg border border-[#D8D3CD] bg-[#f8f6f1] px-3.5 py-2 text-xs leading-snug font-medium text-gray-700 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:bg-[#f1eee7]"
              >
                <IoSwapVerticalOutline className="h-4 w-4 shrink-0" />
                <span>Sort</span>
              </button>
              {/* Filter button — not wired */}
              {/*
              <button
                type="button"
                className="touch-target-compact inline-flex items-center gap-1.5 rounded-lg border border-[#D8D3CD] bg-[#f8f6f1] px-3.5 py-2 text-xs leading-snug font-medium text-gray-700 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:bg-[#f1eee7]"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <g clipPath="url(#clip0_store_filter)">
                    <path d="M13.9997 2.66699H9.33301" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.66667 2.66699H2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 8H8" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.33333 8H2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14.0003 13.333H10.667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 13.333H2" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.33301 1.33301V3.99967" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5.33301 6.66699V9.33366" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.667 12V14.6667" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <defs>
                    <clipPath id="clip0_store_filter">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <span>Filter</span>
              </button>
              */}
            </div>

            {/* Sort Dropdown */}
            {isSortDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSortDropdownOpen(false)}
                />
                <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {[
                    { value: "Price", label: "Sort by Price" },
                    { value: "Popularity", label: "Sort by Popularity"},
                    { value: "New", label: "Sort by New"},
                    { value: "Special", label: "Sort by Special"}
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        sortBy === option.value 
                          ? 'bg-[#19411f] text-white' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-5">
          {error ? (
            <div className="text-red-500 text-center py-4 text-base">
              {error}
            </div>
          ) : (
            <>
              {/* Category Title */}
              <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-gray-900 mb-4 leading-tight [overflow-wrap:anywhere]">
                {categoryName}
              </h1>

              {/* Product Grid */}
              {visibleProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products found in this category.</p>
                </div>
              ) : (
                <div className="gp-store-grid-2 mb-6">
                  {visibleProducts.map((item) => (
                    <div
                      key={item.id || item.slug}
                      className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                      onClick={() => handleProductClick(item)}
                    >
                    {/* Product Image */}
                    <div className="aspect-square bg-white overflow-hidden relative">
                      <ProductImageTag
                        labels={item.labels}
                        variant={availabilityChannel === "daily" ? "daily" : "store"}
                      />
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const currentSrc = img.src;
                          const apiUrl = getApiUrl();
                          const baseUrl = apiUrl.replace('/api/v1', '');
                          
                          // Try alternative URL formats as fallback
                          if (item.primary_image && item.primary_image.startsWith('src/')) {
                            const cleanPath = item.primary_image.replace('src/', '');
                            // Try without /media/ first
                            if (currentSrc.includes('/media/')) {
                              img.src = `${baseUrl}/${cleanPath}`;
                            } else {
                              // Try with full path including src/
                              img.src = `${baseUrl}/media/${item.primary_image}`;
                            }
                            return;
                          }
                          
                          // Final fallback to placeholder
                          img.src = "/placeholder.svg";
                        }}
                      />
                    </div>

                    {/* Product Info — flex-1 + row stretch so price row aligns across the grid */}
                    <div className="flex min-h-0 flex-1 flex-col p-3">
                      <div className="mb-1 flex min-h-[2.75rem] items-start justify-between gap-1">
                        <h3 className="min-w-0 flex-1 pr-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
                          {formatProductTitleCase(item.name)}
                        </h3>
                      </div>
                      <div className="mb-1 min-h-[1.25rem] shrink-0">
                        {item.short_description ? (
                          <p className="truncate text-xs text-gray-500">{formatProductTitleCase(item.short_description)}</p>
                        ) : null}
                      </div>
                      {/* Price and Arrow — effective_price only; show struck base when effective < base */}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <p className="text-gray-900 text-base font-bold">
                          <span>₹{getItemPrice(item)}</span>
                          {showStrikeBaseOnCard(item) && (
                            <span className="text-gray-500 font-medium line-through ml-1">₹{getBasePrice(item)}</span>
                          )}
                        </p>
                        <FaChevronRight className="text-gray-400 text-sm flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}

              {hasMoreFromApi && (
                <div
                  ref={loadMoreSentinelRef}
                  className="flex min-h-[40px] justify-center py-2"
                  aria-hidden
                />
              )}
              {loadingMoreProducts ? (
                <p className="mb-4 text-center text-sm text-gray-500">Loading more…</p>
              ) : null}
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default StoreProductsPages;
