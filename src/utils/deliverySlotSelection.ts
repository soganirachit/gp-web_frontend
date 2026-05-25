/** Parse "HH:mm:ss" / "HH:mm" into minutes from midnight. */
export function slotTimeToMinutes(timeStr: string): number {
  const [h = "0", m = "0"] = (timeStr || "").split(":");
  return Number(h) * 60 + Number(m);
}

export type SlotWindowSource = {
  slot_name?: string;
  start_time: string;
  end_time: string;
};

/**
 * Same-day slot window in minutes from midnight.
 * Fixes common backend typo: 1 PM stored as "01:00:00" for Afternoon (e.g. 13:00–16:00).
 */
export function getSlotWindowMinutes(slot: SlotWindowSource): {
  start: number;
  end: number;
} {
  const rawStart = slotTimeToMinutes(slot.start_time);
  const end = slotTimeToMinutes(slot.end_time);
  let start = rawStart;
  if (end <= start) return { start, end };

  const name = (slot.slot_name || "").toLowerCase();
  const startsVeryEarly = rawStart < 7 * 60;
  const endsAfternoon = end >= 13 * 60;
  const afternoonLike =
    name.includes("afternoon") ||
    name.includes("evening") ||
    name.includes("noon");

  if (startsVeryEarly && endsAfternoon && (afternoonLike || rawStart <= 2 * 60)) {
    const parts = (slot.start_time || "").split(":");
    const h = Number(parts[0] ?? 0);
    const mi = Number(parts[1] ?? 0);
    if (Number.isFinite(h) && h >= 0 && h <= 6) {
      const shifted = (h + 12) * 60 + (Number.isFinite(mi) ? mi : 0);
      if (shifted < end) start = shifted;
    }
  }
  return { start, end };
}

/** True when delivery is scheduled for the calendar day of `date` (local). */
export function isDeliveryDateToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * For today: hide slots whose start time has already passed.
 * For future dates: all API-available slots remain selectable.
 */
export function isDeliverySlotSelectableForDate(
  slot: SlotWindowSource,
  date: Date,
  now: Date = new Date(),
): boolean {
  if (!isDeliveryDateToday(date)) return true;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const { start } = getSlotWindowMinutes(slot);
  return start > nowMinutes;
}
