/**
 * Run: npx tsx src/utils/productSlug.audit.test.ts
 */
import {
  productSlugRouteDiffersFromParam,
  sanitizeProductRouteSlug,
} from "./productSlug";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(
  sanitizeProductRouteSlug("red-rose-bunch-1") === "red-rose-bunch-1",
  "plain slug",
);
assert(
  sanitizeProductRouteSlug("red-rose-bunch-1 Vibrant red roses") ===
    "red-rose-bunch-1",
  "strip description after space",
);
assert(
  sanitizeProductRouteSlug("red-rose-bunch-1\nVibrant red roses") ===
    "red-rose-bunch-1",
  "strip description after newline",
);
assert(
  sanitizeProductRouteSlug(
    "https://customerappdev.mygendaphool.com/products/red-rose-bunch-1",
  ) === "red-rose-bunch-1",
  "extract slug from pasted URL",
);
assert(
  productSlugRouteDiffersFromParam(
    "red-rose-bunch-1 Vibrant",
    "red-rose-bunch-1",
  ),
  "detect corrupted route param",
);
assert(
  !productSlugRouteDiffersFromParam("red-rose-bunch-1", "red-rose-bunch-1"),
  "clean param needs no canonicalize",
);

if (failed > 0) {
  console.error(`\n${failed} audit case(s) failed`);
  process.exit(1);
}
console.log("productSlug audit: all cases passed");
