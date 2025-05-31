import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import walletImage from '../../../assets/icon/Wallet.png';
import profileImage from '../../../assets/icon/Profile.png';

const ModifySubscription: React.FC = () => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<'daily' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

  const days = [
    { key: 'Mon', label: 'Mon' },
    { key: 'Tue', label: 'Tue' },
    { key: 'Wed', label: 'Wed' },
    { key: 'Thu', label: 'Thu' },
    { key: 'Fri', label: 'Fri' },
    { key: 'Sat', label: 'Sat' },
    { key: 'Sun', label: 'Sun' },
  ];

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="bg-[#FFFBEB] shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="text-gray-700">
              <FaArrowLeft className="text-xl md:text-2xl" />
            </button>
            <span className="ml-4 text-lg md:text-xl font-medium">Manage Subscription</span>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src={walletImage} 
              alt="Wallet" 
              className="w-8 h-8 md:w-8 md:h-8 cursor-pointer" 
              onClick={() => navigate('/wallet')}
            />
            <img 
              src={profileImage} 
              alt="Profile" 
              className="w-6 h-6 md:w-8 md:h-8 cursor-pointer" 
              onClick={() => navigate('/More')}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Modify Subscription</h2>

            {/* Quantity Selector */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">Quantity</p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl font-medium"
                >
                  -
                </button>
                <span className="text-lg">{quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(1)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl font-medium"
                >
                  +
                </button>
              </div>
            </div>

            {/* Delivery Type */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3">Select Delivery Type</p>
              <div className="space-y-3">
                <div 
                  className={`p-4 rounded-xl flex justify-between items-center cursor-pointer ${
                    deliveryType === 'daily' ? 'bg-gray-50' : 'bg-white'
                  }`}
                  onClick={() => setDeliveryType('daily')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      deliveryType === 'daily' ? 'border-green-600' : 'border-gray-300'
                    }`}>
                      {deliveryType === 'daily' && (
                        <div className="w-3 h-3 rounded-full bg-green-600" />
                      )}
                    </div>
                    <span>Daily Delivery</span>
                  </div>
                  <span className="text-green-600 font-medium">₹50/Pack</span>
                </div>

                <div 
                  className={`p-4 rounded-xl flex justify-between items-center cursor-pointer ${
                    deliveryType === 'custom' ? 'bg-[#E8F5E9]' : 'bg-white'
                  }`}
                  onClick={() => setDeliveryType('custom')}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      deliveryType === 'custom' ? 'border-green-600' : 'border-gray-300'
                    }`}>
                      {deliveryType === 'custom' && (
                        <div className="w-3 h-3 rounded-full bg-green-600" />
                      )}
                    </div>
                    <span>Custom Days</span>
                  </div>
                  <span className="text-green-600 font-medium">₹70/Pack</span>
                </div>
              </div>
            </div>

            {/* Day Selector */}
            {deliveryType === 'custom' && (
              <div className="flex flex-wrap gap-2 mb-6">
                {days.map(day => (
                  <button
                    key={day.key}
                    onClick={() => handleDayToggle(day.key)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      selectedDays.includes(day.key)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                className="flex-1 bg-[#FF5722] text-white py-3 rounded-full font-medium hover:bg-[#F4511E] transition-colors"
              >
                Save Changes
              </button>
              <button 
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModifySubscription;
