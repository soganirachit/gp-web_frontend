import { storeService } from "../services/store.service";

/** Guest may save one browse address; changing it again requires login. */
export function guestHasSavedBrowseAddress(): boolean {
  return storeService.getGuestBrowseAddress() != null;
}

export function canGuestEnterAddressWithoutLogin(): boolean {
  return !guestHasSavedBrowseAddress();
}
