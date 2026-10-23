import type { GuestBrowseAddressSnapshot } from "../services/store.service";
import { storeService } from "../services/store.service";
import { parseAddressCoordinates } from "./addressCoordinates";

/** Guest may save one local browse address and edit that same address without login. */
export function guestHasSavedBrowseAddress(): boolean {
  return storeService.getGuestBrowseAddress() != null;
}

/** First save and later edits of that one address stay on the guest form. */
export function canGuestEnterAddressWithoutLogin(): boolean {
  return true;
}

export type GuestAddressFormNavState = {
  fromHome?: boolean;
  guestBrowse?: boolean;
  fromLandingHome?: boolean;
  returnUrl?: string;
};

export function guestAddressFormNavState(
  extra?: Partial<GuestAddressFormNavState>,
): GuestAddressFormNavState {
  return {
    fromHome: true,
    guestBrowse: true,
    ...extra,
  };
}

export function formFieldsFromGuestBrowseAddress(
  snapshot: GuestBrowseAddressSnapshot,
): {
  houseNo: string;
  streetName: string;
  floor: string;
  area: string;
  landmark: string;
  coordinates: string;
} {
  const houseNo = snapshot.houseNo?.trim() ?? "";
  const streetName = snapshot.streetName?.trim() ?? "";
  if (houseNo || streetName) {
    return {
      houseNo,
      streetName,
      floor: snapshot.floor?.trim() ?? "",
      area: snapshot.area?.trim() ?? "",
      landmark: snapshot.landmark?.trim() ?? "",
      coordinates: snapshot.coordinates,
    };
  }
  const parts = snapshot.formattedLine
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    houseNo: parts[0] ?? snapshot.formattedLine,
    streetName: parts.slice(1).join(", "),
    floor: snapshot.floor?.trim() ?? "",
    area: snapshot.area?.trim() ?? "",
    landmark: snapshot.landmark?.trim() ?? "",
    coordinates: snapshot.coordinates,
  };
}

export function coordsFromGuestBrowseAddress(
  snapshot: GuestBrowseAddressSnapshot,
): { lat: number; lng: number } | null {
  return parseAddressCoordinates(snapshot.coordinates);
}
