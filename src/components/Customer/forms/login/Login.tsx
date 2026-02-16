import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authService } from "../../../../services/auth.service";
import { useFeatureTheme } from "../../../../context/FeatureThemeContext";

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { theme, feature } = useFeatureTheme();
    const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (phoneNumber.length < 10) {
            setError("Please enter a valid phone number.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");
            await authService.sendOTP(phoneNumber);
            const otpPath = `${basePath}/otp-verification`;
            navigate(otpPath, { state: { phoneNumber } });
        } catch (err: any) {
            setError(
                err?.error || err?.response?.data?.message || "Failed to send OTP"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen w-screen fixed inset-0 flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 md:py-8 overflow-y-auto ${theme.classes.authPageBackground}`}>
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
                        <img
                            src={theme.assets.loginHero}
                            alt="Login Graphic"
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
                            <div className="flex items-center border border-gray-300 rounded-lg sm:rounded-xl overflow-hidden bg-white">
                                <span className="pl-3 sm:pl-4 pr-1.5 sm:pr-2 text-gray-700 text-sm sm:text-base font-medium">+91</span>
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
                            className={`w-full py-3 sm:py-3.5 md:py-4 px-4 rounded-lg sm:rounded-xl font-semibold transition-colors duration-200 text-base sm:text-lg ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
                        >
                            {isLoading ? (
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto ${feature === 'gpDaily' ? 'border-black' : 'border-white'}`} />
                            ) : (
                                "Get OTP"
                            )}
                        </motion.button>
                    </form>

                    <p className="text-xs sm:text-sm text-center text-gray-500 mt-4 sm:mt-6 px-2">
                        By continuing, you agree to our{" "}
                        <a href="#" className="text-gray-700 underline">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-gray-700 underline">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
