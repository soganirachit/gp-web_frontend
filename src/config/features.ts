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
import dailyBlackProfile from "../assets/svg/gp_daily svg/Blackprofile.svg";
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
      authPageBackground: "bg-[#FFFBEB]",
      primaryButton: "bg-[#FAA222] text-white",
      primaryButtonHover: "hover:bg-[#DD7600]",
      authIndicatorActive: "bg-[#FAA222]",
      authIndicatorInactive: "bg-gray-300",
      bottomNavActiveText: "text-[#FAA222]",
      bottomNavInactiveText: "text-gray-500",
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
      profileLogo: dailyBlackProfile,
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
      primary: "#2A6B28",
    },
    classes: {
      authPageBackground: "bg-[#F0F8F0]",
      primaryButton: "bg-[#2A6B28] text-white",
      primaryButtonHover: "hover:bg-[#1e4d1c]",
      authIndicatorActive: "bg-[#2A6B28]",
      authIndicatorInactive: "bg-gray-300",
      bottomNavActiveText: "text-[#2A6B28]",
      bottomNavInactiveText: "text-gray-500",
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
  // Default to gpDaily if no feature prefix is found
  return "gpDaily";
};
