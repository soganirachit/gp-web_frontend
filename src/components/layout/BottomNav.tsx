import { Link, useLocation } from "react-router-dom";
import homeIcon from "../../assets/icon/navbar/home.svg";
import dailyIcon from "../../assets/icon/navbar/daily.svg";
import walletIcon from "../../assets/icon/navbar/wallet.svg";
import basketIcon from "../../assets/icon/navbar/basket.svg";
import accountIcon from "../../assets/icon/navbar/account.svg";
import storeLogo from "../../assets/svg/store_logo.svg";
import orderStoreIcon from "../../assets/svg/gp_store_svg/orderstore.svg";
import activeBg from "../../assets/All/Vector (1).png";
import storeGreenBanner from "../../assets/svg/gp_store_svg/greenbanner.svg";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";

  const isActive = (paths: string | string[]) => {
    if (Array.isArray(paths)) {
      return paths.some(path => {
        if (path === "/") {
          return location.pathname === "/";
        }
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
    // Special case for home - only match exactly "/"
    if (paths === "/") {
      return location.pathname === "/";
    }
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
      <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="max-w-[800px] w-full mx-0 sm:mx-4 bg-white shadow-lg rounded-t-none sm:rounded-t-lg pointer-events-auto overflow-visible">
          <div className="flex justify-between items-center px-4 py-3 pt-4">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center flex-1 relative ${
                isActive("/")
                  ? theme.classes.bottomNavActiveText
                  : theme.classes.bottomNavInactiveText
              }`}
            >
              {isActive("/") && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
                />
              )}
              <img
                src={homeIcon}
                alt="Home"
                className={`w-7 h-7 mb-1 relative z-10 ${isActive("/") ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
              <span className={`text-sm font-medium relative z-10 ${isActive("/") ? "text-white" : ""}`}>Home</span>
            </Link>

            <Link
              to="/gp-store"
              className={`flex flex-col items-center justify-center flex-1 relative ${
                isActive("/gp-store")
                  ? theme.classes.bottomNavActiveText
                  : theme.classes.bottomNavInactiveText
              }`}
            >
              {isActive("/gp-store") && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
                />
              )}
              <img
                src={storeLogo}
                alt="Store"
                className={`w-12 h-12 relative z-10 ${isActive("/gp-store") ? "brightness-0 invert" : "opacity-90"
                  }`}
              />
            </Link>

            <Link
              to={`${basePath}/products`}
              className={`flex flex-col items-center justify-center flex-1 relative ${
                isActive([`${basePath}/products`, "/gp-store/store", "/manage-my-storeProducts"])
                  ? theme.classes.bottomNavActiveText
                  : theme.classes.bottomNavInactiveText
              }`}
            >
              {isActive([`${basePath}/products`, "/gp-store/store", "/manage-my-storeProducts"]) && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
                />
              )}
              <img
                src={basketIcon}
                alt="Basket"
                className={`w-7 h-7 mb-1 relative z-10 ${
                  isActive([`${basePath}/products`, "/gp-store/store", "/manage-my-storeProducts"])
                    ? "brightness-0 invert"
                    : "opacity-90"
                }`}
              />
              <span className={`text-sm font-medium relative z-10 ${isActive([`${basePath}/products`, "/gp-store/store", "/manage-my-storeProducts"]) ? "text-white" : ""}`}>Basket</span>
            </Link>

            <Link
              to={`${basePath}/orders`}
              className={`flex flex-col items-center justify-center flex-1 relative ${
                isActive(`${basePath}/orders`)
                  ? theme.classes.bottomNavActiveText
                  : theme.classes.bottomNavInactiveText
              }`}
            >
              {isActive(`${basePath}/orders`) && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
                />
              )}
              <img
                src={orderStoreIcon}
                alt="Order"
                className={`w-7 h-7 mb-1 relative z-10 ${
                  isActive(`${basePath}/orders`) ? "brightness-0 invert" : "opacity-90"
                }`}
              />
              <span className={`text-sm font-medium relative z-10 ${isActive(`${basePath}/orders`) ? "text-white" : ""}`}>Order</span>
            </Link>

            <Link
              to={`${basePath}/account`}
              className={`flex flex-col items-center justify-center flex-1 relative ${
                isActive([`${basePath}/account`, `${basePath}/profile`])
                  ? theme.classes.bottomNavActiveText
                  : theme.classes.bottomNavInactiveText
              }`}
            >
              {isActive([`${basePath}/account`, `${basePath}/profile`]) && (
                <img
                  src={storeGreenBanner}
                  alt=""
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
                />
              )}
              <img
                src={accountIcon}
                alt="Account"
                className={`w-7 h-7 mb-1 relative z-10 ${
                  isActive([`${basePath}/account`, `${basePath}/profile`])
                    ? "brightness-0 invert"
                    : "opacity-90"
                }`}
              />
              <span className={`text-sm font-medium relative z-10 ${isActive([`${basePath}/account`, `${basePath}/profile`]) ? "text-white" : ""}`}>Account</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // GP Daily Navigation: Home, Daily (logo only), Wallet, Basket, Account
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="max-w-[800px] w-full mx-0 sm:mx-4 bg-white shadow-lg rounded-t-none sm:rounded-t-lg pointer-events-auto overflow-visible">
        <div className="flex justify-between items-center px-4 py-3 pt-4">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 relative ${
              isActive("/")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
            }`}
          >
            {isActive("/") && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={homeIcon}
              alt="Home"
              className={`w-7 h-7 mb-1 relative z-10 ${isActive("/") ? "" : "opacity-90"
                }`}
            />
            <span className="text-sm font-medium relative z-10">Home</span>
          </Link>

          <Link
            to="/gp-daily"
            className={`flex flex-col items-center justify-center flex-1 relative ${
              isActive("/gp-daily")
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
            }`}
          >
            {isActive("/gp-daily") && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={dailyIcon}
              alt="Daily"
              className={`w-11 h-11 relative z-10 ${isActive("/gp-daily") ? "" : "opacity-90"
                }`}
            />
          </Link>

          <Link
            to={`${basePath}/wallet`}
            className={`flex flex-col items-center justify-center flex-1 relative ${
              isActive(`${basePath}/wallet`)
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
            }`}
          >
            {isActive(`${basePath}/wallet`) && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={walletIcon}
              alt="Wallet"
              className={`w-7 h-7 mb-1 relative z-10 ${
                isActive(`${basePath}/wallet`) ? "" : "opacity-90"
              }`}
            />
            <span className="text-sm font-medium relative z-10">Wallet</span>
          </Link>

          <Link
            to="/gp-store"
            className={`flex flex-col items-center justify-center flex-1 relative ${
              isActive(["/gp-store", "/gp-store/store", "/manage-my-storeProducts"])
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
            }`}
          >
            {isActive(["/gp-store", "/gp-store/store", "/manage-my-storeProducts"]) && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={basketIcon}
              alt="Basket"
              className={`w-7 h-7 mb-1 relative z-10 ${
                isActive(["/gp-store", "/gp-store/store", "/manage-my-storeProducts"])
                  ? ""
                  : "opacity-90"
              }`}
            />
            <span className="text-sm font-medium relative z-10">Basket</span>
          </Link>

          <Link
            to={`${basePath}/account`}
            className={`flex flex-col items-center justify-center flex-1 relative ${
              isActive([`${basePath}/account`, `${basePath}/profile`])
                ? theme.classes.bottomNavActiveText
                : theme.classes.bottomNavInactiveText
            }`}
          >
            {isActive([`${basePath}/account`, `${basePath}/profile`]) && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={accountIcon}
              alt="Account"
              className={`w-7 h-7 mb-1 relative z-10 ${
                isActive([`${basePath}/account`, `${basePath}/profile`])
                  ? ""
                  : "opacity-90"
              }`}
            />
            <span className="text-sm font-medium relative z-10">Account</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
