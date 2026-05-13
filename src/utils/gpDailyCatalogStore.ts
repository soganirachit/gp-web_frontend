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
