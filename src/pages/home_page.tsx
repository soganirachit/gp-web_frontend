import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { trackPageView } from '../lib/metaPixel';
import { useAuth } from '../context/AuthContext';
import { useFeatureTheme } from '../context/FeatureThemeContext';
import { MdLocationOn, MdKeyboardArrowDown, MdAccessTime } from 'react-icons/md';
import { FaLeaf, FaUsers, FaBox } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { addressService, Address } from '../services/address.service';
import { storeService, GUEST_STORE_UPDATED_EVENT } from '../services/store.service';
import { OffersBannerCarousel } from '../components/OffersBannerCarousel';
import ProfileIcon from '../assets/icon/Profile.png';
import { SearchBar } from '../components/common/SearchBar';
// Large assets served from public/ — no bundle impact, long-cache headers apply
const storyImage = '/story.png';
const dailyScooterSvg = '/daily_scooter.svg';
const bannerSvg = '/banner.svg';
const bottomBannerSvg = '/bottom_banner.svg';
// SVG Imports
import namasteSvg from '../assets/svg/namaste.svg';
import dailyTabGlyph from '../assets/icon/navbar/daily.svg';
import storeLogoSvg from '../assets/svg/store_logo.svg';
import truckSvg from '../assets/svg/truck.svg';
import sajawatLogoSvg from '../assets/svg/sajawat_logo.svg';
import garlandSvg from '../assets/svg/garland.svg';
import logoSvg from '../assets/svg/logo.svg';
import profilehomeIcon from '../assets/svg/gp_daily svg/profilehome.svg';
import profilelogoIcon from '../assets/svg/gp_daily svg/profilelogo.svg';
import {
  ProfileAvatarButton,
  PROFILE_HEADER_AVATAR_CLASS,
  PROFILE_HEADER_FALLBACK_HOME_CLASS,
  PROFILE_HEADER_LOGO_CLASS,
} from '../components/common/ProfileAvatarButton';
import locationhomeIcon from '../assets/svg/gp_daily svg/locationhome.svg';
import { SOCIAL_URLS } from '../config/socialUrls';
import {
  fetchGuestDeviceLocationLabel,
  GUEST_HEADER_LOCATION_TITLE,
  GUEST_LOCATION_UNAVAILABLE_HINT,
} from '../utils/guestHeaderLocation';
import {
  formatHomeHeaderAddressDisplay,
  HOME_HEADER_ADDRESS_LINE,
  HOME_HEADER_ADDRESS_PROFILE_ROW,
  HOME_HEADER_ADDRESS_TYPE,
  HOME_HEADER_CHEVRON,
  HOME_HEADER_LOCATION_CLICK,
  HOME_HEADER_LOCATION_ICON,
  HOME_HEADER_LOCATION_ROW,
  HOME_HEADER_PROFILE_OFFSET,
} from '../constants/homeHeaderLayout';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { feature } = useFeatureTheme();
  const [deliveryLocation, setDeliveryLocation] = useState<string>('');
  const [addressType, setAddressType] = useState<string>('Home');
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const [offersStoreId, setOffersStoreId] = useState<number | null>(() =>
    storeService.getStoreIdForProducts(),
  );

  const refreshOffersStoreId = useCallback(() => {
    setOffersStoreId((prev) => {
      const next = storeService.getStoreIdForProducts();
      return prev === next ? prev : next;
    });
  }, []);

  // Single effect: avoids duplicate refresh on mount (was two useEffects × Strict Mode = 4 store updates).
  useEffect(() => {
    refreshOffersStoreId();
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, refreshOffersStoreId);
    return () => window.removeEventListener(GUEST_STORE_UPDATED_EVENT, refreshOffersStoreId);
  }, [isLoggedIn, refreshOffersStoreId]);

  // Function to fetch the latest address from API (only when logged in — avoids wrong JWT for guests)
  const fetchLatestAddress = useCallback(async () => {
    if (!isLoggedIn) {
      setAddressType(GUEST_HEADER_LOCATION_TITLE);
      setDeliveryLocation('');
      setIsLoadingAddress(true);
      const label = await fetchGuestDeviceLocationLabel();
      setDeliveryLocation(label);
      setIsLoadingAddress(false);
      return;
    }
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();

      // Get default address first, otherwise get the latest address
      const defaultAddress = addresses.find(addr => addr.isDefault);
      const selectedAddress = defaultAddress || addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      [0];

      if (selectedAddress) {
        const formattedAddress = [
          selectedAddress.houseNo,
          selectedAddress.streetName,
          selectedAddress.area,
          selectedAddress.city,
          selectedAddress.state,
          selectedAddress.pincode
        ].filter(Boolean).join(', ');

        setDeliveryLocation(formattedAddress);
        setAddressType(selectedAddress.type || 'Home');
      } else {
        setDeliveryLocation('');
        setAddressType('Home');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      // Fallback to localStorage if API fails
      setDeliveryLocation(localStorage.getItem('userLocation') || '');
      setAddressType('Home');
    } finally {
      setIsLoadingAddress(false);
    }
  }, [isLoggedIn]);

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
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    navigate(`${basePath}/addresses`);
  };

  const handleProfileClick = () => {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    if (!isLoggedIn) {
      navigate('/gp-store/login');
      return;
    }
    navigate(`${basePath}/account`);
  };

  // Fire PageView for /home (this route is outside Layout so tracking is here)
  useEffect(() => { trackPageView(); }, []);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white font-serif">
      <SEO
        title="Genda Phool — Fresh Flowers & Pooja Items Delivered Daily in Jaipur"
        description="Order fresh marigold, rose, tuberose, garlands and pooja items online in Jaipur. Same-day delivery before 12 PM. 100,000+ orders delivered."
        canonical="https://customerapp.mygendaphool.com/home"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Genda Phool",
          "description": "Fresh flower delivery and pooja items in Jaipur",
          "url": "https://customerapp.mygendaphool.com",
          "logo": "https://customerapp.mygendaphool.com/logo.png",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "17, Sodala",
            "addressLocality": "Jaipur",
            "addressRegion": "Rajasthan",
            "postalCode": "302019",
            "addressCountry": "IN"
          },
          "openingHours": "Mo-Su 06:00-20:00",
          "priceRange": "₹₹",
          "sameAs": [
            SOCIAL_URLS.facebook,
            SOCIAL_URLS.instagramMyGendaPhool
          ]
        }}
      />
      <div className="mx-auto w-full max-w-[min(800px,100vw)] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        {/* Top Navigation Bar */}
        <div className="bg-white sticky top-0 z-20 isolate px-3 sm:px-4 py-2 sm:py-3">
          <div className={HOME_HEADER_ADDRESS_PROFILE_ROW}>
            {/* Location Section */}
            <div className={HOME_HEADER_LOCATION_ROW}>
              <img
                src={locationhomeIcon}
                alt="Location"
                className={HOME_HEADER_LOCATION_ICON}
              />
              <div
                className={HOME_HEADER_LOCATION_CLICK}
                onClick={handleLocationClick}
              >
                <div className="flex flex-col min-w-0">
                  <span className={`${HOME_HEADER_ADDRESS_TYPE} text-gray-800`}>{addressType}</span>
                  <span className={`${HOME_HEADER_ADDRESS_LINE} text-gray-600`}>
                    {isLoadingAddress
                      ? 'Loading...'
                      : deliveryLocation
                        ? formatHomeHeaderAddressDisplay(deliveryLocation)
                        : !isLoggedIn
                          ? GUEST_LOCATION_UNAVAILABLE_HINT
                          : 'Tap to set address'}
                  </span>
                </div>
                <MdKeyboardArrowDown className={HOME_HEADER_CHEVRON} />
              </div>
            </div>

            {/* Profile — nudged toward the right edge; guests go to store login */}
            <ProfileAvatarButton
              onClick={handleProfileClick}
              className={`${PROFILE_HEADER_AVATAR_CLASS} ${HOME_HEADER_PROFILE_OFFSET}`}
              profileHomeSrc={profilehomeIcon}
              profileLogoSrc={profilelogoIcon}
              fallbackHomeClassName={PROFILE_HEADER_FALLBACK_HOME_CLASS}
              logoClassName={PROFILE_HEADER_LOGO_CLASS}
              ariaLabel={isLoggedIn ? 'Account' : 'Log in'}
            />
          </div>

          {/* Search Bar — unified styling, product suggestions as you type */}
          <div className="mt-2 sm:mt-3">
            <SearchBar
              mode="product"
              storeId={offersStoreId}
              productBasePath={feature === 'gpStore' ? '/gp-store' : '/gp-daily'}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-0 px-3 sm:px-4 pb-2">
          {/* Greeting Section with Namaste SVG */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-4 pb-4 xs:pt-6 xs:pb-6 sm:pt-8 sm:pb-7"
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

          {/* Service Cards — 1 col below xs (360px), 2 cols from xs up; min-w-0 avoids grid overflow */}
          <div className="grid grid-cols-1 xs:grid-cols-2 auto-rows-fr gap-2 sm:gap-3 mb-5 items-stretch w-full min-w-0">
            {/* Genda Phool Daily Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="min-w-0 h-full bg-[#FFF5E6] rounded-2xl p-1.5 sm:p-2.5 cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col"
              onClick={() => {
                if (isLoggedIn) {
                  navigate("/gp-daily", { state: { mode: "daily" } });
                } else {
                  navigate("/gp-daily/login", {
                    state: { mode: "daily", returnUrl: "/gp-daily" },
                  });
                }
              }}
            >
              <span className="absolute right-1 top-0.5 z-20 text-[#DD7600] text-base sm:text-2xl font-bold leading-none pointer-events-none" aria-hidden>
                ›
              </span>
              <div className="relative w-full shrink-0 h-[4.25rem] overflow-hidden rounded-[10px] bg-[#FFF5E6]/40 sm:h-[6.5rem] sm:rounded-xl md:h-[6rem]">
                <img
                  src={dailyScooterSvg}
                  alt=""
                  className="pointer-events-none absolute top-4.5 inset-x-0 bottom-0 mx-auto mt-[-22px] h-[92%] w-[118%] max-w-none object-contain object-bottom sm:mt-[-24px] sm:h-[94%] sm:w-[108%]"
                />
                <div className="absolute right-0 top-0.5 z-10 w-[45%] max-w-[4.25rem] sm:top-1.5 sm:max-w-[6rem] md:max-w-[8rem]">
                  <span
                    aria-hidden
                    className="block aspect-square w-full shrink-0 bg-[#DD7600] drop-shadow-sm"
                    style={{
                      maskImage: `url(${dailyTabGlyph})`,
                      WebkitMaskImage: `url(${dailyTabGlyph})`,
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                    }}
                  />
                </div>
              </div>
              <p className="mt-0 top-0 min-h-[2.25rem] flex-1 min-w-0 px-0.5 text-left text-[10px] font-medium leading-snug text-[#DD7600] [overflow-wrap:anywhere] sm:mt-1.5 sm:min-h-[2.5rem] sm:px-1 sm:text-[11px] md:min-h-[2.75rem] md:text-xs md:leading-snug">
                Everyday delivery of fresh flowers for Puja or Home Decor.
              </p>
            </motion.div>

            {/* Genda Phool Store Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="min-w-0 h-full bg-[#E8F5E9] rounded-2xl p-1.5 sm:p-2.5 cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col"
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/gp-store', { state: { mode: 'store' } });
                } else {
                  navigate('/gp-store/login', { state: { mode: 'store' } });
                }
              }}
            >
              <span className="absolute right-1 top-0.5 z-20 text-[#19411F] text-base sm:text-2xl font-bold leading-none pointer-events-none" aria-hidden>
                ›
              </span>
              <div className="relative w-full shrink-0 h-[4.25rem] overflow-hidden rounded-[10px] bg-[#E8F5E9]/40 sm:h-[6.5rem] sm:rounded-xl md:h-[6rem]">
                <img
                  src={truckSvg}
                  alt=""
                  className="pointer-events-none absolute top-4.5 inset-x-0 bottom-0 mx-auto mt-[-22px] h-[92%] w-[118%] max-w-none object-contain object-bottom sm:mt-[-24px] sm:h-[94%] sm:w-[108%]"
                />
                <div className="absolute right-0 top-0.5 z-10 w-[45%] max-w-[4.25rem] sm:top-1.5 sm:max-w-[6rem] md:max-w-[8rem]">
                  <img src={storeLogoSvg} alt="Genda Phool Store" className="h-auto w-full object-contain object-right drop-shadow-sm" />
                </div>
              </div>
              <p className="mt-1 min-h-[2.25rem] flex-1 min-w-0 px-0.5 text-left text-[10px] font-medium leading-snug text-[#19411F] [overflow-wrap:anywhere] sm:mt-1.5 sm:min-h-[2.5rem] sm:px-1 sm:text-[11px] md:min-h-[2.75rem] md:text-xs md:leading-snug">
                From last minute floral needs to grand bouquets, we got it all!
              </p>
            </motion.div>
          </div>

          {/* Sajawat — mobile: horizontal card matching design ref (copy left, arch right) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="relative mb-6 min-h-[8.75rem] cursor-pointer overflow-hidden rounded-2xl bg-[#FDE2D9] p-4 shadow-sm transition-shadow hover:shadow-md sm:min-h-[9.5rem] sm:p-5"
            role="link"
            tabIndex={0}
            aria-label="Sajawat by Genda Phool"
            onClick={() => navigate('/sajawat')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/sajawat');
              }
            }}
          >
            <div className="relative z-10 flex min-w-0 flex-row items-end gap-2">
              <div className="min-w-0 flex-1 pb-0.5">
                <img
                  src={sajawatLogoSvg}
                  alt="Sajawat by Genda Phool"
                  className="mb-2 h-8 w-auto max-w-[10.5rem] sm:h-10"
                />
                <p className="mb-3 max-w-[13.5rem] text-[13px] font-medium leading-snug text-[#9B2226] sm:text-sm sm:leading-normal">
                  A floral first event design and management service, 200+ events executed!
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#9B2226] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7A1B1E] sm:px-5 sm:py-2.5 sm:text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/sajawat');
                  }}
                >
                  <span>Free Consultation</span>
                  <span className="text-sm leading-none" aria-hidden>
                    ›
                  </span>
                </button>
              </div>
              <div className="pointer-events-none flex w-[42%] max-w-[9.5rem] shrink-0 items-end justify-end self-stretch sm:max-w-[11rem]">
                <img
                  src={garlandSvg}
                  alt=""
                  className="h-auto w-full max-h-[7.5rem] object-contain object-bottom sm:max-h-[8.5rem]"
                />
              </div>
            </div>
          </motion.div>

          {/* Offers Section — dynamic banners from API */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <OffersBannerCarousel storeId={offersStoreId} />
          </motion.div>

          {/* Why Choose Us Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mb-8 sm:mb-10"
          >
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">WHY CHOOSE US</h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4 items-stretch w-full min-w-0">
              <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 text-center min-w-0 [overflow-wrap:anywhere]">
                <FaLeaf className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">100,000+</div>
                <div className="text-xs sm:text-sm text-gray-600">Orders Delivered</div>
              </div>
              <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 text-center min-w-0 [overflow-wrap:anywhere]">
                <FaUsers className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-lg sm:text-2xl font-bold text-gray-800 mb-1">40%</div>
                <div className="text-xs sm:text-sm text-gray-600">Women Employees</div>
              </div>
              <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 text-center min-w-0 [overflow-wrap:anywhere]">
                <FaBox className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-800" />
                <div className="text-base sm:text-xl font-bold text-gray-800 mb-1">Eco-Friendly</div>
                <div className="text-xs sm:text-sm text-gray-600">Packaging</div>
              </div>
              <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 text-center min-w-0 [overflow-wrap:anywhere]">
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
                className="w-full max-w-full h-auto object-cover"
              />
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">The Blooming</h3>
                <div className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">
                  <p className="mb-3">
                    Once upon a time, amidst the bustling streets of our childhood neighborhood, there was a figure who graced our mornings with a simple yet profound gesture. Each day, like clockwork, this person would cast a vibrant cascade of Puja flowers into the world, accompanied by the morning newspaper. It was a ritual that went beyond mere routine; it was a gesture of care, of connection, and of spreading joy.
                  </p>
                  {isStoryExpanded && (
                    <div className="space-y-3">
                      <p>
                        This daily ritual left an indelible mark on our hearts. We watched as neighbors would step out, their faces lighting up at the sight of fresh flowers waiting at their doorstep. It wasn't just about the flowers—it was about the sense of community, the feeling of being cared for, and the beauty that a simple gesture could bring to someone's day.
                      </p>
                      <p>
                        Years passed, and as we grew older, we realized that this tradition was fading away. The flower vendor, the morning routine, the sense of connection—all seemed to be disappearing in the fast-paced world we now lived in. But the memory of those mornings stayed with us, a reminder of how something so simple could mean so much.
                      </p>
                      <p>
                        That's when the seed of Genda Phool was planted. We asked ourselves: What if we could bring back that sense of daily connection? What if we could ensure that every home could start their day with fresh, beautiful flowers? What if we could recreate that feeling of care and community, but make it accessible to everyone, everywhere?
                      </p>
                      <p>
                        Today, Genda Phool is more than just a flower delivery service. We are a bridge between the timeless tradition of daily floral offerings and the modern world. We work directly with local farmers, ensuring that every flower is fresh, sustainably sourced, and delivered with the same care and attention that made those childhood mornings so special.
                      </p>
                      <p>
                        From our humble beginnings in Vadodara, we've grown to serve thousands of families, bringing the joy of fresh flowers to their doorsteps every single day. Whether it's for your morning Puja, home decoration, or simply to brighten someone's day, we're here to make sure that the simple beauty of fresh flowers is never out of reach.
                      </p>
                      <p>
                        Our story is still being written, one delivery at a time, one smile at a time. Join us in keeping this beautiful tradition alive, and let's continue to spread joy, one flower at a time.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsStoryExpanded(!isStoryExpanded)}
                  className="text-gray-800 font-medium text-xs sm:text-sm hover:underline cursor-pointer"
                >
                  {isStoryExpanded ? 'Read less' : 'Read full story'} ›
                </button>
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
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain touch-pan-x pb-2 sm:gap-4 -mx-1 px-1 min-w-0">
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
                  className="w-[min(85vw,11rem)] xs:w-[min(180px,42vw)] sm:w-[200px] min-h-[140px] sm:min-h-[160px] snap-start bg-white rounded-xl p-3 sm:p-4 shadow-md flex-shrink-0 min-w-0 max-w-[100%] [overflow-wrap:anywhere]"
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
            className="mb-0"
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

    </div>
  );
};

export default HomePage;

