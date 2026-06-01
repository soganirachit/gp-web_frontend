import api from "../services/api";
import {
  registerPushTokenWithBackend,
  unregisterPushTokenFromBackend,
} from "../services/pushRegistration.service";
import { routeNotificationDeepLink } from "./deepLinkRouter";
import type { NotificationPayload } from "./types";

export type { NotificationModule, NotificationFilterStatus } from "./types";
export {
  classifyNotificationModule,
  notificationTypeFromPayload,
} from "./types";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  message?: string;
  notification_type: string;
  reference_id?: string;
  reference_type?: string;
  data?: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

export const notificationService = {
  async list(unreadOnly = false): Promise<NotificationItem[]> {
    const res = await api.get("/notifications/", {
      params: { unread_only: unreadOnly ? "true" : "false" },
    });
    const raw = res.data;
    return raw?.data ?? raw?.results ?? raw ?? [];
  },

  async unreadCount(): Promise<number> {
    const res = await api.get("/notifications/unread-count/");
    const raw = res.data;
    return raw?.count ?? raw?.data?.count ?? raw?.unread_count ?? 0;
  },

  async markRead(id: number): Promise<void> {
    await api.post(`/notifications/${id}/mark-read/`);
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read/");
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/notifications/${id}/`);
  },

  async clearAll(): Promise<void> {
    await api.delete("/notifications/clear-all/");
  },
};

export const notificationClient = {
  routeDeepLink: routeNotificationDeepLink,
  list: notificationService.list,
  unreadCount: notificationService.unreadCount,
  markRead: notificationService.markRead,
  markAllRead: notificationService.markAllRead,
  registerDeviceToken: registerPushTokenWithBackend,
  unregisterDeviceToken: unregisterPushTokenFromBackend,
};

export type { NotificationPayload };
