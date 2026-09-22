import type { Address } from "../services/address.service";
import { storeService, notifyGpsCatalogLocationUpdated } from "../services/store.service";
import {
  extractDailyCartFromSetAddressResponse,
  isSubscriptionCartStoreChangeConfirmation,
  normalizeSubscriptionCartSetAddressResponse,
  subscriptionCartService,
} from "../services/subscriptionCart.service";
import { resolveGpDailyZoneAtLatLng } from "../services/subscriptionZone.service";
import { formatSavedAddressLine } from "./resolveHomeCatalogHeaderAddress";
import { notifyDailyCartUpdated } from "./dailyCartEvents";

export const GP_DAILY_ADDRESS_STORE_CHANGE_EVENT = "gp-daily-address-store-change";

export type GpDailyAddressStoreChangeDetail = {
  addressId: number;
  message: string;
};

export function dispatchGpDailyAddressStoreChange(
  detail: GpDailyAddressStoreChangeDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GP_DAILY_ADDRESS_STORE_CHANGE_EVENT, { detail }),
  );
}

/**
 * Logged-in GP Daily: sync subscription cart + catalog store for a browse address.
 * Dispatches GP_DAILY_ADDRESS_STORE_CHANGE_EVENT when the server needs confirmation.
 */
export async function applyGpDailyBrowseDeliveryAddress(
  address: Address,
): Promise<"ok" | "pending_confirmation"> {
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

  const zone = await resolveGpDailyZoneAtLatLng(lat, lng);
  if (!zone.eligible || zone.storeId == null) {
    throw new Error(
      zone.message?.trim() ||
        "Genda Phool Daily is not available at this address.",
    );
  }

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

  storeService.setTemporaryStoreId(zone.storeId);

  const addressId = Number(address.id);
  if (!Number.isFinite(addressId) || addressId <= 0) {
    notifyGpsCatalogLocationUpdated();
    return "ok";
  }

  const raw = await subscriptionCartService.setDeliveryAddress(addressId, false);
  const normalized = normalizeSubscriptionCartSetAddressResponse(raw);
  if (isSubscriptionCartStoreChangeConfirmation(normalized)) {
    const newStoreName = (
      normalized as { new_store?: { name?: string } }
    ).new_store?.name;
    const msg =
      typeof normalized.message === "string" && normalized.message.trim()
        ? normalized.message.trim()
        : `Your delivery address maps to ${newStoreName ?? "a different store"}. Continuing will update your daily basket for this store.`;
    dispatchGpDailyAddressStoreChange({ addressId, message: msg });
    return "pending_confirmation";
  }

  const cart = extractDailyCartFromSetAddressResponse(raw);
  const cartStoreId = cart?.store_id != null ? Number(cart.store_id) : null;
  if (cartStoreId != null && Number.isFinite(cartStoreId)) {
    storeService.setTemporaryStoreId(cartStoreId);
    try {
      await storeService.switchStore(cartStoreId);
    } catch {
      /* account store optional */
    }
  }
  notifyDailyCartUpdated(cart);
  notifyGpsCatalogLocationUpdated();
  return "ok";
}

export async function confirmGpDailyAddressStoreChange(
  addressId: number,
): Promise<void> {
  const raw = await subscriptionCartService.setDeliveryAddress(addressId, true);
  const normalized = normalizeSubscriptionCartSetAddressResponse(raw);
  if (isSubscriptionCartStoreChangeConfirmation(normalized)) {
    throw new Error("Could not confirm address change. Try again.");
  }
  const cart = extractDailyCartFromSetAddressResponse(raw);
  const cartStoreId = cart?.store_id != null ? Number(cart.store_id) : null;
  if (cartStoreId != null && Number.isFinite(cartStoreId)) {
    storeService.setTemporaryStoreId(cartStoreId);
    try {
      await storeService.switchStore(cartStoreId);
    } catch {
      /* ignore */
    }
  }
  notifyDailyCartUpdated(cart);
  notifyGpsCatalogLocationUpdated();
}
