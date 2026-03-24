import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import FixedHeader from "./FixedHeader";
import BottomNav from "./BottomNav";
import { FeatureThemeProvider } from "../../context/FeatureThemeContext";
import Spinner from "../common/Spinner";
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

  // Routes that should not have top padding
  const routesWithoutTopPadding = ["/gp-daily", "/gp-store"];
  const shouldHideTopPadding = routesWithoutTopPadding.includes(
    location.pathname
  );

  return (
    <FeatureThemeProvider>
    <div className="min-h-screen bg-[#f8f6f1]">
      {/* Fixed Header - Hide on auth routes */}
      {/* {!isAuthRoute && <FixedHeader />} */}

      <main className={!isAuthRoute && !shouldHideTopPadding ? "pt-4" : ""}>
          <div
            className={
              !isAuthRoute && !shouldHideBottomNav
                ? "min-h-[calc(100vh-144px)] pb-32"
                : !isAuthRoute
                ? "pb-32"
                : ""
            }
          >
          <Suspense fallback={<div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50"><Spinner size={400} /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Bottom navigation */}
      {/* <BottomNav /> */}
        {!isAuthRoute && !shouldHideBottomNav && (
          <BottomNav />
        )}
    </div>
    </FeatureThemeProvider>
  );
};

export default Layout;
