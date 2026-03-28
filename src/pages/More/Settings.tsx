import React, { useEffect, useState, useRef } from 'react';
import { SEO } from '../../components/SEO';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaChevronRight,
} from 'react-icons/fa';
import {
  IoLocationOutline,
  IoLogOutOutline,
  IoCreateOutline,
  IoLogInOutline,
} from 'react-icons/io5';
import BottomNav from '../../components/layout/BottomNav';
import { customerService } from '@/services/getcustomer.service';
import { storeService, Store } from '../../services/store.service';
import { addressService } from '../../services/address.service';
import Spinner from '../../components/common/Spinner';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { cartService, CartSwitchStoreResponse } from '../../services/cart.service';
import { toast } from 'react-hot-toast';
import { editCustomerService } from '../../services/editcustomer.service';
import { formatPhoneForDisplay } from '../../utils/phoneDisplay';

// Import SVG icons
import subscriptionIcon from '../../assets/icon/subscription.svg';
import ordersIcon from '../../assets/icon/orders.png';
import pujaIcon from '../../assets/icon/puja.svg';
import exoticIcon from '../../assets/icon/exotic.svg';
import referIcon from '../../assets/icon/refer.svg';
import supportIcon from '../../assets/icon/support.svg';
import walletIcon from '../../assets/wallet.svg';
import faqIcon from '../../assets/icon/Faq.svg';
import facebookIcon from '../../assets/icon/social/facebook.svg';
import instagramIcon from '../../assets/icon/social/insta.svg';
import whatsappIcon from '../../assets/icon/social/whatsapp.svg';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, feature } = useFeatureTheme();
  const { isLoggedIn, logout } = useAuth();
  const { loadCartFromAPI } = useCart();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const showAsLoggedOut = !isLoggedIn || !localStorage.getItem('access_token');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [showStoreSwitchWarning, setShowStoreSwitchWarning] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState<number | null>(null);
  const [pendingStoreName, setPendingStoreName] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check authentication and redirect if session expired
  useEffect(() => {
    if (!isLoggedIn || !localStorage.getItem('access_token')) {
      navigate(`${basePath}/login`, {
        state: { returnUrl: location.pathname },
        replace: true
      });
    }
  }, [isLoggedIn, navigate, basePath, location.pathname]);

  // Listen for tokenRemoved event (session expiration)
  useEffect(() => {
    const handleTokenRemoved = () => {
      navigate(`${basePath}/login`, { 
        state: { returnUrl: location.pathname },
        replace: true 
      });
    };

    window.addEventListener('tokenRemoved', handleTokenRemoved);
    return () => {
      window.removeEventListener('tokenRemoved', handleTokenRemoved);
    };
  }, [navigate, basePath, location.pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
  
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch customer details
        const customers = await customerService.getAllCustomers();
        const user = customers[0];
        if (user) {
          setUserName(`${user.firstName} ${user.lastName}`);
          setUserPhone(user.phoneNumber.toString());
          setUserEmail(user.emailAddress);
          setHasEmail(!!user.emailAddress);
        }

        // Fetch default address and stores
        await fetchStores();
      } catch (err) {
        setError("Failed to fetch customer details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
    };

    if (isStoreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoreDropdownOpen]);

  /** Parse "lat,lng" or JSON { lat, lng } from localStorage (same keys as home / delivery flows). */
  const parseStoredUserCoordinates = (): { lat: number; lng: number } | null => {
    const raw = localStorage.getItem('userCoordinates');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.lat != null && parsed?.lng != null) {
        const lat = Number(parsed.lat);
        const lng = Number(parsed.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
      }
    } catch {
      const parts = raw.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
    return null;
  };

  const resolveLatLngForStores = (
    addresses: Awaited<ReturnType<typeof addressService.getAllAddresses>>
  ): { lat: number; lng: number } | null => {
    const tryParse = (coord: string | undefined): { lat: number; lng: number } | null => {
      if (!coord?.trim()) return null;
      const [a, b] = coord.split(',').map((s) => parseFloat(s.trim()));
      if (!Number.isNaN(a) && !Number.isNaN(b)) return { lat: a, lng: b };
      return null;
    };

    const ordered = [...addresses].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
    for (const addr of ordered) {
      const p = tryParse(addr.coordinates);
      if (p) return p;
    }
    return parseStoredUserCoordinates();
  };

  const fetchStores = async (opts?: { refreshListOnly?: boolean }) => {
    const refreshListOnly = opts?.refreshListOnly === true;
    try {
      if (!refreshListOnly) setIsLoadingStores(true);
      const addresses = await addressService.getAllAddresses();
      const loc = resolveLatLngForStores(addresses);

      // GET /stores/ includes is_online per store (online vs offline for ordering)
      const [storesList, nearestStore] = await Promise.all([
        loc ? storeService.getAllStores(loc.lat, loc.lng) : storeService.getAllStores(),
        loc ? storeService.getNearestStore(loc.lat, loc.lng) : Promise.resolve(null as Store | null),
      ]);

      setStores(storesList);

      if (refreshListOnly) {
        return;
      }

      // Check if there's a previously selected store in localStorage FIRST
      // Only use nearest store if user hasn't selected a store before
      const savedStoreId = localStorage.getItem("selectedStoreId");
      if (savedStoreId) {
        const savedStore = storesList.find(s => s.id === parseInt(savedStoreId));
        if (savedStore) {
          // User has a saved store selection - use it
          setSelectedStore(savedStore.name);
          setSelectedStoreId(savedStore.id);
        } else {
          // Saved store ID not found in available stores - use nearest or first
          if (nearestStore) {
            setSelectedStore(nearestStore.name);
            setSelectedStoreId(nearestStore.id);
            localStorage.setItem("selectedStoreId", nearestStore.id.toString());
          } else if (storesList.length > 0) {
            const firstStore = storesList[0];
            setSelectedStore(firstStore.name);
            setSelectedStoreId(firstStore.id);
            localStorage.setItem("selectedStoreId", firstStore.id.toString());
          }
        }
      } else {
        // No saved store - set nearest store as default if available
        if (nearestStore) {
          setSelectedStore(nearestStore.name);
          setSelectedStoreId(nearestStore.id);
          localStorage.setItem("selectedStoreId", nearestStore.id.toString());
        } else if (storesList.length > 0) {
          // If no nearest store, use first store
          const firstStore = storesList[0];
          setSelectedStore(firstStore.name);
          setSelectedStoreId(firstStore.id);
          localStorage.setItem("selectedStoreId", firstStore.id.toString());
        }
      }
    } catch (err: any) {
      console.error("Error fetching stores:", err);
      if (!refreshListOnly) setError(err.message || "Failed to fetch stores.");
    } finally {
      if (!refreshListOnly) setIsLoadingStores(false);
    }
  };

  /** Refresh store list (and is_online) when opening the dropdown */
  useEffect(() => {
    if (!isStoreDropdownOpen) return;
    fetchStores({ refreshListOnly: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when dropdown opens
  }, [isStoreDropdownOpen]);

  // GP Store menu items (6 options only)
  const gpStoreMenuItems = [
    {
      icon: ordersIcon,
      title: 'Orders',
      path: `${basePath}/orders`,
      isSvg: false
    },
    {
      icon: pujaIcon,
      title: 'Products',
      path: `${basePath}/products`,
      isSvg: true
    },
    {
      icon: <IoLocationOutline className="text-xl text-gray-500" />,
      title: 'Address Book',
      path: `${basePath}/addresses`,
      isSvg: false,
      isComponent: true
    },
    {
      icon: referIcon,
      title: 'Refer Us',
      path: `${basePath}/refer`,
      isSvg: true
    },
    {
      icon: supportIcon,
      title: 'Request & Support',
      path: `${basePath}/customer-support`,
      isSvg: true
    },
    {
      icon: faqIcon,
      title: 'FAQs',
      path: `${basePath}/faq`,
      isSvg: true
    }
  ];

  // GP Daily menu items (all original options)
  const gpDailyMenuItems = [
    {
      icon: subscriptionIcon,
      title: 'Manage Subscription',
      path: `${basePath}/manage-my-subscription`,
      isSvg: true
    },
    {
      icon: ordersIcon,
      title: 'Orders',
      path: `${basePath}/orders`,
      isSvg: false
    },
    {
      icon: pujaIcon,
      title: 'Puja Flower',
      path: `${basePath}/Products?category=puja`,
      isSvg: true
    },
    {
      icon: exoticIcon,
      title: 'Exotic Flower',
      path: `${basePath}/Products?category=exotic`,
      isSvg: true
    },
    {
      icon: <IoLocationOutline className="text-xl text-gray-500" />,
      title: 'Address Book',
      path: `${basePath}/addresses`,
      isSvg: false,
      isComponent: true
    },
    {
      icon: referIcon,
      title: 'Refer Us',
      path: `${basePath}/refer`,
      isSvg: true
    },
    {
      icon: supportIcon,
      title: 'Request & Support',
      path: `${basePath}/customer-support`,
      isSvg: true
    },
    {
      icon: walletIcon,
      title: 'Wallet',
      path: `${basePath}/wallet`,
      isSvg: true
    },
    {
      icon: faqIcon,
      title: 'FAQs',
      path: `${basePath}/faq`,
      isSvg: true
    }
  ];

  // Select menu items based on feature
  const menuItems = feature === 'gpStore' ? gpStoreMenuItems : gpDailyMenuItems;

  const socialLinks = [
    {
      icon: facebookIcon,
      url: '#'
    },
    {
      icon: instagramIcon,
      url: '#'
    },
    {
      icon: whatsappIcon,
      url: '#'
    }
  ];

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutDialog(false);
    await logout();
    navigate(`${basePath}/login`);
  };

  const handleLoginClick = () => {
    navigate(`${basePath}/login`);
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteAccountDialog(true);
  };

  const handleDeleteAccountConfirm = async () => {
    try {
      setIsDeletingAccount(true);
      
      await editCustomerService.deleteAccount();
      
      toast.success('Account deleted successfully');
      
      // Clear all local storage
      localStorage.clear();
      
      // Logout user
      await logout();
      
      // Close dialog
      setShowDeleteAccountDialog(false);
      
      // Navigate to login page
      navigate(`${basePath}/login`);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const errorMessage = error.message || 'Failed to delete account. Please try again.';
      toast.error(errorMessage);
      setShowDeleteAccountDialog(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccountCancel = () => {
    setShowDeleteAccountDialog(false);
  };

  /** Backend GET /stores/ sets is_online; missing field treated as online */
  const storeIsOnline = (store: Store) => store.is_online !== false;

  const countRemovedCartItems = (res: CartSwitchStoreResponse) => {
    const arr = res?.data?.removed_items ?? res?.removed_items;
    return Array.isArray(arr) ? arr.length : 0;
  };

  const handleStoreSwitchConfirm = async () => {
    try {
      if (pendingStoreId !== null) {
        // Cart switch-store migrates the basket and switches the active store on the backend
        try {
          const cartRes = await cartService.switchCartStore(pendingStoreId);
          await loadCartFromAPI();
          const removed = countRemovedCartItems(cartRes);
          if (removed > 0) {
            toast.success(
              `Store updated. ${removed} item${removed === 1 ? '' : 's'} not sold at this store ${removed === 1 ? 'was' : 'were'} removed from your basket.`
            );
          }
        } catch (cartErr: unknown) {
          console.error('Cart switch-store:', cartErr);
          const msg =
            cartErr instanceof Error ? cartErr.message : 'Cart could not be updated for this store.';
          toast.error(`${msg} Try opening your basket to refresh.`);
          await loadCartFromAPI().catch(() => {});
          setShowStoreSwitchWarning(false);
          setPendingStoreId(null);
          setPendingStoreName('');
          return;
        }
        setSelectedStore(pendingStoreName);
        setSelectedStoreId(pendingStoreId);
        localStorage.setItem("selectedStoreId", pendingStoreId.toString());
      } else {
        // Clearing store selection - just remove from localStorage
        setSelectedStore('');
        setSelectedStoreId(null);
        localStorage.removeItem("selectedStoreId");
      }
      setShowStoreSwitchWarning(false);
      setPendingStoreId(null);
      setPendingStoreName('');
    } catch (err: any) {
      console.error("Error switching store:", err);
      setError(err.message || "Failed to switch store");
      setShowStoreSwitchWarning(false);
      setPendingStoreId(null);
      setPendingStoreName('');
    }
  };

  const handleStoreSwitchCancel = () => {
    setShowStoreSwitchWarning(false);
    setPendingStoreId(null);
    setPendingStoreName('');
  };

  const handleMenuClick = (path: string) => {
    if (path.includes('?')) {
      const [route, query] = path.split('?');
      navigate(`${route}?${query}`);
    } else {
      navigate(path);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const local = formatPhoneForDisplay(phone);
    if (!local || local.length < 10) return phone || local;
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  };

  // When not logged in (or no token), show minimal account page with Login button only
  if (showAsLoggedOut) {
    return (
      <div className="min-h-screen bg-[#f8f6f1]">
        <div className="w-full max-w-[800px] mx-auto">
          <div className="w-full px-4 pt-6">
            <p className="text-gray-600 text-center mb-6">Login to access your account</p>
            <button
              onClick={handleLoginClick}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-colors"
              style={{
                backgroundColor: theme.colors.primary,
                color: feature === 'gpStore' ? 'white' : 'black'
              }}
            >
              <IoLogInOutline className="text-xl" />
              <span className="text-[15px]">Login</span>
            </button>
            <div className="mb-20 mt-8 text-center">
              <p className="text-xs text-gray-400">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-gray-500 underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-gray-500 underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Show full-page loader while data is loading
  if (loading) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${theme.classes.authPageBackground}`}>
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <SEO
        title="My Account — Genda Phool"
        description="Manage your Genda Phool account"
        canonical="https://customerapp.mygendaphool.com/gp-store/account"
        noIndex={true}
      />
      <div className="w-full max-w-[800px] mx-auto">
        {/* Content Container */}
        <div className="w-full px-4">
          {/* User Profile Card */}
          <div className="bg-white mt-4 p-4 rounded-xl shadow-sm relative">
            <button
              onClick={() => navigate(`${basePath}/profile`)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <IoCreateOutline className="text-xl" />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <img
                  src={theme.assets.profileBackground}
                  alt="Profile background"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <img
                  src={theme.assets.profileLogo}
                  alt="Account"
                  className="relative z-10 w-7 h-7 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{userName || 'User Name'}</h2>
                <p className="text-gray-500 text-[15px] mt-0.5">{formatPhoneNumber(userPhone)}</p>
                <p className={`text-[15px] mt-0.5 ${hasEmail ? 'text-gray-500' : 'text-blue-600'}`}>
                  {userEmail || 'No email'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white mt-4 rounded-xl shadow-sm p-3 sm:p-4">
            <h3 className="text-[15px] font-medium text-gray-900 mb-3">Select Store</h3>
            <div ref={dropdownRef} className="relative w-full">
              {/* Custom Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                disabled={isLoadingStores || stores.length === 0}
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-3 sm:pl-4 pr-8 sm:pr-10 rounded-lg text-left text-sm sm:text-base focus:outline-none focus:bg-white focus:border-gray-500 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  <span className="truncate">
                    {isLoadingStores
                      ? 'Loading stores...'
                      : selectedStore || (stores.length === 0 ? 'No stores available' : 'Choose a store')
                    }
                  </span>
                  {selectedStoreId != null &&
                    (() => {
                      const sel = stores.find((s) => s.id === selectedStoreId);
                      if (!sel || storeIsOnline(sel)) return null;
                      return (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                          Offline
                        </span>
                      );
                    })()}
                </span>
                <FaChevronRight
                  className={`transform transition-transform flex-shrink-0 text-xs text-gray-400 ${isStoreDropdownOpen ? 'rotate-180' : 'rotate-90'}`}
                  style={{ marginLeft: '8px' }}
                />
              </button>

              {/* Custom Dropdown Options */}
              {isStoreDropdownOpen && stores.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsStoreDropdownOpen(false)}
                  />
                  <div
                    className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // If there's a selected store, show warning before clearing
                        if (selectedStoreId !== null) {
                          setPendingStoreId(null);
                          setPendingStoreName('');
                          setShowStoreSwitchWarning(true);
                          setIsStoreDropdownOpen(false);
                        } else {
                          // No store selected - just close dropdown
                          setIsStoreDropdownOpen(false);
                        }
                      }}
                      className={`w-full text-left px-3 sm:px-4 py-3 text-sm sm:text-base transition-colors truncate ${!selectedStore
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      Choose a store
                    </button>
                    {stores.map((store) => {
                      const online = storeIsOnline(store);
                      return (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => {
                          if (!online) {
                            toast.error('This store is offline. Please choose another store.');
                            return;
                          }
                          // If switching to a different store, show warning modal
                          if (selectedStoreId !== null && selectedStoreId !== store.id) {
                            setPendingStoreId(store.id);
                            setPendingStoreName(store.name);
                            setShowStoreSwitchWarning(true);
                            setIsStoreDropdownOpen(false);
                          } else {
                            setIsStoreDropdownOpen(false);
                          }
                        }}
                        className={`w-full px-3 sm:px-4 py-3 text-left text-sm sm:text-base transition-colors ${!online ? 'cursor-not-allowed opacity-55' : ''} ${selectedStoreId === store.id
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{store.name}</div>
                            {store.distance_km != null && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {store.distance_km.toFixed(1)} km away
                              </div>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              online
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </button>
                    );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-white mt-4 rounded-xl overflow-hidden shadow-sm">
            {menuItems.map((item, index) => (
              <div
                key={item.title}
                onClick={() => handleMenuClick(item.path)}
                className={`flex items-center justify-between p-4 ${index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                  } cursor-pointer hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-center gap-4">
                  {item.isComponent ? (
                    item.icon
                  ) : (
                    <img src={item.icon as string} alt={item.title} className="w-5 h-5 object-contain" />
                  )}
                  <span className="text-[15px] text-gray-700 font-normal">{item.title}</span>
                </div>
                <FaChevronRight className="text-gray-400 text-sm" />
              </div>
            ))}
          </div>

          {/* Social Connect Section */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect With Us</h3>
            <p className="text-[15px] text-gray-500 mb-4">
              Follow us on social media for daily flowers inspiration, puja tips, & exclusive offers.
            </p>
            <div className="flex items-center justify-center gap-6">
              {socialLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => window.open(link.url, '_blank')}
                  className="transition-opacity hover:opacity-80"
                >
                  <img src={link.icon} alt="" className="w-6 h-6" />
                </button>
              ))}
            </div>
          </div>

          {/* Login/Logout Button */}
          <div className="mt-6 mb-4">
            {isLoggedIn ? (
              <button
                onClick={handleLogoutClick}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-colors"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: feature === 'gpStore' ? 'white' : 'black'
                }}
              >
                <IoLogOutOutline className="text-xl" />
                <span className="text-[15px]">Logout</span>
              </button>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold transition-colors"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: feature === 'gpStore' ? 'white' : 'black'
                }}
              >
                <IoLogInOutline className="text-xl" />
                <span className="text-[15px]">Login</span>
              </button>
            )}
          </div>

          {/* Delete Account Link - Show only when logged in */}
          {isLoggedIn && (
            <div className="mb-4 text-center">
              <button
                onClick={handleDeleteAccountClick}
                className="text-red-500 text-[15px] hover:text-red-700 transition-colors underline"
              >
                Delete Account
              </button>
            </div>
          )}

          {/* Legal Disclaimer */}
          <div className="mb-20 text-center">
            <p className="text-xs text-gray-400">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-gray-500 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-gray-500 underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Are you Sure?
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleLogoutConfirm}
                className="w-full py-3 text-gray-700 font-medium text-base rounded-lg hover:bg-gray-100 transition-colors"
              >
                Log Out
              </button>
              <button
                onClick={handleLogoutCancel}
                className="w-full py-3 text-red-500 font-medium text-base rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteAccountDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              Delete Account?
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDeleteAccountConfirm}
                disabled={isDeletingAccount}
                className="w-full py-3 text-white font-medium text-base rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#DC2626' }}
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                onClick={handleDeleteAccountCancel}
                disabled={isDeletingAccount}
                className="w-full py-3 text-gray-700 font-medium text-base rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Switch Warning Dialog */}
      {showStoreSwitchWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              Switch Store?
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Due to the change in store, items in your cart might get affected. Do you want to continue?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleStoreSwitchConfirm}
                className="w-full py-3 text-white font-medium text-base rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: feature === 'gpStore' ? 'white' : 'black'
                }}
              >
                Continue
              </button>
              <button
                onClick={handleStoreSwitchCancel}
                className="w-full py-3 text-gray-700 font-medium text-base rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
