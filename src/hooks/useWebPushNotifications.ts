import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  listenForegroundWebPush,
  subscribeWebPush,
} from "../services/pushRegistration.service";
import { NOTIFICATION_INBOX_REFRESH_EVENT } from "../context/NotificationInboxContext";

/**
 * Registers browser push when logged in and user has granted permission.
 * Call subscribeWebPush from preferences UI for explicit opt-in.
 */
export function useWebPushNotifications(enabled = true) {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!enabled || !isLoggedIn) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    void subscribeWebPush().catch(() => {});
    const off = listenForegroundWebPush(() => {
      window.dispatchEvent(new Event(NOTIFICATION_INBOX_REFRESH_EVENT));
    });
    return () => {
      off?.();
    };
  }, [enabled, isLoggedIn]);
}
