import { GP_DAILY_WALLET_PAUSE_SCHEDULE_KEY } from "./gpDailyWalletHold";

export function readWalletPauseScheduleYmd(): string | null {
  try {
    return localStorage.getItem(GP_DAILY_WALLET_PAUSE_SCHEDULE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function writeWalletPauseScheduleYmd(ymd: string | null): void {
  try {
    if (!ymd) {
      localStorage.removeItem(GP_DAILY_WALLET_PAUSE_SCHEDULE_KEY);
      return;
    }
    localStorage.setItem(GP_DAILY_WALLET_PAUSE_SCHEDULE_KEY, ymd);
  } catch {
    /* ignore */
  }
}
