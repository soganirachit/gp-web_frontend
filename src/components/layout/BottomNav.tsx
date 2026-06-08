import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import homeIcon from "../../assets/icon/navbar/home.svg";
import dailyIcon from "../../assets/icon/navbar/daily.svg";
import walletIcon from "../../assets/icon/navbar/wallet.svg";
import basketIcon from "../../assets/icon/navbar/basket.svg";
import accountIcon from "../../assets/icon/navbar/account.svg";
import storeLogo from "../../assets/svg/store_logo.svg";
import ordersNavIcon from "../../assets/svg/Orders Icon.svg";
import dailyOrangeBanner from "../../assets/svg/gp_daily svg/orangebanner.svg";
import storeGreenBanner from "../../assets/svg/gp_store_svg/greenbanner.svg";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { subscriptionCartService } from "../../services/subscriptionCart.service";
import {
  DAILY_CART_UPDATED_EVENT,
  countDailyCartItems,
} from "../../utils/dailyCartEvents";
import {
  isAccountSectionRoute,
  isGpDailyHubRoute,
  isGpStoreHubRoute,
} from "../../utils/bottomNavRoutes";

/** Side tab icons (Home, Basket, Wallet, etc.) */
const BOTTOM_NAV_SIDE_ICON = "mb-1 h-7 w-7";
/** Center hub logo (GP Daily / GP Store) */
const BOTTOM_NAV_CENTER_ICON = "mb-1 h-10 w-10";

/**
 * Small navbar SVGs are often inlined by Vite as `data:` URLs. `mask-image: url(data:…)`
 * is unreliable in WebViews (icons show as solid squares); `<img src>` is fine.
 */
function DailyNavMonoIcon({
  src,
  active,
  className = BOTTOM_NAV_SIDE_ICON,
}: {
  src: string;
  active: boolean;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`inline-block shrink-0 object-contain ${className}`}
      style={
        active
          ? { filter: "brightness(0) saturate(100%)" }
          : { filter: "brightness(0) saturate(100%)", opacity: 0.5 }
      }
    />
  );
}

/** Store orders tab — grey asset on account; bottom nav tints via mask like other tabs. */
function StoreOrdersNavIcon({
  active,
  className = `relative z-10 ${BOTTOM_NAV_SIDE_ICON}`,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 object-contain ${className} ${
        active ? "bg-white" : "bg-[#19411F] opacity-90"
      }`}
      style={{
        maskImage: `url(${ordersNavIcon})`,
        WebkitMaskImage: `url(${ordersNavIcon})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

/** Daily logo stays a separate asset; CSS mask tint is OK here. */
function DailyNavGlyph({
  src,
  active,
  className = BOTTOM_NAV_CENTER_ICON,
}: {
  src: string;
  active: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${active ? "bg-[#222222]" : "bg-[#6B7280]"} ${className}`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, feature } = useFeatureTheme();
  const { items } = useCart();
  const { isLoggedIn } = useAuth();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";
  const accountRootPath = `${basePath}/account`;
  const [dailyCartItemCount, setDailyCartItemCount] = useState(0);

  const refreshDailyCartBadge = useCallback(async () => {
    if (feature !== "gpDaily") return;
    if (!isLoggedIn || !localStorage.getItem("access_token")) {
      setDailyCartItemCount(0);
      return;
    }
    try {
      const cart = await subscriptionCartService.getDailyCart();
      setDailyCartItemCount(countDailyCartItems(cart));
    } catch {
      setDailyCartItemCount(0);
    }
  }, [feature, isLoggedIn]);

  useEffect(() => {
    void refreshDailyCartBadge();
  }, [refreshDailyCartBadge, location.pathname]);

  useEffect(() => {
    if (feature !== "gpDaily") return;
    const onCartUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") {
        setDailyCartItemCount(Math.max(0, detail.count));
        return;
      }
      void refreshDailyCartBadge();
    };
    window.addEventListener(DAILY_CART_UPDATED_EVENT, onCartUpdated);
    return () => window.removeEventListener(DAILY_CART_UPDATED_EVENT, onCartUpdated);
  }, [feature, refreshDailyCartBadge]);

  const cartItemCount = useMemo(() => {
    return feature === "gpDaily" ? dailyCartItemCount : items.length;
  }, [dailyCartItemCount, feature, items.length]);

  /** Treat subpages (FAQ, wallet, …) as part of Account tab; bar tap always opens settings root. */
  const isAccountSectionActive = () =>
    isAccountSectionRoute(location.pathname, basePath);

  const handleAccountNavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(accountRootPath);
  };

  const handleBasketClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate(`${basePath}/login`, {
        state: { returnUrl: `${basePath}/basket` }
      });
    }
  };

  const handleWalletClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate(`${basePath}/login`, {
        state: { returnUrl: `${basePath}/wallet` },
      });
    }
  };

  const isActive = (paths: string | string[]) => {
    const matchPath = (path: string) => {
      if (path === "/home") return location.pathname === "/home";
      if (path === "/gp-daily") return isGpDailyHubRoute(location.pathname);
      if (path === "/gp-store") return isGpStoreHubRoute(location.pathname);
      return (
        location.pathname === path ||
        location.pathname.startsWith(`${path}/`)
      );
    };

    if (Array.isArray(paths)) {
      return paths.some(matchPath);
    }
    return matchPath(paths);
  };

  const storeNavPill = (show: boolean) =>
    show ? (
      <img
        src={storeGreenBanner}
        alt=""
        className="pointer-events-none absolute top-1/2 left-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    ) : null;

  const storeSideNavIconClass = (active: boolean) =>
    `relative z-10 ${BOTTOM_NAV_SIDE_ICON} ${active ? "brightness-0 invert" : "opacity-90"}`;

  const storeNavLabelClass = (active: boolean) =>
    `relative z-10 text-[10px] font-medium leading-none ${
      active ? "text-white" : "text-[#19411f]"
    }`;

  // GP Store Navigation: Home, Store (logo only), Basket, Order, Account
  if (feature === "gpStore") {
    return (
      /* Fix_V0.9: E2E anchor for bottom navigation */
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none"
        data-testid="gp-bottom-nav"
      >
        <div className="w-full max-w-[min(800px,100vw)] mx-auto bg-white shadow-lg rounded-none pointer-events-auto overflow-visible pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex min-h-[56px] items-center justify-between px-3 py-2.5 pt-2.5">
            <Link
              to="/home"
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center ${isActive("/home")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {storeNavPill(isActive("/home"))}
              <img
                src={homeIcon}
                alt="Home"
                className={storeSideNavIconClass(isActive("/home"))}
              />
              <span className={storeNavLabelClass(isActive("/home"))}>Home</span>
            </Link>

            <Link
              to="/gp-store"
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center ${isActive("/gp-store")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {storeNavPill(isActive("/gp-store"))}
              <img
                src={storeLogo}
                alt="Store"
                className={`relative z-10 ${BOTTOM_NAV_CENTER_ICON} ${isActive("/gp-store") ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
            </Link>

            <Link
              to={isLoggedIn ? "/gp-store/basket" : "#"}
              onClick={handleBasketClick}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center ${isActive("/gp-store/basket")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {storeNavPill(isActive("/gp-store/basket"))}
              <div className="relative">
                <img
                  src={basketIcon}
                  alt="Basket"
                  className={storeSideNavIconClass(isActive("/gp-store/basket"))}
                />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 z-20 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border border-[#2A6B28] bg-white px-0.5 text-[9px] font-bold text-[#2A6B28]">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </div>
              <span className={storeNavLabelClass(isActive("/gp-store/basket"))}>Basket</span>
            </Link>

            <Link
              to={`${basePath}/orders`}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center ${isActive(`${basePath}/orders`)
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {storeNavPill(isActive(`${basePath}/orders`))}
              <StoreOrdersNavIcon active={isActive(`${basePath}/orders`)} />
              <span className={storeNavLabelClass(isActive(`${basePath}/orders`))}>Order</span>
            </Link>

            <Link
              to={accountRootPath}
              onClick={handleAccountNavClick}
              className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center ${isAccountSectionActive()
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {storeNavPill(isAccountSectionActive())}
              <img
                src={accountIcon}
                alt="Account"
                className={storeSideNavIconClass(isAccountSectionActive())}
              />
              <span className={storeNavLabelClass(isAccountSectionActive())}>Account</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const basketTabActive = isActive([
    "/gp-store",
    "/gp-store/store",
    "/manage-my-storeProducts",
    `${basePath}/basket`,
  ]);

  /** GP Daily: same orange “pill” as app (`BottomTabs` + `orangebanner.svg`), labels #222 on active / #6B7280 muted. */
  const dailyActivePill = (
    <img
      src={dailyOrangeBanner}
      alt=""
      className="pointer-events-none absolute top-1/2 left-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 object-contain"
    />
  );

  // GP Daily Navigation: Home, Daily (logo only), Wallet, Basket, Account
  return (
    /* Fix_V0.9: E2E anchor for bottom navigation */
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none"
      data-testid="gp-bottom-nav"
    >
      <div className="w-full max-w-[800px] mx-auto bg-white shadow-[0_-2px_16px_rgba(0,0,0,0.08)] rounded-none pointer-events-auto overflow-visible pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex min-h-[56px] justify-between items-center px-3 py-2.5 pt-2.5">
          <Link
            to="/home"
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive("/home")
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive("/home") && dailyActivePill}
            <DailyNavMonoIcon
              src={homeIcon}
              active={isActive("/home")}
              className={`relative z-10 ${BOTTOM_NAV_SIDE_ICON}`}
            />
            <span className={`text-[10px] font-medium relative z-10 ${isActive("/home") ? "text-[#222222]" : "text-[#6B7280]"}`}>Home</span>
          </Link>

          <Link
            to="/gp-daily"
            aria-label="Daily"
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive("/gp-daily")
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive("/gp-daily") && dailyActivePill}
            <DailyNavGlyph
              src={dailyIcon}
              active={isActive("/gp-daily")}
              className={`relative z-10 ${BOTTOM_NAV_CENTER_ICON}`}
            />
          </Link>

          <Link
            to={isLoggedIn ? `${basePath}/wallet` : "#"}
            onClick={handleWalletClick}
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive(`${basePath}/wallet`)
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive(`${basePath}/wallet`) && dailyActivePill}
            <DailyNavMonoIcon
              src={walletIcon}
              active={isActive(`${basePath}/wallet`)}
              className={`relative z-10 ${BOTTOM_NAV_SIDE_ICON}`}
            />
            <span className={`text-[10px] font-medium relative z-10 ${isActive(`${basePath}/wallet`) ? "text-[#222222]" : "text-[#6B7280]"}`}>Wallet</span>
          </Link>

          <Link
            to={isLoggedIn ? `${basePath}/basket` : "#"}
            onClick={handleBasketClick}
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${basketTabActive
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {basketTabActive && dailyActivePill}
            <div className="relative">
              <DailyNavMonoIcon
                src={basketIcon}
                active={basketTabActive}
                className={`relative z-10 ${BOTTOM_NAV_SIDE_ICON}`}
              />
              {cartItemCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 text-[10px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-1 z-20 leading-none ${
                    basketTabActive
                      ? "bg-white border-2 border-[#FFB043] text-[#222222]"
                      : "bg-[#FFB043] text-[#222222]"
                  }`}
                >
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-medium relative z-10 ${
                basketTabActive ? "text-[#222222]" : "text-[#6B7280]"
              }`}
            >
              Basket
            </span>
          </Link>

          <Link
            to={accountRootPath}
            onClick={handleAccountNavClick}
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isAccountSectionActive()
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isAccountSectionActive() && dailyActivePill}
            <DailyNavMonoIcon
              src={accountIcon}
              active={isAccountSectionActive()}
              className={`relative z-10 ${BOTTOM_NAV_SIDE_ICON}`}
            />
            <span className={`text-[10px] font-medium relative z-10 ${isAccountSectionActive() ? "text-[#222222]" : "text-[#6B7280]"}`}>
              Account
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
