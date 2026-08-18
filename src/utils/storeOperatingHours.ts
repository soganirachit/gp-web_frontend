import type { Store } from "../services/store.service";

const IST_OFFSET_MINUTES = 5 * 60 + 30;

function parseTimeToMinutes(raw: string | null | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const text = String(raw).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Current clock time in IST as minutes from midnight. */
export function getIstMinutesNow(now = new Date()): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MINUTES + 24 * 60) % (24 * 60);
}

/**
 * True when the store is outside its configured opening/closing window.
 * Supports same-day windows (09:00–21:00) and overnight windows (22:00–06:00).
 */
export function isOutsideStoreOperatingHours(
  store: Pick<Store, "opening_time" | "closing_time">,
  now = new Date(),
): boolean {
  const open = parseTimeToMinutes(store.opening_time);
  const close = parseTimeToMinutes(store.closing_time);
  if (open == null || close == null) return false;

  const nowMinutes = getIstMinutesNow(now);
  if (close > open) {
    return nowMinutes < open || nowMinutes >= close;
  }
  if (close < open) {
    return nowMinutes >= close && nowMinutes < open;
  }
  return false;
}

/** Show offline hero when outside hours or API marks store offline. */
export function shouldShowStoreOfflineHero(
  store: Pick<Store, "opening_time" | "closing_time" | "is_online">,
  now = new Date(),
): boolean {
  if (isOutsideStoreOperatingHours(store, now)) return true;
  return store.is_online === false;
}
