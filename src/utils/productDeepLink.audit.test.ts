/**
 * Audit cases: WhatsApp / Android product deep links (no refresh loop).
 * Run: npx tsx src/utils/productDeepLink.audit.test.ts
 */
import {
  PRODUCT_DEEPLINK_WEB_PARAM,
  buildProductDeepLinkFallbackUrl,
  shouldSkipAndroidProductIntent,
} from "./tryOpenAndroidAppLink";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(
  shouldSkipAndroidProductIntent(`?${PRODUCT_DEEPLINK_WEB_PARAM}=1`),
  "openInWeb=1 must skip Android intent",
);
assert(
  !shouldSkipAndroidProductIntent(""),
  "plain deep link must attempt intent on Android",
);
assert(
  buildProductDeepLinkFallbackUrl("https://customerapp.mygendaphool.com", "rose-bouquet").includes(
    `${PRODUCT_DEEPLINK_WEB_PARAM}=1`,
  ),
  "fallback URL must include openInWeb=1",
);
assert(
  buildProductDeepLinkFallbackUrl("https://x.com", "a/b").includes(encodeURIComponent("a/b")),
  "slug must be encoded in fallback path",
);

if (failed > 0) {
  console.error(`\n${failed} audit case(s) failed`);
  process.exit(1);
}
console.log("productDeepLink audit: all cases passed");
