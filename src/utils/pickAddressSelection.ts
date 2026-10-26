import type { Address } from "../services/address.service";
import type { GuestBrowseAddressSnapshot } from "../services/store.service";
import { pickSavedAddressNearGps } from "./pickSavedAddressNearGps";
import type { LocationSession } from "./locationSession";

export type GuestAddressFormSource =
  | { kind: "auto_pin"; pin: { lat: number; lng: number } }
  | { kind: "browse"; snapshot: GuestBrowseAddressSnapshot }
  | { kind: "manual_pin"; pin: { lat: number; lng: number } }
  | { kind: "empty" };

/**
 * Guest address form: Auto GPS uses the live session pin, never a leftover
 * Manual browse address from an earlier visit.
 */
export function resolveGuestAddressFormSource(input: {
  frozen: boolean;
  pin: { lat: number; lng: number } | null;
  snapshot: GuestBrowseAddressSnapshot | null;
}): GuestAddressFormSource {
  if (!input.frozen && input.pin) {
    return { kind: "auto_pin", pin: input.pin };
  }
  if (input.snapshot) {
    return { kind: "browse", snapshot: input.snapshot };
  }
  if (input.pin) {
    return { kind: "manual_pin", pin: input.pin };
  }
  return { kind: "empty" };
}

/** Open the address form for a leftover browse pin, or for Auto GPS. */
export function guestShouldOpenAddressForm(input: {
  hasBrowseAddress: boolean;
  frozen: boolean;
  hasPin: boolean;
}): boolean {
  if (input.hasBrowseAddress) return true;
  return !input.frozen && input.hasPin;
}

/**
 * Which saved row is highlighted on Choose location.
 * Auto GPS with no 120 m match must not keep a leftover selected address.
 */
export function pickLoggedInAddressSelection(
  session: LocationSession,
  saved: Address[],
  stored: Address | null,
): Address | null {
  if (session.mode === "auto" && session.addressId) {
    const fromSession = saved.find(
      (a) => String(a.id) === String(session.addressId),
    );
    if (fromSession) return fromSession;
  }
  if (
    session.mode === "auto" &&
    session.lat != null &&
    session.lng != null &&
    !session.addressId
  ) {
    return (
      pickSavedAddressNearGps(session.lat, session.lng, saved) ?? null
    );
  }
  if (stored?.id) {
    const live = saved.find((a) => String(a.id) === String(stored.id));
    if (live) return live;
    if (stored.streetName || stored.area || stored.houseNo) return stored;
  }
  return saved.find((a) => a.isDefault) ?? saved[0] ?? null;
}
