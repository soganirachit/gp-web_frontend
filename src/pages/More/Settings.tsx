import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaChevronRight,
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
} from 'react-icons/fa';
import { 
  IoPersonOutline, 
  IoLocationOutline,
  IoCopyOutline,
  IoNotificationsOutline,
  IoHelpCircleOutline,
  IoMailOutline,
  IoLogOutOutline,
  IoArrowBack
} from 'react-icons/io5';
import walletImage from '../../assets/icon/Wallet.png'
import profileImage from '../../assets/icon/Profile.png'
import BottomNav from '../../components/layout/BottomNav';
import { customerService } from '@/services/getcustomer.service';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(true);

  // Add loading and error state if needed
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

  const menuItems = [
    {
      icon: <IoPersonOutline className="text-xl text-gray-500" />,
      title: 'Edit Profile',
      path: '/profile'
    },
    {
      icon: <IoLocationOutline className="text-xl text-gray-500" />,
      title: 'Address Book',
      path: '/addresses'
    },
    {
      icon: <IoCopyOutline className="text-xl text-gray-500" />,
      title: 'Refer Us',
      path: '/refer'
    },
    {
      icon: <IoNotificationsOutline className="text-xl text-gray-500" />,
      title: 'Manage Subscriptions',
      path: '/manage-my-subscription'
    },
    {
      icon: <IoHelpCircleOutline className="text-xl text-gray-500" />,
      title: 'Help & Support',
      path: '/customer-support'
    }
  ];

  const socialLinks = [
    {
      icon: <FaInstagram />,
      title: 'Instagram',
      url: '#'
    },
    {
      icon: <FaFacebookF />,
      title: 'Facebook',
      url: '#'
    },
    {
      icon: <FaWhatsapp />,
      title: 'Whatsapp',
      url: '#'
    },
    {
      icon: <IoMailOutline />,
      title: 'E-mail',
      url: '#'
    }
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center">
      <div className="w-full max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors">
              <IoArrowBack className="text-xl" />
            </button>
            <h1 className="text-xl font-medium">Account & Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src={walletImage} 
              alt="Wallet" 
              className="w-10 h-10" 
              onClick={() => navigate('/wallet')}
            />
            <img 
              src={profileImage} 
              alt="Profile" 
              className="w-6 h-6" 
              onClick={() => navigate('/account')}
            />
          </div>
        </div>

        {/* Content Container */}
        <div className="w-full px-4">
          {/* User Profile Card */}
          <div className="bg-white mt-4 p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <IoPersonOutline className="text-2xl text-[#FF5722]" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">{userName} </h2>
                <p className="text-gray-500 text-[15px]">{userPhone}</p>
                <p className={`text-[15px] ${hasEmail ? 'text-gray-500' : 'text-blue-600'}`}>
                  {userEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-white mt-4 rounded-xl overflow-hidden shadow-sm">
            {menuItems.map((item, index) => (
              <div
                key={item.title}
                onClick={() => navigate(item.path)}
                className={`flex items-center justify-between p-4 ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                } cursor-pointer hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-center gap-4">
                  {item.icon}
                  <span className="text-[15px] text-gray-700 font-normal">{item.title}</span>
                </div>
                <FaChevronRight className="text-gray-400 text-sm" />
              </div>
            ))}
          </div>

          {/* Social Connect Section */}
          <div className="mt-6 bg-white p-4 rounded-xl shadow-sm">
            <h3 className="text-[17px] font-medium text-gray-900 mb-2">Connect With Us</h3>
            <p className="text-[15px] text-gray-500 mb-4">
              Follow us on social media for daily flower inspiration, puja tips, and exclusive offers.
            </p>
            <div className="bg-white rounded-xl">
              <div className="grid grid-cols-2 gap-3">
                {socialLinks.map((link) => (
                  <button
                    key={link.title}
                    onClick={() => window.open(link.url, '_blank')}
                    className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-[#1B4B33] text-base">{link.icon}</span>
                    <span className="text-[15px] text-gray-700">{link.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-6 mb-24">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <IoLogOutOutline className="text-xl" />
              <span className="text-[15px]">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="w-full">
        <BottomNav />
      </div>
    </div>
  );
}

export default Settings;