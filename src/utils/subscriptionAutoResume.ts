import type { Subscription } from "../services/subscription.service";

function subscriptionId(sub: Record<string, unknown>): string {
  return String(sub.id ?? sub.subscription_id ?? sub.subscriptionId ?? "").trim();
}

function normalizeStatus(sub: Record<string, unknown>): string {
  return String(sub.status ?? "").toLowerCase();
}

function getPauseReason(sub: Record<string, unknown>): string {
  return String(sub.pause_reason ?? sub.pauseReason ?? "").trim();
}

export function shouldAutoResumeSubscription(sub: Record<string, unknown>): boolean {
  if (normalizeStatus(sub) !== "paused") return false;
  const reason = getPauseReason(sub).toLowerCase();
  if (reason.includes("wallet") || reason.includes("insufficient")) return false;
  const raw = sub.paused_until_date ?? sub.pausedUntilDate;
  if (raw == null || String(raw).trim() === "") return false;
  const until = new Date(String(raw));
  if (Number.isNaN(until.getTime())) return false;
  until.setHours(23, 59, 59, 999);
  return Date.now() > until.getTime();
}

export function subscriptionsDueForAutoResume(
  subs: Array<Subscription | Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return subs.filter((s) => {
    const rec = s as Record<string, unknown>;
    const id = subscriptionId(rec);
    return id && shouldAutoResumeSubscription(rec);
  }) as Array<Record<string, unknown>>;
}
