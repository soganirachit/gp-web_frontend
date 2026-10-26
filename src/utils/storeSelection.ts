import type { Store } from "../services/store.service";
import { storeAcceptsCustomerOrders } from "./storeOperatingHours";

function parseMaxDeliveryRadiusKm(s: Store): number | null {
  const raw = s.max_delivery_radius_km;
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

function distanceKm(s: Store): number {
  const d = Number(s.distance_km);
  return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY;
}

/** Same rule as mobile: road `distance_km` vs `max_delivery_radius_km` from GET /stores/?lat=&lng= */
export function storeIsWithinDeliveryRadius(s: Store): boolean {
  const maxR = parseMaxDeliveryRadiusKm(s);
  const d = s.distance_km;
  if (maxR == null || d == null || Number.isNaN(Number(d))) return true;
  return Number(d) <= maxR;
}

export function sortStoresClosestFirst(stores: Store[]): Store[] {
  return [...stores].sort((a, b) => {
    const byDist = distanceKm(a) - distanceKm(b);
    if (byDist !== 0) return byDist;
    return Number(a.id) - Number(b.id);
  });
}

export type StorePinPickKind = "accepting" | "offline_covering" | null;

export type StorePinPick = {
  store: Store | null;
  kind: StorePinPickKind;
};

/**
 * GP Store catalog store for a pin.
 *
 * 1. Closest store that is accepting orders (not hours-closed / not staff-offline)
 *    and whose radius covers the pin.
 * 2. Else the closest covering store even if it is offline — so the area is still
 *    in-service and the offline hero can show, instead of “coming soon”.
 * 3. Else none — out of area.
 *
 * A newly added closer store wins on the next list fetch. Changing the pin
 * always re-runs this; the previous store id is never kept.
 */
export function pickNearestStoreForPin(stores: Store[]): StorePinPick {
  const covering = sortStoresClosestFirst(
    stores.filter(storeIsWithinDeliveryRadius),
  );
  const accepting = covering.filter((s) => storeAcceptsCustomerOrders(s));
  if (accepting[0]) {
    return { store: accepting[0], kind: "accepting" };
  }
  if (covering[0]) {
    return { store: covering[0], kind: "offline_covering" };
  }
  return { store: null, kind: null };
}

/** After a location change, catalog store is always the pick for the new pin. */
export function catalogStoreIdForNewPin(
  _previousStoreId: number | null,
  pick: StorePinPick,
): number | null {
  const id = pick.store?.id;
  if (id == null || !Number.isFinite(Number(id)) || Number(id) <= 0) return null;
  return Number(id);
}
