import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { notificationClient } from "../notifications/notificationClient";
import type { NotificationItem } from "../notifications/notificationClient";

export const NOTIFICATION_INBOX_REFRESH_EVENT = "gp-notification-inbox-refresh";

type NotificationInboxContextValue = {
  unreadCount: number;
  items: NotificationItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationInboxContext =
  createContext<NotificationInboxContextValue | null>(null);

export function NotificationInboxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const [count, list] = await Promise.all([
        notificationClient.unreadCount(),
        notificationClient.list(false),
      ]);
      setUnreadCount(count);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const markRead = useCallback(async (id: number) => {
    await notificationClient.markRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationClient.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    void refresh();
    if (!isLoggedIn) return;
    const id = window.setInterval(() => void refresh(), 60_000);
    const onRefresh = () => void refresh();
    window.addEventListener(NOTIFICATION_INBOX_REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(NOTIFICATION_INBOX_REFRESH_EVENT, onRefresh);
    };
  }, [isLoggedIn, refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      items,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [unreadCount, items, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationInboxContext.Provider value={value}>
      {children}
    </NotificationInboxContext.Provider>
  );
}

export function useNotificationInbox() {
  const ctx = useContext(NotificationInboxContext);
  if (!ctx) {
    throw new Error(
      "useNotificationInbox must be used within NotificationInboxProvider",
    );
  }
  return ctx;
}

export function useNotificationUnreadCount(): number {
  const ctx = useContext(NotificationInboxContext);
  return ctx?.unreadCount ?? 0;
}
