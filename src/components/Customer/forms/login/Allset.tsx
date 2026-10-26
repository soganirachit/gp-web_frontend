import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import allsetLogo from '../../../../assets/All/allset_logo.png';
import { resolveAuthReturnUrl } from '../../../../config/routes.config';

function Allset() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/gp-store') ? '/gp-store' : '/gp-daily';

  useEffect(() => {
    const destination = resolveAuthReturnUrl(location.state, basePath);
    const timer = setTimeout(() => {
      navigate(destination, { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, location.state, basePath]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-white px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        <div className="flex justify-center mb-6 sm:mb-8">
          <motion.img
            src={allsetLogo}
            alt="Success"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2 
            }}
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain select-none"
            style={{
              imageRendering: 'auto',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0) scale(1)',
            }}
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
          Profile Created Successfully
        </h1>

        <p className="text-sm sm:text-base text-gray-600 px-4">
          Your account has been created and you&apos;re ready to explore our subscription packs!
        </p>
      </motion.div>
    </div>
  );
}

export default Allset;
