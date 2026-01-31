import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../../../services/auth.service';
import { addressService } from '../../../../services/address.service';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';

interface LocationState {
  phoneNumber: string;
}

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const phoneNumber = (location.state as LocationState)?.phoneNumber;
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [countdown, setCountdown] = useState<number>(29);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phoneNumber) {
      navigate(`${basePath}/login`);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneNumber, navigate]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isSubmitting) return;

    const value = element.value;
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      const otpArray = value.slice(0, 6).split('').map(char => char.toString());
      const newOtp = [...otpArray, ...new Array(6 - otpArray.length).fill("")];
      setOtp(newOtp);

      if (otpArray.length === 6) {
        setTimeout(() => handleVerify(), 100);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index === 5) {
      handleVerify();
      return;
    }

    if (value && element.nextSibling) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d*$/.test(pastedData)) return;

    const otpArray = pastedData.slice(0, 6).split('').map(char => char.toString());
    const newOtp = [...otpArray, ...new Array(6 - otpArray.length).fill("")];
    setOtp(newOtp);

    if (otpArray.length === 6) {
      setTimeout(() => handleVerify(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      handleVerify();
      return;
    }

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = e.currentTarget.previousSibling;
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6 || !phoneNumber) return;

    try {
      setIsSubmitting(true);
      setError('');
      const response = await authService.verifyOTP(phoneNumber, otpString);

      if (response.message === "Number verified successfully") {
        toast.success('OTP verified successfully!');

        if (response.token) {
          login(response.token, phoneNumber);
        }

        if (response.userExists) {
          if (response.userName) {
            localStorage.setItem('userName', response.userName);
          }

          // Check if user already has addresses
          try {
            const addresses = await addressService.getAllAddresses();
            if (addresses && addresses.length > 0) {
              // User has addresses, go directly to home
              navigate(basePath, {
                state: {
                  returnUrl: basePath
                }
              });
            } else {
              // User has no addresses, go to location page
              navigate(`${basePath}/location`, {
                state: {
                  returnUrl: basePath
                }
              });
            }
          } catch (error) {
            // If there's an error checking addresses, assume user needs to set location
            console.error('Error checking addresses:', error);
            navigate(`${basePath}/location`, {
              state: {
                returnUrl: basePath
              }
            });
          }
        } else {
          navigate(`${basePath}/name-input`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(new Array(6).fill(""));
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || !phoneNumber) return;

    try {
      await authService.sendOTP(phoneNumber);
      setCountdown(29);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return `+91 ${phone.slice(0, -4)}XXXX`;
  };

  const handleEditNumber = () => {
    navigate(`${basePath}/login`);
  };

  return (
    <div className={`min-h-screen w-screen fixed inset-0 flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 md:py-8 overflow-y-auto ${theme.classes.authPageBackground}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10 flex flex-col"
      >
        {/* Top Section - Orange Graphic */}
        <div className="relative mb-4 sm:mb-6 md:mb-8 flex flex-col items-center">
          {/* OTP Graphic */}
          <div className="relative w-full max-w-[280px] sm:max-w-xs h-48 sm:h-56 md:h-64 flex items-center justify-center mb-4 sm:mb-6">
            <img
              src={theme.assets.otpHero}
              alt="OTP Graphic"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Carousel Indicators */}
          <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${theme.classes.authIndicatorActive}`}></div>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${theme.classes.authIndicatorInactive}`}></div>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${theme.classes.authIndicatorInactive}`}></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
              Verify your code
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-normal px-2 mb-1 sm:mb-1.5">
              Enter 6-digit code sent to {formatPhoneNumber(phoneNumber || '')}
            </p>

            {/* WhatsApp Notification */}
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-2.5">
              <FaWhatsapp className="text-green-500 text-sm sm:text-base" />
              <p className="text-xs sm:text-sm text-gray-500">Code sent to WhatsApp</p>
            </div>

            {/* Edit Number Link */}
            <button
              onClick={handleEditNumber}
              className="flex items-center justify-center gap-1 text-xs sm:text-sm text-gray-500 underline hover:text-gray-700 transition-colors mx-auto"
            >
              <MdEdit className="text-xs sm:text-sm" />
              <span>Edit number</span>
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs sm:text-sm mb-4 sm:mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="flex gap-2 sm:gap-3 justify-center">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="tel"
                  maxLength={index === 0 ? 6 : 1}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e)}
                  className={`w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 border-2 rounded-lg sm:rounded-xl text-center text-lg sm:text-xl md:text-2xl font-semibold focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${theme.classes.otpInputBorder}`}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting || otp.join('').length !== 6}
              className={`w-full py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl font-semibold transition-colors duration-200 text-base sm:text-lg ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Continue'
              )}
            </motion.button>
          </form>

          <div className="text-center mt-4 sm:mt-6">
            <button
              onClick={handleResendOTP}
              disabled={countdown > 0}
              className={`text-xs sm:text-sm ${countdown > 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 transition-colors'
                }`}
              style={countdown === 0 ? { '--hover-color': theme.colors.primary } as React.CSSProperties & { '--hover-color': string } : {}}
              onMouseEnter={(e) => {
                if (countdown === 0) {
                  e.currentTarget.style.color = theme.colors.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (countdown === 0) {
                  e.currentTarget.style.color = '#4b5563';
                }
              }}
            >
              {countdown > 0 ? (
                `Didn't get it? Resend code (${countdown}s)`
              ) : (
                "Didn't get it? Resend code"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;