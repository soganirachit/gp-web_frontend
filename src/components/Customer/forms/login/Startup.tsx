import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import logo from '../../../../assets/All/logo.png';
import vectorBg from '../../../../assets/All/Vector (1).png';

const Startup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const from = (location.state as { from?: Location })?.from;

  useEffect(() => {
    // If user is already logged in, redirect immediately without showing splash
    if (isLoggedIn) {
      navigate('/home', { replace: true });
      return;
    }

    // Auto-navigate to login after 2.5 seconds for non-logged-in users
    const timer = setTimeout(() => {
      navigate('/login', { state: from ? { from } : undefined });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, from, isLoggedIn]);

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
          {/* Orange Vector Background */}
          <img
            src={vectorBg}
            alt="Background"
            className="absolute inset-0 w-full h-full object-contain"
          />
          {/* Logo on top */}
          <div className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <img
              src={logo}
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

