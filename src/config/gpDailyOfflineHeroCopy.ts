export function gpDailyOfflineGreeting(firstName: string): string {
  const name = firstName.trim() || "there";
  return `We're offline, ${name}!`;
}

export const GP_DAILY_OFFLINE_MESSAGE =
  "Genda Phool will be back soon with a basket full of fresh flowers!";

export const GP_DAILY_OFFLINE_HINT = "You can still browse our products!";
