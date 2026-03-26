import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaGift, FaWhatsapp, FaTelegramPlane, FaCopy } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';

const Refer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const referralCode = "GP2023REF";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      icon: <FaWhatsapp className="text-green-500" />,
      label: 'WhatsApp',
      bgColor: 'bg-green-50'
    },
    {
      icon: <MdEmail className="text-red-500" />,
      label: 'Email',
      bgColor: 'bg-red-50'
    },
    {
      icon: <FaTelegramPlane className="text-blue-500" />,
      label: 'Telegram',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-nav-bottom">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-400 to-green-600 p-6 text-white rounded-b-3xl"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-24 h-24 mx-auto mb-6"
        >
          <FaGift className="w-full h-full" />
        </motion.div>
        {/* <h1 className="text-2xl font-bold text-center mb-2">Invite Friends & Earn</h1> */}
        <h1 className="text-2xl font-bold text-center mb-2">Invite Friends</h1>
        {/* <p className="text-center text-green-100">Get ₹100 for every friend who joins</p> */}
      </motion.div>

      {/* Referral Code Section */}
      <div className="p-6">
        {/* <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <p className="text-gray-600 text-sm mb-3">Your Referral Code</p>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <span className="font-mono text-xl font-semibold">{referralCode}</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className="flex items-center text-green-600"
            >
              <FaCopy className="mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>
        </div> */}

        {/* Share Options */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Share via</h2>
          <div className="grid grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
            {shareOptions.map((option, index) => (
              <motion.button
                key={index}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${option.bgColor} flex min-w-0 flex-col items-center rounded-xl p-2 xs:p-4`}
              >
                <span className="mb-1 text-xl xs:mb-2 xs:text-2xl">{option.icon}</span>
                <span className="text-center text-[10px] font-medium leading-tight xs:text-sm">{option.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* How it Works */}
        {/* <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">How it Works</h2>
          <div className="space-y-4">
            {[
              { step: 1, text: "Share your referral code with friends" },
              { step: 2, text: "They sign up using your code" },
              { step: 3, text: "Both get ₹100 when they make first purchase" }
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: item.step * 0.2 }}
                className="flex items-center bg-white p-4 rounded-lg shadow-sm"
              >
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-green-600 font-semibold">{item.step}</span>
                </div>
                <p className="text-gray-700">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Refer;
