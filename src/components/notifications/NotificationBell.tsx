import { Link, useLocation } from "react-router-dom";
import { IoNotificationsOutline } from "react-icons/io5";
import { useNotificationUnreadCount } from "../../context/NotificationInboxContext";
import { useFeatureTheme } from "../../context/FeatureThemeContext";

export function NotificationBell() {
  const unread = useNotificationUnreadCount();
  const { feature } = useFeatureTheme();
  const location = useLocation();
  const base = location.pathname.startsWith("/gp-daily")
    ? "/gp-daily"
    : "/gp-store";
  const href = `${base}/notifications`;

  if (feature !== "gpDaily" && feature !== "gpStore") return null;

  return (
    <Link
      to={href}
      className="relative inline-flex p-2 rounded-full hover:bg-black/5 transition-colors"
      aria-label="Notifications"
    >
      <IoNotificationsOutline className="text-xl text-gray-700" />
      {unread > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
