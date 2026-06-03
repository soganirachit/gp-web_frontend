import { cartService } from "../services/cart.service";
import { storeService } from "../services/store.service";

/**
 * Store ids to check for GP Store home offline hero — selected store, then cart store.
 */
export async function resolveGpStoreOfflineStoreCandidates(): Promise<{
  primaryStoreId: number | null;
  storeIds: number[];
}> {
  const fromProducts = storeService.getStoreIdForProducts();
  let fromCart: number | null = null;
  if (typeof localStorage !== "undefined" && localStorage.getItem("access_token")) {
    try {
      const cart = await cartService.getCartData();
      const cid = Number(cart?.store);
      if (Number.isFinite(cid) && cid > 0) fromCart = cid;
    } catch {
      /* cart optional */
    }
  } else {
    const temp = storeService.getTemporaryStoreId();
    if (temp != null) fromCart = temp;
  }
  const storeIds = [fromProducts, fromCart].filter(
    (id): id is number =>
      id != null && Number.isFinite(Number(id)) && Number(id) > 0,
  );
  const uniqueIds = [...new Set(storeIds.map(Number))];
  return {
    primaryStoreId: fromProducts ?? fromCart ?? null,
    storeIds: uniqueIds,
  };
}
