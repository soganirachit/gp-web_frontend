import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../../../assets/All/logo.png';

const Startup: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home', { replace: true });
    }, 4200);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex min-h-screen w-screen items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 110 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          opacity: { duration: 1.15, ease: [0.25, 0.1, 0.25, 1] },
          // Use `bounce` + `duration` only — stiffness/damping override bounce in Framer Motion
          y: {
            type: 'spring',
            bounce: 0.58,
            duration: 2.45,
          },
        }}
        className="flex w-full max-w-[min(220px,68vw)] items-center justify-center px-6"
      >
        <img
          src={logo}
          alt="गेंदा फूल"
          className="h-auto w-full object-contain"
        />
      </motion.div>
    </div>
  );
};

export default Startup;
