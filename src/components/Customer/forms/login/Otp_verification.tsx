import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  authService,
  checkNotOnWhatsappBeforeOtpRoute,
  OTP_NOT_ON_WHATSAPP_MESSAGE,
  shouldBlockOtpEntryAfterSendOtp,
  whatsappOtpLikelyDelivered,
} from '../../../../services/auth.service';
import { addressService } from '../../../../services/address.service';
import { useAuth } from '../../../../context/AuthContext';
import { useCart } from '../../../../context/CartContext';
import { toast } from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';
import Spinner from '../../../common/Spinner';
import { errorMessageFromCatch } from '../../../../utils/apiErrorMessage';

interface LocationState {
  phoneNumber: string;
  returnUrl?: string;
  fromCart?: boolean;
  /** From Login after send-otp; when false, WhatsApp delivery failed or unconfigured. */
  whatsappOtpLikelyDelivered?: boolean;
  /** Same phone key as send-otp / status API (often E.164 from backend). */
  deliveryPollPhone?: string;
}

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { syncCartToAPI, items } = useCart();
  const locState = (location.state as LocationState) || ({} as LocationState);
  const phoneNumber = locState.phoneNumber;
  const returnUrl = locState.returnUrl;
  const fromCart = locState.fromCart;
  const { theme } = useFeatureTheme();
  const basePath = location.pathname.startsWith("/gp-store") ? "/gp-store" : "/gp-daily";

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [countdown, setCountdown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [whatsappDeliveryOk, setWhatsappDeliveryOk] = useState(
    locState.whatsappOtpLikelyDelivered !== false
  );

  const deliveryPollPhone = locState.deliveryPollPhone ?? phoneNumber;

  // Array of images to cycle through
  const images = [theme.assets.otpHero, theme.assets.loginHero];

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(imageInterval);
  }, [images.length]);

  useEffect(() => {
    if (!phoneNumber) {
      navigate(`${basePath}/login`);
      return;
    }
  }, [phoneNumber, navigate, basePath]);

  // Countdown timer — only runs when countdown > 0 (after resend is clicked)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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
      const response = await authService.verifyOTP(phoneNumber, otpString);

      // Handle new Django API response structure
      if (response.success && response.message) {
        toast.success(response.message || 'OTP verified successfully!');

        // Login — tokens are in HttpOnly cookies set by server
        login(phoneNumber);

        // Store user info if available
        if (response.user) {
          if (response.user.full_name) {
            localStorage.setItem('userName', response.user.full_name);
          } else if (response.userName) {
            localStorage.setItem('userName', response.userName);
          }
        }

        // Note: Cart sync is now handled automatically by CartContext when login is detected
        // No need to manually sync here to avoid conflicts
        // The CartContext will detect the login and sync the temp cart automatically

        // If coming from cart checkout, redirect back to cart
        if (fromCart && returnUrl) {
          navigate(returnUrl);
          return;
        }

        // Check if user is new or existing
        const isNewUser = response.is_new_user || !response.userExists;

        if (!isNewUser) {
          // Existing user - check if they have addresses
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
          // New user - go to name input page
          navigate(`${basePath}/name-input`);
        }
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (err: unknown) {
      const errorMessage = errorMessageFromCatch(err, 'Invalid OTP');
      setOtp(new Array(6).fill(""));
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || !phoneNumber) return;

    try {
      const result = await authService.sendOTP(phoneNumber);
      if (!result.success) {
        toast.error(result.message || 'Failed to resend OTP');
        return;
      }
      const pollPhone = result.phone ?? phoneNumber;
      let shouldBlockEntry = shouldBlockOtpEntryAfterSendOtp(result);
      let blockMessage =
        result.message && result.message.toLowerCase() !== "success"
          ? result.message
          : OTP_NOT_ON_WHATSAPP_MESSAGE;
      if (!shouldBlockEntry) {
        const guard = await checkNotOnWhatsappBeforeOtpRoute(pollPhone);
        if (guard.notOnWhatsapp) {
          shouldBlockEntry = true;
          blockMessage = guard.message || OTP_NOT_ON_WHATSAPP_MESSAGE;
        }
      }
      if (shouldBlockEntry) {
        toast.error(
          blockMessage
        );
        navigate(`${basePath}/login`, { state: { returnUrl, fromCart } });
        return;
      }

      const warnStyle = { background: '#fffbeb', color: '#92400e' } as const;
      if (result.whatsapp_status === 'failed') {
        toast(result.message || 'OTP delivery failed. Please try again in a moment.', {
          icon: '⚠️',
          duration: 5000,
          style: warnStyle,
        });
      } else if (result.whatsapp_status === 'not_configured') {
        toast(
          result.message ||
            'WhatsApp is not configured. If you still do not receive a code, edit your number and try again.',
          { icon: '⚠️', duration: 5000, style: warnStyle }
        );
      } else {
        toast.success(result.message || 'OTP sent to your WhatsApp');
      }

      setWhatsappDeliveryOk(whatsappOtpLikelyDelivered(result));
      setCountdown(30);
    } catch (err: any) {
      let errorMessage = err?.response?.data?.message || err?.message || 'Failed to resend OTP';
      
      // Handle throttling error with user-friendly message
      if (errorMessage.includes("throttled") || errorMessage.includes("Expected available")) {
        const match = errorMessage.match(/(\d+)\s*seconds?/i);
        if (match) {
          const seconds = parseInt(match[1]);
          const minutes = Math.ceil(seconds / 60);
          errorMessage = `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before requesting another OTP.`;
        } else {
          errorMessage = "Too many OTP requests. Please wait a few minutes before trying again.";
        }
      }

      toast.error(errorMessage);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return `+91 ${phone.slice(0, -4)}XXXX`;
  };

  const handleEditNumber = () => {
    navigate(`${basePath}/login`, { state: { returnUrl, fromCart } });
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
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt="OTP Graphic"
                className="w-full h-full object-contain"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
              />
            </AnimatePresence>
          </div>

          {/* Carousel Indicators - 2 dots */}
          <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-300 ${currentImageIndex === 0 ? theme.classes.authIndicatorActive : theme.classes.authIndicatorInactive}`}></div>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-300 ${currentImageIndex === 1 ? theme.classes.authIndicatorActive : theme.classes.authIndicatorInactive}`}></div>
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

            {/* WhatsApp delivery note */}
            <div className="flex flex-col items-center gap-1 mb-2 sm:mb-2.5 px-1">
              <div className="flex items-center justify-center gap-2">
                <FaWhatsapp className="text-green-500 text-sm sm:text-base flex-shrink-0" />
                {whatsappDeliveryOk ? (
                  <p className="text-xs sm:text-sm text-gray-500">Code sent to WhatsApp</p>
                ) : (
                  <p className="text-xs sm:text-sm text-amber-800 text-center max-w-[280px]">
                    We could not confirm WhatsApp delivery. If you do not see the code, use{" "}
                    <span className="font-medium">Resend</span> below or edit your number.
                  </p>
                )}
              </div>
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

          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="flex gap-2 sm:gap-3 justify-center" data-testid="gp-otp-fields">
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
                  data-testid={index === 0 ? "gp-otp-input-first" : undefined}
                />
              ))}
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting || otp.join('').length !== 6}
              className={`w-full py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl font-semibold transition-colors duration-200 text-base sm:text-lg flex items-center justify-center ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
            >
              {isSubmitting ? (
                <Spinner size={24} variant="light" className="flex-shrink-0" />
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