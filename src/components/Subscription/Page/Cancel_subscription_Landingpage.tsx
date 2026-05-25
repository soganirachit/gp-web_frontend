import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import sadSvg from '../../../assets/svg/cancelpage/sad.svg';
import modifySvg from '../../../assets/svg/cancelpage/modify.svg';
import vectorBadge from '../../../assets/All/Vector (1).png';
import { IoChevronForward } from 'react-icons/io5';

const CancelSubscriptionLanding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const subscription = location.state?.subscription;

  // If no subscription provided, go back (safety check)
  React.useEffect(() => {
    if (!subscription) {
      navigate('/gp-daily/manage-my-subscription');
    }
  }, [subscription, navigate]);

  const handleProceedToReason = () => {
    if (!subscription) return;
    // Navigate to Reason page to capture reason and confirm cancellation there
    navigate('/gp-daily/cancel-subscription-reason', { state: { subscription } });
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col pb-nav-bottom">
      <div className="max-w-[500px] w-full mx-auto flex-1 flex flex-col px-4 pt-8">
        {/* Badge with Sad Face Icon */}
        <motion.div
          className="relative w-20 h-20 mx-auto mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        >
          {/* Orange badge background */}
          <img
            src={vectorBadge}
            alt="Badge"
            className="w-full h-full object-contain"
          />
          {/* Sad face icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={sadSvg} alt="Sad" className="w-11 h-11" />
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            We're Sad to See You Go
          </h1>
          <p className="text-gray-500 text-sm px-4">
            Are you sure you want to cancel? Consider pausing instead.
          </p>
        </motion.div>

        {/* Before you go... Section */}
        <motion.div
          className="bg-white rounded-2xl p-5 mb-4 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Before you go...
          </h2>

          <ul className="space-y-2 mb-5">
            <li className="text-gray-500 text-sm flex items-start">
              <span className="mr-2">•</span>
              <span>Consider pausing instead of cancelling - you can resume anytime</span>
            </li>
            <li className="text-gray-500 text-sm flex items-start">
              <span className="mr-2">•</span>
              <span>Try our weekend-only delivery option</span>
            </li>
            <li className="text-gray-500 text-sm flex items-start">
              <span className="mr-2">•</span>
              <span>Contact support for a custom solution</span>
            </li>
          </ul>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/gp-daily/pause-subscription', { state: { subscription } })}
            className="w-full bg-[rgb(250,162,34)] text-gray-900 py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity text-sm"
          >
            Pause Instead of Canceling
          </motion.button>
        </motion.div>

        {/* Modify your Pack Section */}
        <motion.div
          className="rounded-2xl p-4 mb-4 shadow-sm"
          style={{ background: 'linear-gradient(to bottom,rgb(251, 232, 207) 0%, #FFFFFF 100%)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/gp-daily/modify-subscription', { state: { subscription } })}
          >
            <span className="mr-3 flex-shrink-0">
              <img src={modifySvg} alt="Modify" className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Modify your Pack
              </h3>
              <p className="text-gray-400 text-xs">
                Find a plan that suits you better
              </p>
            </div>
            <IoChevronForward className="text-gray-400 text-lg" />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={handleProceedToReason}
            className="flex-1 bg-transparent border-2 border-gray-200 text-gray-500 py-3 rounded-[20px] font-medium text-m hover:bg-gray-100 transition-colors"
          >
            Cancel Subscription
          </button>
          <button
            onClick={() => navigate('/gp-daily/Products')}
            className="flex-1 border-2 py-3 rounded-[20px] font-semibold text-m bg-[rgb(250,162,34)] border-[rgb(250,162,34)] active:bg-[rgb(250,162,34)] text-gray-900 active:border-[rgb(250,162,34)] transition-colors"
          >
            Explore Packs
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CancelSubscriptionLanding;
