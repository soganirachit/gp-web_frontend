import { addressService, type Address } from "./address.service";
import { cartService } from "./cart.service";
import {
  notifyGpsCatalogLocationUpdated,
  storeService,
} from "./store.service";
import { resolveGpDailyZoneAtLatLng } from "./subscriptionZone.service";
import { applyGpDailyBrowseDeliveryAddress } from "../utils/gpDailyAddressStoreChange";
import { persistSelectedBrowseAddress } from "../utils/applySharedBrowseDeliveryAddress";
import { clearSelectedDeliveryAddress } from "../utils/selectedDeliveryAddressStorage";
import { requestBrowserGeolocation } from "../utils/requestBrowserGeolocation";
import { pickSavedAddressNearGps } from "../utils/pickSavedAddressNearGps";
import { haversineMeters } from "../utils/geoMeters";
import {
  GPS_MOVE_RECHECK_METERS,
  channelFromPathname,
  getLocationSession,
  getSessionPin,
  isGuestLocationFrozen,
  lockStickyManualNewLoadPolicy,
  recordGpsSample,
  resetLocationSession,
  resumeAutoMode,
  setLocationSession,
  skipStickyManualPin,
  type LocationChannel,
  type LocationSession,
} from "../utils/locationSession";
import { parseAddressCoordinates } from "../utils/addressCoordinates";
import { getStoreVisitOverrideId } from "../utils/storeVisitOverride";
import { GP_OPEN_GUEST_AREA_MODAL_EVENT } from "../config/guestAreaModalCopy";

function isLoggedIn(): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem("phoneNumber");
}

function persistUserCoords(lat: number, lng: number): void {
  recordGpsSample(lat, lng);
}

function defaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? null;
}

async function readGps(): Promise<{ lat: number; lng: number } | null> {
  try {
    const pos = await requestBrowserGeolocation();
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    persistUserCoords(lat, lng);
    return { lat, lng };
  } catch {
    return null;
  }
}

async function applyStorePin(lat: number, lng: number): Promise<number | null> {
  const visitStoreId = getStoreVisitOverrideId();
  if (visitStoreId != null) {
    return visitStoreId;
  }
  try {
    const cov = await addressService.validateAddressInDeliveryArea(`${lat},${lng}`);
    if (!cov.isValid) {
      setLocationSession({ storeId: null }, false);
      return null;
    }
    const store = await storeService.getSelectableNearestStore(lat, lng);
    if (!store) {
      setLocationSession({ storeId: null }, false);
      return null;
    }
    const current = storeService.getSelectedStoreId();
    if (current !== store.id) {
      if (isLoggedIn()) {
        try {
          await cartService.switchCartStore(store.id);
        } catch {
          /* empty cart */
        }
        try {
          await storeService.switchStore(store.id);
        } catch {
          storeService.setTemporaryStoreId(store.id);
        }
      } else {
        storeService.setTemporaryStoreId(store.id);
      }
    }
    setLocationSession({ storeId: store.id }, false);
    return store.id;
  } catch {
    setLocationSession({ storeId: null }, false);
    return null;
  }
}

async function applyDailyPin(
  lat: number,
  lng: number,
  address?: Address | null,
): Promise<number | null> {
  try {
    if (address && isLoggedIn() && Number(address.id) > 0) {
      try {
        await applyGpDailyBrowseDeliveryAddress(address);
      } catch {
        /* outside zone — still try lat/lng store */
      }
    }
    const zone = await resolveGpDailyZoneAtLatLng(lat, lng);
    if (!zone.eligible || zone.storeId == null) {
      setLocationSession({ dailyStoreId: null }, false);
      return null;
    }
    storeService.setTemporaryStoreId(zone.storeId);
    setLocationSession({ dailyStoreId: zone.storeId }, false);
    return zone.storeId;
  } catch {
    setLocationSession({ dailyStoreId: null }, false);
    return null;
  }
}

function applySavedAutoAddress(address: Address): void {
  persistSelectedBrowseAddress(address);
  const coords = parseAddressCoordinates(address.coordinates);
  setLocationSession(
    {
      mode: "auto",
      addressId: String(address.id),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
    false,
  );
}

function clearStaleManualBrowsePins(): void {
  storeService.clearGuestBrowseAddress();
  storeService.setGpStoreCatalogAddressOverrideId(null);
  try {
    clearSelectedDeliveryAddress();
  } catch {
    /* ignore */
  }
}

function applyGpsOnlyAuto(lat: number, lng: number): void {
  clearStaleManualBrowsePins();
  setLocationSession(
    {
      mode: "auto",
      addressId: null,
      lat,
      lng,
    },
    false,
  );
}

function applyDefaultAuto(address: Address | null): void {
  if (!address) {
    setLocationSession(
      { mode: "auto", addressId: null, lat: null, lng: null },
      false,
    );
    return;
  }
  persistSelectedBrowseAddress(address);
  const coords = parseAddressCoordinates(address.coordinates);
  setLocationSession(
    {
      mode: "auto",
      addressId: String(address.id),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
    false,
  );
}

async function liveCheckPin(
  channel: LocationChannel,
  pin: { lat: number; lng: number },
  address?: Address | null,
): Promise<void> {
  if (channel === "store") {
    await applyStorePin(pin.lat, pin.lng);
    return;
  }
  if (channel === "daily") {
    await applyDailyPin(pin.lat, pin.lng, address);
    return;
  }
  await Promise.all([
    applyStorePin(pin.lat, pin.lng),
    applyDailyPin(pin.lat, pin.lng, address),
  ]);
}

async function resolveLoggedInAuto(
  channel: LocationChannel,
): Promise<LocationSession> {
  const addresses = await addressService.getAllAddresses().catch(() => [] as Address[]);
  const gps = await readGps();
  if (gps) {
    const matched = pickSavedAddressNearGps(gps.lat, gps.lng, addresses);
    if (matched) {
      applySavedAutoAddress(matched);
      await liveCheckPin(channel, gps, matched);
    } else {
      applyGpsOnlyAuto(gps.lat, gps.lng);
      await liveCheckPin(channel, gps, null);
    }
  } else {
    const fallback = defaultAddress(addresses);
    applyDefaultAuto(fallback);
    const pin = fallback ? parseAddressCoordinates(fallback.coordinates) : null;
    if (pin) await liveCheckPin(channel, pin, fallback);
  }
  notifyGpsCatalogLocationUpdated();
  return getLocationSession();
}

async function resolveGuestAuto(channel: LocationChannel): Promise<void> {
  if (isGuestLocationFrozen()) return;
  const gps = await readGps();
  // City pick / browse address can land while GPS is still timing out (~15–35s).
  if (getLocationSession().mode === "manual") return;
  if (!gps) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(GP_OPEN_GUEST_AREA_MODAL_EVENT, {
          detail: {
            variant: "need_location",
            dismissible: channel === "home",
            redirectToAddressAfterPick: channel !== "home",
          },
        }),
      );
    }
    return;
  }
  clearStaleManualBrowsePins();
  setLocationSession(
    { mode: "auto", addressId: null, lat: gps.lat, lng: gps.lng },
    false,
  );
  await liveCheckPin(channel, gps, null);
  const session = getLocationSession();
  let fullyOut = false;
  if (channel === "store") {
    fullyOut = session.storeId == null;
  } else if (channel === "daily" && session.dailyStoreId == null) {
    const storeId =
      session.storeId ?? (await applyStorePin(gps.lat, gps.lng));
    fullyOut = storeId == null;
  }
  notifyGpsCatalogLocationUpdated();
  if (fullyOut && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(GP_OPEN_GUEST_AREA_MODAL_EVENT, {
        detail: {
          variant: "outside_service",
          dismissible: channel === "home",
          redirectToAddressAfterPick: channel !== "home",
        },
      }),
    );
  }
}

export async function maybeSkipStickyManualOnNewLoad(): Promise<void> {
  if (!lockStickyManualNewLoadPolicy()) return;
  if (getLocationSession().mode !== "manual") return;
  const gps = await readGps();
  skipStickyManualPin({
    gpsAvailable: gps != null,
    loggedIn: isLoggedIn(),
  });
}

/**
 * Refresh catalogs for the session pin. Auto: GPS (+ saved-address rank).
 * Manual stays for this visit. A new page load skips Manual only when GPS
 * is on, or when logged in (default-address fallback). Guests with GPS off
 * keep the last city pick.
 */
export async function refreshLocationForChannel(
  channel: LocationChannel,
): Promise<void> {
  await maybeSkipStickyManualOnNewLoad();
  if (isLoggedIn()) {
    const session = getLocationSession();
    if (session.mode === "manual") {
      const pin = getSessionPin();
      if (!pin) return;
      let address: Address | null = null;
      if (session.addressId) {
        const all = await addressService.getAllAddresses().catch(() => [] as Address[]);
        address = all.find((a) => String(a.id) === String(session.addressId)) ?? null;
      }
      await liveCheckPin(channel, pin, address);
      notifyGpsCatalogLocationUpdated();
      return;
    }
    await resolveLoggedInAuto(channel);
    return;
  }
  if (isGuestLocationFrozen()) {
    const pin = getSessionPin();
    if (pin) {
      await liveCheckPin(channel, pin, null);
      notifyGpsCatalogLocationUpdated();
    }
    return;
  }
  await resolveGuestAuto(channel);
}

export async function resumeAutoAndResolve(
  channel: LocationChannel = "home",
): Promise<void> {
  resumeAutoMode();
  storeService.setGpStoreCatalogAddressOverrideId(null);
  await refreshLocationForChannel(channel);
}

export function handleGpsWatchSample(lat: number, lng: number): void {
  const prev = getLocationSession();
  persistUserCoords(lat, lng);
  if (prev.mode !== "auto") return;
  if (isGuestLocationFrozen()) return;
  const lastLat = prev.lastGpsLat;
  const lastLng = prev.lastGpsLng;
  if (lastLat == null || lastLng == null) {
    setLocationSession({ lastGpsLat: lat, lastGpsLng: lng }, false);
    return;
  }
  const moved =
    haversineMeters({ lat: lastLat, lng: lastLng }, { lat, lng }) >=
    GPS_MOVE_RECHECK_METERS;
  if (!moved) return;
  setLocationSession({ lastGpsLat: lat, lastGpsLng: lng }, false);
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/home";
  const channel: LocationChannel = path.startsWith("/gp-daily")
    ? "daily"
    : path.startsWith("/gp-store")
      ? "store"
      : "home";
  void refreshLocationForChannel(channel);
}

export function onAuthLoginResetLocation(): void {
  resetLocationSession();
}

export function onAuthLogoutResetLocation(): void {
  resetLocationSession();
}

export { channelFromPathname };
