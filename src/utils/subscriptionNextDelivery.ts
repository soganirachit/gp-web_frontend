import { format, addDays } from "date-fns";
import type { Subscription } from "../services/subscription.service";

/** Mon … Sun labels for UI (delivery int 0 = Monday). */
export const WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayStringToApiInt(day: string): number | undefined {
  const s = String(day).trim().toLowerCase();
  if (s.startsWith("mon")) return 0;
  if (s.startsWith("tue")) return 1;
  if (s.startsWith("wed")) return 2;
  if (s.startsWith("thu")) return 3;
  if (s.startsWith("fri")) return 4;
  if (s.startsWith("sat")) return 5;
  if (s.startsWith("sun")) return 6;
  return undefined;
}

function selectedDaysToApiInts(days: string[]): number[] {
  const map: Record<string, number> = {
    MONDAY: 0,
    MON: 0,
    TUESDAY: 1,
    TUE: 1,
    WEDNESDAY: 2,
    WED: 2,
    THURSDAY: 3,
    THU: 3,
    FRIDAY: 4,
    FRI: 4,
    SATURDAY: 5,
    SAT: 5,
    SUNDAY: 6,
    SUN: 6,
  };
  const out: number[] = [];
  for (const d of days) {
    const key = String(d).trim().toUpperCase().replace(/\.$/, "");
    const n = map[key] ?? dayStringToApiInt(d);
    if (n != null) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Delivery weekdays as API ints 0=Mon … 6=Sun. */
export function getDeliveryDayInts(subscription: Subscription): number[] {
  if (subscription.deliveryDayInts?.length) {
    return subscription.deliveryDayInts;
  }
  const fromSelected = selectedDaysToApiInts(subscription.selectedDays || []);
  if (fromSelected.length) return fromSelected;
  if (
    subscription.deliveryPreference === "DAILY" ||
    subscription.type === "DAILY"
  ) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return [];
}

/** JS `Date.getDay()`: 0 Sun … 6 Sat → delivery int 0 Mon … 6 Sun. */
function jsWeekdayToDeliveryInt(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

const SAME_DAY_NEXT_DELIVERY_CUTOFF_HOUR = 12;

/**
 * Next calendar delivery on a subscribed weekday, respecting 12:00 cutoff for today.
 * Matches Manage Subscriptions / app schedule (not stale API-only dates).
 */
export function computeNextDeliveryFromSubscribedDays(
  subscription: Subscription,
): Date | null {
  if (
    subscription.status === "PAUSED" ||
    subscription.status === "INACTIVE" ||
    subscription.status === "CANCELLED"
  ) {
    return null;
  }

  const ints = getDeliveryDayInts(subscription);
  if (!ints.length) return null;

  const allowed = new Set(ints);
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const cutoffToday = new Date(todayMidnight);
  cutoffToday.setHours(SAME_DAY_NEXT_DELIVERY_CUTOFF_HOUR, 0, 0, 0);
  const skipTodayBecauseSlotPassed = now.getTime() >= cutoffToday.getTime();

  for (let add = 0; add <= 28; add++) {
    const d = new Date(todayMidnight);
    d.setDate(todayMidnight.getDate() + add);
    const ui = jsWeekdayToDeliveryInt(d.getDay());
    if (!allowed.has(ui)) continue;
    if (add === 0 && skipTodayBecauseSlotPassed) continue;
    return d;
  }
  return null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** e.g. "Tomorrow - Sat, 18 Apr" or "Tue, 19 May" */
export function formatNextDeliveryDateLine(date: Date): string {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const d0 = startOfDay(date);
  const part = format(date, "EEE, d MMM");

  if (d0.getTime() === tomorrow.getTime()) {
    return `Tomorrow - ${part}`;
  }
  if (d0.getTime() === today.getTime()) {
    return `Today - ${part}`;
  }
  return part;
}

/**
 * Next calendar delivery date for an active subscription (schedule-first).
 */
export function calculateNextDeliveryDate(subscription: Subscription): Date | null {
  return computeNextDeliveryFromSubscribedDays(subscription);
}

/** e.g. "Tomorrow - Sat, 18 Apr" or "Sun, 18 Apr" */
export function formatHomepageNextDeliveryLine(subscription: Subscription): string {
  const next = calculateNextDeliveryDate(subscription);
  if (!next) return "—";
  return formatNextDeliveryDateLine(next);
}

/** Resume date for paused subs — API uses `next_delivery_date` as resume when paused. */
export function getPausedResumeDate(subscription: Subscription): Date | null {
  if (subscription.status !== "PAUSED" && subscription.status !== "INACTIVE") {
    return null;
  }
  const next = subscription.nextDeliveryDate;
  if (next && !Number.isNaN(next.getTime())) {
    return next;
  }
  const until = subscription.pausedUntilDate;
  if (until && !Number.isNaN(until.getTime())) {
    return until;
  }
  return null;
}

/** Paused copy with resume date from `next_delivery_date` (then `paused_until_date`). */
export function formatPausedDeliveryLine(subscription: Subscription): string {
  const resume = getPausedResumeDate(subscription);
  if (resume) {
      return `Paused till ${format(resume, "d MMM yyyy")}`;
    }
  return "Paused till —";
}

/** Namaste carousel — subscription status (replaces delivery time slot row). */
export function formatNamasteSubscriptionStatusLine(
  subscription: Subscription,
): string {
  if (subscription.status === "PAUSED") {
    return formatPausedDeliveryLine(subscription);
  }
  if (subscription.status === "ACTIVE") {
    return "Active subscription";
  }
  if (subscription.status === "CANCELLED") {
    return "Cancelled";
  }
  const raw = String(subscription.status ?? "").trim();
  if (!raw) return "—";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

/** GP Daily home Namaste row — schedule-first, then API fallback. */
export function formatNamasteDeliveryLine(subscription: Subscription): string {
  if (subscription.status === "PAUSED") {
    return formatPausedDeliveryLine(subscription);
  }

  const fromSchedule = computeNextDeliveryFromSubscribedDays(subscription);
  if (fromSchedule) {
    return formatNextDeliveryDateLine(fromSchedule);
  }

  const raw = subscription.nextDeliveryDate;
  if (raw != null) {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return formatNextDeliveryDateLine(dt);
    }
  }

  const fallback = formatHomepageNextDeliveryLine(subscription);
  if (fallback === "—") return "No upcoming delivery scheduled";
  return fallback;
}

export function subscriptionProductLabel(subscription: Subscription): string {
  const n =
    subscription.productDetails?.name?.trim() ||
    subscription.basePackDetails?.name?.trim() ||
    "";
  return n || "Subscription";
}
