/**
 * Account Select Store is visit-sticky like Manual location.
 * Run: npx tsx src/utils/storeVisitOverride.cases.test.ts
 */
import {
  clearStoreVisitOverride,
  getStoreVisitOverrideId,
  preferStoreIdForVisit,
  resetStoreVisitOverrideForTests,
  setStoreVisitOverrideId,
} from "./storeVisitOverride";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

resetStoreVisitOverrideForTests();
assert(getStoreVisitOverrideId() === null, "fresh visit has no override");

setStoreVisitOverrideId(52);
assert(getStoreVisitOverrideId() === 52, "Account pick is remembered in memory");
setStoreVisitOverrideId(52);
assert(getStoreVisitOverrideId() === 52, "same pick is a no-op");

setStoreVisitOverrideId(88);
assert(getStoreVisitOverrideId() === 88, "switching stores updates the visit pick");

clearStoreVisitOverride();
assert(getStoreVisitOverrideId() === null, "clear drops the visit pick");

setStoreVisitOverrideId(52);
resetStoreVisitOverrideForTests();
assert(
  getStoreVisitOverrideId() === null,
  "hard refresh / new document load drops the visit pick",
);

const selectable = [26, 52];

assert(
  preferStoreIdForVisit({
    overrideId: 88,
    sessionId: 26,
    nearestId: 26,
    savedId: 26,
    selectableIds: selectable,
  }) === 88,
  "Account pick wins over GPS/session even if not in the selectable list",
);

assert(
  preferStoreIdForVisit({
    overrideId: 52,
    sessionId: 26,
    nearestId: 26,
    savedId: 26,
    selectableIds: selectable,
  }) === 52,
  "Account pick Airat (52) stays while switching pages",
);

assert(
  preferStoreIdForVisit({
    overrideId: null,
    sessionId: 26,
    nearestId: 26,
    savedId: 52,
    selectableIds: selectable,
  }) === 26,
  "after reload, location/GPS store wins over leftover localStorage Airat",
);

assert(
  preferStoreIdForVisit({
    overrideId: null,
    sessionId: null,
    nearestId: 26,
    savedId: 52,
    selectableIds: selectable,
  }) === 26,
  "after reload with empty session, nearest original store wins",
);

assert(
  preferStoreIdForVisit({
    overrideId: null,
    sessionId: 99,
    nearestId: 26,
    savedId: 52,
    selectableIds: selectable,
  }) === 26,
  "stale session id that is not selectable yields nearest",
);

if (failed) {
  console.error(`\n${failed} failing case(s)`);
  process.exit(1);
}
console.log("storeVisitOverride.cases.test.ts: all cases passed");
