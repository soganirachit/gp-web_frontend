import { Link, useLocation } from "react-router-dom";
import homeIcon from "../../assets/icon/navbar/home.svg";
import dailyIcon from "../../assets/icon/navbar/daily.svg";
import walletIcon from "../../assets/icon/navbar/wallet.svg";
import basketIcon from "../../assets/icon/navbar/basket.svg";
import accountIcon from "../../assets/icon/navbar/account.svg";
import activeBg from "../../assets/All/Vector (1).png";

const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (paths: string | string[]) => {
    if (Array.isArray(paths)) {
      return paths.some(path => {
        if (path === "/") {
          return location.pathname === "/";
        }
        return location.pathname === path || location.pathname.startsWith(path + "/");
      });
    }
    // Special case for home - only match exactly "/"
    if (paths === "/") {
      return location.pathname === "/";
    }
    return location.pathname === paths || location.pathname.startsWith(paths + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="max-w-[800px] w-full mx-0 sm:mx-4 bg-white shadow-lg rounded-t-none sm:rounded-t-lg pointer-events-auto overflow-visible">
        <div className="flex justify-between items-center px-4 py-3 pt-4">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/") ? "text-green-800" : "text-gray-500"
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
              className={`w-7 h-7 mb-1 relative z-10 ${isActive("/") ? "" : "opacity-60"
                }`}
            />
            <span className="text-sm font-medium relative z-10">Home</span>
          </Link>

          <Link
            to="/gp-daily"
            className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/gp-daily") ? "text-green-800" : "text-gray-500"
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
              className={`w-7 h-7 mb-1 relative z-10 ${isActive("/gp-daily") ? "" : "opacity-60"
                }`}
            />
            <span className="text-sm font-medium relative z-10">Daily</span>
          </Link>

          <Link
            to="/wallet"
            className={`flex flex-col items-center justify-center flex-1 relative ${isActive("/wallet") ? "text-green-800" : "text-gray-500"
              }`}
          >
            {isActive("/wallet") && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={walletIcon}
              alt="Wallet"
              className={`w-7 h-7 mb-1 relative z-10 ${isActive("/wallet") ? "" : "opacity-60"
                }`}
            />
            <span className="text-sm font-medium relative z-10">Wallet</span>
          </Link>

          <Link
            to="/store"
            className={`flex flex-col items-center justify-center flex-1 relative ${isActive(["/store", "/manage-my-storeProducts"]) ? "text-green-800" : "text-gray-500"
              }`}
          >
            {isActive(["/store", "/manage-my-storeProducts"]) && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={basketIcon}
              alt="Basket"
              className={`w-7 h-7 mb-1 relative z-10 ${isActive(["/store", "/manage-my-storeProducts"]) ? "" : "opacity-60"
                }`}
            />
            <span className="text-sm font-medium relative z-10">Basket</span>
          </Link>

          <Link
            to="/Account"
            className={`flex flex-col items-center justify-center flex-1 relative ${isActive(["/Account", "/account", "/Profile", "/profile"]) ? "text-green-800" : "text-gray-500"
              }`}
          >
            {isActive(["/Account", "/account", "/Profile", "/profile"]) && (
              <img
                src={activeBg}
                alt=""
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 object-contain pointer-events-none"
              />
            )}
            <img
              src={accountIcon}
              alt="Account"
              className={`w-7 h-7 mb-1 relative z-10 ${isActive(["/Account", "/account", "/Profile", "/profile"]) ? "" : "opacity-60"
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
