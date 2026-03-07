import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { FaSearch } from 'react-icons/fa';
import { basePackService, BasePack } from '../../services/basepack.service';
import { productService, Product } from '../../services/product.service';
import walletImage from '../../assets/icon/Wallet.png';
import profileImage from '../../assets/icon/Profile.png';
import logo from '../../assets/All/logo.png';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [basePacks, setBasePacks] = useState<BasePack[]>([]);
  const [filteredItems, setFilteredItems] = useState<(Product | BasePack)[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [packs, prods] = await Promise.all([
          basePackService.getAllBasePacks(),
          productService.getAllProducts()
        ]);
        setBasePacks(packs);
        setProducts(prods);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = [...products, ...basePacks].filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  }, [searchQuery, products, basePacks]);

  const getItemPrice = (item: Product | BasePack): number => {
    return 'sellingPricePerPackDaily' in item ? item.sellingPrice : item.sellingPrice;
  };

  const handleProductClick = (item: Product | BasePack) => {
    navigate(`/product/${item.id}`, { state: { product: item } });
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] relative">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Search</h1>
          </div>

          {/* Search Bar - same as My Orders */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search subscriptions, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8f6f1] border border-[#808080] rounded-xl py-3 pl-4 pr-10 text-sm text-gray-900 placeholder:text-[#808080] focus:outline-none focus:border-gray-300"
            />
            <FaSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#808080]" size={16} />
          </div>
        </div>

        {/* Search Results */}
        <div className="px-4 min-h-[50vh] flex flex-col pb-48">
          {searchQuery === '' ? (
            <div className="text-center text-gray-500 mt-8">
              Start typing to search
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <span className="text-6xl animate-bounce">🌼</span>
              <p className="text-gray-500 text-lg">No results found</p>
              <p className="text-gray-400">Search something else</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-20">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="w-[160px] md:w-[180px] h-[280px] md:h-[300px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(item)}
                >
                  <div className="p-3">
                    <div className="bg-[#f8f6f1] rounded-2xl overflow-hidden aspect-square">
                      <img 
                        src={(Array.isArray(item.imagesUrl) ? item.imagesUrl[0] : item.imagesUrl) || 'https://via.placeholder.com/160'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="pt-3 pb-2 px-1 space-y-2">
                      <h3 className="text-[16px] font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-[14px] text-gray-500 truncate">{'type' in item ? item.type : 'Basepack'}</p>
                      <p className="text-pink-600 text-[16px] font-bold">₹{getItemPrice(item)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(item);
                        }}
                        className="text-green-600 text-[16px] mb-3 font-medium block hover:text-green-700"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Logo at bottom */}
      <div className=" bottom-3 left-0 right-0 flex justify-center opacity-50">
        <img src={logo} alt="GendaPhool Logo" className="w-40 h-40" />
      </div>
    </div>
  );
};

export default SearchPage;