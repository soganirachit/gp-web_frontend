import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { getFeatureFromPath, FEATURE_FLAGS } from '../../../../config/features';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';

const Startup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const { theme } = useFeatureTheme();
  const from = (location.state as { from?: Location })?.from;

  useEffect(() => {
    // Detect feature from referrer or default to gp-daily
    const referrer = document.referrer;
    const currentPath = location.pathname;
    
    // Try to detect feature from referrer URL or current path
    let feature = getFeatureFromPath(currentPath);
    if (referrer) {
      try {
        const referrerPath = new URL(referrer).pathname;
        const referrerFeature = getFeatureFromPath(referrerPath);
        if (referrerFeature) {
          feature = referrerFeature;
        }
      } catch (e) {
        // If referrer parsing fails, use current path feature
      }
    }
    
    // If gp-daily is disabled, force gp-store
    let finalFeature = feature;
    if (feature === 'gpDaily' && !FEATURE_FLAGS.gpDailyEnabled) {
      finalFeature = 'gpStore';
    }
    const basePath = finalFeature === 'gpStore' ? '/gp-store' : '/gp-daily';

    // Always show startup splash for ~3s before navigating.
    // After startup, always take the user to the homepage.
    const timer = setTimeout(() => {
      navigate('/home', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, from, isLoggedIn, location.pathname]);

  return (
    <div className="min-h-screen w-screen bg-white fixed inset-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative w-full max-w-[280px] sm:max-w-xs h-48 sm:h-56 md:h-64 flex items-center justify-center"
        >
          {/* Theme-based Startup Banner Background */}
          <img
            src={theme.assets.startupBanner}
            alt="Startup Background"
            className="absolute inset-0 w-full h-full object-contain"
          />
          {/* Logo on top - use startupLogo with conditional sizing */}
          <div className={`relative z-10 flex items-center justify-center p-4 sm:p-6 md:p-8 ${
            theme.feature === 'gpStore' 
              ? 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40' 
              : 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64'
          }`}>
            <img
              src={theme.assets.startupLogo}
              alt="Genda Phool Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Startup;

