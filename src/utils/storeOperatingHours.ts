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
  if (open == null || close == null) return true;
  if (open === 0 && close === 0) return true;

  const nowMinutes = getIstMinutesNow(now);
  if (close > open) {
    return nowMinutes < open || nowMinutes >= close;
  }
  if (close < open) {
    return nowMinutes >= close && nowMinutes < open;
  }
  return false;
}

/** Show offline hero when the store is not accepting customer orders. */
export function shouldShowStoreOfflineHero(
  store: Pick<
    Store,
    | "opening_time"
    | "closing_time"
    | "is_online"
    | "is_accepting_orders"
    | "opening_hours_configured"
  >,
  now = new Date(),
): boolean {
  if (typeof store.is_accepting_orders === "boolean") {
    return !store.is_accepting_orders;
  }
  if (store.opening_hours_configured === false) return true;
  if (isOutsideStoreOperatingHours(store, now)) return true;
  return store.is_online === false;
}

/** Customer-facing copy when checkout is blocked by store hours / offline. */
export function storeOrderingClosedMessage(
  store: Pick<
    Store,
    | "customer_offline_reason"
    | "opening_time"
    | "closing_time"
    | "is_online"
    | "is_accepting_orders"
    | "opening_hours_configured"
  >,
): string {
  const reason = store.customer_offline_reason;
  if (reason === "inactive") return "This store is no longer active.";
  if (reason === "manual") {
    return "This store is currently offline and not accepting orders.";
  }
  if (reason === "hours_not_set") {
    return "This store has not set opening hours yet and is not accepting orders.";
  }
  if (reason === "outside_hours") {
    return "This store is closed for the day. Please try again during opening hours.";
  }
  if (shouldShowStoreOfflineHero(store)) {
    return "This store is currently offline and not accepting orders.";
  }
  return "This store is currently offline and not accepting orders.";
}
