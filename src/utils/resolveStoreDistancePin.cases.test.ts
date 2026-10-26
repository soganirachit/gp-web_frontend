/**
 * Account store list distances must follow the visit pin, not the saved default.
 * Run: npx tsx src/utils/resolveStoreDistancePin.cases.test.ts
 */
import type { Address } from "../services/address.service";
import {
  resetLocationSession,
  setLocationSession,
} from "./locationSession";
import {
  accountStoreIdForCurrentPin,
  resetStoreVisitOverrideForTests,
  setStoreVisitOverrideId,
} from "./storeVisitOverride";
import {
  defaultSavedAddressPin,
  resolveStoreDistancePin,
} from "./resolveStoreDistancePin";

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

function addr(
  partial: Partial<Address> & { id: string; coordinates: string },
): Address {
  return {
    userId: "1",
    houseNo: "1",
    streetName: "Street",
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

const sodala = addr({
  id: "home",
  isDefault: true,
  coordinates: "26.9050,75.7900",
});
const mansarovar = addr({
  id: "work",
  coordinates: "26.8500,75.7600",
});
const gpsPin = { lat: 26.9124, lng: 75.7873 };
const pickedPin = { lat: 28.6139, lng: 77.2090 };

ls.clear();
resetLocationSession();
resetStoreVisitOverrideForTests();

const savedOnly = defaultSavedAddressPin([sodala, mansarovar]);
assert(savedOnly?.lat === 26.905, "default address wins saved-address fallback");

ls.setItem("userCoordinates", JSON.stringify(gpsPin));
const gpsBeforeSession = resolveStoreDistancePin([sodala]);
assert(
  gpsBeforeSession?.source === "gps_sample" && gpsBeforeSession.lat === gpsPin.lat,
  "without session pin, last GPS sample beats saved default",
);

setLocationSession({ lat: pickedPin.lat, lng: pickedPin.lng });
const sessionWins = resolveStoreDistancePin([sodala]);
assert(
  sessionWins?.source === "session" &&
    sessionWins.lat === pickedPin.lat &&
    sessionWins.lng === pickedPin.lng,
  "picked / GPS session pin is what GET /stores/?lat=&lng= must use",
);

setLocationSession({ lat: gpsPin.lat, lng: gpsPin.lng });
const afterRefresh = resolveStoreDistancePin([sodala]);
assert(
  afterRefresh?.lat === gpsPin.lat && afterRefresh.source === "session",
  "hard-refresh GPS pin (session) is used, not Sodala default",
);

ls.clear();
resetLocationSession();
const noPin = resolveStoreDistancePin([]);
assert(noPin === null, "no pin at all");

assert(
  accountStoreIdForCurrentPin({
    overrideId: 52,
    nearestId: 26,
    selectableIds: [26, 52],
  }) === 52,
  "Account pick stays for this visit even when nearest for the pin changed",
);

assert(
  accountStoreIdForCurrentPin({
    overrideId: null,
    nearestId: 88,
    selectableIds: [26, 88],
  }) === 88,
  "new location with no Account pick uses nearest for that pin",
);

assert(
  accountStoreIdForCurrentPin({
    overrideId: null,
    nearestId: 26,
    selectableIds: [26, 88],
  }) === 26,
  "same covering store is fine when it is still nearest",
);

assert(
  accountStoreIdForCurrentPin({
    overrideId: null,
    nearestId: 99,
    selectableIds: [26, 88],
  }) === 26,
  "nearest outside the selectable list falls back to first selectable",
);

setStoreVisitOverrideId(null);
if (failed) {
  console.error(`\n${failed} failing case(s)`);
  process.exit(1);
}
console.log("resolveStoreDistancePin.cases.test.ts: all cases passed");
