import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdLocationOn, MdKeyboardArrowDown, MdAccessTime } from 'react-icons/md';
import { FaLeaf, FaUsers, FaBox } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { addressService, Address } from '../services/address.service';
import ProfileIcon from '../assets/icon/Profile.png';
import SearchIcon from '../assets/icon/Search.png';
import storyImage from '../assets/Banner/Story.png';
// SVG Imports
import namasteSvg from '../assets/svg/namaste.svg';
import dailyLogoSvg from '../assets/svg/daily_logo.svg';
import dailyScooterSvg from '../assets/svg/daily_scooter.svg';
import storeLogoSvg from '../assets/svg/store_logo.svg';
import truckSvg from '../assets/svg/truck.svg';
import sajawatLogoSvg from '../assets/svg/sajawat_logo.svg';
import garlandSvg from '../assets/svg/garland.svg';
import bannerSvg from '../assets/svg/banner.svg';
import bottomBannerSvg from '../assets/svg/bottom_banner.svg';
import logoSvg from '../assets/svg/logo.svg';
import profilehomeIcon from '../assets/svg/gp_daily svg/profilehome.svg';
import profilelogoIcon from '../assets/svg/gp_daily svg/profilelogo.svg';
import locationhomeIcon from '../assets/svg/gp_daily svg/locationhome.svg';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [deliveryLocation, setDeliveryLocation] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);

  // Function to fetch the latest address from API
  const fetchLatestAddress = useCallback(async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();

      // Sort by updatedAt in descending order and get the most recent address
      const latestAddress = addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      [0];

      if (latestAddress) {
        const formattedAddress = [
          latestAddress.houseNo,
          latestAddress.streetName,
          latestAddress.area,
          latestAddress.city,
          latestAddress.state,
          latestAddress.pincode
        ].filter(Boolean).join(', ');

        setDeliveryLocation(formattedAddress);
      } else {
        setDeliveryLocation('');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      // Fallback to localStorage if API fails
      setDeliveryLocation(localStorage.getItem('userLocation') || '');
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestAddress();

    // Listen for address updates
    const handleAddressUpdate = () => {
      fetchLatestAddress();
    };

    window.addEventListener('addressUpdated', handleAddressUpdate);
    return () => {
      window.removeEventListener('addressUpdated', handleAddressUpdate);
    };
  }, [fetchLatestAddress]);

  const handleLocationClick = () => {
    navigate('/location', { state: { returnUrl: '/home' } });
  };

  return (
    <div className="min-h-screen w-screen bg-white overflow-x-hidden">
      <div className="max-w-[800px] mx-auto bg-white min-h-screen">
        {/* Top Navigation Bar */}
        <div className="bg-white sticky top-0 z-20 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Location Section */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <img
                src={locationhomeIcon}
                alt="Location"
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
              />
              <div
                className="flex items-center gap-1 cursor-pointer min-w-0 flex-1"
                onClick={handleLocationClick}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-bold text-gray-800">Home</span>
                  <span className="text-xs sm:text-sm text-gray-600 truncate font-medium">
                    {isLoadingAddress ? 'Loading...' : deliveryLocation || 'Tap to set address'}
                  </span>
                </div>
                <MdKeyboardArrowDown className="text-gray-600 flex-shrink-0 text-lg sm:text-xl" />
              </div>
            </div>

            {/* Right Side Icons */}
            <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <img
                src={profilehomeIcon}
                alt="Profile"
                className=" absolute inset-0 w-12 h-12 object-contain cursor-pointer self-center justify-self-center"
                onClick={() => navigate("/gp-daily/account")}
              />
              <img
                src={profilelogoIcon}
                alt="Profile Logo"
                className="relative z-10 w-5 h-5 object-contain"
              />
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-2 sm:mt-3">
            <div
              className="bg-gray-50 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 cursor-pointer shadow-sm border border-gray-200"
              onClick={() => navigate('/search')}
            >
              <img src={SearchIcon} alt="Search" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-gray-400 text-sm sm:text-base font-medium">Search anything.....</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-3 sm:px-4 pb-8">
          {/* Greeting Section with Namaste SVG */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-6 sm:pt-8 pb-6 sm:pb-8"
          >
            <div className="text-left">
              <img
                src={namasteSvg}
                alt="Namaste"
                className="h-10 sm:h-14 w-auto mb-2 sm:mb-3"
              />
              <p className="text-gray-600 text-sm sm:text-base">
                We are Genda Phool! Your partner for everyday floral needs.
              </p>
            </div>
          </motion.div>

          {/* Service Cards Section */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
            {/* Genda Phool Daily Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-[#FFF5E6] rounded-2xl p-2 sm:p-3 cursor-pointer hover:shadow-lg transition-shadow relative overflow-visible min-h-0"
              onClick={() => navigate('/gp-daily', { state: { mode: 'daily' } })}
            >
              <div className="flex flex-col h-full">
                {/* Top Section: Scooter and Logo with overlap */}
                <div className="relative">
                  <div className="flex items-start">
                    <div className="relative flex-shrink-0 w-[130px] h-[130px] sm:w-[300px] sm:h-[300px] flex items-center justify-center -mt-6 sm:-mt-14">
                      <img
                        src={dailyScooterSvg}
                        alt="Daily Scooter"
                        className="w-full h-full object-contain mt-1"
                      />
                      {/* Logo overlapping scooter in top-right area over road lines */}
                      <div className="absolute right-0 top-[28px] sm:top-[60px] z-10">
                        <img
                          src={dailyLogoSvg}
                          alt="Genda Phool Daily"
                          className="h-[42px] sm:h-[100px] w-full"
                        />
                      </div>
                      {/* Text overlapping SVGs at the bottom - hidden on mobile, shown on larger screens */}
                      <div className="absolute bottom-7 left-0 right-0 z-10 px-2 hidden sm:block">
                        <p className="text-[#DD7600] text-base leading-tight">
                          Everyday delivery of fresh flowers for Puja or Home Decor.
                        </p>
                      </div>
                    </div>
                    <span className="text-[#DD7600] text-lg sm:text-2xl font-bold flex-shrink-0 ml-auto self-center">›</span>
                  </div>
                  {/* Text below SVGs on mobile */}
                  <div className="mt-0 sm:hidden">
                    <p className="text-[#DD7600] text-xs leading-tight px-1">
                      Everyday delivery of fresh flowers for Puja or Home Decor.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Genda Phool Store Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-[#E8F5E9] rounded-2xl p-2 sm:p-3 cursor-pointer hover:shadow-lg transition-shadow relative overflow-visible min-h-0"
              onClick={() => navigate('/gp-store', { state: { mode: 'store' } })}
            >
              <div className="flex flex-col h-full">
                {/* Top Section: Truck and Logo with overlap */}
                <div className="relative">
                  <div className="flex items-start">
                    <div className="relative flex-shrink-0 w-[130px] h-[130px] sm:w-[300px] sm:h-[300px] flex items-center justify-center -mt-6 sm:-mt-14">
                      <img
                        src={truckSvg}
                        alt="Store Truck"
                        className="w-full h-full object-contain mt-1"
                      />
                      {/* Logo overlapping truck in top-right area */}
                      <div className="absolute right-0 top-[28px] sm:top-[60px] z-10">
                        <img
                          src={storeLogoSvg}
                          alt="Genda Phool Store"
                          className="h-[42px] sm:h-[100px] w-full"
                        />
                      </div>
                      {/* Text overlapping SVGs at the bottom - hidden on mobile, shown on larger screens */}
                      <div className="absolute bottom-7 left-0 right-0 z-10 px-2 hidden sm:block">
                        <p className="text-[#2A6B28] text-base leading-tight">
                          From last minute floral needs to grand bouquets, we got it all!
                        </p>
                      </div>
                    </div>
                    <span className="text-[#2A6B28] text-lg sm:text-2xl font-bold flex-shrink-0 ml-auto self-center">›</span>
                  </div>
                  {/* Text below SVGs on mobile */}
                  <div className="mt-0 sm:hidden">
                    <p className="text-[#2A6B28] text-xs leading-tight px-1">
                      From last minute floral needs to grand bouquets, we got it all!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sajawat Card - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-[#FFF5F5] rounded-2xl p-4 sm:p-6 mb-6 cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 sm:gap-6">
              <div className="flex-1 min-w-0">
                <img
                  src={sajawatLogoSvg}
                  alt="Sajawat by Genda Phool"
                  className="h-8 sm:h-12 w-auto mb-2"
                />
                <p className="text-[#A91F23] text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">
                  A floral first event design and management service, 200+ events executed!
                </p>
                <button className="bg-[#A91F23] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-[#8B1A1D] transition-colors">
                  Free Consultation <span className="text-white">›</span>
                </button>
              </div>
              <div className="flex-shrink-0 self-end">
                <img
                  src={garlandSvg}
                  alt="Garland"
                  className="h-24 sm:h-40 w-auto object-contain"
                />
              </div>
            </div>
          </motion.div>

          {/* Offers Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">OFFERS FOR YOU</h2>
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
              <img
                src={bannerSvg}
                alt="Ganesh Utsav Offer"
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6">
                <button className="bg-white/80 text-gray-800 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium border-2 border-gray-300/80 hover:bg-white transition-colors">
                  Book Now ›
                </button>
              </div>
            </div>
          </motion.div>

          {/* Why Choose Us Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">WHY CHOOSE US</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-[#FFFBEB] rounded-xl p-3 sm:p-4 text-center">
                <FaLeaf className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">100,000+</div>
                <div className="text-xs sm:text-sm text-gray-600">Orders Delivered</div>
              </div>
              <div className="bg-[#FFFBEB] rounded-xl p-3 sm:p-4 text-center">
                <FaUsers className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">40%</div>
                <div className="text-xs sm:text-sm text-gray-600">Women Employees</div>
              </div>
              <div className="bg-[#FFFBEB] rounded-xl p-3 sm:p-4 text-center">
                <FaBox className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-base sm:text-xl font-bold text-gray-800 mb-1">Eco-Friendly</div>
                <div className="text-xs sm:text-sm text-gray-600">Packaging</div>
              </div>
              <div className="bg-[#FFFBEB] rounded-xl p-3 sm:p-4 text-center">
                <MdAccessTime className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-base sm:text-xl font-bold text-gray-800 mb-1">Freshly Plucked</div>
                <div className="text-xs sm:text-sm text-gray-600">by 5:00 AM</div>
              </div>
            </div>
          </motion.div>

          {/* Our Story Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">OUR STORY</h2>
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              <img
                src={storyImage}
                alt="Our Story"
                className="w-full h-auto object-cover"
              />
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">The Blooming</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">
                  Once upon a time, amidst the bustling streets of our childhood neighborhood, there was a figure who graced our mornings with a simple yet profound gesture. Each day, like clockwork, this person would cast a vibrant cascade of Puja flowers into the world, accompanied by the morning newspaper. It was a ritual that went beyond mere routine; it was a gesture of care, of connection, and of spreading joy.
                </p>
                <a href="#" className="text-gray-800 font-medium text-xs sm:text-sm hover:underline">
                  Read full story ›
                </a>
              </div>
            </div>
          </motion.div>

          {/* We Are Loved Section - Customer Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">WE ARE LOVED</h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
              {[
                {
                  name: "Priya S.",
                  rating: 5,
                  review: "Fresh flowers delivered on time every day. Perfect for our morning puja!"
                },
                {
                  name: "Rajesh K.",
                  rating: 5,
                  review: "Excellent service! The flowers are always fresh and beautifully arranged."
                },
                {
                  name: "Anita M.",
                  rating: 5,
                  review: "Love the subscription plans. Makes my home look beautiful every day."
                },
                {
                  name: "Suresh P.",
                  rating: 5,
                  review: "Best floral service in town. Highly recommend to everyone!"
                },
                {
                  name: "Meera R.",
                  rating: 5,
                  review: "Amazing customer support and the quality of flowers is outstanding."
                }
              ].map((review, index) => (
                <div
                  key={index}
                  className="w-[180px] sm:w-[200px] min-h-[140px] sm:min-h-[160px] bg-white rounded-xl p-3 sm:p-4 shadow-md flex-shrink-0"
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="font-bold text-gray-800 text-sm sm:text-base">{review.name}</span>
                    <div className="flex gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <span key={i} className="text-[#FAA222] text-xs sm:text-sm">★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    "{review.review}"
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Banner Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="mb-8 sm:mb-10"
          >
            <img
              src={bottomBannerSvg}
              alt="Flower Wisdom Banner"
              className="w-full h-auto object-contain rounded-lg"
            />
          </motion.div>

          {/* Branding Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex flex-col gap-2 items-start">
              <img
                src={logoSvg}
                alt="Genda Phool Logo"
                className="h-24 sm:h-32 w-auto"
              />
              <div className="flex items-center gap-2">
                <p className="text-gray-600 text-xs sm:text-sm">Blossomed In Vadodara!</p>
                <span className="text-pink-500 text-sm sm:text-base">❤</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div >
  );
};

export default HomePage;

