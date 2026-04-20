import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { SearchBar } from '../common/SearchBar';
import { basePackService, BasePack } from '../../services/basepack.service';
import {
  productService,
  Product,
  getEffectivePrice,
  PRODUCT_AVAILABILITY_GP_DAILY_LIST,
  PRODUCT_AVAILABILITY_STORE,
} from '../../services/product.service';
import { trackSearch } from '../../lib/metaPixel';
import walletImage from '../../assets/icon/Wallet.png';
import profileImage from '../../assets/icon/Profile.png';
import logo from '../../assets/All/logo.png';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { storeService } from '../../services/store.service';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const listAvailability =
    feature === 'gpStore' ? PRODUCT_AVAILABILITY_STORE : PRODUCT_AVAILABILITY_GP_DAILY_LIST;
  const productBasePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [filteredItems, setFilteredItems] = useState<(Product | BasePack)[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeId = storeService.getStoreIdForProducts();
        const [packs, prods] = await Promise.all([
          basePackService.getAllBasePacks(),
          productService.getAllProducts({
            availabilityType: listAvailability,
            storeId: storeId || undefined,
          }),
        ]);
        setBasePacks(packs);
        setProducts(prods);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [listAvailability]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = [...products, ...basePacks].filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);

    // Fire pixel Search event — debounced, only for queries 3+ chars
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        trackSearch(searchQuery.trim());
      }, 800);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, products, basePacks]);

  const getItemPrice = (item: Product | BasePack): number => {
    return getEffectivePrice(item);
  };

  const handleProductClick = (item: Product | BasePack) => {
    const pathSlug = 'slug' in item && item.slug ? item.slug : item.id;
    navigate(`${productBasePath}/product/${encodeURIComponent(String(pathSlug))}`, { state: { product: item } });
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] relative overflow-x-clip">
      <div className="mx-auto w-full max-w-[min(800px,100vw)]">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Search</h1>
          </div>

          {/* Search Bar — unified home page styling */}
          <SearchBar
            mode="product"
            productBasePath={productBasePath}
            storeId={storeService.getStoreIdForProducts() ?? undefined}
            placeholder="Search subscriptions, products..."
            value={searchQuery}
            onChange={(q) => setSearchQuery(q)}
            searchPagePath="/search"
          />
        </div>

        {/* Search Results */}
        <div className="px-3 xs:px-4 min-h-[50vh] flex flex-col pb-nav-bottom">
          {searchQuery === '' ? (
            <div className="text-center text-gray-500 mt-8">
              Start typing to search products...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 xs:gap-4 mt-4 items-start">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleProductClick(item)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer"
                >
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2">{item.name}</h3>
                    <p className="text-green-700 font-semibold mt-1">₹{getItemPrice(item)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
