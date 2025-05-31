import React, { useState } from 'react';
import {  FaPhoneAlt, FaRegCommentDots, FaPaperPlane } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import walletImage from '../../assets/icon/Wallet.png';
import profileImage from '../../assets/icon/Profile.png';
import BottomNav from '../../components/layout/BottomNav';
import { IoArrowBack } from 'react-icons/io5';

const CustomerSupport: React.FC = () => {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState('Delivery Issue');
  const [message, setMessage] = useState('');

  const handleChatSupport = () => {
    // Implement chat support functionality
  };

  const handleCallSupport = () => {
    // Implement call support functionality
  };

  const handleSubmitRequest = () => {
    // Implement request submission functionality
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
            <h1 className="text-xl md:text-2xl font-medium">Request & Support</h1>
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

        {/* Support Options */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">How can we help you?</h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleChatSupport}
              className="flex-1 bg-orange-500 text-white py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md hover:bg-orange-600 transition-colors"
            >
              <FaRegCommentDots className="text-lg md:text-xl" />
              Chat with Support
            </button>
            <button
              onClick={handleCallSupport}
              className="flex-1 border border-gray-300 text-gray-700 py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md hover:bg-gray-50 transition-colors"
            >
              <FaPhoneAlt className="text-lg md:text-xl" />
              Call Support
            </button>
          </div>
        </div>

        {/* Raise a New Request */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">Raise a New Request</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm md:text-base text-gray-600">Request Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full p-2 md:p-3 border-b-2 border-gray-200 focus:outline-none focus:border-orange-500 mt-1 text-base md:text-lg"
              >
                <option>Delivery Issue</option>
                <option>Product Issue</option>
                <option>Account Issue</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 md:p-3 border-b-2 border-gray-200 focus:outline-none focus:border-orange-500 mt-1 text-base md:text-lg"
                placeholder="Please describe your issue or request..."
                rows={4}
              />
            </div>
            <button
              onClick={handleSubmitRequest}
              className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md hover:bg-orange-600 transition-colors"
            >
              <FaPaperPlane className="text-lg md:text-xl" />
              Submit Callback Request
            </button>
          </div>
        </div>

        {/* Your Requests */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6 mb-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">Your Requests</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-800 text-base md:text-lg">Missing items in delivery</h3>
                <span className="text-sm md:text-base bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">In Progress</span>
              </div>
              <p className="text-sm md:text-base text-gray-600 mt-2">My delivery was missing 2 lotus flowers today.</p>
              <button className="text-sm md:text-base text-green-600 mt-2 hover:text-green-700">View Details</button>
            </div>
            <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-800 text-base md:text-lg">Special request for festival</h3>
                <span className="text-sm md:text-base bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Resolved</span>
              </div>
              <p className="text-sm md:text-base text-gray-600 mt-2">Need extra marigold garlands for Diwali.</p>
              <button className="text-sm md:text-base text-green-600 mt-2 hover:text-green-700">View Details</button>
            </div>
          </div>
        </div>
          {/* Navigation */}
            <div>
              <BottomNav />
            </div>
      </div>
    </div>
  );
};

export default CustomerSupport;