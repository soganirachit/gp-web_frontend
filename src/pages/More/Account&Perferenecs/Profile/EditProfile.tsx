import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCamera,
  FaUser
} from 'react-icons/fa';

import walletImage from '../../../../assets/icon/Wallet.png'; 
import profileImage from '../../../../assets/icon/Profile.png';
import { IoArrowBack } from 'react-icons/io5';
import { customerService } from '@/services/getcustomer.service';
import { editCustomerService } from '@/services/editcustomer.service';

interface UserDetails {
  name: string;
  email: string;
  phone: string;
  dob: string;
  language: string;
  profileImage: string | null;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User details state
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    language: 'English',
    profileImage: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const customers = await customerService.getAllCustomers();
        if (customers.length > 0) {
          const customer = customers[0];
          setUserDetails(prev => ({
            ...prev,
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.emailAddress,
            phone: customer.phoneNumber.toString(),
            // dob, language, profileImage can be set if available in API
          }));
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
        // Add other fields if needed
      });
      // Optionally show a success message or navigate
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFBEB] min-h-screen">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors">
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">Edit Profile</h1>
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

        {/* Profile Image */}
        <div className="flex justify-center mt-6 md:mt-8">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-pink-100 rounded-full flex items-center justify-center overflow-hidden">
              {userDetails.profileImage ? (
                <img 
                  src={userDetails.profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                  <FaUser className=" w-16 h-16 md:w-20 md:h-20 text-pink-500" />
                </button>
              )}
            </div>
            <button 
              className="absolute bottom-0 right-0 bg-white text-gray-700  p-1.5 md:p-2 rounded-full shadow-md"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCamera className="text-sm md:text-base" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
         
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mt-6 mx-4 md:mx-8">
          <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6">Personal Information</h2>
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="text-sm md:text-base text-gray-600">Full Name</label>
              <input
                type="text"
                value={userDetails.name}
                onChange={(e) => setUserDetails(prev => ({...prev, name: e.target.value}))}
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Email Address</label>
              <input
                type="email"
                value={userDetails.email}
                onChange={(e) => setUserDetails(prev => ({...prev, email: e.target.value}))}
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Phone Number</label>
              <input
                type="tel"
                value={userDetails.phone}
                onChange={(e) => setUserDetails(prev => ({...prev, phone: e.target.value}))}
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Date of Birth</label>
              <input
                type="date"
                value={userDetails.dob}
                onChange={(e) => setUserDetails(prev => ({...prev, dob: e.target.value}))}
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Language Preference</label>
              <select
                value={userDetails.language}
                onChange={(e) => setUserDetails(prev => ({...prev, language: e.target.value}))}
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              >
                <option>English</option>
                <option>हिंदी</option>
                <option>ગુજરાતી</option>
              </select>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mt-6 mx-4 md:mx-8">
          <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6">Change Password</h2>
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="text-sm md:text-base text-gray-600">Current Password</label>
              <input
                type="password"
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">New Password</label>
              <input
                type="password"
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Confirm New Password</label>
              <input
                type="password"
                className="w-full p-2 md:p-3 border-b-2 border-gray-300 text-base md:text-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="p-4 md:p-8">
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <button 
            onClick={handleSaveChanges}
            className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-3xl font-medium text-base md:text-lg hover:bg-orange-600 transition-colors"
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