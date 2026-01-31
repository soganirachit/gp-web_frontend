import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import FixedHeader from "./FixedHeader";
import BottomNav from "./BottomNav";
import { FeatureThemeProvider } from "../../context/FeatureThemeContext";

const Layout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  // Routes that render their own BottomNav (no need for Layout padding)
  const routesWithOwnBottomNav = ["/account", "/Account"];
  const hasOwnBottomNav = routesWithOwnBottomNav.includes(location.pathname);

  // Routes that should not show BottomNav (location pages)
  const routesWithoutBottomNav = ["/location"];
  const shouldHideBottomNav = routesWithoutBottomNav.includes(
    location.pathname
  );

  // Routes that should not have top padding
  const routesWithoutTopPadding = ["/gp-daily", "/gp-store"];
  const shouldHideTopPadding = routesWithoutTopPadding.includes(
    location.pathname
  );

  return (
    <FeatureThemeProvider>
    <div className="min-h-screen bg-[#FFFBEB]">
      {/* Fixed Header - Hide on auth routes */}
      {/* {!isAuthRoute && <FixedHeader />} */}

      <main className={!isAuthRoute && !shouldHideTopPadding ? "pt-4" : ""}>
          <div
            className={
              !isAuthRoute && !hasOwnBottomNav && !shouldHideBottomNav
                ? "min-h-[calc(100vh-144px)] pb-32"
                : !isAuthRoute
                ? "pb-32"
                : ""
            }
          >
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      {/* <BottomNav /> */}
        {!isAuthRoute && !hasOwnBottomNav && !shouldHideBottomNav && (
          <BottomNav />
        )}
    </div>
    </FeatureThemeProvider>
  );
};

export default Layout;
