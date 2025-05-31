import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
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
    return 'sellingPricePerPackDaily' in item ? item.sellingPricePerPackDaily : item.sellingPrice;
  };

  const handleProductClick = (item: Product | BasePack) => {
    navigate(`/product/${item.id}`, { state: { product: item } });
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] relative">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors">
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">Search</h1>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src={walletImage} 
              alt="Wallet" 
              className="w-10 h-10 md:w-10 md:h-10" 
              onClick={() => navigate('/wallet')}
            />
            <img 
              src={profileImage} 
              alt="Profile" 
              className="w-6 h-6 md:w-8 md:h-8" 
              onClick={() => navigate('/account')}
            />
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search subscriptions, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F15A22] focus:border-transparent"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="px-4 min-h-[60vh] flex flex-col pb-48">
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
                    <div className="bg-[#FFFBEB] rounded-2xl overflow-hidden aspect-square">
                      <img 
                        src={item.imageUrl || 'https://via.placeholder.com/160'} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="pt-3 pb-2 px-1 space-y-2">
                      <h3 className="text-[16px] font-semibold text-gray-900 truncate">{item.name}</h3>
                      <p className="text-[14px] text-gray-500 truncate">{'type' in item ? item.type : 'Basepack'}</p>
                      <p className="text-pink-600 text-[16px] font-bold">₹{getItemPrice(item)}/Day</p>
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