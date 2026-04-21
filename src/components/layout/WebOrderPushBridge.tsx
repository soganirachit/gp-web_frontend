import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  registerWebOrderPushNavigate,
  handleWebOrderPushData,
} from "../../utils/orderPushNavigationWeb";

/**
 * Registers SPA navigation for {@link handleWebOrderPushData} and listens for:
 * - `navigator.serviceWorker` `message` (payload object in `event.data`)
 * - `window` `gp-order-push` `CustomEvent` with `detail` = FCM-like data object
 * - URL query `?notification_type=` / `?type=` (optional deep-link from notification URLs)
 */
export function WebOrderPushBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerWebOrderPushNavigate((to, replace) => {
      navigate(to, { replace: replace ?? false });
    });
  }, [navigate]);

  useEffect(() => {
    const onSwMessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && typeof d === "object" && !Array.isArray(d)) {
        handleWebOrderPushData(d as Record<string, unknown>);
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    const onWin = (e: Event) => {
      const det = (e as CustomEvent<Record<string, unknown>>).detail;
      if (det && typeof det === "object") handleWebOrderPushData(det);
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
    handleWebOrderPushData({
      notification_type: nt,
      order_type: q.get("order_type") ?? "",
      channel: q.get("channel") ?? "",
    });
  }, [location.search]);

  return null;
}
