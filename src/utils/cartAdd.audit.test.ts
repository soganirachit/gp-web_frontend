/**
 * Audit cases: GP Store add-to-cart failure must not show success toast.
 * Documents expected CartAddFailedError propagation (see CartContext + store PDP).
 * Run: npx tsx src/utils/cartAdd.audit.test.ts
 */
import { CartAddFailedError, isCartAddFailedError } from "./cartAddFailed";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(isCartAddFailedError(new CartAddFailedError()), "CartAddFailedError recognized");
assert(!isCartAddFailedError(new Error("x")), "generic Error not cart failure");

async function simulateStorePdpToastOnlyOnSuccess(
  addToCart: () => Promise<void>,
): Promise<"success" | "error"> {
  try {
    await addToCart();
    return "success";
  } catch {
    return "error";
  }
}

void (async () => {
  const ok = await simulateStorePdpToastOnlyOnSuccess(async () => {});
  assert(ok === "success", "resolved addToCart → success toast allowed");

  const bad = await simulateStorePdpToastOnlyOnSuccess(async () => {
    throw new CartAddFailedError();
  });
  assert(bad === "error", "CartAddFailedError → no success toast");

  if (failed > 0) {
    console.error(`\n${failed} audit case(s) failed`);
    process.exit(1);
  }
  console.log("cartAdd audit: all cases passed");
})();
