import loginLogoDaily from "../assets/All/login_logo.png";
import otpLogoDaily from "../assets/All/otp_logo.png";
import logoDaily from "../assets/All/logo.png";
import vectorBg from "../assets/All/Vector (1).png";
import smallGendaDaily from "../assets/svg/smallgenda.svg";
import dailyLowBalance from "../assets/svg/gp_daily svg/lowbalance.svg";
import dailyTopBanner from "../assets/svg/gp_daily svg/top _banner.svg";
import dailyBottomBanner from "../assets/svg/gp_daily svg/bottom_banner.svg";
import dailyLocationHome from "../assets/svg/gp_daily svg/locationhome.svg";
import dailyProfileHome from "../assets/svg/gp_daily svg/profilehome.svg";
import dailyProfileLogo from "../assets/svg/gp_daily svg/profilelogo.svg";
import dailyFaqIcon from "../assets/svg/gp_daily svg/faq.svg";
import dailyFaqUpIcon from "../assets/svg/gp_daily svg/faqup.svg";

import loginLogoStore from "../assets/svg/gp_store_svg/storeloginlogo.png";
import otpLogoStore from "../assets/svg/gp_store_svg/storeotplogo.png";
import storeGreenBanner from "../assets/svg/gp_store_svg/greenbanner.svg";
import storeWhiteLogo from "../assets/svg/gp_store_svg/whitelogo.svg";
import storeWhiteProfileLogo from "../assets/svg/gp_store_svg/whiteprofilelogo.svg";
import storeFaqIcon from "../assets/svg/gp_store_svg/storefaq.svg";
import storeFaqUpIcon from "../assets/svg/gp_store_svg/storefaqup.svg";

export type Feature = "gpDaily" | "gpStore";

// Feature flags - Loaded from environment variables at build time
// VITE_GP_DAILY_ENABLED should be set to "true" or "false" in .env file
const getGpDailyEnabled = (): boolean => {
  const envValue = import.meta.env.VITE_GP_DAILY_ENABLED;
  if (envValue === undefined || envValue === null) {
    return false; // Default to disabled if not set
  }
  // Convert string to boolean (handles "true", "True", "TRUE", "1", etc.)
  return String(envValue).toLowerCase() === "true" || String(envValue) === "1";
};

export const FEATURE_FLAGS = {
  gpDailyEnabled: getGpDailyEnabled(), // Loaded from VITE_GP_DAILY_ENABLED env variable at build time
  gpStoreEnabled: true,
} as const;

export interface FeatureThemeAssets {
  loginHero: string;
  otpHero: string;
  headerBadge?: string;
  headerBottomBanner?: string;
  headerLocationIcon?: string;
  headerProfileHomeIcon?: string;
  headerProfileLogoIcon?: string;
  lowBalanceIcon?: string;
  storeBanner?: string;
  storeLogoOnBanner?: string;
  profileLogo?: string;
  profileBackground?: string;
  startupBanner?: string;
  startupLogo?: string;
  faqIcon?: string;
  faqUpIcon?: string;
}

export interface FeatureThemeClasses {
  authPageBackground: string;
  primaryButton: string;
  primaryButtonHover: string;
  authIndicatorActive: string;
  authIndicatorInactive: string;
  bottomNavActiveText: string;
  bottomNavInactiveText: string;
  otpInputBorder: string;
}

export interface FeatureTheme {
  feature: Feature;
  colors: {
    primary: string;
    secondary?: string;
  };
  classes: FeatureThemeClasses;
  assets: FeatureThemeAssets;
}

export const featureThemes: Record<Feature, FeatureTheme> = {
  gpDaily: {
    feature: "gpDaily",
    colors: {
      primary: "#FAA222",
    },
    classes: {
      authPageBackground: "bg-[#f8f6f1]",
      primaryButton: "bg-[#FAA222] text-black",
      primaryButtonHover: "hover:bg-[#DD7600]",
      authIndicatorActive: "bg-[#FAA222]",
      authIndicatorInactive: "bg-gray-300",
      bottomNavActiveText: "text-[#FAA222]",
      bottomNavInactiveText: "text-gray-500",
      otpInputBorder: "border-[#FAA222] focus:ring-[#FAA222]",
    },
    assets: {
      loginHero: loginLogoDaily,
      otpHero: otpLogoDaily,
      headerBadge: smallGendaDaily,
      headerBottomBanner: dailyBottomBanner,
      headerLocationIcon: dailyLocationHome,
      headerProfileHomeIcon: dailyProfileHome,
      headerProfileLogoIcon: dailyProfileLogo,
      lowBalanceIcon: dailyLowBalance,
      profileLogo: dailyProfileLogo,
      profileBackground: vectorBg,
      startupBanner: vectorBg,
      startupLogo: logoDaily,
      faqIcon: dailyFaqIcon,
      faqUpIcon: dailyFaqUpIcon,
    },
  },
  gpStore: {
    feature: "gpStore",
    colors: {
      primary: "#19411f",
    },
    classes: {
      authPageBackground: "bg-[#f7f5f0]",
      primaryButton: "bg-[#19411f] text-white",
      primaryButtonHover: "hover:bg-[#1e4d1c]",
      authIndicatorActive: "bg-[#19411f]",
      authIndicatorInactive: "bg-gray-300",
      bottomNavActiveText: "text-[#19411f]",
      bottomNavInactiveText: "text-gray-500",
      otpInputBorder: "border-[#19411f] focus:ring-[#19411f]",
    },
    assets: {
      loginHero: loginLogoStore,
      otpHero: otpLogoStore,
      storeBanner: storeGreenBanner,
      storeLogoOnBanner: storeWhiteLogo,
      profileLogo: storeWhiteProfileLogo,
      profileBackground: storeGreenBanner,
      startupBanner: storeGreenBanner,
      startupLogo: storeWhiteLogo,
      faqIcon: storeFaqIcon,
      faqUpIcon: storeFaqUpIcon,
    },
  },
};

export const getFeatureFromPath = (pathname: string): Feature => {
  if (pathname.startsWith("/gp-store")) {
    return "gpStore";
  }
  if (pathname.startsWith("/gp-daily")) {
    return "gpDaily";
  }
  // Default to gpStore if gp-daily is disabled, otherwise gpDaily
  return FEATURE_FLAGS.gpDailyEnabled ? "gpDaily" : "gpStore";
};
