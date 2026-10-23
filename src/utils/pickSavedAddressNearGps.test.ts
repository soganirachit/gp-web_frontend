import type { Address } from "../services/address.service";
import { pickSavedAddressNearGps } from "./pickSavedAddressNearGps";

function addr(partial: Partial<Address> & { id: string; coordinates: string }): Address {
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

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const origin = { lat: 26.9124, lng: 75.7873 };

const home = addr({
  id: "1",
  type: "Home",
  isDefault: true,
  coordinates: `${origin.lat},${origin.lng}`,
  houseNo: "Home",
});
const work = addr({
  id: "2",
  type: "Work",
  coordinates: `${origin.lat + 0.0004},${origin.lng}`,
  houseNo: "Work",
});
const officeAlpha = addr({
  id: "3",
  type: "Alpha",
  coordinates: `${origin.lat},${origin.lng}`,
  houseNo: "Alpha",
});
const far = addr({
  id: "4",
  type: "Hometown",
  coordinates: `${origin.lat + 0.05},${origin.lng}`,
  houseNo: "Far",
});

const closest = pickSavedAddressNearGps(origin.lat, origin.lng, [work, home, far]);
assert(closest?.id === "1", `expected Home as closest default, got ${closest?.id}`);

const tiedDefault = pickSavedAddressNearGps(origin.lat, origin.lng, [
  officeAlpha,
  home,
]);
assert(
  tiedDefault?.id === "1",
  `equal metres should prefer default, got ${tiedDefault?.id}`,
);

const tiedAlpha = pickSavedAddressNearGps(origin.lat, origin.lng, [
  addr({ id: "b", type: "Work", coordinates: `${origin.lat},${origin.lng}`, houseNo: "B" }),
  addr({ id: "a", type: "Alpha", coordinates: `${origin.lat},${origin.lng}`, houseNo: "A" }),
]);
assert(tiedAlpha?.id === "a", `equal metres no default should be A–Z, got ${tiedAlpha?.id}`);

const none = pickSavedAddressNearGps(origin.lat, origin.lng, [far]);
assert(none === null, "far address must be outside 120m");

console.log("pickSavedAddressNearGps tests passed");
