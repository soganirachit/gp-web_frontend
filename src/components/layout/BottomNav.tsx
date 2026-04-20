import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import homeIcon from "../../assets/icon/navbar/home.svg";
import dailyIcon from "../../assets/icon/navbar/daily.svg";
import walletIcon from "../../assets/icon/navbar/wallet.svg";
import basketIcon from "../../assets/icon/navbar/basket.svg";
import accountIcon from "../../assets/icon/navbar/account.svg";
import storeLogo from "../../assets/svg/store_logo.svg";
import orderStoreIcon from "../../assets/svg/gp_store_svg/orderstore.svg";
import activeBg from "../../assets/All/Vector (1).png";
import dailyOrangeBanner from "../../assets/svg/gp_daily svg/orangebanner.svg";
import storeGreenBanner from "../../assets/svg/gp_store_svg/greenbanner.svg";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { subscriptionCartService } from "../../services/subscriptionCart.service";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, feature } = useFeatureTheme();
  const { items } = useCart();
  const { isLoggedIn } = useAuth();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";
  const accountRootPath = `${basePath}/account`;
  const [dailyCartItemCount, setDailyCartItemCount] = useState(0);

  useEffect(() => {
    if (feature !== "gpDaily") return;
    if (!isLoggedIn || !localStorage.getItem("access_token")) {
      setDailyCartItemCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const cart = await subscriptionCartService.getDailyCart();
        const rawCount =
          typeof (cart as any)?.items_count === "number"
            ? (cart as any).items_count
            : Array.isArray((cart as any)?.items)
              ? (cart as any).items.length
              : 0;
        if (!cancelled) setDailyCartItemCount(Math.max(0, Number(rawCount) || 0));
      } catch {
        if (!cancelled) setDailyCartItemCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Refresh when route changes (e.g., after add/remove navigations)
  }, [feature, isLoggedIn, location.pathname]);

  const cartItemCount = useMemo(() => {
    return feature === "gpDaily" ? dailyCartItemCount : items.length;
  }, [dailyCartItemCount, feature, items.length]);

  /** Treat subpages (FAQ, wallet, …) as part of Account tab; bar tap always opens settings root. */
  const accountSectionPaths = [
    `${basePath}/account`,
    `${basePath}/profile`,
    `${basePath}/faq`,
    `${basePath}/addresses`,
    `${basePath}/refer`,
    `${basePath}/customer-support`,
  ];

  const isAccountSectionActive = () =>
    accountSectionPaths.some(
      (p) =>
        location.pathname === p || location.pathname.startsWith(`${p}/`),
    );

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

  const isActive = (paths: string | string[]) => {
    if (Array.isArray(paths)) {
      return paths.some(path => {
        if (path === "/home") return location.pathname === "/home";
        if (path === "/gp-daily") {
          // Only match exact /gp-daily
          return location.pathname === "/gp-daily";
        }
        if (path === "/gp-store") {
          // Only match exact /gp-store for this special case
          return location.pathname === "/gp-store";
        }
        return location.pathname === path || location.pathname.startsWith(path + "/");
      });
    }
    // Special case for home - only match exactly "/home"
    if (paths === "/home") return location.pathname === "/home";
    // Special case for /gp-daily - only match exactly "/gp-daily"
    if (paths === "/gp-daily") {
      return location.pathname === "/gp-daily";
    }
    // Special case for /gp-store - only match exactly "/gp-store"
    if (paths === "/gp-store") {
      return location.pathname === "/gp-store";
    }
    return location.pathname === paths || location.pathname.startsWith(paths + "/");
  };

  // GP Store Navigation: Home, Store (logo only), Basket, Order, Account
  if (feature === "gpStore") {
    return (
      /* Fix_V0.9: E2E anchor for bottom navigation */
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 w-full pointer-events-none"
        data-testid="gp-bottom-nav"
      >
        <div className="w-full max-w-none bg-white shadow-lg rounded-none pointer-events-auto overflow-visible pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex justify-between items-center px-3 py-2 pt-2">
            <Link
              to="/home"
              className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/home")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {isActive("/home") && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain pointer-events-none"
                />
              )}
              <img
                src={homeIcon}
                alt="Home"
                className={`w-5 h-5 mb-0.5 relative z-10 ${isActive("/home") ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
              <span className={`text-[10px] font-medium relative z-10 ${isActive("/home") ? "text-white" : "text-[#19411f]"}`}>Home</span>
            </Link>

            <Link
              to="/gp-store"
              className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/gp-store")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {isActive("/gp-store") && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain pointer-events-none"
                />
              )}
              <img
                src={storeLogo}
                alt="Store"
                className={`w-9 h-9 relative z-10 ${isActive("/gp-store") ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
            </Link>

            <Link
              to={isLoggedIn ? "/gp-store/basket" : "#"}
              onClick={handleBasketClick}
              className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/gp-store/basket")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {isActive("/gp-store/basket") && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain pointer-events-none"
                />
              )}
              <div className="relative">
                <img
                  src={basketIcon}
                  alt="Basket"
                  className={`w-5 h-5 mb-0.5 relative z-10 ${isActive("/gp-store/basket") ? "brightness-0 invert" : "opacity-90"
                    }`}
                />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-white text-[#2A6B28] text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 z-20 border border-[#2A6B28]">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium relative z-10 ${isActive("/gp-store/basket") ? "text-white" : "text-[#19411f]"}`}>Basket</span>
            </Link>

            <Link
              to={`${basePath}/orders`}
              className={`flex flex-col items-center justify-center flex-1 relative ${isActive(`${basePath}/orders`)
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {isActive(`${basePath}/orders`) && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain pointer-events-none"
                />
              )}
              <img
                src={orderStoreIcon}
                alt="Order"
                className={`w-5 h-5 mb-0.5 relative z-10 ${isActive(`${basePath}/orders`) ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
              <span className={`text-[10px] font-medium relative z-10 ${isActive(`${basePath}/orders`) ? "text-white" : "text-[#19411f]"}`}>Order</span>
            </Link>

            <Link
              to={accountRootPath}
              onClick={handleAccountNavClick}
              className={`flex flex-col items-center justify-center flex-1 relative ${isAccountSectionActive()
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
                }`}
            >
              {isAccountSectionActive() && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 object-contain pointer-events-none"
                />
              )}
              <img
                src={accountIcon}
                alt="Account"
                className={`w-5 h-5 mb-0.5 relative z-10 ${isAccountSectionActive()
                  ? "brightness-0 invert"
                  : "opacity-90"
                  }`}
              />
              <span className={`text-[10px] font-medium relative z-10 ${isAccountSectionActive() ? "text-white" : "text-[#19411f]"}`}>Account</span>
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
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] object-contain pointer-events-none"
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
        <div className="flex justify-between items-center px-3 py-2 pt-2">
          <Link
            to="/home"
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive("/home")
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive("/home") && dailyActivePill}
            <img
              src={homeIcon}
              alt="Home"
              className={`w-5 h-5 mb-0.5 relative z-10 ${isActive("/home") ? "" : "opacity-75"}`}
              style={isActive("/home") ? { filter: "brightness(0) saturate(100%)" } : undefined}
            />
            <span className={`text-[10px] font-medium relative z-10 ${isActive("/home") ? "text-[#222222]" : "text-[#6B7280]"}`}>Home</span>
          </Link>

          <Link
            to="/gp-daily"
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive("/gp-daily")
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive("/gp-daily") && dailyActivePill}
            <img
              src={dailyIcon}
              alt="Daily"
              className={`w-9 h-9 relative z-10 ${isActive("/gp-daily") ? "" : "opacity-75"}`}
              style={isActive("/gp-daily") ? { filter: "brightness(0) saturate(100%)" } : undefined}
            />
          </Link>

          <Link
            to={`${basePath}/wallet`}
            className={`flex flex-col items-center justify-center flex-1 relative min-h-[44px] ${isActive(`${basePath}/wallet`)
              ? theme.classes.bottomNavActiveText
              : theme.classes.bottomNavInactiveText
              }`}
          >
            {isActive(`${basePath}/wallet`) && dailyActivePill}
            <img
              src={walletIcon}
              alt="Wallet"
              className={`w-5 h-5 mb-0.5 relative z-10 ${isActive(`${basePath}/wallet`) ? "" : "opacity-75"}`}
              style={isActive(`${basePath}/wallet`) ? { filter: "brightness(0) saturate(100%)" } : undefined}
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
              <img
                src={basketIcon}
                alt="Basket"
                className={`w-5 h-5 mb-0.5 relative z-10 ${basketTabActive ? "" : "opacity-75"}`}
                style={basketTabActive ? { filter: "brightness(0) saturate(100%)" } : undefined}
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
            <img
              src={accountIcon}
              alt="Account"
              className={`w-5 h-5 mb-0.5 relative z-10 ${isAccountSectionActive() ? "" : "opacity-75"}`}
              style={isAccountSectionActive() ? { filter: "brightness(0) saturate(100%)" } : undefined}
            />
            <span className={`text-[10px] font-medium relative z-10 ${isAccountSectionActive() ? "text-[#222222]" : "text-[#6B7280]"}`}>Account</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
