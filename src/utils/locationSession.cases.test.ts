/**
 * Case matrix for Auto/Manual location session. Run:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","esModuleInterop":true}' src/utils/locationSession.cases.test.ts
 */
import type { Address } from "../services/address.service";
import { haversineMeters } from "./geoMeters";
import {
  pickSavedAddressNearGps,
  SAVED_ADDRESS_MATCH_METERS,
} from "./pickSavedAddressNearGps";
import {
  catalogStoreIdForNewPin,
  pickNearestStoreForPin,
} from "./storeSelection";
import type { Store } from "../services/store.service";
import {
  GPS_MOVE_RECHECK_METERS,
  channelFromPathname,
  dailyCatalogStoreIdFromSession,
  getLocationSession,
  getSessionPin,
  isGuestLocationFrozen,
  markManualGuest,
  markManualSavedAddress,
  recordGpsSample,
  applyStickyManualNewLoadPolicy,
  resetLocationSession,
  resetStickyManualDocumentLoadFlag,
  resumeAutoMode,
  setLocationSession,
} from "./locationSession";

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

const origin = { lat: 26.9124, lng: 75.7873 };
/** ~111 m north */
const near111 = { lat: origin.lat + 0.001, lng: origin.lng };
/** ~133 m north */
const near133 = { lat: origin.lat + 0.0012, lng: origin.lng };
/** ~1.11 km north */
const km1 = { lat: origin.lat + 0.01, lng: origin.lng };

const home = addr({
  id: "home",
  type: "Home",
  isDefault: true,
  coordinates: `${origin.lat},${origin.lng}`,
  houseNo: "Home",
});
const workCloser = addr({
  id: "work",
  type: "Work",
  coordinates: `${near111.lat},${near111.lng}`,
  houseNo: "Work",
});
const alphaSame = addr({
  id: "alpha",
  type: "Alpha",
  coordinates: `${origin.lat},${origin.lng}`,
  houseNo: "Alpha",
});
const far = addr({
  id: "far",
  type: "Hometown",
  coordinates: `${origin.lat + 0.05},${origin.lng}`,
  houseNo: "Far",
});

// ── ranking ──────────────────────────────────────────────────────────────
assert(
  pickSavedAddressNearGps(origin.lat, origin.lng, [workCloser, home, far])?.id ===
    "home",
  "standing on Home pin → Home beats Work even if Work is also in-window",
);
assert(
  pickSavedAddressNearGps(near111.lat, near111.lng, [home, workCloser, far])
    ?.id === "work",
  "closer Work wins over default Home when metres differ",
);
assert(
  pickSavedAddressNearGps(origin.lat, origin.lng, [alphaSame, home])?.id ===
    "home",
  "equal metres → default wins",
);
assert(
  pickSavedAddressNearGps(origin.lat, origin.lng, [
    addr({
      id: "b",
      type: "Work",
      coordinates: `${origin.lat},${origin.lng}`,
      houseNo: "B",
    }),
    addr({
      id: "a",
      type: "Alpha",
      coordinates: `${origin.lat},${origin.lng}`,
      houseNo: "A",
    }),
  ])?.id === "a",
  "equal metres, no default → alphabetical",
);
assert(
  pickSavedAddressNearGps(near133.lat, near133.lng, [home]) === null,
  `133m is outside ${SAVED_ADDRESS_MATCH_METERS}m window`,
);
assert(
  pickSavedAddressNearGps(origin.lat, origin.lng, [far]) === null,
  "far address never matches",
);
assert(
  pickSavedAddressNearGps(origin.lat, origin.lng, [
    addr({ id: "nopin", coordinates: "", houseNo: "NoPin" }),
  ]) === null,
  "address without pin is ignored",
);

const d111 = haversineMeters(origin, near111);
assert(d111 > 90 && d111 < 120, `~111m fixture was ${d111.toFixed(1)}m`);
const d1km = haversineMeters(origin, km1);
assert(
  d1km >= GPS_MOVE_RECHECK_METERS,
  `1.11km fixture must exceed ${GPS_MOVE_RECHECK_METERS}m, got ${d1km.toFixed(1)}`,
);
assert(
  haversineMeters(origin, { lat: origin.lat + 0.004, lng: origin.lng }) <
    GPS_MOVE_RECHECK_METERS,
  "sub-1km move must not trip the watcher",
);

// ── channels ─────────────────────────────────────────────────────────────
assert(channelFromPathname("/home") === "home", "/home");
assert(channelFromPathname("/gp-store") === "store", "/gp-store");
assert(channelFromPathname("/gp-store/") === "store", "/gp-store/");
assert(channelFromPathname("/gp-store/products") === "store", "store products");
assert(channelFromPathname("/gp-daily") === "daily", "/gp-daily");
assert(channelFromPathname("/gp-daily/Products") === "daily", "daily products");
assert(
  channelFromPathname("/gp-store/basket") === null,
  "cart is not a catalog channel",
);
assert(
  channelFromPathname("/gp-store/address-selection") === null,
  "address picker is not a catalog channel",
);
assert(channelFromPathname("/gp-daily/account") === null, "account skipped");

// ── session Auto / Manual / guest freeze ─────────────────────────────────
ls.clear();
resetLocationSession();
assert(getLocationSession().mode === "auto", "fresh session is Auto");
assert(getSessionPin() === null, "fresh session has no pin");
assert(isGuestLocationFrozen() === false, "guest not frozen initially");

recordGpsSample(origin.lat, origin.lng);
assert(
  getSessionPin() === null,
  "last GPS sample must not become the session pin",
);
setLocationSession({ lat: null, lng: null, lastGpsLat: origin.lat, lastGpsLng: origin.lng });
assert(
  getLocationSession().lat === null && getSessionPin() === null,
  "JSON null coords must not round-trip as 0,0",
);

setLocationSession({
  mode: "auto",
  lat: origin.lat,
  lng: origin.lng,
  addressId: "home",
});
assert(getSessionPin()?.lat === origin.lat, "Auto saved match uses explicit pin");

markManualSavedAddress(workCloser);
assert(getLocationSession().mode === "manual", "saved pick freezes Manual");
assert(getLocationSession().addressId === "work", "manual address id");
assert(
  getSessionPin()?.lat === near111.lat,
  "manual pin is Work, not leftover Home GPS",
);

recordGpsSample(km1.lat, km1.lng);
assert(
  getSessionPin()?.lat === near111.lat,
  "1km GPS sample must not hop a Manual pin",
);
assert(getLocationSession().mode === "manual", "still Manual after GPS sample");

ls.removeItem("phoneNumber");
resetStickyManualDocumentLoadFlag();
markManualGuest({ lat: 26.8, lng: 75.8 });
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: false, loggedIn: false }) ===
    false,
  "guest + GPS off keeps last city pick",
);
assert(getLocationSession().mode === "manual", "guest city still Manual");
assert(getSessionPin()?.lat === 26.8, "guest city pin stays");
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: true, loggedIn: false }) ===
    false,
  "same document does not drop guest city later",
);

resetStickyManualDocumentLoadFlag();
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: true, loggedIn: false }) ===
    true,
  "guest reopen with GPS on skips last city",
);
assert(getLocationSession().mode === "auto", "guest + GPS → Auto");
assert(getSessionPin() === null, "skipped guest city drops pin");

ls.setItem("phoneNumber", "9999999999");
resetStickyManualDocumentLoadFlag();
markManualSavedAddress(workCloser);
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: false, loggedIn: true }) ===
    true,
  "logged-in reopen with GPS off skips Manual for default",
);
assert(getLocationSession().mode === "auto", "logged-in + no GPS → Auto");
assert(getLocationSession().addressId === null, "skipped Manual drops address id");
assert(
  getLocationSession().storeId === null &&
    getLocationSession().dailyStoreId === null,
  "skipped Manual drops leftover catalog ids",
);

resetStickyManualDocumentLoadFlag();
markManualSavedAddress(workCloser);
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: false, loggedIn: true }) ===
    true,
  "next document load can skip Manual again",
);
assert(
  applyStickyManualNewLoadPolicy({ gpsAvailable: true, loggedIn: true }) ===
    false,
  "SPA navigation in the same document keeps the decision",
);

resumeAutoMode();
assert(getLocationSession().mode === "auto", "use-current-location resumes Auto");
assert(getLocationSession().addressId === null, "resume clears matched id");

ls.removeItem("phoneNumber");
markManualGuest(null);
assert(isGuestLocationFrozen() === true, "city pick freezes guest");
assert(
  getSessionPin() === null,
  "city pick must not keep leftover GPS as the pin",
);

markManualGuest({ lat: 26.8, lng: 75.8 });
assert(getSessionPin()?.lat === 26.8, "guest browse pin is explicit");
assert(isGuestLocationFrozen() === true, "browse pin still frozen");

ls.setItem("phoneNumber", "9999999999");
assert(
  isGuestLocationFrozen() === false,
  "logged-in users are never guest-frozen",
);

resetLocationSession();
assert(getLocationSession().mode === "auto", "reset returns Auto");
assert(getSessionPin() === null, "reset clears pin");

// ── JSON round-trip traps ────────────────────────────────────────────────
ls.clear();
ls.setItem(
  "gp_location_session",
  JSON.stringify({
    mode: "manual",
    addressId: "",
    lat: null,
    lng: null,
    lastGpsLat: origin.lat,
    lastGpsLng: origin.lng,
    storeId: null,
    dailyStoreId: null,
  }),
);
{
  const s = getLocationSession();
  assert(s.mode === "manual", "JSON mode manual");
  assert(s.addressId === null, "empty addressId → null");
  assert(s.lat === null && s.lng === null, "JSON null coords stay null");
  assert(s.storeId === null && s.dailyStoreId === null, "JSON null store ids stay null");
  assert(getSessionPin() === null, "leftover lastGps is not the pin");
}

ls.setItem(
  "gp_location_session",
  JSON.stringify({
    mode: "AUTO",
    addressId: 12,
    lat: "26.9124",
    lng: "75.7873",
    storeId: "7",
    dailyStoreId: "0",
  }),
);
{
  const s = getLocationSession();
  assert(s.mode === "auto", "unknown mode falls back to auto");
  assert(s.addressId === "12", "numeric addressId stringified");
  assert(s.lat === 26.9124 && s.lng === 75.7873, "string coords parse");
  assert(s.storeId === 7, "string storeId parses");
  assert(s.dailyStoreId === 0, "store id 0 stays 0 (catalog treats as missing)");
}

ls.setItem("gp_location_session", "{not-json");
assert(getLocationSession().mode === "auto", "corrupt JSON → empty Auto session");
assert(getSessionPin() === null, "corrupt JSON has no pin");

ls.setItem(
  "gp_location_session",
  JSON.stringify({ lat: "abc", lng: Infinity, storeId: "", lastGpsLat: "", lastGpsLng: 1 }),
);
{
  const s = getLocationSession();
  assert(s.lat === null && s.lng === null, "NaN/Infinity coords → null");
  assert(s.storeId === null, "empty storeId → null");
  assert(s.lastGpsLat === null, "empty lastGps → null");
}

// ── city pick must wipe leftover catalog ids ─────────────────────────────
ls.clear();
resetLocationSession();
setLocationSession({
  mode: "auto",
  lat: origin.lat,
  lng: origin.lng,
  lastGpsLat: origin.lat,
  lastGpsLng: origin.lng,
  storeId: 55,
  dailyStoreId: 66,
});
ls.removeItem("phoneNumber");
markManualGuest(null);
assert(isGuestLocationFrozen() === true, "city pick freezes after Auto GPS");
assert(getSessionPin() === null, "city pick clears pin");
assert(
  getLocationSession().storeId === null &&
    getLocationSession().dailyStoreId === null,
  "city pick must not keep leftover GPS store ids",
);
assert(
  getLocationSession().lastGpsLat === origin.lat,
  "city pick may keep lastGps sample but it is not the pin",
);

markManualGuest({ lat: 26.892, lng: 75.776 });
assert(getSessionPin()?.lat === 26.892, "browse/city store pin is explicit");
assert(
  getLocationSession().storeId === null &&
    getLocationSession().dailyStoreId === null,
  "new guest pin waits for a live Store/Daily check before catalog ids",
);

// ── 120 m window edges ───────────────────────────────────────────────────
function offsetNorth(meters: number): { lat: number; lng: number } {
  let lo = 0;
  let hi = 0.02;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const d = haversineMeters(origin, { lat: origin.lat + mid, lng: origin.lng });
    if (d < meters) lo = mid;
    else hi = mid;
  }
  return { lat: origin.lat + (lo + hi) / 2, lng: origin.lng };
}
const at120 = offsetNorth(120);
const at121 = offsetNorth(121);
const at119 = offsetNorth(119);
assert(
  Math.abs(haversineMeters(origin, at120) - 120) < 0.6,
  "120m fixture",
);
assert(
  pickSavedAddressNearGps(at120.lat, at120.lng, [home])?.id === "home",
  "exactly 120m still matches",
);
assert(
  pickSavedAddressNearGps(at119.lat, at119.lng, [home])?.id === "home",
  "119m matches",
);
assert(
  pickSavedAddressNearGps(at121.lat, at121.lng, [home]) === null,
  "121m is outside the window",
);

const at999 = offsetNorth(999);
const at1000 = offsetNorth(1000);
assert(
  haversineMeters(origin, at999) < GPS_MOVE_RECHECK_METERS,
  "999m must not trip 1km watcher",
);
assert(
  haversineMeters(origin, at1000) >= GPS_MOVE_RECHECK_METERS,
  "1000m trips the watcher",
);

// ── more channels ────────────────────────────────────────────────────────
assert(channelFromPathname("/") === "home", "landing / is home");
assert(
  channelFromPathname("/gp-store/product/rose-123") === "store",
  "store PDP",
);
assert(
  channelFromPathname("/gp-daily/explore-more") === "daily",
  "daily explore",
);
assert(channelFromPathname("/gp-store/login") === null, "login skipped");
assert(channelFromPathname("/gp-daily/basket") === null, "daily cart skipped");
assert(
  channelFromPathname("/gp-store/choose-location") === null,
  "choose-location skipped",
);

// ── Store↔Daily in-flight queue (Host semantics) ─────────────────────────
function simulateHostQueue(navs: string[]): string[] {
  let last = "";
  let inFlight = false;
  let pending: string | null = null;
  const started: string[] = [];
  const finishes: Array<() => void> = [];
  const run = (ch: string) => {
    inFlight = true;
    started.push(ch);
    finishes.push(() => {
      inFlight = false;
      const next = pending;
      pending = null;
      if (!next || next === ch) return;
      last = `${next}`;
      run(next);
    });
  };
  for (const ch of navs) {
    if (last === ch) continue;
    last = ch;
    if (inFlight) {
      pending = ch;
      continue;
    }
    run(ch);
  }
  while (finishes.length) {
    const fn = finishes.shift();
    fn?.();
  }
  return started;
}
assert(
  simulateHostQueue(["store", "daily"]).join(",") === "store,daily",
  "fast Store→Daily still live-checks Daily after Store returns",
);
assert(
  simulateHostQueue(["store", "daily", "store"]).join(",") === "store",
  "Store→Daily→Store bounce stays on Store and does not double-run",
);
assert(
  simulateHostQueue(["store", "store"]).join(",") === "store",
  "same channel is not double-refreshed",
);
assert(
  simulateHostQueue(["home", "store", "daily"]).join(",") === "home,daily",
  "in-flight Home then Store then Daily keeps the latest pending channel",
);

// ── Daily catalog must not reuse Store leftover ──────────────────────────
resetLocationSession();
setLocationSession({
  mode: "auto",
  lat: 26.936,
  lng: 75.739,
  storeId: 52,
  dailyStoreId: null,
});
assert(
  dailyCatalogStoreIdFromSession(getLocationSession(), 52) === null,
  "Store-yes Daily-no pin must not browse Store leftover as Daily",
);
setLocationSession({ dailyStoreId: 26 });
assert(
  dailyCatalogStoreIdFromSession(getLocationSession(), 52) === 26,
  "Daily zone id wins over Store temp",
);
resetLocationSession();
markManualGuest(null);
assert(
  dailyCatalogStoreIdFromSession(getLocationSession(), 57) === 57,
  "city pick without pin may use temp city store",
);

// ── Store vs Daily selection permutations ────────────────────────────────
function guestOpensOutsideServiceModal(
  channel: "home" | "store" | "daily",
  storeId: number | null,
  dailyStoreId: number | null,
): boolean {
  if (channel === "store") return storeId == null;
  if (channel === "daily") return dailyStoreId == null && storeId == null;
  return false;
}

function expectedLiveIds(
  channel: "home" | "store" | "daily",
  storeOk: boolean,
  dailyOk: boolean,
  storeId = 10,
  dailyId = 20,
): { storeId: number | null; dailyStoreId: number | null } {
  const s = storeOk ? storeId : null;
  const d = dailyOk ? dailyId : null;
  if (channel === "store") return { storeId: s, dailyStoreId: null };
  if (channel === "daily") return { storeId: null, dailyStoreId: d };
  return { storeId: s, dailyStoreId: d };
}

const coverageCombos: Array<[boolean, boolean, string]> = [
  [true, true, "Store-yes Daily-yes"],
  [true, false, "Store-yes Daily-no"],
  [false, true, "Store-no Daily-yes"],
  [false, false, "Store-no Daily-no"],
];
const channels: Array<"home" | "store" | "daily"> = ["home", "store", "daily"];

for (const [storeOk, dailyOk, label] of coverageCombos) {
  for (const ch of channels) {
    const live = expectedLiveIds(ch, storeOk, dailyOk);
    setLocationSession({
      mode: "auto",
      lat: origin.lat,
      lng: origin.lng,
      storeId: live.storeId,
      dailyStoreId: live.dailyStoreId,
    });
    const dailyCatalog = dailyCatalogStoreIdFromSession(
      getLocationSession(),
      live.storeId ?? 99,
    );
    if (ch === "daily" || ch === "home") {
      if (dailyOk) {
        assert(
          dailyCatalog === 20,
          `${label} ${ch}: Daily catalog uses zone store`,
        );
      } else {
        assert(
          dailyCatalog === null,
          `${label} ${ch}: Daily catalog must not reuse Store leftover`,
        );
      }
    }
    if (ch === "store") {
      assert(
        getLocationSession().dailyStoreId === null,
        `${label} store channel does not write Daily id`,
      );
    }
    if (ch === "daily") {
      assert(
        getLocationSession().storeId === null,
        `${label} daily channel does not write Store id`,
      );
    }
    const modal = guestOpensOutsideServiceModal(
      ch,
      storeOk ? 10 : null,
      dailyOk ? 20 : null,
    );
    if (ch === "store") {
      assert(
        modal === !storeOk,
        `${label} store: city picker only when Store coverage fails`,
      );
    }
    if (ch === "daily") {
      const expectModal = !dailyOk && !storeOk;
      assert(
        modal === expectModal,
        `${label} daily: city picker only when Daily miss AND Store miss`,
      );
    }
    if (ch === "home") {
      assert(
        modal === false,
        `${label} home: GPS-out does not auto-open city picker`,
      );
    }
  }
}

const skipCombos: Array<{
  gps: boolean;
  loggedIn: boolean;
  drop: boolean;
  name: string;
}> = [
  { gps: true, loggedIn: true, drop: true, name: "logged-in + GPS → Auto nearest/GPS pin" },
  { gps: true, loggedIn: false, drop: true, name: "guest + GPS → Auto GPS pin" },
  { gps: false, loggedIn: true, drop: true, name: "logged-in + no GPS → default address" },
  { gps: false, loggedIn: false, drop: false, name: "guest + no GPS → keep last city store" },
];
for (const row of skipCombos) {
  resetStickyManualDocumentLoadFlag();
  resetLocationSession();
  if (row.loggedIn) ls.setItem("phoneNumber", "999");
  else ls.removeItem("phoneNumber");
  markManualGuest({ lat: origin.lat, lng: origin.lng });
  const dropped = applyStickyManualNewLoadPolicy({
    gpsAvailable: row.gps,
    loggedIn: row.loggedIn,
  });
  assert(dropped === row.drop, row.name);
  assert(
    getLocationSession().mode === (row.drop ? "auto" : "manual"),
    `${row.name} mode`,
  );
}

// ── Location change always rewrites catalog store ────────────────────────
function sessionStoreRow(
  id: number,
  distance_km: number,
  extra: Partial<Store> = {},
): Store {
  return {
    id,
    name: `S${id}`,
    code: `S${id}`,
    address: "x",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    latitude: "26.91",
    longitude: "75.78",
    is_active: true,
    is_online: true,
    opening_time: "09:00",
    closing_time: "21:00",
    opening_hours_configured: true,
    is_within_opening_hours: true,
    is_accepting_orders: true,
    customer_offline_reason: null,
    delivery_fee: "0",
    free_delivery_threshold: "149",
    min_order_amount: "0",
    max_delivery_radius_km: "5",
    distance_km,
    ...extra,
  };
}

resetLocationSession();
setLocationSession({ storeId: 26, dailyStoreId: 26, lat: origin.lat, lng: origin.lng });
const pinA = pickNearestStoreForPin([
  sessionStoreRow(26, 0.4),
  sessionStoreRow(52, 3.1),
]);
setLocationSession({
  storeId: catalogStoreIdForNewPin(getLocationSession().storeId, pinA),
});
assert(getLocationSession().storeId === 26, "first pin assigns closest 26");

const pinB = pickNearestStoreForPin([
  sessionStoreRow(26, 6.2),
  sessionStoreRow(52, 0.6),
]);
setLocationSession({
  storeId: catalogStoreIdForNewPin(getLocationSession().storeId, pinB),
});
assert(
  getLocationSession().storeId === 52,
  "location change always switches to the new pin’s closest store",
);

const pinNewStore = pickNearestStoreForPin([
  sessionStoreRow(26, 0.8),
  sessionStoreRow(52, 3.1),
  sessionStoreRow(88, 0.15),
]);
setLocationSession({
  storeId: catalogStoreIdForNewPin(getLocationSession().storeId, pinNewStore),
});
assert(
  getLocationSession().storeId === 88,
  "newly added closer store becomes the Auto catalog store",
);

const pinOfflineSwitch = pickNearestStoreForPin([
  sessionStoreRow(88, 0.15, {
    is_online: false,
    is_accepting_orders: false,
    customer_offline_reason: "manual",
  }),
  sessionStoreRow(26, 0.8),
]);
setLocationSession({
  storeId: catalogStoreIdForNewPin(getLocationSession().storeId, pinOfflineSwitch),
});
assert(
  getLocationSession().storeId === 26,
  "staff-offline closest store is skipped; next open covering store is used",
);

const pinHoursSwitch = pickNearestStoreForPin([
  sessionStoreRow(26, 0.3, {
    is_accepting_orders: false,
    is_within_opening_hours: false,
    customer_offline_reason: "outside_hours",
  }),
  sessionStoreRow(52, 1.1),
]);
setLocationSession({
  storeId: catalogStoreIdForNewPin(getLocationSession().storeId, pinHoursSwitch),
});
assert(
  getLocationSession().storeId === 52,
  "hours-closed closest store is skipped; next open covering store is used",
);

if (failed) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
console.log("locationSession.cases: all passed");
