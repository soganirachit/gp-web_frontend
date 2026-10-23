import { storeService } from "../services/store.service";
import { subscriptionCartService } from "../services/subscriptionCart.service";
import {
  dailyCatalogStoreIdFromSession,
  getLocationSession,
} from "./locationSession";

/**
 * GP Daily product/category APIs: prefer the session Daily zone store, then
 * subscription cart `store_id`. Do not fall back to GP Store leftover temp
 * while the session has a pin (Store-yes / Daily-no).
 */
export async function resolveGpDailyCatalogStoreId(): Promise<number | undefined> {
  const fromSession = dailyCatalogStoreIdFromSession(
    getLocationSession(),
    storeService.getTemporaryStoreId(),
  );
  if (fromSession != null) return fromSession;
  const token = localStorage.getItem("access_token");
  if (token && !getLocationSession().lat && !getLocationSession().lng) {
    try {
      const cart = await subscriptionCartService.getDailyCart();
      const cid = cart?.store_id;
      if (cid != null && Number.isFinite(Number(cid))) return Number(cid);
    } catch {
      /* cart fetch optional — fall through */
    }
  }
  return undefined;
}

/**
 * Store ids that can affect the GP Daily offline hero — catalog / zone / temp store
 * without switching the user to a different store.
 */
export async function resolveGpDailyOfflineStoreCandidates(
  zoneStoreId?: number | null,
  extraStoreIds: number[] = [],
): Promise<{ primaryStoreId: number | null; storeIds: number[] }> {
  const fromCatalog = await resolveGpDailyCatalogStoreId().catch(() => undefined);
  const dailyLive = getLocationSession().dailyStoreId;
  const storeIds = [
    fromCatalog,
    dailyLive,
    zoneStoreId,
    ...extraStoreIds,
  ].filter(
    (id): id is number =>
      id != null && Number.isFinite(Number(id)) && Number(id) > 0,
  );
  const uniqueIds = [...new Set(storeIds.map(Number))];
  return {
    primaryStoreId: fromCatalog ?? dailyLive ?? zoneStoreId ?? null,
    storeIds: uniqueIds,
  };
}
