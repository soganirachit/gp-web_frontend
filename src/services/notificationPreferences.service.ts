import api from "./api";

export interface UserNotificationPreferences {
  id?: number;
  push_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  promotional_notifications: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

export const notificationPreferencesService = {
  async get(): Promise<UserNotificationPreferences> {
    const res = await api.get("/users/preferences/");
    return (res.data?.data ?? res.data) as UserNotificationPreferences;
  },

  async update(
    patch: Partial<UserNotificationPreferences>,
  ): Promise<UserNotificationPreferences> {
    const res = await api.post("/users/preferences/update/", patch);
    return (res.data?.data ?? res.data) as UserNotificationPreferences;
  },
};
