import type { Subscription } from "../services/subscription.service";

/**
 * Next calendar delivery date for an active subscription (aligned with Manage My Subscriptions logic).
 */
export function calculateNextDeliveryDate(subscription: Subscription): Date | null {
  if (subscription.status === "PAUSED" || subscription.status === "INACTIVE") {
    return null;
  }

  const today = new Date();
  const currentDay = today.getDay();

  const dayMap: { [key: string]: number } = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    tues: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    thur: 4,
    thurs: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };

  if (subscription.deliveryPreference === "DAILY" || subscription.type === "DAILY") {
    const nextDeliveryDate = new Date(today);
    nextDeliveryDate.setDate(today.getDate() + 1);
    if (nextDeliveryDate.getDay() === 0) {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    }
    return nextDeliveryDate;
  }

  if (subscription.deliveryPreference === "CUSTOM" || subscription.type === "CUSTOM") {
    let subscribedDays: number[] = [];
    const deliveryDays = subscription.deliveryDays || subscription.selectedDays || [];

    if (deliveryDays.length > 0) {
      subscribedDays = deliveryDays
        .map((day: unknown) => {
          if (typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6) {
            return (day + 1) % 7;
          }
          const str = String(day ?? "")
            .toLowerCase()
            .trim();
          return dayMap[str] !== undefined ? dayMap[str] : -1;
        })
        .filter((d: number) => d !== -1);
    }

    if (subscribedDays.length === 0) {
      subscribedDays = [1, 2, 3, 4, 5, 6, 0];
    }

    let daysToAdd = 1;
    while (daysToAdd <= 7) {
      const nextDay = (currentDay + daysToAdd) % 7;
      if (subscribedDays.includes(nextDay)) {
        const nextDeliveryDate = new Date(today);
        nextDeliveryDate.setDate(today.getDate() + daysToAdd);
        return nextDeliveryDate;
      }
      daysToAdd++;
    }
  }

  const nextDeliveryDate = new Date(today);
  nextDeliveryDate.setDate(today.getDate() + 1);
  if (nextDeliveryDate.getDay() === 0) {
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
  }
  return nextDeliveryDate;
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** e.g. "Tomorrow - Sat, 18 Apr" or "Sun, 18 Apr" */
export function formatHomepageNextDeliveryLine(subscription: Subscription): string {
  const next = calculateNextDeliveryDate(subscription);
  if (!next) return "—";

  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const d0 = startOfDay(next);
  const part = `${SHORT_DAYS[next.getDay()]}, ${next.getDate()} ${SHORT_MONTHS[next.getMonth()]}`;

  if (d0.getTime() === tomorrow.getTime()) {
    return `Tomorrow - ${part}`;
  }
  return part;
}

export function subscriptionProductLabel(subscription: Subscription): string {
  const n =
    subscription.productDetails?.name?.trim() ||
    subscription.basePackDetails?.name?.trim() ||
    "";
  return n || "Subscription";
}
