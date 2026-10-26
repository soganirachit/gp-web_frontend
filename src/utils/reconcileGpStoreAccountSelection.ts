import { cartService } from "../services/cart.service";
import type { Store } from "../services/store.service";
import {
  storeIsWithinDeliveryRadius,
  storeService,
} from "../services/store.service";
import { storeAcceptsCustomerOrders } from "./storeOperatingHours";
import { getLocationSession, setLocationSession } from "./locationSession";
import {
  accountStoreIdForCurrentPin,
  getStoreVisitOverrideId,
  setStoreVisitOverrideId,
} from "./storeVisitOverride";

function storeIsSelectableForOrders(store: Store): boolean {
  return storeIsWithinDeliveryRadius(store) && storeAcceptsCustomerOrders(store);
}

/**
 * Pick the store Account + cart APIs should use (logged-in GP Store).
 * Visit Account pick wins for this SPA session. Otherwise the nearest
 * covering store for the current location pin wins (leftover session ids
 * from a previous pin are ignored). Hard refresh drops the visit override.
 */
export function pickGpStoreForAccount(
  storesList: Store[],
  nearestStore: Store | null,
): Store | null {
  const byId = (id: number | null | undefined) =>
    id != null ? storesList.find((s) => s.id === id) ?? null : null;

  const pickedId = accountStoreIdForCurrentPin({
    overrideId: getStoreVisitOverrideId(),
    nearestId: nearestStore?.id ?? null,
    selectableIds: storesList
      .filter((s) => storeIsSelectableForOrders(s))
      .map((s) => s.id),
  });
  return byId(pickedId) ?? storesList[0] ?? null;
}

/** Sync backend cart + localStorage when account resolves a different store than before. */
export async function applyGpStoreAccountSelection(
  store: Store,
  previousId: number | null,
): Promise<void> {
  if (previousId === store.id && getLocationSession().storeId === store.id) {
    return;
  }
  try {
    await cartService.switchCartStore(store.id);
  } catch {
    /* empty cart or network */
  }
  try {
    await storeService.switchStore(store.id);
  } catch {
    localStorage.setItem("selectedStoreId", String(store.id));
  }
  setLocationSession({ storeId: store.id }, false);
}

/** Remember an Account store pick for this visit and point the catalog at it. */
export function rememberAccountStoreForVisit(storeId: number): void {
  setStoreVisitOverrideId(storeId);
  setLocationSession({ storeId }, false);
}
