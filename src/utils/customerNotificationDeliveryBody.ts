import { resolveUpcomingSubscriptionDeliveryDate } from "./subscriptionNextDelivery";
import type { Subscription } from "../services/subscription.service";

/** Push/inbox: server sometimes says "Renewed" for a user resume action. */
export function patchSubscriptionResumeNotificationCopy(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/\bsubscription\s+renewed\b/gi, "Subscription Resumed")
    .replace(/\brenewed\b/gi, (match) => {
      if (match === "Renewed") return "Resumed";
      if (match === "RENEWED") return "RESUMED";
      return "resumed";
    });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatNotificationDeliveryDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseIsoDateField(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function notificationNeedsDeliveryDateFix(
  notificationType: string,
  body: string,
): boolean {
  const t = notificationType.toLowerCase();
  if (
    t.includes("subscription") ||
    t.includes("resume") ||
    t.includes("renew") ||
    t.includes("store") ||
    t.includes("online") ||
    t.includes("offline") ||
    t.includes("delivery")
  ) {
    return true;
  }
  return /scheduled for/i.test(body) || /next delivery/i.test(body);
}

export function patchNotificationBodyWithDeliveryDate(
  body: string,
  deliveryDate: Date,
): string {
  const trimmed = body.trim();
  if (!trimmed) return trimmed;
  const formatted = formatNotificationDeliveryDate(deliveryDate);
  if (/scheduled for/i.test(trimmed)) {
    return trimmed.replace(
      /scheduled for\s+[^.]+\./i,
      `scheduled for ${formatted}.`,
    );
  }
  if (/next delivery/i.test(trimmed)) {
    return trimmed.replace(
      /next delivery[^.]*\./gi,
      `Your next delivery is scheduled for ${formatted}.`,
    );
  }
  return `${trimmed} Your next delivery is scheduled for ${formatted}.`;
}

function resolveDateFromSubscription(sub: Subscription): Date | null {
  const upcoming = resolveUpcomingSubscriptionDeliveryDate(sub);
  if (!upcoming) return null;
  const day = new Date(upcoming);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() < startOfToday().getTime()) return null;
  return upcoming;
}

function subscriptionIdFromFields(
  notificationType: string,
  data: Record<string, unknown> | undefined,
  referenceId?: string,
  referenceType?: string,
): string | null {
  const d = data ?? {};
  const fromData =
    d.subscription_id ??
    d.subscriptionId ??
    (referenceType?.toLowerCase() === "subscription" ? referenceId : null);
  if (fromData != null && String(fromData).trim()) {
    return String(fromData).trim();
  }
  const t = notificationType.toLowerCase();
  if (t.includes("subscription") && referenceId?.trim()) {
    return referenceId.trim();
  }
  return null;
}

export function enrichCustomerNotificationBody(
  body: string,
  opts: {
    notification_type?: string;
    data?: Record<string, unknown>;
    reference_id?: string;
    reference_type?: string;
  },
  subscriptionsById?: Map<string, Subscription>,
): string {
  const notificationType = String(opts.notification_type ?? "").trim();
  let rawBody = patchSubscriptionResumeNotificationCopy(body || "");
  if (!rawBody) return rawBody;
  if (!notificationNeedsDeliveryDateFix(notificationType, rawBody)) {
    return rawBody;
  }

  const data = opts.data ?? {};
  const subId = subscriptionIdFromFields(
    notificationType,
    data,
    opts.reference_id,
    opts.reference_type,
  );

  if (subId && subscriptionsById?.has(subId)) {
    const fromSub = resolveDateFromSubscription(subscriptionsById.get(subId)!);
    if (fromSub) return patchNotificationBodyWithDeliveryDate(rawBody, fromSub);
  }

  const fromData =
    parseIsoDateField(data.next_delivery_date) ??
    parseIsoDateField(data.next_delivery) ??
    parseIsoDateField(data.scheduled_delivery_date);
  if (fromData) {
    const day = new Date(fromData);
    day.setHours(0, 0, 0, 0);
    if (day.getTime() >= startOfToday().getTime()) {
      return patchNotificationBodyWithDeliveryDate(rawBody, fromData);
    }
  }

  return rawBody;
}

export function buildSubscriptionsById(
  subs: Subscription[],
): Map<string, Subscription> {
  const map = new Map<string, Subscription>();
  for (const sub of subs) {
    if (sub.id) map.set(String(sub.id), sub);
  }
  return map;
}
