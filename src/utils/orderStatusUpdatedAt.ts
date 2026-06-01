/** Prefer latest timeline status update, then delivery timestamps, then created. */
export function resolveOrderStatusUpdatedAt(
  order: Record<string, unknown>,
): string | null {
  const timeline = order.timeline;
  if (Array.isArray(timeline) && timeline.length > 0) {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const entry = timeline[i] as Record<string, unknown>;
      const at = entry?.status_updated_at ?? entry?.statusUpdatedAt;
      if (typeof at === "string" && at.trim()) return at.trim();
    }
  }

  const latestStatus = order.latest_status;
  if (latestStatus && typeof latestStatus === "object") {
    const at =
      (latestStatus as Record<string, unknown>).status_updated_at ??
      (latestStatus as Record<string, unknown>).statusUpdatedAt;
    if (typeof at === "string" && at.trim()) return at.trim();
  }

  const direct = order.status_updated_at ?? order.statusUpdatedAt;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const delivered = order.delivered_at ?? order.deliveredAt;
  if (typeof delivered === "string" && delivered.trim()) return delivered.trim();

  const created = order.created_at ?? order.createdAt;
  if (typeof created === "string" && created.trim()) return created.trim();

  return null;
}

export function formatOrderListStatusTimeLabel(
  order: Record<string, unknown>,
): string {
  const raw = resolveOrderStatusUpdatedAt(order);
  if (!raw) return "—";
  try {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "—";
    const now = new Date();
    const isToday = now.toDateString() === dt.toDateString();
    if (isToday) {
      return `Today, ${dt.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
    return `${dt.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}, ${dt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}
