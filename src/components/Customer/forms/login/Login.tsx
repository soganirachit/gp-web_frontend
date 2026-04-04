import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
    authService,
    checkNotOnWhatsappBeforeOtpRoute,
    OTP_NOT_ON_WHATSAPP_MESSAGE,
    shouldBlockOtpEntryAfterSendOtp,
    whatsappOtpLikelyDelivered,
} from "../../../../services/auth.service";
import { useFeatureTheme } from "../../../../context/FeatureThemeContext";
import Spinner from "../../../common/Spinner";
import { errorMessageFromCatch } from "../../../../utils/apiErrorMessage";

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, feature } = useFeatureTheme();
    const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

    // Array of images to cycle through
    const images = [theme.assets.loginHero, theme.assets.otpHero];

    // Auto-rotate images every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [images.length]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (phoneNumber.length < 10) {
            setError("Please enter a valid phone number.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");
            const result = await authService.sendOTP(phoneNumber);
            if (!result.success) {
                setError(result.message || "Failed to send OTP");
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
                setError(blockMessage);
                return;
            }

            const warnStyle = { background: "#fffbeb", color: "#92400e" } as const;
            if (result.whatsapp_status === "failed") {
                toast(result.message || "OTP delivery failed. Please tap “Resend” in a moment.", {
                    icon: "⚠️",
                    duration: 5000,
                    style: warnStyle,
                });
            } else if (result.whatsapp_status === "not_configured") {
                toast(
                    result.message ||
                        "WhatsApp is not configured. If you do not receive a code, tap “Resend” or try another number.",
                    { icon: "⚠️", duration: 5000, style: warnStyle }
                );
            } else {
                toast.success(result.message || "OTP sent to your WhatsApp");
            }

            const otpPath = `${basePath}/otp-verification`;
            const incoming = location.state as { returnUrl?: string; fromCart?: boolean } | null;
            navigate(otpPath, {
                state: {
                    phoneNumber,
                    whatsappOtpLikelyDelivered: whatsappOtpLikelyDelivered(result),
                    /** E.164 or backend-normalized phone for GET otp-delivery-status */
                    deliveryPollPhone: pollPhone,
                    returnUrl: incoming?.returnUrl,
                    fromCart: incoming?.fromCart,
                },
            });
        } catch (err: unknown) {
            let errorMessage = errorMessageFromCatch(err, "Failed to send OTP");
            
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
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        navigate('/gp-store');
    };

    return (
        <div className={`min-h-screen w-screen fixed inset-0 flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 md:py-8 overflow-y-auto ${theme.classes.authPageBackground}`}>
            {/* Skip Button - Top Right Corner */}
            <button
                onClick={handleSkip}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 text-gray-600 hover:text-gray-800 text-sm sm:text-base font-medium px-3 sm:px-4 py-2 transition-colors z-20"
            >
                Skip
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-10 flex flex-col"
            >

                {/* Top Section - Orange Graphic with Badge */}
                <div className="relative mb-4 sm:mb-6 md:mb-8 flex flex-col items-center">
                    {/* OTP Graphic */}
                    <div className="relative w-full max-w-[280px] sm:max-w-xs h-48 sm:h-56 md:h-64 flex items-center justify-center mb-4 sm:mb-6">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={currentImageIndex}
                                src={images[currentImageIndex]}
                                alt="Login Graphic"
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
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-1.5 sm:mb-2">
                            Get Started
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 font-normal px-2">
                            Enter your WhatsApp number to continue
                        </p>
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

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                        <div>
                            <label className="block text-gray-700 mb-1.5 sm:mb-2 text-sm sm:text-base font-medium">
                                Phone Number
                            </label>
                            <div className="flex flex-row flex-nowrap items-center border border-gray-300 rounded-lg sm:rounded-xl overflow-hidden bg-white">
                                <span className="flex-shrink-0 pl-3 sm:pl-4 pr-1.5 sm:pr-2 text-gray-700 text-sm sm:text-base font-medium whitespace-nowrap">+91</span>
                                <input
                                    type="tel"
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full py-3 sm:py-3.5 px-2 text-gray-900 text-sm sm:text-base focus:outline-none"
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
                            className={`w-full py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl font-semibold transition-colors duration-200 text-base sm:text-lg flex items-center justify-center ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
                        >
                            {isLoading ? (
                                <Spinner size={24} variant="light" className="flex-shrink-0" />
                            ) : (
                                "Get OTP"
                            )}
                        </motion.button>
                    </form>

                    <p className="text-xs sm:text-sm text-center text-gray-500 mt-4 sm:mt-6 px-2">
                        By continuing, you agree to our{" "}
                        <span className="text-gray-700 underline">Terms of Service</span> and{" "}
                        <span className="text-gray-700 underline">Privacy Policy</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
