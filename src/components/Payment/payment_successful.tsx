import React from 'react';
import { motion } from 'framer-motion';
import allsetLogo from '../../assets/All/allset_logo.png';

const PaymentSuccessful = () => {
    return (
        <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-sm"
            >
                {/* Container */}
                <div className="bg-[#f8f6f1] p-8 sm:p-12 flex flex-col items-center justify-center relative">

                    {/* Success Icon */}
                    <motion.img
                        src={allsetLogo}
                        alt="Payment Successful"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 10, -10, 0] }} // Subtle wiggle on enter
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2
                        }}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-6"
                    />

                    {/* Text */}
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 text-center tracking-wide">
                        Payment Successful
                    </h2>

                </div>
            </motion.div>
        </div>
    );
};

export default PaymentSuccessful;
