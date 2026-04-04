#!/usr/bin/env node
/**
 * Regenerates human-readable checklists and flow matrices from JSON.
 * Usage: node testing/scripts/generate-artifacts.mjs [--init-scenarios]
 * Fix_V0.9
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCENARIOS_PATH = path.join(ROOT, "scenarios", "gp-frontend-scenarios.json");
const OUT_DIR = path.join(ROOT, "generated");

/** Default scenario catalog — single source when JSON missing or --init-scenarios */
function buildDefaultScenarios() {
  const mk = (id, title, critical = false, automation = "manual") => ({
    id,
    title,
    critical,
    automation,
  });
  const suites = [
    {
      id: "ENV",
      name: "Environment & build",
      cases: [
        mk("GFP-ENV-01", "npm run build (tsc + vite) succeeds", true, "build"),
        mk("GFP-ENV-02", "npm run dev serves application", true, "manual"),
        mk("GFP-ENV-03", "VITE_API_BASE_URL not accidentally localhost in prod build", true, "manual"),
        mk("GFP-ENV-04", "VITE_GP_DAILY_ENABLED=true exposes /gp-daily routes", false, "manual"),
        mk("GFP-ENV-05", "VITE_GP_DAILY_ENABLED=false redirects /gp-daily to /gp-store", true, "e2e"),
        mk("GFP-ENV-06", "Feature query ?feature=gpStore|gpDaily applies theme", false, "manual"),
        mk("GFP-ENV-07", "Empty VITE_SENTRY_DSN does not throw", false, "manual"),
        mk("GFP-ENV-08", "Sentry DSN set receives events (staging)", false, "manual"),
      ],
    },
    {
      id: "LAY",
      name: "Layout & navigation",
      cases: [
        mk("GFP-LAY-01", "Scroll to top on route change", false, "e2e"),
        mk("GFP-LAY-02", "Meta Pixel trackPageView on SPA navigations", false, "manual"),
        mk("GFP-LAY-03", "Auth routes hide bottom padding pattern", false, "e2e"),
        mk("GFP-LAY-04", "/location hides BottomNav", false, "e2e"),
        mk("GFP-LAY-05", "customer-support/questions hides BottomNav", false, "e2e"),
        mk("GFP-LAY-06", "GP Store/Daily routes avoid double bottom padding", false, "manual"),
        mk("GFP-NAV-01", "GP Store bottom nav: Home, Store, Basket, Order, Account", true, "e2e"),
        mk("GFP-NAV-02", "Basket when logged out redirects to login with returnUrl", true, "e2e"),
        mk("GFP-NAV-03", "GP Daily nav uses /gp-daily base when enabled", false, "manual"),
        mk("GFP-NAV-04", "Active nav state / visuals", false, "manual"),
        mk("GFP-NAV-05", "Cart badge matches CartContext", true, "manual"),
        mk("GFP-ERR-01", "RouteErrorPage on thrown route errors", false, "manual"),
        mk("GFP-ERR-02", "lazyWithRetry on chunk failure", false, "manual"),
        mk("GFP-ERR-03", "Suspense PageFadeFallback", false, "manual"),
      ],
    },
    {
      id: "AUTH",
      name: "Authentication & onboarding",
      cases: [
        mk("GFP-AUTH-01", "Startup shown at / and /startup", true, "e2e"),
        mk("GFP-AUTH-02", "Already logged in redirect from startup", false, "manual"),
        mk("GFP-AUTH-03", "GP Store vs Daily entry paths", false, "manual"),
        mk("GFP-AUTH-10", "Login valid phone requests OTP", true, "manual"),
        mk("GFP-AUTH-11", "Login invalid phone validation", true, "manual"),
        mk("GFP-AUTH-12", "OTP rate limit messaging", false, "manual"),
        mk("GFP-AUTH-13", "Login network error UX", false, "manual"),
        mk("GFP-AUTH-20", "Correct OTP stores tokens", true, "manual"),
        mk("GFP-AUTH-21", "Wrong OTP error", true, "manual"),
        mk("GFP-AUTH-22", "Resend OTP cooldown", false, "manual"),
        mk("GFP-AUTH-23", "Expired OTP message", false, "manual"),
        mk("GFP-AUTH-30", "NameInput new user profile", false, "manual"),
        mk("GFP-AUTH-31", "NameInput skip existing user", false, "manual"),
        mk("GFP-AUTH-40", "Allset completion navigates home", false, "manual"),
        mk("GFP-AUTH-50", "ProtectedRoute redirects to feature login when logged out", true, "e2e"),
        mk("GFP-AUTH-51", "isLoggedIn without access_token treated logged out", true, "manual"),
        mk("GFP-AUTH-52", "returnUrl / state.from after login", true, "manual"),
        mk("GFP-AUTH-60", "401 handling → login", true, "manual"),
        mk("GFP-AUTH-61", "Logout clears storage", true, "manual"),
        mk("GFP-AUTH-62", "Token refresh if implemented", false, "manual"),
      ],
    },
    {
      id: "LOC",
      name: "Store & location",
      cases: [
        mk("GFP-LOC-01", "Update location assigns store", true, "manual"),
        mk("GFP-LOC-02", "Nearby stores list + distance", false, "manual"),
        mk("GFP-LOC-03", "Switch store clears cart per API", true, "manual"),
        mk("GFP-LOC-04", "Out of zone messaging", false, "manual"),
        mk("GFP-LOC-05", "Maps autocomplete / pin", false, "manual"),
        mk("GFP-LOC-06", "Geolocation denied fallback", false, "manual"),
        mk("GFP-LOC-07", "Unsubscribed_User_Home CTAs", false, "manual"),
      ],
    },
    {
      id: "CAT",
      name: "Home & catalog",
      cases: [
        mk("GFP-HOM-01", "GpStore_Homepage banners & categories", true, "manual"),
        mk("GFP-HOM-02", "GpDaily_Homepage when flag on", false, "manual"),
        mk("GFP-HOM-03", "Legacy /home", false, "e2e"),
        mk("GFP-HOM-04", "OffersBannerCarousel", false, "manual"),
        mk("GFP-CAT-01", "/gp-store/products grid loads", true, "e2e"),
        mk("GFP-CAT-02", "/gp-daily/Products when flag on", false, "manual"),
        mk("GFP-CAT-03", "Category filters", false, "manual"),
        mk("GFP-CAT-04", "Pagination / infinite scroll no duplicates", false, "manual"),
        mk("GFP-CAT-05", "Out of stock display", false, "manual"),
        mk("GFP-CAT-06", "Search debounce & empty state", false, "manual"),
        mk("GFP-CAT-07", "ExploreMore cross-sell", false, "manual"),
        mk("GFP-PDP-01", "/gp-store/product/:slug PDP", true, "manual"),
        mk("GFP-PDP-02", "/gp-daily/product/:id", false, "manual"),
        mk("GFP-PDP-03", "Invalid slug/id 404 UX", false, "manual"),
        mk("GFP-PDP-04", "Variant selector updates price", false, "manual"),
        mk("GFP-PDP-05", "Add to cart from PDP", true, "manual"),
        mk("GFP-IMG-01", "Broken image fallback", false, "manual"),
        mk("GFP-IMG-02", "Lazy load performance", false, "manual"),
      ],
    },
    {
      id: "CART",
      name: "Cart & checkout",
      cases: [
        mk("GFP-CART-01", "Add item to cart", true, "manual"),
        mk("GFP-CART-02", "Update quantity / subtotal", true, "manual"),
        mk("GFP-CART-03", "Remove line item", false, "manual"),
        mk("GFP-CART-04", "Apply coupon", true, "manual"),
        mk("GFP-CART-05", "Delivery slot if required", false, "manual"),
        mk("GFP-CART-06", "Address selection / default", true, "manual"),
        mk("GFP-CART-07", "Delivery fee / free threshold math", true, "manual"),
        mk("GFP-CART-08", "Wallet application", false, "manual"),
        mk("GFP-CART-09", "Razorpay checkout success & failure URLs", true, "manual"),
        mk("GFP-CART-10", "Payment failure order not paid", true, "manual"),
        mk("GFP-CART-11", "Network drop during payment recovery", false, "manual"),
        mk("GFP-CART-12", "Empty cart checkout blocked", true, "manual"),
        mk("GFP-CART-13", "Store switch clears cart per rule", false, "manual"),
      ],
    },
    {
      id: "PAY",
      name: "Payment confirmation",
      cases: [
        mk("GFP-PAY-01", "/gp-store/payment-success order summary", true, "manual"),
        mk("GFP-PAY-02", "/payment-success generic", false, "manual"),
        mk("GFP-PAY-03", "Deep link without order context graceful", false, "manual"),
        mk("GFP-PAY-04", "Invoice link", false, "manual"),
      ],
    },
    {
      id: "WAL",
      name: "Wallet",
      cases: [
        mk("GFP-WAL-01", "View balance", false, "manual"),
        mk("GFP-WAL-02", "Top-up Razorpay", false, "manual"),
        mk("GFP-WAL-03", "Transaction history pagination", false, "manual"),
        mk("GFP-WAL-04", "Insufficient balance at checkout", false, "manual"),
      ],
    },
    {
      id: "ORD",
      name: "Orders",
      cases: [
        mk("GFP-ORD-01", "Orders list statuses", true, "manual"),
        mk("GFP-ORD-02", "Filter orders", false, "manual"),
        mk("GFP-ORD-03", "Order detail timeline", true, "manual"),
        mk("GFP-ORD-04", "Track delivery", false, "manual"),
        mk("GFP-ORD-05", "Cancel order if allowed", false, "manual"),
        mk("GFP-ORD-06", "Reorder prefill", false, "manual"),
        mk("GFP-ORD-07", "GP Daily order routes mirror", false, "manual"),
      ],
    },
    {
      id: "SUB",
      name: "Subscriptions",
      cases: [
        mk("GFP-SUB-01", "View active subscription", false, "manual"),
        mk("GFP-SUB-02", "New subscription address validation", false, "manual"),
        mk("GFP-SUB-03", "Confirm subscription payment", false, "manual"),
        mk("GFP-SUB-04", "Modify pack/frequency", false, "manual"),
        mk("GFP-SUB-05", "Pause subscription", false, "manual"),
        mk("GFP-SUB-06", "Paused landing resume", false, "manual"),
        mk("GFP-SUB-07", "Cancel landing", false, "manual"),
        mk("GFP-SUB-08", "Cancel reason required", false, "manual"),
        mk("GFP-SUB-09", "Cancel success", false, "manual"),
        mk("GFP-SUB-10", "manageMyStoreProducts", false, "manual"),
        mk("GFP-SUB-11", "GP Daily vs Store subscription paths", false, "manual"),
      ],
    },
    {
      id: "ACC",
      name: "Account & profile",
      cases: [
        mk("GFP-ACC-01", "Settings sections navigate", false, "manual"),
        mk("GFP-ACC-02", "Edit profile photo/name", false, "manual"),
        mk("GFP-ACC-03", "Logout from settings", true, "manual"),
        mk("GFP-ACC-04", "Addresses list", false, "manual"),
        mk("GFP-ACC-05", "Add/edit/default/delete address", true, "manual"),
        mk("GFP-ACC-06", "Address map geocode", false, "manual"),
        mk("GFP-ACC-07", "Pincode/phone validation", false, "manual"),
      ],
    },
    {
      id: "SUP",
      name: "Support",
      cases: [
        mk("GFP-SUP-01", "CustomerSupport list/categories", false, "manual"),
        mk("GFP-SUP-02", "SupportTicketChat send/receive", false, "manual"),
        mk("GFP-SUP-03", "TicketQuestionForm create", false, "manual"),
        mk("GFP-SUP-04", "FAQ search", false, "manual"),
        mk("GFP-SUP-05", "Attachment limits if any", false, "manual"),
        mk("GFP-SUP-06", "Support offline error", false, "manual"),
      ],
    },
    {
      id: "REF",
      name: "Referral",
      cases: [
        mk("GFP-REF-01", "Refer code copy", false, "manual"),
        mk("GFP-REF-02", "Share deep link", false, "manual"),
        mk("GFP-REF-03", "Referral API failure", false, "manual"),
      ],
    },
    {
      id: "LEG",
      name: "Legal",
      cases: [
        mk("GFP-LEG-01", "Terms renders", true, "e2e"),
        mk("GFP-LEG-02", "Privacy renders", true, "e2e"),
        mk("GFP-LEG-03", "Footer/settings legal links", false, "manual"),
      ],
    },
    {
      id: "SVC",
      name: "Services (API mapping)",
      cases: [
        mk("GFP-SVC-api", "api.ts client + interceptors", false, "api"),
        mk("GFP-SVC-auth", "auth.service OTP/tokens", true, "api"),
        mk("GFP-SVC-product", "product.service catalog", true, "api"),
        mk("GFP-SVC-cart", "cart.service", true, "api"),
        mk("GFP-SVC-store", "store.service assignment", true, "api"),
        mk("GFP-SVC-order", "order.service", true, "api"),
        mk("GFP-SVC-payment", "payment.service", true, "api"),
        mk("GFP-SVC-wallet", "wallet.service", false, "api"),
        mk("GFP-SVC-subscription", "subscription.service", false, "api"),
        mk("GFP-SVC-basepack", "basepack.service", false, "api"),
        mk("GFP-SVC-address", "address.service", false, "api"),
        mk("GFP-SVC-support", "support.service", false, "api"),
        mk("GFP-SVC-faq", "faq.service", false, "api"),
        mk("GFP-SVC-invoice", "invoice.service", false, "api"),
        mk("GFP-SVC-editcustomer", "editcustomer.service", false, "api"),
        mk("GFP-SVC-getcustomer", "getcustomer.service", false, "api"),
        mk("GFP-SVC-headers", "headers.service", false, "api"),
      ],
    },
    {
      id: "NFR",
      name: "Non-functional",
      cases: [
        mk("GFP-NFR-01", "LCP home/PDP", false, "manual"),
        mk("GFP-NFR-02", "A11y keyboard modals", false, "manual"),
        mk("GFP-NFR-03", "SEO helmet titles", false, "manual"),
        mk("GFP-NFR-04", "Safe area inset nav", false, "manual"),
        mk("GFP-NFR-05", "Chart widgets if any", false, "manual"),
        mk("GFP-NFR-06", "date-fns delivery timezone", false, "manual"),
        mk("GFP-NFR-07", "Redux persistence", false, "manual"),
      ],
    },
    {
      id: "SEC",
      name: "Security",
      cases: [
        mk("GFP-SEC-01", "XSS search escaped", false, "manual"),
        mk("GFP-SEC-02", "IDOR other user order URL", true, "manual"),
        mk("GFP-SEC-03", "CSRF / cookie SameSite", false, "manual"),
        mk("GFP-SEC-04", "Token not in URL/logs", true, "manual"),
      ],
    },
    {
      id: "REG",
      name: "Release gate checklist",
      cases: [
        mk("GFP-REG-01", "Auth login→OTP→protected", true, "manual"),
        mk("GFP-REG-02", "ProtectedRoute + access_token", true, "manual"),
        mk("GFP-REG-03", "Store + cart", true, "manual"),
        mk("GFP-REG-04", "Checkout Razorpay test", true, "manual"),
        mk("GFP-REG-05", "Order detail + invoice", true, "manual"),
        mk("GFP-REG-06", "Subscription modify/pause/cancel", false, "manual"),
        mk("GFP-REG-07", "Address CRUD + map", true, "manual"),
        mk("GFP-REG-08", "Support create + chat", false, "manual"),
        mk("GFP-REG-09", "GP Daily flag off: no broken gp-daily links", true, "manual"),
        mk("GFP-REG-10", "Meta Pixel no console errors", false, "manual"),
        mk("GFP-REG-11", "Sentry sample rate staging", false, "manual"),
      ],
    },
  ];

  const flows = [
    {
      id: "FLOW-J1",
      name: "J1 — First purchase (GP Store)",
      critical: true,
      description:
        "Startup → Login → OTP → Location/store → Browse → PDP → Cart → Address → Pay → Success → Order visible",
      caseIds: [
        "GFP-AUTH-01",
        "GFP-AUTH-10",
        "GFP-AUTH-20",
        "GFP-LOC-01",
        "GFP-HOM-01",
        "GFP-PDP-05",
        "GFP-CART-01",
        "GFP-CART-06",
        "GFP-CART-09",
        "GFP-PAY-01",
        "GFP-ORD-01",
      ],
    },
    {
      id: "FLOW-J2",
      name: "J2 — Returning user checkout",
      critical: true,
      description: "Login → cart state → wallet partial pay → confirmation",
      caseIds: ["GFP-AUTH-20", "GFP-CART-02", "GFP-CART-08", "GFP-CART-09", "GFP-PAY-01"],
    },
    {
      id: "FLOW-J3",
      name: "J3 — Subscription lifecycle",
      critical: false,
      description: "Subscribe → pause → resume → cancel with reason",
      caseIds: ["GFP-SUB-02", "GFP-SUB-03", "GFP-SUB-05", "GFP-SUB-06", "GFP-SUB-08", "GFP-SUB-09"],
    },
    {
      id: "FLOW-J4",
      name: "J4 — Support",
      critical: false,
      description: "Open ticket → chat → resolve",
      caseIds: ["GFP-SUP-03", "GFP-SUP-02"],
    },
    {
      id: "FLOW-J5",
      name: "J5 — GP Daily mirror",
      critical: false,
      description: "Repeat store flows under /gp-daily when flag enabled",
      caseIds: ["GFP-ENV-04", "GFP-CAT-02", "GFP-SUB-11"],
    },
    {
      id: "FLOW-J6",
      name: "J6 — Payment failure recovery",
      critical: true,
      description: "Declined payment → cart consistent → retry success",
      caseIds: ["GFP-CART-10", "GFP-CART-11", "GFP-CART-09"],
    },
    {
      id: "FLOW-E2E-SMOKE",
      name: "Automated smoke (Playwright)",
      critical: true,
      description: "Public routes, startup redirect, protected redirect, legal pages",
      caseIds: [
        "GFP-AUTH-01",
        "GFP-HOM-03",
        "GFP-LAY-03",
        "GFP-NAV-01",
        "GFP-AUTH-50",
        "GFP-LEG-01",
        "GFP-LEG-02",
        "GFP-CAT-01",
      ],
    },
  ];

  return {
    meta: {
      app: "gp-frontend",
      catalogVersion: "1.1.0",
      sourceDoc: "testing/docs/TESTING_SCENARIOS.md",
      generator: "testing/scripts/generate-artifacts.mjs",
      fixTag: "Fix_V0.9",
    },
    suites,
    flows,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--init-scenarios")) {
    fs.mkdirSync(path.dirname(SCENARIOS_PATH), { recursive: true });
    fs.writeFileSync(SCENARIOS_PATH, JSON.stringify(buildDefaultScenarios(), null, 2), "utf8");
    console.log("Wrote", SCENARIOS_PATH);
    return;
  }

  let data;
  if (!fs.existsSync(SCENARIOS_PATH)) {
    console.warn("No scenarios JSON — writing default from embedded catalog.");
    data = buildDefaultScenarios();
    fs.mkdirSync(path.dirname(SCENARIOS_PATH), { recursive: true });
    fs.writeFileSync(SCENARIOS_PATH, JSON.stringify(data, null, 2), "utf8");
  } else {
    data = JSON.parse(fs.readFileSync(SCENARIOS_PATH, "utf8"));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const allCases = data.suites.flatMap((s) =>
    s.cases.map((c) => ({ ...c, suiteId: s.id, suiteName: s.name }))
  );
  const byId = Object.fromEntries(allCases.map((c) => [c.id, c]));

  let checklist = `# gp-frontend — Generated execution checklist\n\n`;
  checklist += `> Generated: ${new Date().toISOString()}  \n`;
  checklist += `> Catalog: ${data.meta?.catalogVersion ?? "?"} (${data.meta?.fixTag ?? ""})  \n\n`;
  checklist += `Legend: [ ] not run · [x] pass · [~] blocked · [!] fail\n\n`;

  for (const suite of data.suites) {
    checklist += `## ${suite.name} (\`${suite.id}\`)\n\n`;
    for (const c of suite.cases) {
      const star = c.critical ? " **★**" : "";
      checklist += `- [ ] **${c.id}**${star} — ${c.title}  \`(${c.automation})\`\n`;
    }
    checklist += "\n";
  }

  checklist += `---\n\n## Connected flows (execute in order)\n\n`;
  for (const f of data.flows) {
    checklist += `### ${f.id}: ${f.name}${f.critical ? " ★" : ""}\n\n${f.description}\n\n`;
    for (const cid of f.caseIds) {
      const c = byId[cid];
      checklist += `1. ${cid}${c ? ` — ${c.title}` : " _(case ref)_"}\n`;
    }
    checklist += "\n";
  }

  fs.writeFileSync(path.join(OUT_DIR, "EXECUTION_CHECKLIST.md"), checklist, "utf8");

  const stats = {
    generatedAt: new Date().toISOString(),
    suiteCount: data.suites.length,
    caseCount: allCases.length,
    flowCount: data.flows.length,
    criticalCount: allCases.filter((c) => c.critical).length,
    byAutomation: allCases.reduce((acc, c) => {
      acc[c.automation] = (acc[c.automation] || 0) + 1;
      return acc;
    }, {}),
  };
  fs.writeFileSync(path.join(OUT_DIR, "stats.json"), JSON.stringify(stats, null, 2), "utf8");

  let matrix = `# Flow × case coverage matrix\n\n`;
  matrix += `| Flow | Cases | Critical |\n|------|-------|----------|\n`;
  for (const f of data.flows) {
    matrix += `| ${f.id} | ${f.caseIds.length} | ${f.critical ? "yes" : "no"} |\n`;
  }
  matrix += `\n`;
  fs.writeFileSync(path.join(OUT_DIR, "FLOW_COVERAGE_MATRIX.md"), matrix, "utf8");

  console.log("Generated:", path.join(OUT_DIR, "EXECUTION_CHECKLIST.md"));
  console.log("Stats:", stats);
}

main();
