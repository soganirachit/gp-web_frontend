/**
 * Share links must follow current customer app origin (dev vs prod).
 * Run: VITE_API_BASE_URL=https://apigpdev.mygendaphool.com/api/v1 npx tsx src/utils/productShare.audit.test.ts
 */
import { resolveProductShareUrl } from "./productShare";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const fromProdApi = resolveProductShareUrl(
  {
    share_url: "https://customerapp.mygendaphool.com/products/carnations",
    slug: "carnations",
  },
  "carnations",
);

const apiBase = String(process.env.VITE_API_BASE_URL ?? "").toLowerCase();
const expectDev = apiBase.includes("apigpdev");

if (expectDev) {
  assert(
    fromProdApi?.includes("customerappdev.mygendaphool.com"),
    "dev build must not share production customerapp links",
  );
} else {
  assert(
    fromProdApi?.includes("customerapp.mygendaphool.com"),
    "prod share link host",
  );
}
assert(fromProdApi?.endsWith("/products/carnations"), "slug path preserved");

if (failed > 0) {
  console.error(`\n${failed} audit case(s) failed`);
  process.exit(1);
}
console.log("productShare audit: all cases passed");
