import { Link, useLocation } from "react-router-dom";
import homeIcon from "../../assets/icon/Home.png";
import subscriptionIcon from "../../assets/icon/Subscription.png";
import supportIcon from "../../assets/icon/Support.png";
import accountIcon from "../../assets/icon/Account.png";

const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 ">
      <div className="max-w-[800px] mx-auto flex justify-between items-center px-4 py-3 md:px-8 md:py-4 bg-white shadow-lg md:mt-10 rounded-t-lg">
        <Link
          to="/"
          className={`flex flex-col items-center text-center min-w-[64px] md:min-w-[80px] ${
            isActive("/") ? "text-green-700" : "text-gray-600"
          }`}
        >
          <img
            src={homeIcon}
            alt="Home"
            className="w-6 h-6 mb-1 md:w-8 md:h-8"
          />
          <span className="text-xs md:text-sm">Home</span>
        </Link>

        <Link
          to="/Manage-my-subscription"
          className={`flex flex-col items-center text-center min-w-[64px]  md:min-w-[80px] ${
            isActive("/Manage-my-subscription")
              ? "text-green-700"
              : "text-gray-600"
          }`}
        >
          <img
            src={subscriptionIcon}
            alt="Subscriptions"
            className="w-6 h-6 mb-1 text-green-800 md:w-8 md:h-8"
          />
          <span className="text-xs md:text-sm">Subscriptions</span>
        </Link>

        <Link
          to="/manage-my-storeProducts"
          className={`flex flex-col items-center text-center min-w-[64px]  md:min-w-[80px] ${
            isActive("/manage-my-storeProducts") ? "text-green-700" : "text-gray-600"
          }`}
        >
          <img
            src={subscriptionIcon}
            alt="Subscriptions"
            className="w-6 h-6 mb-1 text-green-800 md:w-8 md:h-8"
          />
          <span className="text-xs md:text-sm">Store</span>
        </Link>

        <Link
          to="/customer-support"
          className={`flex flex-col items-center text-center min-w-[64px] md:min-w-[80px] ${
            isActive("/customer-support") ? "text-green-700" : "text-gray-600"
          }`}
        >
          <img
            src={supportIcon}
            alt="Support"
            className="w-6 h-6 mb-1 md:w-8 md:h-8"
          />
          <span className="text-xs md:text-sm">Support</span>
        </Link>

        <Link
          to="/account"
          className={`flex flex-col items-center text-center min-w-[64px] md:min-w-[80px] ${
            isActive("/account") ? "text-green-700" : "text-gray-600"
          }`}
        >
          <img
            src={accountIcon}
            alt="Account"
            className="w-6 h-6 mb-1 md:w-8 md:h-8"
          />
          <span className="text-xs md:text-sm">Account</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
