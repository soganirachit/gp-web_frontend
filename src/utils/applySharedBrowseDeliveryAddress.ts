import type { Address } from "../services/address.service";
import { addressService } from "../services/address.service";
import { storeService, notifyGpsCatalogLocationUpdated } from "../services/store.service";
import { cartService } from "../services/cart.service";
import { applyGpDailyBrowseDeliveryAddress } from "./gpDailyAddressStoreChange";
import { formatSavedAddressLine } from "./resolveHomeCatalogHeaderAddress";

const LANDING_ADDRESS_RETURN_KEY = "gpLandingAddressReturn";

export function markLandingAddressReturn(): void {
  try {
    sessionStorage.setItem(LANDING_ADDRESS_RETURN_KEY, "/home");
  } catch {
    /* ignore */
  }
}

export function consumeLandingAddressReturn(): string | null {
  try {
    const v = sessionStorage.getItem(LANDING_ADDRESS_RETURN_KEY);
    sessionStorage.removeItem(LANDING_ADDRESS_RETURN_KEY);
    return v === "/home" ? "/home" : null;
  } catch {
    return null;
  }
}

export function peekLandingAddressReturn(): boolean {
  try {
    return sessionStorage.getItem(LANDING_ADDRESS_RETURN_KEY) === "/home";
  } catch {
    return false;
  }
}

export function persistSelectedBrowseAddress(address: Address): void {
  storeService.setGpStoreCatalogAddressOverrideId(String(address.id));
  try {
    localStorage.setItem("selectedDeliveryAddress", JSON.stringify(address));
    const headerLine = formatSavedAddressLine(address);
    if (headerLine.trim()) {
      localStorage.setItem("userLocation", headerLine);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Landing / shared picker: bind one saved address for both GP Store and GP Daily.
 * Store catalog uses nearest store; Daily uses zone cart store_id.
 * Out-of-coverage for one vertical does not roll back the selection.
 */
export async function applySharedBrowseDeliveryAddress(
  address: Address,
): Promise<void> {
  const parts = (address.coordinates || "")
    .split(",")
    .map((s) => parseFloat(s.trim()));
  const lat = parts[0];
  const lng = parts[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(
      "This address has no map pin. Edit the address to set location on the map.",
    );
  }

  persistSelectedBrowseAddress(address);

  try {
    await applyGpDailyBrowseDeliveryAddress(address);
  } catch {
    /* Daily may be outside zone — keep the selected address for Store + header */
  }

  try {
    const cov = await addressService.validateAddressInDeliveryArea(
      `${lat},${lng}`,
    );
    if (cov.isValid) {
      const store = await storeService.getSelectableNearestStore(lat, lng);
      if (store) {
        const current = storeService.getSelectedStoreId();
        if (current !== store.id) {
          try {
            await cartService.switchCartStore(store.id);
          } catch {
            /* empty cart */
          }
          await storeService.switchStore(store.id);
        }
      }
    }
  } catch {
    /* Store may be outside radius — keep the selected address */
  }

  notifyGpsCatalogLocationUpdated();
}
