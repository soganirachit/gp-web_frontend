/**
 * GP Daily Manage Subscription "Deliver to" is always address_line1.
 * Run: npx tsx src/utils/formatSubscriptionDeliverTo.cases.test.ts
 */
import { formatSubscriptionDeliverTo } from "./formatDeliveryAddress";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const apiShape = {
  id: 245,
  address_line1: "26, near Landmark Honda, Madhuvan Colony, B",
  address_line2: "",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302015",
};
assert(
  formatSubscriptionDeliverTo(apiShape) ===
    "26, near Landmark Honda, Madhuvan Colony, B",
  "API address_line1 is Deliver To (not city/state/pin)",
);

const mappedShape = {
  houseNo: "26, near Landmark Honda, Madhuvan Colony, B",
  streetName: "",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302015",
};
assert(
  formatSubscriptionDeliverTo(mappedShape) ===
    "26, near Landmark Honda, Madhuvan Colony, B",
  "mapped houseNo (from address_line1) is Deliver To",
);

const editedBookWouldHaveBeen = {
  address_line1: "26, near Landmark Honda, Madhuvan Colony, B",
  city: "Kota",
  pincode: "324001",
};
assert(
  formatSubscriptionDeliverTo(editedBookWouldHaveBeen) ===
    "26, near Landmark Honda, Madhuvan Colony, B",
  "city/pin in the payload never replace address_line1",
);

assert(
  formatSubscriptionDeliverTo(undefined) === "Delivery address on file",
  "missing address has a fallback",
);

assert(
  formatSubscriptionDeliverTo({ city: "Jaipur", pincode: "302015" }).includes(
    "Jaipur",
  ),
  "if line1 is empty, fall back to remaining snapshot fields",
);

if (failed) {
  console.error(`\n${failed} failing case(s)`);
  process.exit(1);
}
console.log("formatSubscriptionDeliverTo.cases.test.ts: all cases passed");
