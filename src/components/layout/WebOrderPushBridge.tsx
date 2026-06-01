import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  registerNotificationNavigate,
  routeNotificationDeepLink,
} from "../../notifications/deepLinkRouter";
import { NOTIFICATION_INBOX_REFRESH_EVENT } from "../../context/NotificationInboxContext";
import { useWebPushNotifications } from "../../hooks/useWebPushNotifications";

/**
 * Registers SPA navigation for push/inbox deep links and listens for:
 * - service worker postMessage
 * - window `gp-order-push` custom event
 * - URL query `?notification_type=` / `?type=`
 */
export function WebOrderPushBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  useWebPushNotifications(true);

  useEffect(() => {
    registerNotificationNavigate((to, replace) => {
      navigate(to, { replace: replace ?? false });
    });
  }, [navigate]);

  useEffect(() => {
    const onSwMessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && typeof d === "object" && !Array.isArray(d)) {
        if (routeNotificationDeepLink(d as Record<string, unknown>)) {
          window.dispatchEvent(new Event(NOTIFICATION_INBOX_REFRESH_EVENT));
        }
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    const onWin = (e: Event) => {
      const det = (e as CustomEvent<Record<string, unknown>>).detail;
      if (det && typeof det === "object") {
        if (routeNotificationDeepLink(det)) {
          window.dispatchEvent(new Event(NOTIFICATION_INBOX_REFRESH_EVENT));
        }
      }
    };
    window.addEventListener("gp-order-push", onWin as EventListener);
    return () => {
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
      window.removeEventListener("gp-order-push", onWin as EventListener);
    };
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const nt = q.get("notification_type") || q.get("type");
    if (!nt?.trim()) return;
    routeNotificationDeepLink({
      notification_type: nt,
      order_type: q.get("order_type") ?? "",
      channel: q.get("channel") ?? "",
      order_number: q.get("order_number") ?? "",
      ticket_number: q.get("ticket_number") ?? "",
    });
  }, [location.search]);

  return null;
}
