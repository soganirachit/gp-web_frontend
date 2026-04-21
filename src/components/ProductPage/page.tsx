import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { IoSwapVerticalOutline, IoArrowBack } from "react-icons/io5";
import { FaChevronRight } from "react-icons/fa";
import { SEO } from "../SEO";
import {
  productService,
  type Category,
  getEffectivePrice,
  getBasePrice,
  showStrikeBaseOnCard,
  resolveProductImageUrl,
  PRODUCT_AVAILABILITY_GP_DAILY_LIST,
  mapGpDailyCatalogRowToProduct,
} from "../../services/product.service";
import { storeService } from "../../services/store.service";
import { getApiUrl } from "../../config/api.config";
import { formatProductTitleCase } from "../../lib/formatProductTitleCase";
import { ProductImageTag } from "../common/ProductImageTag";
import { ProductBrowseSkeleton } from "../common/PageSkeletons";
import { SearchBar } from "../common/SearchBar";
import scooterIcon from "../../assets/svg/gp_daily svg/scooter.svg";

const DAILY_AVAILABILITY = PRODUCT_AVAILABILITY_GP_DAILY_LIST;

const ProductBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlug = useMemo(() => searchParams.get("category"), [searchParams]);
  const stateCategoryName = useMemo(
    () => (location.state as { categoryName?: string } | null)?.categoryName,
    [location.state],
  );

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortBy, setSortBy] = useState("Price");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("All Products");
  const [displayedProducts, setDisplayedProducts] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");

  const basePath = "/gp-daily";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const storeId = storeService.getStoreIdForProducts();
        let fetched = await productService.getCategories(
          storeId || undefined,
          DAILY_AVAILABILITY,
        );
        if (!fetched.length) {
          fetched = await productService.getCategories(storeId || undefined, "store");
        }
        const active = fetched
          .filter((c) => c.is_active)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setCategories(active);
      } catch (e) {
        console.error("Error fetching categories:", e);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!localStorage.getItem("phoneNumber")) {
          const existing = storeService.getTemporaryStoreId();
          if (!existing) {
            try {
              await storeService.getStoreFromLocation();
            } catch (e) {
              console.error(e);
            }
          }
        }

        const storeId = storeService.getStoreIdForProducts();

        if (stateCategoryName) {
          setCategoryName(stateCategoryName);
        } else if (categorySlug) {
          const formatted = categorySlug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          setCategoryName(formatted);
        } else {
          setCategoryName("All Products");
        }

        let list: any[] = [];
        const rawAll = async () => {
          const rows = await productService.getAllProductsPaged({
            availabilityType: DAILY_AVAILABILITY,
            storeId: storeId || undefined,
          });
          return rows
            .filter((p: any) => p.isActive !== false)
            .map((p: any) => mapGpDailyCatalogRowToProduct(p as Record<string, unknown>));
        };

        if (!categorySlug) {
          list = await rawAll();
        } else if (categorySlug === "puja" || categorySlug === "pujaflowers") {
          const all = await rawAll();
          list = all.filter((p) => p.category?.toUpperCase() === "PUJA");
          setCategoryName("Puja Flowers");
        } else if (categorySlug === "exotic") {
          const all = await rawAll();
          list = all.filter((p) => p.category?.toUpperCase() === "EXOTIC");
          setCategoryName("Exotic Flowers");
        } else {
          const result = await productService.getProductsByCategory(
            categorySlug,
            storeId || undefined,
            DAILY_AVAILABILITY,
            100,
          );
          list = (result || []).map((p: any) =>
            mapGpDailyCatalogRowToProduct(p as Record<string, unknown>),
          );
        }

        setProducts(list);
        setDisplayedProducts(6);
      } catch (e) {
        console.error(e);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [categorySlug, stateCategoryName]);

  useEffect(() => {
    if (!categorySlug || stateCategoryName) return;
    const cat = categories.find((c) => c.slug === categorySlug);
    if (cat?.name) setCategoryName(cat.name);
  }, [categories, categorySlug, stateCategoryName]);

  const sortProducts = (items: any[], sortType: string) => {
    return [...items].sort((a, b) => {
      switch (sortType) {
        case "Price": {
          return getEffectivePrice(a) - getEffectivePrice(b);
        }
        case "Popularity":
          return 0;
        case "New": {
          const idA = a.id?.toString() || "";
          const idB = b.id?.toString() || "";
          return idB.localeCompare(idA);
        }
        case "Special":
          return 0;
        default:
          return 0;
      }
    });
  };

  const handleProductClick = (product: any) => {
    const pathSlug = product?.slug ?? product?.id;
    if (pathSlug == null || pathSlug === "") return;
    navigate(`${basePath}/product/${encodeURIComponent(String(pathSlug))}`, { state: { product } });
  };

  const handleCategoryClick = (slug: string | null) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  const handleLoadMore = () => setDisplayedProducts((p) => p + 6);

  const sortedProducts = sortProducts(products, sortBy);
  const filteredProducts =
    searchQuery.trim() === ""
      ? sortedProducts
      : sortedProducts.filter((item) => {
          const q = searchQuery.toLowerCase();
          const name = String(item.name ?? "").toLowerCase();
          const desc = String(item.description ?? item.short_description ?? "").toLowerCase();
          return name.includes(q) || desc.includes(q);
        });
  const visibleProducts = filteredProducts.slice(0, displayedProducts);
  const hasMoreProducts = filteredProducts.length > displayedProducts;

  const isPageLoading = isLoading || isLoadingCategories;

  const seoDescription = useMemo(() => {
    if (!categorySlug) {
      return "Browse daily flower subscriptions and products from Genda Phool.";
    }
    const cat = categories.find((c) => c.slug === categorySlug);
    return `Shop ${cat?.name || categoryName} — fresh flowers delivered daily.`;
  }, [categorySlug, categories, categoryName]);

  if (isPageLoading) {
    return <ProductBrowseSkeleton />;
  }

  const seoTitle =
    categoryName && categoryName !== "All Products"
      ? `${categoryName} — Genda Phool Daily`
      : "Products — Genda Phool Daily";

  /** GP Daily accent (replaces gp-store #19411f) */
  const chipActive = "bg-[#FAA222] text-gray-900";
  const chipInactive = "bg-transparent text-[#222222]";
  const sortSelectedRow = "bg-[#FAA222] text-gray-900";

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={`https://customerapp.mygendaphool.com/gp-daily/Products${
          categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ""
        }`}
      />
      <div className="mx-auto min-h-screen w-full min-w-0 max-w-[min(800px,100vw)] overflow-x-hidden bg-[#f8f6f1] pb-nav-bottom">
        <div className="sticky top-0 z-20 bg-[#f8f6f1] border-b border-gray-200">
          <div className="px-4 pt-6 pb-3">
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5"
                aria-label="Go back"
              >
                <IoArrowBack size={24} className="text-gray-900" />
              </button>
              <h1 className="min-w-0 flex-1 font-serif text-2xl font-bold text-gray-900">
                Products
              </h1>
            </div>

            <SearchBar
              mode="product"
              storeId={storeService.getStoreIdForProducts() ?? undefined}
              productBasePath={basePath}
              searchPagePath="/search"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="px-4 pb-3 relative">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleCategoryClick(null)}
                className={`touch-target-compact inline-flex flex-shrink-0 items-center rounded-lg px-3.5 py-2 text-xs leading-snug font-medium transition-colors ${
                  !categorySlug ? chipActive : chipInactive
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleCategoryClick(c.slug)}
                  className={`touch-target-compact inline-flex flex-shrink-0 items-center rounded-lg px-3.5 py-2 text-xs leading-snug font-medium transition-colors whitespace-nowrap ${
                    categorySlug === c.slug ? chipActive : chipInactive
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

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
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <g clipPath="url(#clip0_daily_filter)">
                    <path
                      d="M13.9997 2.66699H9.33301"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.66667 2.66699H2"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 8H8"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.33333 8H2"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.0003 13.333H10.667"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 13.333H2"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.33301 1.33301V3.99967"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.33301 6.66699V9.33366"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.667 12V14.6667"
                      stroke="currentColor"
                      strokeWidth="1.33333"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_daily_filter">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <span>Filter</span>
              </button>
              */}
            </div>

            {isSortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortDropdownOpen(false)} />
                <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {[
                    { value: "Price", label: "Sort by Price" },
                    { value: "Popularity", label: "Sort by Popularity" },
                    { value: "New", label: "Sort by New" },
                    { value: "Special", label: "Sort by Special" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        sortBy === option.value ? sortSelectedRow : "text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* <div className="px-4 py-3">
          <div className="bg-white py-2 rounded-2xl border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 px-4">
              <img src={scooterIcon} alt="" className="w-5 h-5" />
              <span>Free Delivery — 5–25 min slots in Vadodara</span>
            </div>
          </div>
        </div> */}

        <div className="px-4 py-5">
          {error ? (
            <div className="text-red-500 text-center py-4 text-base">{error}</div>
          ) : (
            <>
              <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-gray-900 mb-4 leading-tight [overflow-wrap:anywhere]">
                {categoryName}
              </h1>

              {visibleProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products found in this category.</p>
                </div>
              ) : (
                <div className="gp-store-grid-2 mb-6">
                  {visibleProducts.map((item) => {
                    const row = item as Record<string, unknown>;
                    const key = row.id ?? row.slug ?? String(row.name);
                    const eff = getEffectivePrice(item);
                    const labels = (Array.isArray(row.labels) && row.labels.length > 0
                      ? row.labels
                      : null) as { name?: string; slug?: string }[] | null;
                    const shortDesc =
                      typeof row.short_description === "string"
                        ? row.short_description
                        : typeof row.description === "string"
                          ? row.description
                          : "";
                    return (
                      <div
                        key={String(key)}
                        className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                        onClick={() => handleProductClick(item)}
                      >
                        <div className="aspect-square bg-white overflow-hidden relative">
                          <ProductImageTag labels={labels ?? undefined} variant="daily" />
                          <img
                            src={resolveProductImageUrl(row)}
                            alt={String(row.name ?? "Product")}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              const currentSrc = img.src;
                              const apiUrl = getApiUrl();
                              const baseUrl = apiUrl.replace("/api/v1", "");
                              const pi = row.primary_image;
                              if (typeof pi === "string" && pi.startsWith("src/")) {
                                const cleanPath = pi.replace("src/", "");
                                if (currentSrc.includes("/media/")) {
                                  img.src = `${baseUrl}/${cleanPath}`;
                                } else {
                                  img.src = `${baseUrl}/media/${pi}`;
                                }
                                return;
                              }
                              img.src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col p-3">
                          <div className="mb-1 flex min-h-[2.75rem] items-start justify-between gap-1.5">
                            <h3 className="min-w-0 flex-1 pr-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
                              {formatProductTitleCase(String(row.name ?? ""))}
                            </h3>
                            <span className="shrink-0 rounded-md bg-[#FAA222] px-2 py-0.5 text-[10px] font-semibold leading-tight text-gray-900">
                              Daily
                            </span>
                          </div>
                          <div className="mb-1 min-h-[1.25rem] shrink-0">
                            {shortDesc ? (
                              <p className="truncate text-xs text-gray-500">
                                {formatProductTitleCase(shortDesc)}
                              </p>
                            ) : (
                              <p className="truncate text-xs text-gray-500">Mixed flowers daily</p>
                            )}
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <p className="text-base font-bold text-gray-900">
                              <span>
                                ₹{Math.round(eff)}
                                /Day
                              </span>
                              {showStrikeBaseOnCard(item) && (
                                <span className="ml-1 text-gray-500 font-medium line-through">
                                  ₹{getBasePrice(item)}
                                </span>
                              )}
                            </p>
                            <FaChevronRight className="flex-shrink-0 text-sm text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasMoreProducts && (
                <div className="flex justify-center mb-6">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="inline-flex min-h-[44px] items-center justify-center px-6 py-2.5 text-sm font-medium text-gray-700 underline rounded-lg transition-colors hover:bg-gray-200"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductBrowsePage;
