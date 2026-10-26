/**
 * Address page must follow the same pin as the home header.
 *   npx tsx src/utils/pickAddressSelection.test.ts
 */
import type { Address } from "../services/address.service";
import type { GuestBrowseAddressSnapshot } from "../services/store.service";
import {
  guestShouldOpenAddressForm,
  pickLoggedInAddressSelection,
  resolveGuestAddressFormSource,
} from "./pickAddressSelection";
import {
  getLocationSession,
  markManualGuest,
  resetLocationSession,
  setLocationSession,
} from "./locationSession";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const mem: Record<string, string> = {};
const ls = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => {
    mem[k] = String(v);
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
};
(globalThis as { localStorage: typeof ls }).localStorage = ls;

const vadodaraSnap: GuestBrowseAddressSnapshot = {
  formattedLine: "83, Vadodara Railway Station, Vadodara Railway Station",
  coordinates: "22.3107,73.1812",
  label: "Location",
};
const jaipurPin = { lat: 26.9124, lng: 75.7873 };

const sourceAuto = resolveGuestAddressFormSource({
  frozen: false,
  pin: jaipurPin,
  snapshot: vadodaraSnap,
});
assert(sourceAuto.kind === "auto_pin", "Auto GPS ignores leftover Vadodara browse");
assert(
  sourceAuto.kind === "auto_pin" &&
    sourceAuto.pin.lat === jaipurPin.lat &&
    sourceAuto.pin.lng === jaipurPin.lng,
  "Auto form pin is current GPS",
);

const sourceManual = resolveGuestAddressFormSource({
  frozen: true,
  pin: { lat: 22.31, lng: 73.18 },
  snapshot: vadodaraSnap,
});
assert(sourceManual.kind === "browse", "Manual frozen still edits the saved browse address");

const sourceCity = resolveGuestAddressFormSource({
  frozen: true,
  pin: { lat: 22.31, lng: 73.18 },
  snapshot: null,
});
assert(sourceCity.kind === "manual_pin", "city pick without browse uses the frozen pin");

assert(
  guestShouldOpenAddressForm({
    hasBrowseAddress: false,
    frozen: false,
    hasPin: true,
  }),
  "tapping Current location with Auto GPS opens the address form",
);
assert(
  !guestShouldOpenAddressForm({
    hasBrowseAddress: false,
    frozen: true,
    hasPin: true,
  }),
  "city-pick freeze without a browse address still uses the city picker",
);
assert(
  guestShouldOpenAddressForm({
    hasBrowseAddress: true,
    frozen: true,
    hasPin: true,
  }),
  "saved browse address still opens the edit form",
);

function addr(
  partial: Partial<Address> & { id: string; coordinates: string },
): Address {
  return {
    userId: "1",
    houseNo: partial.houseNo ?? partial.id,
    streetName: partial.streetName ?? "Street",
    area: "",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    associatedPhoneNumber: "9999999999",
    isDefault: false,
    type: "Home",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...partial,
  };
}

const vadodara = addr({
  id: "vado",
  coordinates: "22.3107,73.1812",
  city: "Vadodara",
  streetName: "Railway Station",
  isDefault: true,
});
const jaipurHome = addr({
  id: "jai",
  coordinates: "26.9124,75.7873",
  city: "Jaipur",
  type: "Home",
});

resetLocationSession();
setLocationSession({
  mode: "auto",
  addressId: null,
  lat: 26.9124,
  lng: 75.7873,
});
assert(
  pickLoggedInAddressSelection(getLocationSession(), [vadodara, jaipurHome], vadodara)
    ?.id === "jai",
  "Auto GPS near a saved address highlights that address, not leftover default",
);

resetLocationSession();
setLocationSession({
  mode: "auto",
  addressId: null,
  lat: 19.07,
  lng: 72.87,
});
assert(
  pickLoggedInAddressSelection(getLocationSession(), [vadodara, jaipurHome], vadodara) ===
    null,
  "Auto GPS with no saved match must not keep the earlier selected address",
);

resetLocationSession();
setLocationSession({
  mode: "auto",
  addressId: "jai",
  lat: 26.9124,
  lng: 75.7873,
});
assert(
  pickLoggedInAddressSelection(getLocationSession(), [vadodara, jaipurHome], vadodara)
    ?.id === "jai",
  "Auto GPS matched saved address uses session addressId",
);

resetLocationSession();
markManualGuest({ lat: 22.31, lng: 73.18 });
setLocationSession({
  mode: "manual",
  addressId: "vado",
  lat: 22.31,
  lng: 73.18,
});
assert(
  pickLoggedInAddressSelection(getLocationSession(), [vadodara, jaipurHome], vadodara)
    ?.id === "vado",
  "Manual still highlights the address the user picked",
);

if (failed) {
  console.error(`${failed} pickAddressSelection case(s) failed`);
  process.exit(1);
}
console.log("pickAddressSelection: all passed");
