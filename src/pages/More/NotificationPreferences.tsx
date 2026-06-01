import React, { useCallback, useEffect, useState } from "react";
import { UniformPageHeader } from "../../components/layout/UniformPageHeader";
import {
  notificationPreferencesService,
  type UserNotificationPreferences,
} from "../../services/notificationPreferences.service";
import {
  subscribeWebPush,
  unsubscribeWebPush,
} from "../../services/pushRegistration.service";
import toast from "react-hot-toast";

const NotificationPreferencesPage: React.FC = () => {
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPrefs(await notificationPreferencesService.get());
    } catch {
      toast.error("Could not load notification preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (next: Partial<UserNotificationPreferences>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, ...next });
    try {
      setSaving(true);
      const saved = await notificationPreferencesService.update(next);
      setPrefs(saved);
      if (next.push_notifications === true) {
        await subscribeWebPush();
      }
      if (next.push_notifications === false) {
        await unsubscribeWebPush();
      }
      toast.success("Preferences updated");
    } catch {
      toast.error("Could not save preferences.");
      void load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="min-h-screen bg-[#f8f6f1]">
        <UniformPageHeader title="Notification preferences" />
        <p className="p-4 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <UniformPageHeader title="Notification preferences" />
      <div className="px-4 py-4 space-y-1">
        <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Channels
        </h2>
        <PrefToggle
          label="Push notifications"
          value={prefs.push_notifications}
          onChange={(v) => void patch({ push_notifications: v })}
        />
        <PrefToggle
          label="Email"
          value={prefs.email_notifications}
          onChange={(v) => void patch({ email_notifications: v })}
        />
        <PrefToggle
          label="WhatsApp"
          value={prefs.whatsapp_notifications}
          onChange={(v) => void patch({ whatsapp_notifications: v })}
        />
        <PrefToggle
          label="SMS"
          value={prefs.sms_notifications}
          onChange={(v) => void patch({ sms_notifications: v })}
        />
        <PrefToggle
          label="Promotional offers"
          value={prefs.promotional_notifications}
          onChange={(v) => void patch({ promotional_notifications: v })}
        />

        <h2 className="text-xs font-semibold uppercase text-gray-500 mt-6 mb-2">
          Quiet hours
        </h2>
        <PrefToggle
          label="Enable quiet hours"
          value={Boolean(prefs.quiet_hours_enabled)}
          onChange={(v) => void patch({ quiet_hours_enabled: v })}
        />
        <label className="block mt-3 text-sm text-gray-600">
          Start (HH:MM)
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={prefs.quiet_hours_start ?? ""}
            onChange={(e) =>
              setPrefs((p) =>
                p ? { ...p, quiet_hours_start: e.target.value } : p,
              )
            }
            onBlur={() =>
              void patch({ quiet_hours_start: prefs.quiet_hours_start ?? "" })
            }
            placeholder="22:00"
          />
        </label>
        <label className="block mt-3 text-sm text-gray-600">
          End (HH:MM)
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={prefs.quiet_hours_end ?? ""}
            onChange={(e) =>
              setPrefs((p) =>
                p ? { ...p, quiet_hours_end: e.target.value } : p,
              )
            }
            onBlur={() =>
              void patch({ quiet_hours_end: prefs.quiet_hours_end ?? "" })
            }
            placeholder="08:00"
          />
        </label>
        {saving ? (
          <p className="mt-4 text-xs text-gray-500">Saving…</p>
        ) : null}
      </div>
    </div>
  );
};

function PrefToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-3 border-b border-gray-100 bg-white px-3 rounded-lg mb-1">
      <span className="text-sm text-gray-900">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#19411F]"
      />
    </label>
  );
}

export default NotificationPreferencesPage;
