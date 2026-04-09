import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  type Feature,
  type FeatureTheme,
  featureThemes,
  getFeatureFromPath,
} from "../config/features";

interface FeatureThemeContextValue {
  feature: Feature;
  theme: FeatureTheme;
  basePath: string; 
}

export const FeatureThemeContext = createContext<FeatureThemeContextValue | undefined>(
  undefined
);

interface FeatureThemeProviderProps {
  feature?: Feature;
  children: ReactNode;
}

export const FeatureThemeProvider: React.FC<FeatureThemeProviderProps> = ({
  feature,
  children,
}) => {
  const location = useLocation();

  const getFeatureFromQuery = (): Feature | null => {
    const params = new URLSearchParams(location.search);
    const featureParam = params.get("feature");
    if (featureParam === "gpStore") return "gpStore";
    if (featureParam === "gpDaily") return "gpDaily";
    return null;
  };

  /** URL path wins over `?feature=` so `/gp-daily/*` stays Daily even when home had `?feature=gpStore`. */
  const featureFromPathPrefix = (): Feature | null => {
    if (location.pathname.startsWith("/gp-daily")) return "gpDaily";
    if (location.pathname.startsWith("/gp-store")) return "gpStore";
    return null;
  };

  const activeFeature =
    feature ??
    featureFromPathPrefix() ??
    getFeatureFromQuery() ??
    getFeatureFromPath(location.pathname);

  const value = useMemo(
    () => ({
      feature: activeFeature,
      theme: featureThemes[activeFeature],
      basePath: activeFeature === 'gpStore' ? '/gp-store' : '/gp-daily', 
    }),
    [activeFeature]
  );

  return (
    <FeatureThemeContext.Provider value={value}>
      {children}
    </FeatureThemeContext.Provider>
  );
};

export const useFeatureTheme = (): FeatureThemeContextValue => {
  const ctx = useContext(FeatureThemeContext);
  if (!ctx) {
    throw new Error(
      "useFeatureTheme must be used within a FeatureThemeProvider"
    );
  }
  return ctx;
};




