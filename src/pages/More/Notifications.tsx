import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useNotificationInbox } from "../../context/NotificationInboxContext";
import { notificationClient } from "../../notifications/notificationClient";
import {
  classifyNotificationModule,
  notificationTypeFromPayload,
  type NotificationFilterStatus,
  type NotificationModule,
} from "../../notifications/types";
import type { NotificationItem } from "../../notifications/notificationClient";
import { UniformPageHeader } from "../../components/layout/UniformPageHeader";

const MODULES: Array<NotificationModule | "all"> = [
  "all",
  "orders",
  "delivery",
  "subscriptions",
  "payments",
  "support",
  "marketing",
  "campaigns",
  "cart",
  "loyalty",
];

const STATUS: NotificationFilterStatus[] = ["all", "unread", "read"];

function bodyText(n: NotificationItem): string {
  return (n.body || n.message || "").trim();
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const { items, loading, refresh, markRead, markAllRead } =
    useNotificationInbox();
  const [moduleFilter, setModuleFilter] = useState<NotificationModule | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] =
    useState<NotificationFilterStatus>("all");

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const t = notificationTypeFromPayload({
        notification_type: n.notification_type,
        ...(n.data ?? {}),
      });
      const mod = classifyNotificationModule(t || n.notification_type);
      if (moduleFilter !== "all" && mod !== moduleFilter) return false;
      if (statusFilter === "unread" && n.is_read) return false;
      if (statusFilter === "read" && !n.is_read) return false;
      return true;
    });
  }, [items, moduleFilter, statusFilter]);

  const onOpen = async (n: NotificationItem) => {
    if (!n.is_read) await markRead(n.id);
    const payload = {
      notification_type: n.notification_type,
      channel: feature === "gpDaily" ? "daily" : "store",
      ...(n.data ?? {}),
      order_number:
        n.reference_type === "order" ? n.reference_id : undefined,
      ticket_number:
        n.reference_type === "support" || n.reference_type === "ticket"
          ? n.reference_id
          : undefined,
    };
    const routed = notificationClient.routeDeepLink(payload);
    if (!routed) navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <UniformPageHeader title="Notifications" />
      <div className="px-4 pt-3 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MODULES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModuleFilter(m)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                moduleFilter === m
                  ? "bg-[#19411F] text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              {m === "all" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs border ${
                statusFilter === s
                  ? "bg-[#19411F] text-white border-[#19411F]"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="ml-auto text-xs font-semibold text-[#19411F]"
          >
            Mark all read
          </button>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-gray-500 underline"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-16">
            No notifications yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onOpen(n)}
                  className={`w-full text-left rounded-2xl border p-4 shadow-sm ${
                    n.is_read
                      ? "bg-white border-gray-100"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {bodyText(n) ? (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {bodyText(n)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
