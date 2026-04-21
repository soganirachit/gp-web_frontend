import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera } from 'react-icons/fa';
import { customerService } from '@/services/getcustomer.service';
import { editCustomerService } from '@/services/editcustomer.service';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';
import { formatPhoneForDisplay } from '@/utils/phoneDisplay';
import { UniformPageHeader } from '../../../../components/layout/UniformPageHeader';

interface UserDetails {
  name: string;
  email: string;
  phone: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  // User details state
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    email: '',
    phone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const customers = await customerService.getAllCustomers();
        if (customers.length > 0) {
          const customer = customers[0];
          setUserDetails({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.emailAddress || '',
            phone: formatPhoneForDisplay(customer.phoneNumber.toString())
          });
        }
      } catch (error) {
        console.error('Failed to fetch customer:', error);
      }
    };
    fetchCustomer();
  }, []);

  // Add a handler for Save Changes
  const handleSaveChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prepare data for API (split name if needed)
      const [firstName, ...rest] = userDetails.name.split(' ');
      const lastName = rest.join(' ');
      await editCustomerService.editCustomer({
        firstName: firstName || '',
        lastName: lastName || '',
        emailAddress: userDetails.email,
        phoneNumber: Number(userDetails.phone),
      });
      // Optionally show a success message or navigate
      navigate(`${basePath}/account`);
    } catch (err: any) {
      setError('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const local = formatPhoneForDisplay(phone);
    if (!local || local.length < 10) return phone || local;
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  };

  return (
    <div className="bg-[#f8f6f1] min-h-screen">
      <div className="max-w-[800px] mx-auto">
        <UniformPageHeader
          title="Edit Profile"
          onBack={() => navigate(`${basePath}/account`)}
          padYClassName="pt-4 pb-4"
        />

        {/* Profile Image */}
        <div className="flex justify-center mt-6">
          <div className="relative">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <img
                src={theme.assets.profileBackground}
                alt="Profile background"
                className="absolute inset-0 w-full h-full object-contain"
              />
              <img
                src={theme.assets.profileLogo}
                alt="Account"
                className="relative z-10 w-12 h-12 object-contain"
              />
            </div>
            <button 
              className="absolute -bottom-1 -right-1 bg-white text-gray-700 p-2 rounded-full shadow-md z-20"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCamera className="text-sm" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
            />
          </div>
        </div>

        {/* Profile Information Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6 mx-4">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={userDetails.name}
                onChange={(e) => setUserDetails(prev => ({...prev, name: e.target.value}))}
                placeholder="Maya Sharma"
                className="w-full p-3 bg-gray-100 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={userDetails.email}
                onChange={(e) => setUserDetails(prev => ({...prev, email: e.target.value}))}
                placeholder="maya@example.com"
                className="w-full p-3 bg-gray-100 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={userDetails.phone}
                disabled
                autoComplete="tel"
                title="Phone number cannot be changed"
                placeholder="+91 00000 00000"
                className="w-full p-3 rounded-lg text-base cursor-not-allowed bg-gray-200/90 text-gray-600 border border-gray-200/80 focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="px-4 mt-6 pb-layout-pb">
          {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
          <button 
            onClick={handleSaveChanges}
            className="w-full text-white py-3.5 rounded-xl font-semibold text-base transition-colors"
            style={{ backgroundColor: theme.colors.primary }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
