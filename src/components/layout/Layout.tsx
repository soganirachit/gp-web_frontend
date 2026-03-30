import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import { FeatureThemeProvider } from "../../context/FeatureThemeContext";
import { FadingOutlet } from "../common/PageFade";
import { trackPageView } from "../../lib/metaPixel";

const Layout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Fire Meta Pixel PageView on every route change (critical for SPAs)
  useEffect(() => {
    trackPageView();
  }, [location.pathname, location.search]);

  // Define auth routes that should not show BottomNav or Header
  const authRoutes = [
    "/login",
    "/otp-verification",
    "/otp-Verification",
    "/name-input",
    "/Name-input",
    "/allset",
    "/Allset",
    "/gp-daily/login",
    "/gp-daily/otp-verification",
    "/gp-daily/name-input",
    "/gp-daily/allset",
    "/gp-daily/startup",
    "/gp-store/login",
    "/gp-store/otp-verification",
    "/gp-store/name-input",
    "/gp-store/allset",
    "/gp-store/startup",
    "/startup",
    "/",
  ];
  const isAuthRoute = authRoutes.includes(location.pathname);

  // Routes that should not show BottomNav (location pages, support question form)
  const routesWithoutBottomNav = ["/location"];
  const shouldHideBottomNav = routesWithoutBottomNav.includes(
    location.pathname
  ) || location.pathname.includes("/customer-support/questions");

  // Routes that should not have top padding.
  // Important: pathname is like `/gp-store/orders`, so we must use prefix matching.
  const routesWithoutTopPadding = ["/gp-daily", "/gp-store"];
  const shouldHideTopPadding = routesWithoutTopPadding.some((p) =>
    location.pathname.startsWith(p)
  );

  // Many GP Store/Daily screens already apply their own `pb-nav-bottom`.
  // Avoid double bottom padding from `pb-layout-pb`.
  const isGpStoreOrDailyRoute = routesWithoutTopPadding.some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <FeatureThemeProvider>
    <div className="min-h-screen bg-[#f8f6f1]">
      {/* Fixed Header - Hide on auth routes */}
      {/* {!isAuthRoute && <FixedHeader />} */}

      <main className={!isAuthRoute && !shouldHideTopPadding ? "pt-4" : ""}>
          <div
            className={
              isAuthRoute
                ? ""
                : !shouldHideBottomNav
                ? `min-h-[calc(100dvh-144px)] min-h-[calc(100vh-144px)] ${isGpStoreOrDailyRoute ? "pb-0" : "pb-layout-pb"}`
                : isGpStoreOrDailyRoute
                ? "pb-0"
                : "pb-layout-pb"
            }
          >
          <FadingOutlet />
        </div>
      </main>

      {/* Single global bottom nav (do not mount BottomNav inside page components — duplicates stack) */}
      {!isAuthRoute && !shouldHideBottomNav && <BottomNav />}
    </div>
    </FeatureThemeProvider>
  );
};

export default Layout;
