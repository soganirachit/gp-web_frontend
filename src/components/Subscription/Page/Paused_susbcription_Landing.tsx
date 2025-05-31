import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPause } from 'react-icons/fa';
import { motion } from 'framer-motion';

const PausedSubscriptionLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col">
      <div className="max-w-[800px] w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Pause Icon Circle with Enhanced Animation */}
          <motion.div 
            className="w-20 h-20 bg-[#FFF3CD] rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [-180, 0],
              boxShadow: [
                "0px 0px 0px rgba(255,87,34,0)",
                "0px 0px 20px rgba(255,87,34,0.3)",
                "0px 0px 0px rgba(255,87,34,0)"
              ]
            }}
            transition={{
              duration: 1,
              times: [0, 0.6, 1],
              ease: "easeOut"
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                delay: 0.3,
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              <FaPause className="text-[#FF5722] text-2xl" />
            </motion.div>
          </motion.div>

          {/* Text Content with Animation */}
          <motion.h1 
            className="text-2xl font-semibold text-gray-900 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Subscription Paused
          </motion.h1>
          <motion.p 
            className="text-gray-600 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Your subscription has been paused. You can resume it anytime.
          </motion.p>

          {/* Buttons with Enhanced Animation */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/manage-my-subscription')}
              className="w-full bg-[#FF5722] text-white py-3.5 rounded-full font-medium hover:bg-[#F4511E] transition-colors"
            >
              View Subscription
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="w-full border border-gray-300 text-gray-700 py-3.5 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PausedSubscriptionLanding;
