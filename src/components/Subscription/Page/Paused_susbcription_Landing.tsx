import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNavigation from '../../layout/BottomNav';
import pauseSvg from '../../../assets/svg/cancelpage/pause.svg';
import vectorBadge from '../../../assets/All/Vector (1).png';
import { format } from 'date-fns';

const PausedSubscriptionLanding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get resume date from navigation state
  const resumeDateFromState = location.state?.resumeDate;

  // Format the date
  let formattedDate = '{Date}';
  if (resumeDateFromState) {
    formattedDate = format(new Date(resumeDateFromState), 'dd MMM, yyyy');
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col pb-20 font-sans">
      <div className="max-w-[500px] w-full mx-auto flex-1 flex flex-col items-center justify-center px-4">

        {/* Toggle Icon */}
        <motion.div
          className="relative w-24 h-24 mx-auto mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <img
            src={vectorBadge}
            alt="Badge"
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Verify if pauseSvg is black bars. If not, we might need to style it or filter it. 
                Assuming it is correct for now based on user context. */}
            <img src={pauseSvg} alt="Pause" className="w-8 h-8" />
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-3 font-serif">
            Subscription Paused
          </h1>
          <p className="text-[#666666] text-sm leading-relaxed px-6">
            Your deliveries will resume from <span className="font-medium">{formattedDate}</span>.
            <br />
            You can resume it anytime!
          </p>
        </motion.div>

        {/* View Subscription Button */}
        <motion.div
          className="w-full max-w-xs mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => navigate('/gp-daily/manage-my-subscription')}
            className="w-full bg-[#FAA222] text-gray-900 py-4 rounded-[20px] font-semibold text-sm hover:bg-[#E8911F] transition-colors shadow-sm"
          >
            View Subscription
          </button>
        </motion.div>

        {/* Explore Other Packs Link */}
        <motion.div
          className="w-full text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => navigate('/gp-daily/Products')}
            className="text-gray-800 text-sm font-medium hover:text-gray-600 transition-colors"
          >
            Explore Other Packs
          </button>
        </motion.div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PausedSubscriptionLanding;
