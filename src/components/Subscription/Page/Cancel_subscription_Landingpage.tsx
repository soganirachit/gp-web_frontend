import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import { motion } from 'framer-motion';

const CancelSubscriptionLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col">
      <div className="max-w-[800px] w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Heart Icon Circle with Animation */}
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
              <FaHeart className="text-[#FF5722] text-2xl" />
            </motion.div>
          </motion.div>

          {/* Main Content with Animation */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              We're Sad to See You Go
            </h1>
            <p className="text-gray-600">
              Your subscription has been cancelled. We hope to serve you again soon.
            </p>
          </motion.div>

          {/* Before You Go Section with Animation */}
          <motion.div 
            className="bg-white rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Before You Go...
            </h2>
            <p className="text-gray-500 mb-4">
              Would you consider pausing your subscription instead? You can resume whenever you're ready.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/pause-subscription')}
              className="w-full bg-[#FF5722] text-white py-3.5 rounded-full font-medium hover:bg-[#F4511E] transition-colors"
            >
              Pause Instead of Cancelling
            </motion.button>
          </motion.div>

          {/* Change Pack Section with Animation */}
          <motion.div 
            className="bg-white rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Wish to change your Pack instead?
            </h2>
            <p className="text-gray-600 mb-4">
              Get upto 30% off on Combo Subscription and much more!
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/Products')}
              className="w-full border border-[#006D3B] text-[#006D3B] py-3.5 rounded-full font-medium hover:bg-[#E8F5E9] transition-colors mb-3"
            >
              Explore Subscription Packs
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

export default CancelSubscriptionLanding;
