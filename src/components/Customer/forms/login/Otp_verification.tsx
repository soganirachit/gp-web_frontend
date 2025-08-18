import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../../../services/auth.service';
import { addressService } from '../../../../services/address.service';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import logo from "../../../../assets/All/logo.png";

interface LocationState {
  phoneNumber: string;
}

const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const phoneNumber = (location.state as LocationState)?.phoneNumber;

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [countdown, setCountdown] = useState<number>(29);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
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

  // const handleVerify = async () => {
  //   const otpString = otp.join('');
  //   if (otpString.length !== 6 || !phoneNumber) return;

  //   try {
  //     setIsSubmitting(true);
  //     setError('');
  //     const response = await authService.verifyOTP(phoneNumber, otpString);
      
  //     if (response.message === "Number verified successfully") {
  //       toast.success('OTP verified successfully!');
        
  //       if (response.token) {
  //         login(response.token, phoneNumber);
  //       }
        
  //       if (response.userExists) {
  //         if (response.userName) {
  //           localStorage.setItem('userName', response.userName);
  //         }


  //         navigate('/location', { 
  //           state: { 
  //             returnUrl: '/' 
  //           } 
  //         });
  //       } else {
  //         navigate('/name-input');
  //       }
  //     }
  //   } catch (err: any) {
  //     setError(err.response?.data?.message || 'Invalid OTP');
  //     setOtp(new Array(6).fill(""));
  //     toast.error(err.response?.data?.message || 'Invalid OTP');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

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
              navigate('/', { 
                state: { 
                  returnUrl: '/' 
                } 
              });
            } else {
              // User has no addresses, go to location page
              navigate('/location', { 
                state: { 
                  returnUrl: '/' 
                } 
              });
            }
          } catch (error) {
            // If there's an error checking addresses, assume user needs to set location
            console.error('Error checking addresses:', error);
            navigate('/location', { 
              state: { 
                returnUrl: '/' 
              } 
            });
          }
        } else {
          navigate('/name-input');
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#FFF1F2] to-[#FFFBEB] px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center">
          <img 
            src={logo}
            alt="Genda Phool"
            className="h-20 sm:h-24 md:h-28 lg:h-32 mb-8 sm:mb-12 md:mb-16 lg:mb-20"
          />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm"
          >
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold mb-2">Verify WhatsApp OTP</h1>
              <p className="text-sm sm:text-base text-gray-600">Enter 6-digit OTP sent to {formatPhoneNumber(phoneNumber || '')}</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-xs sm:text-sm text-center mb-4 sm:mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="flex gap-2 sm:gap-4 justify-center mb-6 sm:mb-8">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="tel"
                  maxLength={index === 0 ? 6 : 1}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e)}
                  className="w-8 h-10 sm:w-10 sm:h-12 md:w-12 md:h-14 border border-gray-300 rounded-lg text-center text-lg sm:text-xl font-semibold focus:border-[#FF5722] focus:outline-none transition-all duration-200 bg-white"
                  disabled={isSubmitting}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVerify}
              disabled={isSubmitting || otp.join('').length !== 6}
              className="w-full py-3 sm:py-3.5 px-4 bg-[#FF5722] text-white rounded-full font-medium hover:bg-[#F4511E] transition-colors duration-200 mb-4 sm:mb-6"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Verify & Continue'
              )}
            </motion.button>

            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Didn't receive OTP?{' '}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResendOTP}
                  disabled={countdown > 0}
                  className={countdown > 0 ? 'text-gray-400' : 'text-[#FF5722] font-medium'}
                >
                  Resend
                </motion.button>
                {countdown > 0 && (
                  <span className="text-gray-400 ml-1">
                    in {`00:${countdown < 10 ? `0${countdown}` : countdown}`}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;