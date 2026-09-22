import { format, addDays } from "date-fns";
import type { Subscription } from "../services/subscription.service";
import { isSubscriptionPausedForInsufficientWallet } from "./gpDailySubscriptionWalletPause";

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** True once local calendar day D has started (after 12:00 AM on D). */
export function isPastSameDaySubscriptionDeliveryCutoff(now: Date = new Date()): boolean {
  const midnight = startOfDay(now);
  return now.getTime() > midnight.getTime();
}

/** Parse API date-only fields in local calendar (avoids UTC `YYYY-MM-DD` shifting). */
export function parseSubscriptionDateField(
  value: Date | string | undefined | null,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }
  const s = String(value).trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return startOfDay(d);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function getApiNextDeliveryDate(
  subscription: Subscription,
): Date | null {
  return parseSubscriptionDateField(subscription.nextDeliveryDate);
}

/**
 * Next subscribed weekday strictly after today (local calendar).
 * GP Daily: actions on day D cannot deliver on D after midnight.
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
  const todayMidnight = startOfDay(new Date());

  for (let add = 1; add <= 28; add++) {
    const d = addDays(todayMidnight, add);
    const ui = jsWeekdayToDeliveryInt(d.getDay());
    if (!allowed.has(ui)) continue;
    return d;
  }
  return null;
}

function parseSubscriptionCalendarDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return startOfDay(raw);
  }
  const s = String(raw).trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(dt.getTime()) ? null : startOfDay(dt);
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : startOfDay(dt);
}

function isFutureSubscriptionDeliveryCalendarDay(date: Date, now: Date): boolean {
  const today = startOfDay(now);
  const d0 = startOfDay(date);
  if (d0.getTime() <= today.getTime()) return false;
  return true;
}

/** Schedule-first next delivery (ignores stale API "today" after midnight). */
export function resolveUpcomingSubscriptionDeliveryDate(
  subscription: Subscription,
): Date | null {
  const now = new Date();
  const start = subscription.startDate
    ? parseSubscriptionCalendarDate(subscription.startDate)
    : null;
  const apiNext = subscription.nextDeliveryDate
    ? parseSubscriptionCalendarDate(subscription.nextDeliveryDate)
    : null;

  if (start && isFutureSubscriptionDeliveryCalendarDay(start, now)) {
    return start;
  }

  const fromSchedule = computeNextDeliveryFromSubscribedDays(subscription);
  if (fromSchedule) return startOfDay(fromSchedule);

  if (apiNext && isFutureSubscriptionDeliveryCalendarDay(apiNext, now)) {
    return apiNext;
  }

  return null;
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
 * Next delivery for an active subscription — prefer healed API date, then schedule.
 */
export function calculateNextDeliveryDate(subscription: Subscription): Date | null {
  return resolveUpcomingSubscriptionDeliveryDate(subscription);
}

/** e.g. "Tomorrow - Sat, 18 Apr" or "Sun, 18 Apr" */
export function formatHomepageNextDeliveryLine(subscription: Subscription): string {
  const next = resolveUpcomingSubscriptionDeliveryDate(subscription);
  if (!next) return "—";
  return formatNextDeliveryDateLine(next);
}

/** Resume date for manual pauses — not wallet-driven pauses or past resume dates. */
export function getPausedResumeDate(subscription: Subscription): Date | null {
  if (subscription.status !== "PAUSED" && subscription.status !== "INACTIVE") {
    return null;
  }
  if (isSubscriptionPausedForInsufficientWallet(subscription)) {
    return null;
  }
  const candidates: Date[] = [];
  const next = subscription.nextDeliveryDate;
  if (next && !Number.isNaN(next.getTime())) candidates.push(next);
  const until = subscription.pausedUntilDate;
  if (until && !Number.isNaN(until.getTime())) candidates.push(until);
  if (!candidates.length) return null;
  const resume = candidates.sort((a, b) => a.getTime() - b.getTime())[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resumeDay = new Date(resume);
  resumeDay.setHours(0, 0, 0, 0);
  if (resumeDay.getTime() < today.getTime()) return null;
  return resume;
}

/** Paused copy — wallet pauses omit "paused till"; manual pauses show future resume date. */
export function formatPausedDeliveryLine(subscription: Subscription): string {
  if (isSubscriptionPausedForInsufficientWallet(subscription)) {
    const display =
      (subscription as { pauseReasonDisplay?: string }).pauseReasonDisplay ||
      "Insufficient Wallet Balance";
    return display;
  }
  const resume = getPausedResumeDate(subscription);
  if (resume) {
    return `Paused till ${format(resume, "d MMM yyyy")}`;
  }
  return "Paused";
}

/** Namaste carousel — subscription status (replaces delivery time slot row). */
function isNamastePausedStatus(status: Subscription["status"] | undefined): boolean {
  const s = String(status ?? "").toUpperCase();
  return s === "PAUSED" || s === "INACTIVE";
}

export function formatNamasteSubscriptionStatusLine(
  subscription: Subscription,
): string {
  if (isNamastePausedStatus(subscription.status)) {
    return "Paused";
  }
  if (subscription.status === "ACTIVE") {
    return "Active";
  }
  if (subscription.status === "CANCELLED") {
    return "Cancelled";
  }
  const raw = String(subscription.status ?? "").trim();
  if (!raw) return "—";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** GP Daily home Namaste row — API next delivery, then schedule fallback. */
export function formatNamasteDeliveryLine(subscription: Subscription): string {
  if (isNamastePausedStatus(subscription.status)) {
    return formatPausedDeliveryLine(subscription);
  }

  const upcoming = resolveUpcomingSubscriptionDeliveryDate(subscription);
  if (upcoming) {
    return formatNextDeliveryDateLine(upcoming);
  }

  return "No upcoming delivery scheduled";
}

export function subscriptionProductLabel(subscription: Subscription): string {
  const n =
    subscription.productDetails?.name?.trim() ||
    subscription.basePackDetails?.name?.trim() ||
    "";
  return n || "Subscription";
}
