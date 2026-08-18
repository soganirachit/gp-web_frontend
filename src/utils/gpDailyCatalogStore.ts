import { storeService } from "../services/store.service";
import { subscriptionCartService } from "../services/subscriptionCart.service";

/**
 * GP Daily product/category APIs: prefer subscription cart `store_id` (zone from delivery
 * address). Otherwise use the guest/area temporary store only — not GP Store “selected store”
 * from account settings (`selectedStoreId`).
 */
export async function resolveGpDailyCatalogStoreId(): Promise<number | undefined> {
  const token = localStorage.getItem("access_token");
  if (token) {
    try {
      const cart = await subscriptionCartService.getDailyCart();
      const cid = cart?.store_id;
      if (cid != null && Number.isFinite(Number(cid))) return Number(cid);
    } catch {
      /* cart fetch optional — fall through */
    }
  }
  const temp = storeService.getTemporaryStoreId();
  return temp ?? undefined;
}

/**
 * Store ids that can affect the GP Daily offline hero — catalog / zone / temp store
 * without switching the user to a different store.
 */
export async function resolveGpDailyOfflineStoreCandidates(
  zoneStoreId?: number | null,
  extraStoreIds: number[] = [],
): Promise<{ primaryStoreId: number | null; storeIds: number[] }> {
  const fromProducts = storeService.getStoreIdForProducts();
  const fromCatalog = await resolveGpDailyCatalogStoreId().catch(() => undefined);
  const tempStoreId = storeService.getTemporaryStoreId();
  const storeIds = [
    fromProducts,
    fromCatalog,
    zoneStoreId,
    tempStoreId,
    ...extraStoreIds,
  ].filter(
    (id): id is number =>
      id != null && Number.isFinite(Number(id)) && Number(id) > 0,
  );
  const uniqueIds = [...new Set(storeIds.map(Number))];
  return {
    primaryStoreId: fromProducts ?? fromCatalog ?? zoneStoreId ?? null,
    storeIds: uniqueIds,
  };
}
