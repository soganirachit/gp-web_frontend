/**
 * Full store-selection matrix: hours offline, staff offline, Auto closest,
 * location change, newly added store. Run:
 *   npx tsx src/utils/storeSelection.test.ts
 */
import type { Store } from "../services/store.service";
import {
  catalogStoreIdForNewPin,
  pickNearestStoreForPin,
  storeIsWithinDeliveryRadius,
} from "./storeSelection";
import {
  shouldShowStoreOfflineHero,
  storeAcceptsCustomerOrders,
} from "./storeOperatingHours";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

function store(partial: Partial<Store> & { id: number }): Store {
  return {
    name: `Store ${partial.id}`,
    code: `S${partial.id}`,
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
    distance_km: 1,
    ...partial,
  };
}

const hoursClosed = {
  is_accepting_orders: false,
  is_within_opening_hours: false,
  customer_offline_reason: "outside_hours" as const,
};
const hoursNotSet = {
  is_accepting_orders: false,
  opening_hours_configured: false,
  customer_offline_reason: "hours_not_set" as const,
};
const staffOffline = {
  is_online: false,
  is_accepting_orders: false,
  customer_offline_reason: "manual" as const,
};

// ── Hours + staff offline detection ──────────────────────────────────────
assert(
  storeAcceptsCustomerOrders(store({ id: 1 })),
  "open store accepts orders",
);
assert(
  shouldShowStoreOfflineHero(store({ id: 1, ...hoursClosed })),
  "outside hours → offline hero",
);
assert(
  !storeAcceptsCustomerOrders(store({ id: 1, ...hoursClosed })),
  "outside hours → not selectable",
);
assert(
  !storeAcceptsCustomerOrders(store({ id: 1, ...staffOffline })),
  "staff offline → not selectable",
);
assert(
  !storeAcceptsCustomerOrders(store({ id: 1, ...hoursNotSet })),
  "hours not set → not selectable",
);
assert(
  !storeAcceptsCustomerOrders(
    store({
      id: 1,
      is_online: true,
      is_accepting_orders: false,
      opening_time: "09:00",
      closing_time: "21:00",
    }),
  ),
  "is_accepting_orders=false wins even if is_online is true",
);
{
  const lateIst = new Date(Date.UTC(2026, 2, 15, 17, 0)); // 22:30 IST
  const noonIst = new Date(Date.UTC(2026, 2, 15, 6, 30)); // 12:00 IST
  const hoursOnly = store({
    id: 1,
    is_online: true,
    opening_time: "09:00",
    closing_time: "21:00",
  });
  delete (hoursOnly as { is_accepting_orders?: boolean }).is_accepting_orders;
  assert(
    storeAcceptsCustomerOrders(hoursOnly, noonIst),
    "without is_accepting_orders, inside hours is selectable",
  );
  assert(
    !storeAcceptsCustomerOrders(hoursOnly, lateIst),
    "without is_accepting_orders, outside hours is not selectable",
  );
}

// ── Radius ───────────────────────────────────────────────────────────────
assert(
  storeIsWithinDeliveryRadius(store({ id: 1, distance_km: 5, max_delivery_radius_km: "5" })),
  "inclusive radius: distance == max is in",
);
assert(
  !storeIsWithinDeliveryRadius(store({ id: 1, distance_km: 5.01, max_delivery_radius_km: "5" })),
  "just outside radius is out",
);

const A = store({ id: 10, distance_km: 0.4, name: "Closest" });
const B = store({ id: 20, distance_km: 1.8, name: "Next" });
const C = store({ id: 30, distance_km: 4.9, name: "Far in radius" });
const D = store({ id: 40, distance_km: 8.2, name: "Out of radius", max_delivery_radius_km: "5" });
const NEW = store({ id: 99, distance_km: 0.2, name: "New closer" });

type Status = "open" | "hours" | "manual" | "hours_not_set";
function withStatus(base: Store, status: Status): Store {
  if (status === "open") return { ...base };
  if (status === "hours") return { ...base, ...hoursClosed };
  if (status === "manual") return { ...base, ...staffOffline };
  return { ...base, ...hoursNotSet };
}

const statuses: Status[] = ["open", "hours", "manual", "hours_not_set"];

function expectedPick(
  closest: Status,
  next: Status,
  far: Status,
  out: Status,
): { id: number | null; kind: "accepting" | "offline_covering" | null } {
  const covering: Array<{ status: Status; id: number }> = [
    { status: closest, id: 10 },
    { status: next, id: 20 },
    { status: far, id: 30 },
  ];
  const open = covering.find((r) => r.status === "open");
  if (open) return { id: open.id, kind: "accepting" };
  return { id: covering[0]!.id, kind: "offline_covering" };
}

let combo = 0;
for (const closest of statuses) {
  for (const next of statuses) {
    for (const far of statuses) {
      for (const out of statuses) {
        combo += 1;
        const rows = [
          withStatus(A, closest),
          withStatus(B, next),
          withStatus(C, far),
          withStatus(D, out),
        ];
        const pick = pickNearestStoreForPin(rows);
        const exp = expectedPick(closest, next, far, out);
        assert(
          pick.store?.id === exp.id && pick.kind === exp.kind,
          `combo ${combo} closest=${closest} next=${next} far=${far} out=${out} → ${pick.store?.id}/${pick.kind} expected ${exp.id}/${exp.kind}`,
        );
        assert(
          pick.store?.id !== 40,
          `combo ${combo}: out-of-radius store must never be chosen`,
        );
      }
    }
  }
}
assert(combo === 256, `expected 4^4 = 256 status combos, got ${combo}`);

// ── Auto always closest accepting in radius ──────────────────────────────
{
  const pick = pickNearestStoreForPin([C, B, A, D]);
  assert(pick.store?.id === 10 && pick.kind === "accepting", "Auto: closest open wins regardless of list order");
}
{
  const pick = pickNearestStoreForPin([
    withStatus(A, "hours"),
    withStatus(B, "open"),
    withStatus(C, "open"),
  ]);
  assert(pick.store?.id === 20 && pick.kind === "accepting", "hours-closed closest → switch to next open");
}
{
  const pick = pickNearestStoreForPin([
    withStatus(A, "manual"),
    withStatus(B, "open"),
  ]);
  assert(pick.store?.id === 20 && pick.kind === "accepting", "staff-offline closest → switch to next open");
}
{
  const pick = pickNearestStoreForPin([
    withStatus(A, "hours"),
    withStatus(B, "manual"),
    withStatus(C, "open"),
  ]);
  assert(pick.store?.id === 30 && pick.kind === "accepting", "skip hours + staff offline until an open covering store");
}
{
  const pick = pickNearestStoreForPin([
    withStatus(A, "hours"),
    withStatus(B, "manual"),
    withStatus(C, "hours_not_set"),
    D,
  ]);
  assert(
    pick.store?.id === 10 && pick.kind === "offline_covering",
    "all covering closed → keep closest covering (offline hero), not out-of-area",
  );
}
{
  const pick = pickNearestStoreForPin([
    withStatus(A, "manual"),
    withStatus(D, "open"),
  ]);
  assert(
    pick.store?.id === 10 && pick.kind === "offline_covering",
    "open store out of radius must not steal; keep covering offline store",
  );
}
{
  const pick = pickNearestStoreForPin([withStatus(D, "open")]);
  assert(pick.store == null && pick.kind == null, "only out-of-radius → no store");
}

// ── New store added ──────────────────────────────────────────────────────
{
  const before = pickNearestStoreForPin([A, B]);
  assert(before.store?.id === 10, "before new store: closest A");
  const after = pickNearestStoreForPin([A, B, NEW]);
  assert(after.store?.id === 99, "new closer open store becomes the catalog store");
}
{
  const after = pickNearestStoreForPin([A, B, { ...NEW, distance_km: 2.5 }]);
  assert(after.store?.id === 10, "new farther store does not steal closest");
}
{
  const after = pickNearestStoreForPin([
    withStatus(A, "hours"),
    B,
    NEW,
  ]);
  assert(after.store?.id === 99, "new closer open store wins over hours-closed previous nearest");
}
{
  const after = pickNearestStoreForPin([A, B, withStatus(NEW, "manual")]);
  assert(after.store?.id === 10, "new closer store that is staff-offline is skipped");
}

// ── Location change always uses the new pin’s pick ───────────────────────
{
  const prevId = 10;
  const pickHere = pickNearestStoreForPin([A, B]);
  const pickMoved = pickNearestStoreForPin([
    { ...A, distance_km: 6, max_delivery_radius_km: "5" },
    { ...B, distance_km: 0.5 },
  ]);
  assert(catalogStoreIdForNewPin(prevId, pickHere) === 10, "same pin keeps closest");
  assert(
    catalogStoreIdForNewPin(prevId, pickMoved) === 20,
    "moved pin always switches to the new closest, never keeps previous id",
  );
  assert(
    catalogStoreIdForNewPin(prevId, { store: null, kind: null }) === null,
    "moved pin with no covering store clears the catalog store",
  );
}

if (failed) {
  console.error(`${failed} storeSelection case(s) failed`);
  process.exit(1);
}
console.log(`storeSelection: all passed (${combo} status combos + extra cases)`);
