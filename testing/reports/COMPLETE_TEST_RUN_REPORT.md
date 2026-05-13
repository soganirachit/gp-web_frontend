# GP customer portal — complete automated test run report

**Run completed:** 2026-04-05 (UTC, machine-local)  
**Command:** `npm run test:gp-plan:full` from `gp-frontend/`  
**API target:** `VITE_API_BASE_URL` in `gp-frontend/.env` (this run: production API origin used by smoke scripts)

---

## 1. Executive summary

| Layer | Result | What ran |
|--------|--------|----------|
| JWT refresh | **PASS** | `test:e2e:auth-db` — `send-otp` → DB `otp_verifications` → `verify-otp` → `E2E_ACCESS_TOKEN` / `E2E_REFRESH_TOKEN` in `testing/e2e/.env.local` |
| Artifact generation | **PASS** | `node testing/scripts/generate-artifacts.mjs` — checklist + `stats.json` |
| Production build | **PASS** | `npm run build` (tsc + vite) |
| Static bundle smoke | **PASS** | `dist/`, Fix_V0.9 testids in JS bundle |
| Playwright (Chromium) | **PASS** | **25 passed**, **1 skipped** (~45s) |
| API smoke (anon) | **PASS** | health + OpenAPI schema |
| API smoke (JWT) | **PASS** | `/users/me/`, `/cart/`, `/orders/`, `/users/addresses/` |

**Environment note:** A first attempt on this host **failed all 26 Playwright tests** because Playwright’s **Chromium / headless-shell binaries were not installed** (`npx playwright install chromium` fixed it). CI or fresh clones should run that once.

**Scenario catalog (`stats.json`):** **164** atomic cases, **53** critical (★). The repo tags **133** as **manual**, **13** as **e2e**, **17** as **api**, **1** as **build**. This run exercised **all implemented automated checks** (build + static + API scripts + **26** Playwright cases, one skipped). It did **not** execute the **133 manual** checklist rows (no automation exists for them in this repo).

---

## 2. Commands executed (in order)

1. `npm run test:e2e:auth-db`  
2. `node testing/scripts/run-full-plan.mjs` (internally: generate → build → static-smoke → Playwright → api-smoke → api-authenticated-smoke → write `LATEST_FULL_PLAN_REPORT.md`)

---

## 3. Playwright — every test (26 total)

| # | File | Title | Result |
|---|------|--------|--------|
| 1 | `authenticated-full.spec.ts` | GFP-AUTH-50 inverse: basket loads when logged in | **PASS** |
| 2 | `authenticated-full.spec.ts` | GFP-ORD-01: orders list route | **PASS** |
| 3 | `authenticated-full.spec.ts` | GFP-ACC-01: account / settings hub | **PASS** |
| 4 | `authenticated-full.spec.ts` | GFP-ACC-04: addresses list | **PASS** |
| 5 | `authenticated-full.spec.ts` | GFP-ACC-02: profile | **PASS** |
| 6 | `authenticated-full.spec.ts` | GFP-WAL-01: wallet route (GP Store) | **PASS** |
| 7 | `authenticated-full.spec.ts` | GFP-LOC-01 shell: location page | **PASS** |
| 8 | `authenticated-full.spec.ts` | GFP-SUP-01: customer support | **PASS** |
| 9 | `authenticated-full.spec.ts` | GFP-SUP-04: FAQ | **PASS** |
| 10 | `authenticated-full.spec.ts` | GFP-REF-01: refer | **PASS** |
| 11 | `authenticated-full.spec.ts` | GFP-CAT-01 auth context: products still loads | **PASS** |
| 12 | `authenticated-full.spec.ts` | GFP-HOM-01: gp-store home with session | **PASS** |
| 13 | `authenticated-full.spec.ts` | GFP-PAY-01 shell: payment-success route | **PASS** |
| 14 | `authenticated-full.spec.ts` | GFP-SUB-01 shell: manage subscription (if routed) | **PASS** |
| 15 | `authenticated-full.spec.ts` | FLOW: store → products → basket → account (JWT) | **PASS** |
| 16 | `gp-daily-redirect.spec.ts` | GFP-ENV-05: /gp-daily redirects when Daily disabled | **PASS** |
| 17 | `gp-store-smoke.spec.ts` | GFP-AUTH-01: root → startup → /home | **PASS** |
| 18 | `gp-store-smoke.spec.ts` | GFP-HOM-03: /home loads inside layout | **PASS** |
| 19 | `gp-store-smoke.spec.ts` | GFP-NAV-01: bottom nav Home + Basket | **PASS** |
| 20 | `gp-store-smoke.spec.ts` | GFP-CAT-01: /gp-store/products loads | **PASS** |
| 21 | `gp-store-smoke.spec.ts` | GFP-LAY-03: login hides bottom nav | **PASS** |
| 22 | `gp-store-smoke.spec.ts` | GFP-AUTH-50: basket → login when logged out | **PASS** |
| 23 | `gp-store-smoke.spec.ts` | GFP-LEG-01: Terms | **PASS** |
| 24 | `gp-store-smoke.spec.ts` | GFP-LEG-02: Privacy | **PASS** |
| 25 | `gp-store-smoke.spec.ts` | FLOW partial: home → gp-store → products (no auth) | **PASS** |
| 26 | `otp-login-flow.spec.ts` | GFP-AUTH-10→20: send OTP + verify → session (UI) | **SKIPPED** |

**Why #26 was skipped:** `hasOtpCredentials()` requires **`E2E_OTP`** (6 digits) in `testing/e2e/.env.local`. JWT was obtained via **`test:e2e:auth-db`** (no UI OTP). To run the **browser OTP** spec: add a **fresh** `E2E_OTP` right after WhatsApp delivers it, then `npx playwright test testing/e2e/tests/otp-login-flow.spec.ts` (or full `npm run test:e2e`).

---

## 4. API smoke — unauthenticated (`test:api-smoke`)

- API base reachable  
- `GET /health/` → 200  
- `GET /api/schema/` → 200  

(Exact JSON is in `testing/reports/LATEST_FULL_PLAN_REPORT.md` §5.)

---

## 5. API smoke — authenticated (`test:api-auth-smoke`)

- `GET /users/me/` — Bearer **E2E_ACCESS_TOKEN** → 200  
- `GET /cart/` → 200  
- `GET /orders/` → 200  
- `GET /users/addresses/` → 200  

---

## 6. Static smoke (`test:static-smoke`)

- `dist/index.html` present  
- JS bundle count check  
- Fix_V0.9 markers: `gp-root-layout`, startup, nav testids present in bundle  

---

## 7. What was **not** run (by design)

These are **not** implemented as one-click automation in `gp-frontend/testing/`:

- **133 manual-tagged** scenarios in `testing/scenarios/gp-frontend-scenarios.json` / `testing/generated/EXECUTION_CHECKLIST.md` (UX edge cases, payments, WhatsApp edge cases, deep support flows, etc.).
- **Connected flows J1–J6** end-to-end (Razorpay, real order placement, subscription billing, etc.).
- **Cross-browser** (Safari iOS, Chrome Android) — suite is **Chromium only**.
- **OTP UI path** unless you set **`E2E_OTP`** (see §3).

---

## 8. How to reproduce

```bash
cd gp-frontend
npm install
npx playwright install chromium   # once per machine / CI image
# testing/e2e/.env.local: E2E_PHONE=... ; DB via monorepo backend .env or E2E_DATABASE_URL
npm run test:gp-plan:full
```

Optional strict CI (fail job if Playwright fails): `STRICT_E2E=1 npm run test:gp-plan`.

---

## 9. Related files

| File | Purpose |
|------|---------|
| `testing/reports/LATEST_FULL_PLAN_REPORT.md` | Raw machine output from last `test:gp-plan` |
| `testing/reports/FULL_PLAN_*.md` | Timestamped snapshots |
| `testing/reports/PRODUCTION_READINESS_REPORT.md` | Human production summary |
| `testing/generated/EXECUTION_CHECKLIST.md` | Full 164-case manual matrix |
| `testing/e2e/CREDENTIALS.md` | JWT / DB / OTP env setup |

---

*This report describes what automation **can** cover today. It is not a substitute for executing the manual checklist and staging journeys before production.*
