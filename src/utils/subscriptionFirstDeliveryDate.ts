import { addDays } from 'date-fns';

/**
 * GP Daily subscription: first `start_date` is the first calendar date on or after
 * **tomorrow** whose weekday is in `delivery_days` (Monday = 0 … Sunday = 6,
 * Python `weekday()` — same mapping as mobile `shortWeekdaysToIntegerDeliveryDays`).
 */
export function computeFirstSubscriptionDeliveryDateFromWeekdayInts(
  selectedApiWeekdays: readonly number[],
): Date {
  const tomorrow = addDays(new Date(), 1);
  const allowed = selectedApiWeekdays.filter(
    (n) => Number.isInteger(n) && n >= 0 && n <= 6,
  );
  if (allowed.length === 0) return tomorrow;
  for (let add = 0; add < 14; add++) {
    const candidate = addDays(tomorrow, add);
    const pyWeekday = (candidate.getDay() + 6) % 7;
    if (allowed.includes(pyWeekday)) return candidate;
  }
  return tomorrow;
}
