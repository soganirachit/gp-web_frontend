import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authService } from '../../../../services/auth.service';
import logo from "../../../../assets/All/logo.png";

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await authService.sendOTP(phoneNumber);
      navigate('/otp-verification', { state: { phoneNumber } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#FFF1F2] to-[#FFFBEB] fixed inset-0">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[800px] mx-auto flex flex-col items-center"
      >
        <div className="w-full max-w-md px-6">
          <img 
            src={logo}
            alt="Genda Phool"
            className="h-32 mx-auto mb-20"
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-white p-8 rounded-2xl shadow-sm"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-semibold mb-2">Login with WhatsApp</h1>
              <p className="text-gray-600">Enter Phone Number</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm mb-6 text-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                  <span className="pl-4 pr-2 text-gray-500">+91</span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full py-3.5 px-2 text-gray-900 focus:outline-none"
                    placeholder="Enter your WhatsApp number"
                    pattern="[0-9]*"
                    maxLength={10}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 bg-[#FF5722] text-white rounded-full font-medium hover:bg-[#F4511E] transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Send OTP on WhatsApp'
                )}
              </motion.button>
            </form>

            <p className="text-sm text-center text-gray-500 mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;