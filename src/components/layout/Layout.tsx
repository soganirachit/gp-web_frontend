import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import { WebOrderPushBridge } from "./WebOrderPushBridge";
import { GuestStoreLocationBootstrap } from "../store/GuestStoreLocationBootstrap";
import { FeatureThemeProvider } from "../../context/FeatureThemeContext";
import { FadingOutlet } from "../common/PageFade";
import { trackPageView } from "../../lib/metaPixel";
import { AppToaster } from "../ui/AppToaster";

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
    "/gp-store/login",
    "/gp-store/otp-verification",
    "/gp-store/name-input",
    "/gp-store/allset",
    "/gp-store/startup",
    "/startup",
    "/",
  ];
  const isAuthRoute = authRoutes.includes(location.pathname);

  // Routes that should not show BottomNav (landing, location pages)
  const routesWithoutBottomNav = ["/home", "/location", "/sajawat"];
  const shouldHideBottomNav = routesWithoutBottomNav.includes(location.pathname);

  // Routes that should not have top padding.
  // Important: pathname is like `/gp-store/orders`, so we must use prefix matching.
  const routesWithoutTopPadding = ["/gp-daily", "/gp-store"];
  const shouldHideTopPadding = routesWithoutTopPadding.some((p) =>
    location.pathname.startsWith(p)
  );

  const isGpDailyRoute = location.pathname.startsWith("/gp-daily");
  const dailyHeadingsClass = isGpDailyRoute ? " gp-daily-headings" : "";
  const showBottomNav = !isAuthRoute && !shouldHideBottomNav;

  const isSupportRoute = location.pathname.includes("/customer-support");
  /** Chat + question flow: fixed viewport band above bottom nav (no extra pb). */
  const isSupportDockedComposer =
    location.pathname.includes("/customer-support/chat") ||
    location.pathname.includes("/customer-support/questions");

  /** Landing + location: scroll the document (no trapped overflow on `<main>`). */
  const useDocumentScroll =
    shouldHideBottomNav && !isAuthRoute && !isSupportDockedComposer;

  const contentClassName = isAuthRoute
    ? dailyHeadingsClass.trim()
    : showBottomNav
      ? isSupportDockedComposer
        ? `h-0 min-h-0 overflow-hidden${dailyHeadingsClass}`
        : isSupportRoute
          ? `min-h-[calc(100dvh-var(--gp-bottom-nav-offset))] pb-nav-bottom${dailyHeadingsClass}`
          : `min-h-[calc(100dvh-144px)] min-h-[calc(100vh-144px)] pb-nav-bottom${dailyHeadingsClass}`
      : `pb-0${dailyHeadingsClass}`;

  return (
    <FeatureThemeProvider>
    <>
      <WebOrderPushBridge />
      <AppToaster />
      {/* Fix_V0.9: data-testid for Playwright / QA without changing layout behaviour */}
    <div
      className={
        showBottomNav && !isAuthRoute && !isSupportDockedComposer
          ? "flex h-[100dvh] max-h-[100dvh] flex-col bg-[#f8f6f1]"
          : "min-h-screen bg-[#f8f6f1]"
      }
      data-testid="gp-root-layout"
    >
      <GuestStoreLocationBootstrap />
      {/* Fixed Header - Hide on auth routes */}
      {/* {!isAuthRoute && <FixedHeader />} */}

      <main
        className={
          !isAuthRoute
            ? isSupportDockedComposer
              ? "h-0 overflow-hidden pt-0"
              : useDocumentScroll
                ? "block min-h-0 pt-0"
                : !shouldHideTopPadding
                  ? "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-0"
                  : ""
            : ""
        }
      >
          <div className={contentClassName}>
          <FadingOutlet />
        </div>
      </main>

      {/* Single global bottom nav (do not mount BottomNav inside page components — duplicates stack) */}
      {!isAuthRoute && !shouldHideBottomNav && <BottomNav />}
    </div>
    </>
    </FeatureThemeProvider>
  );
};

export default Layout;
