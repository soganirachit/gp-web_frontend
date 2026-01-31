import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChevronRight,
} from 'react-icons/fa';
import {
  IoLocationOutline,
  IoLogOutOutline,
  IoCreateOutline,
} from 'react-icons/io5';
import BottomNav from '../../components/layout/BottomNav';
import { customerService } from '@/services/getcustomer.service';

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
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const [, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    customerService.getAllCustomers()
      .then((customers) => {
        const user = customers[0];
        if (user) {
          setUserName(`${user.firstName} ${user.lastName}`);
          setUserPhone(user.phoneNumber.toString());
          setUserEmail(user.emailAddress);
          setHasEmail(!!user.emailAddress);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch customer details.");
        setLoading(false);
      });
  }, []);

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

  const handleLogoutConfirm = () => {
    localStorage.clear();
    navigate(`${basePath}/login`);
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteAccountDialog(true);
  };

  const handleDeleteAccountConfirm = () => {
    // Add delete account functionality here
    console.log('Delete account confirmed');
    // localStorage.clear();
    // navigate('/login');
    setShowDeleteAccountDialog(false);
  };

  const handleDeleteAccountCancel = () => {
    setShowDeleteAccountDialog(false);
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
    if (!phone || phone.length < 10) return phone;
    return `+91 ${phone}`;
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
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

          {/* Logout Button */}
          <div className="mt-6 mb-4">
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
          </div>

          {/* Delete Account Link */}
          <div className="mb-4 text-center">
            <button
              onClick={handleDeleteAccountClick}
              className="text-red-500 text-[15px] hover:text-red-700 transition-colors underline"
            >
              Delete Account
            </button>
          </div>

          {/* Legal Disclaimer */}
          <div className="mb-20 text-center">
            <p className="text-xs text-gray-400">
              By continuing, you agree to our{' '}
              <a href="#" className="text-gray-500 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-gray-500 underline">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Are you Sure?
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleDeleteAccountConfirm}
                className="w-full py-3 text-gray-700 font-medium text-base rounded-lg hover:bg-gray-100 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleDeleteAccountCancel}
                className="w-full py-3 text-red-500 font-medium text-base rounded-lg hover:bg-red-50 transition-colors"
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
