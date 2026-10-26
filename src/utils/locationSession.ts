import type { Address } from "../services/address.service";
import { parseAddressCoordinates } from "./addressCoordinates";
import { clearStoreVisitOverride } from "./storeVisitOverride";

export const LOCATION_SESSION_KEY = "gp_location_session";
export const LOCATION_SESSION_UPDATED_EVENT = "gp-location-session-updated";

/** Re-resolve Auto GPS when the device has moved this far. */
export const GPS_MOVE_RECHECK_METERS = 1000;

export type LocationMode = "auto" | "manual";

export type LocationSession = {
  mode: LocationMode;
  /** Saved address id when GPS matched one, default fallback, or a manual pick. */
  addressId: string | null;
  lat: number | null;
  lng: number | null;
  lastGpsLat: number | null;
  lastGpsLng: number | null;
  /** Last live GP Store radius match for the session pin. */
  storeId: number | null;
  /** Last live GP Daily zone match for the session pin. */
  dailyStoreId: number | null;
};

const EMPTY_SESSION: LocationSession = {
  mode: "auto",
  addressId: null,
  lat: null,
  lng: null,
  lastGpsLat: null,
  lastGpsLng: null,
  storeId: null,
  dailyStoreId: null,
};

function notifyLocationSessionUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCATION_SESSION_UPDATED_EVENT));
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getLocationSession(): LocationSession {
  if (typeof localStorage === "undefined") return { ...EMPTY_SESSION };
  try {
    const raw = localStorage.getItem(LOCATION_SESSION_KEY);
    if (!raw?.trim()) return { ...EMPTY_SESSION };
    const parsed = JSON.parse(raw) as Partial<LocationSession>;
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      addressId:
        parsed.addressId != null && String(parsed.addressId).trim()
          ? String(parsed.addressId)
          : null,
      lat: numOrNull(parsed.lat),
      lng: numOrNull(parsed.lng),
      lastGpsLat: numOrNull(parsed.lastGpsLat),
      lastGpsLng: numOrNull(parsed.lastGpsLng),
      storeId: numOrNull(parsed.storeId),
      dailyStoreId: numOrNull(parsed.dailyStoreId),
    };
  } catch {
    return { ...EMPTY_SESSION };
  }
}

export function setLocationSession(
  patch: Partial<LocationSession>,
  notify = true,
): LocationSession {
  const next: LocationSession = { ...getLocationSession(), ...patch };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(next));
  }
  if (notify) notifyLocationSessionUpdated();
  return next;
}

export function resetLocationSession(): LocationSession {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LOCATION_SESSION_KEY);
  }
  notifyLocationSessionUpdated();
  return { ...EMPTY_SESSION };
}

export function isGuestLocationFrozen(): boolean {
  if (typeof localStorage === "undefined") return false;
  if (localStorage.getItem("phoneNumber")) return false;
  return getLocationSession().mode === "manual";
}

export function coordsFromAddress(
  address: Address,
): { lat: number; lng: number } | null {
  return parseAddressCoordinates(address.coordinates);
}

/** Manual pick: saved address or “order for others”. Sticky until the next page load. */
export function markManualSavedAddress(address: Address): void {
  clearStoreVisitOverride();
  const coords = coordsFromAddress(address);
  setLocationSession({
    mode: "manual",
    addressId: address.id != null ? String(address.id) : null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  });
}

/** Guest city picker or guest browse pin — freeze GPS auto. */
export function markManualGuest(coords?: {
  lat: number;
  lng: number;
} | null): void {
  clearStoreVisitOverride();
  setLocationSession({
    mode: "manual",
    addressId: null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    // Drop leftover Auto catalog ids so city pick / browse pin cannot keep
    // serving the previous GPS store until a live radius/zone check runs.
    storeId: null,
    dailyStoreId: null,
  });
}

/** “Use current location” — GPS is in charge again. */
export function resumeAutoMode(): void {
  clearStoreVisitOverride();
  setLocationSession({
    mode: "auto",
    addressId: null,
  });
}

/**
 * Manual is sticky during SPA navigation. On a new page load (reopen / hard
 * refresh) Auto may take over — but only when GPS is on, or the user is
 * logged in (default-address fallback). Guests with GPS off keep the last
 * city / browse pick so the city picker does not reopen.
 */
let stickyManualNewLoadLocked = false;

export function lockStickyManualNewLoadPolicy(): boolean {
  if (stickyManualNewLoadLocked) return false;
  stickyManualNewLoadLocked = true;
  return true;
}

export function skipStickyManualPin(input: {
  gpsAvailable: boolean;
  loggedIn: boolean;
}): boolean {
  if (getLocationSession().mode !== "manual") return false;
  if (!input.gpsAvailable && !input.loggedIn) return false;
  clearStoreVisitOverride();
  setLocationSession({
    mode: "auto",
    addressId: null,
    lat: null,
    lng: null,
    storeId: null,
    dailyStoreId: null,
  });
  return true;
}

/** Lock this document + maybe drop Manual. Used by tests. */
export function applyStickyManualNewLoadPolicy(input: {
  gpsAvailable: boolean;
  loggedIn: boolean;
}): boolean {
  if (!lockStickyManualNewLoadPolicy()) return false;
  return skipStickyManualPin(input);
}

/** Test helper: pretend this is a fresh document load. */
export function resetStickyManualDocumentLoadFlag(): void {
  stickyManualNewLoadLocked = false;
}

export function recordGpsSample(lat: number, lng: number): void {
  try {
    localStorage.setItem("userCoordinates", JSON.stringify({ lat, lng }));
  } catch {
    /* ignore */
  }
  setLocationSession({ lastGpsLat: lat, lastGpsLng: lng }, false);
}

/** Explicit session pin only — never last GPS. City-pick freeze must not reuse a leftover fix. */
export type LocationChannel = "home" | "store" | "daily";

const NON_CATALOG_SEGMENTS = new Set([
  "account",
  "basket",
  "login",
  "otp",
  "choose-location",
  "address-selection",
  "addresses",
  "profile",
]);

export function channelFromPathname(pathname: string): LocationChannel | null {
  if (pathname === "/home" || pathname === "/") return "home";
  const isDaily =
    pathname === "/gp-daily" || pathname.startsWith("/gp-daily/");
  const isStore =
    pathname === "/gp-store" || pathname.startsWith("/gp-store/");
  if (!isDaily && !isStore) return null;
  const rest = pathname.replace(/^\/gp-(daily|store)\/?/, "");
  const first = rest.split("/").filter(Boolean)[0] ?? "";
  if (first && NON_CATALOG_SEGMENTS.has(first)) return null;
  return isDaily ? "daily" : "store";
}

export function getSessionPin(): { lat: number; lng: number } | null {
  const s = getLocationSession();
  if (
    s.lat != null &&
    s.lng != null &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng)
  ) {
    return { lat: s.lat, lng: s.lng };
  }
  return null;
}

/**
 * Daily catalog store: live zone id only. If the session has a pin, never fall
 * back to GP Store's temporary store (Store-yes / Daily-no would otherwise
 * browse the Store leftover).
 */
export function dailyCatalogStoreIdFromSession(
  session: LocationSession = getLocationSession(),
  tempStoreId: number | null = null,
): number | null {
  const live = session.dailyStoreId;
  if (live != null && Number.isFinite(live) && live > 0) return live;
  const pin =
    session.lat != null &&
    session.lng != null &&
    Number.isFinite(session.lat) &&
    Number.isFinite(session.lng);
  if (pin) return null;
  if (tempStoreId != null && Number.isFinite(tempStoreId) && tempStoreId > 0) {
    return tempStoreId;
  }
  return null;
}
