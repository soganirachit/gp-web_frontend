import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { authService } from "../../../../services/auth.service";
import { FaStar, FaRedo, FaHeadset, FaTag } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { REQUIRED_TOAST } from "../../../../constants/requiredToastMessages";
import { useFeatureTheme } from "../../../../context/FeatureThemeContext";

const NameInput: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useFeatureTheme();
  const basePath = location.pathname.startsWith("/gp-store") ? "/gp-store" : "/gp-daily";
  const locState = (location.state ?? {}) as { returnUrl?: string; fromCart?: boolean };
  const returnUrl = locState.returnUrl;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [customGender, setCustomGender] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (value: string) => {
    // Lightweight, production-safe validation (avoids blocking legitimate emails).
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const showValidationError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const handleSubmit = async () => {
    console.log("handleSubmit called");

    if (!firstName.trim()) {
      showValidationError(REQUIRED_TOAST.ENTER_FIRST_NAME);
      return;
    }

    if (!lastName.trim()) {
      showValidationError(REQUIRED_TOAST.ENTER_LAST_NAME);
      return;
    }

    if (!email.trim()) {
      showValidationError(REQUIRED_TOAST.ENTER_EMAIL);
      return;
    }

    if (!isValidEmail(email)) {
      showValidationError(REQUIRED_TOAST.ENTER_EMAIL);
      return;
    }

    if (!gender) {
      showValidationError(REQUIRED_TOAST.SELECT_GENDER);
      return;
    }

    if (gender === "other" && !customGender.trim()) {
      showValidationError(REQUIRED_TOAST.SPECIFY_GENDER);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
   

      const phoneNumber = localStorage.getItem("phoneNumber");

      if (!phoneNumber) {
        setError("Authentication required. Please login again.");
        navigate(`${basePath}/login`);
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const formattedGender =
        gender === "other" ? customGender : gender.toUpperCase();

      const response = await authService.completeOnboarding(
        firstName.trim(),
        lastName.trim(),
        formattedGender,
        email.trim()
      );

      if (response.success) {
        localStorage.setItem("userName", fullName.trim());
        localStorage.setItem(
          "userGender",
          gender === "other" ? customGender : gender
        );
        localStorage.setItem("userEmail", email.trim());
        localStorage.setItem("needLocation", "true");

        navigate(`${basePath}/location`, {
          state: {
            fromNameInput: true,
            returnUrl: returnUrl ?? basePath,
            fromCart: locState.fromCart,
          },
        });
      } else {
        throw new Error(response.error || "Failed to save profile details");
      }
    } catch (err: any) {
      console.log("Error in onboarding:", err);
      let errorMessage = err.message || REQUIRED_TOAST.FAILED_SAVE_DETAILS;

      // Backend may return a generic "validation error" for invalid email.
      if (typeof errorMessage === "string" && errorMessage.toLowerCase().includes("validation error")) {
        errorMessage = REQUIRED_TOAST.ENTER_EMAIL;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: FaStar,
      text: "Flexible subscription plans",
    },
    {
      icon: FaRedo,
      text: "Fresh flowers delivered daily",
    },
    {
      icon: FaHeadset,
      text: "24/7 customer support",
    },
    {
      icon: FaTag,
      text: "Special discounts & offers",
    },
  ];

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-white px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold text-gray-800 mb-2">
              Welcome to Genda Phool
            </h1>
            <p className="text-gray-600">Let's get to know you better</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">
                First Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
                aria-required="true"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg transition-colors"
                style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg transition-colors"
                style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-semibold">
                Email Address<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg transition-colors"
                style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-3 font-semibold">
                Gender<span className="text-red-500">*</span>
              </label>
            <div className="flex gap-8">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      checked={gender === option.value}
                      onChange={() =>
                        setGender(option.value as "male" | "female" | "other")
                      }
                      className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-full transition-colors"
                      style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                    />
                    {gender === option.value && (
                      <div className="absolute w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                    )}
                  </div>
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

            {gender === "other" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <label className="block text-gray-700 mb-2 font-semibold">Specify Gender</label>
                <input
                  type="text"
                  value={customGender}
                  onChange={(e) => setCustomGender(e.target.value)}
                  placeholder="Enter your gender"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg transition-colors"
                style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </motion.div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl font-medium transition-colors ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className={`w-5 h-5 border-2 border-t-transparent rounded-full mx-auto ${theme.feature === "gpDaily" ? "border-black" : "border-white"}`}
              />
            ) : (
              "Continue"
            )}
          </motion.button>

          {error && (
            <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                <Icon className="text-gray-800 text-2xl mb-2" />
                <p className="text-sm text-gray-700 leading-tight">
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default NameInput;
