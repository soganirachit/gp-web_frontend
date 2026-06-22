import { useCallback, useEffect, useState } from "react";
import { GUEST_STORE_UPDATED_EVENT, storeService } from "../services/store.service";
import { resolveGpDailyCatalogStoreId } from "../utils/gpDailyCatalogStore";
import {
  invalidateOrderingOfflineCache,
  isOrderingBlockedByStoreOffline,
} from "../utils/homeLocationHeroState";

function readDeviceCoords(): { lat: number | null; lng: number | null } {
  try {
    const raw = localStorage.getItem("userCoordinates");
    if (!raw) return { lat: null, lng: null };
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    /* ignore */
  }
  return { lat: null, lng: null };
}

export function useOrderingStoreOffline(cartStoreId?: number | null) {
  const [orderingStoreOffline, setOrderingStoreOffline] = useState(false);

  const refresh = useCallback(async () => {
    const { lat, lng } = readDeviceCoords();
    const catalogId =
      storeService.getStoreIdForProducts() ??
      (await resolveGpDailyCatalogStoreId()) ??
      null;
    const storeId = cartStoreId ?? catalogId ?? null;
    const blocked = await isOrderingBlockedByStoreOffline({
      storeId,
      storeIds: [cartStoreId, catalogId].filter(
        (id): id is number =>
          id != null && Number.isFinite(Number(id)) && Number(id) > 0,
      ),
      lat,
      lng,
    });
    setOrderingStoreOffline(blocked);
  }, [cartStoreId]);

  useEffect(() => {
    void refresh();
    const onStoreChange = () => {
      invalidateOrderingOfflineCache();
      void refresh();
    };
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, onStoreChange);
    window.addEventListener("addressUpdated", onStoreChange);
    return () => {
      window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onStoreChange);
      window.removeEventListener("addressUpdated", onStoreChange);
    };
  }, [refresh]);

  return orderingStoreOffline;
}
