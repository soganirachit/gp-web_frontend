# gp-frontend — production readiness report (GP customer app)

**Program:** Genda Phool customer web (`gp-frontend`)  
**Engineering tag:** `Fix_V0.9` (non-disruptive `data-testid` hooks + managed testing folder)  
**Report date:** 2026-04-04 (UTC)  
**Machine run:** `npm run test:gp-plan:full` (JWT via `test:e2e:auth-db`) + `LATEST_FULL_PLAN_REPORT.md` against configured `VITE_API_BASE_URL`

---

## 1. Executive summary

| Gate | Result | Notes |
|------|--------|--------|
| TypeScript + Vite production build | **PASS** | `npm run build` completed |
| Static bundle integrity | **PASS** | `dist/` present; **Fix_V0.9** strings `gp-root-layout`, `gp-startup-screen`, `gp-bottom-nav` found in compiled JS |
| Backend reachability (same origin as API) | **PASS** | `GET /health/` → 200 healthy; `GET /api/schema/` → 200 |
| Playwright E2E | **PASS** | **25 passed**, **1 skipped** (optional UI OTP spec — needs `E2E_OTP`). Includes JWT-injected routes + public smoke. `npx playwright install chromium` if binaries missing. |
| API smoke (JWT) | **PASS** | `npm run test:api-auth-smoke` — `/users/me/`, `/cart/`, `/orders/`, `/users/addresses/` with token from `.env.local` |
| Full manual catalog (164 cases) | **PENDING** | Execute `testing/generated/EXECUTION_CHECKLIST.md` — especially **53 critical (★)** rows |
| Connected journeys J1–J6 | **PENDING** | Require OTP, payment, and staging credentials — cannot be fully automated without secrets |

**Readiness statement:** The application **builds cleanly**, **automated E2E is green** (public shell + **authenticated** basket, orders, account, wallet, support, FAQ, refer, products, payment/subscription shells, connected browse), **authenticated API smoke is green**, the **bundle contains Fix_V0.9 testids**, and the **API origin is healthy**. Full **manual** catalog (164) and **J1–J6** on staging remain **mandatory** for complete sign-off.

---

## 2. Scope aligned to `testing/docs/TESTING_SCENARIOS.md`

All scenario narrative remains in:

- `testing/docs/TESTING_SCENARIOS.md`

Machine-readable cases + **7 connected flows** (including J1–J6 + automated smoke mapping):

- `testing/scenarios/gp-frontend-scenarios.json`  
- Regenerate checklists anytime: `npm run test:generate`  
- Reset JSON from embedded defaults: `node testing/scripts/generate-artifacts.mjs --init-scenarios`

---

## 3. Connected flows — execution status

| Flow ID | Name | Automated this run | Manual / staging |
|---------|------|--------------------|------------------|
| FLOW-J1 | First purchase (GP Store) | Partial (browse + auth shell; no paid checkout) | **Required** — OTP, Razorpay, order |
| FLOW-J2 | Returning user + wallet | Partial (wallet route + API cart) | **Required** — full wallet top-up / spend |
| FLOW-J3 | Subscription lifecycle | — | **Required** |
| FLOW-J4 | Support ticket + chat | — | **Required** |
| FLOW-J5 | GP Daily mirror | ENV-05 in E2E | **Required** if `VITE_GP_DAILY_ENABLED=true` |
| FLOW-J6 | Payment failure recovery | — | **Required** |
| FLOW-E2E-SMOKE | Playwright suite | **PASS** (25 run, 1 skipped OTP UI) | One-shot: `npm run test:gp-plan:full` · Report: `npm run test:gp-plan` |

---

## 4. Quantitative coverage (catalog)

| Metric | Value |
|--------|------:|
| Suites | 18 |
| Atomic cases | 164 |
| Critical (★) cases | 53 |
| Connected flows defined | 7 |
| Automation tags | build: 1, e2e: 13, api: 17, manual: 133 |

---

## 5. Commands used for this report

```bash
cd gp-frontend
npm install
# testing/e2e/.env.local: E2E_PHONE (+ DB or E2E_DATABASE_URL) for JWT refresh; see testing/e2e/CREDENTIALS.md
npm run test:gp-plan:full    # test:e2e:auth-db → JWT in .env.local, then full plan (build, E2E, API smokes, report)

# Headless CI without browser / port issues:
# SKIP_PLAYWRIGHT=1 npm run test:gp-plan

# Linux browser deps if needed:
# npx playwright install-deps chromium && npx playwright install chromium

# Force Playwright to start a fresh dev server (default reuses 5173 if already listening):
# PLAYWRIGHT_FORCE_NEW_SERVER=1 npm run test:e2e
```

---

## 6. Sign-off block (copy for release notes)

- [ ] **Build:** `npm run build` green on release branch  
- [ ] **Static smoke:** `npm run build && npm run test:static-smoke` green  
- [ ] **API:** `npm run test:api-smoke` green against **production** API URL (or dedicated prod smoke)  
- [ ] **E2E:** `npm run test:gp-plan:full` or `npm run test:e2e` green (`PLAYWRIGHT_BASE_URL` if not using bundled `webServer`)  
- [ ] **Checklist:** All ★ rows in `testing/generated/EXECUTION_CHECKLIST.md`  
- [ ] **Flows J1–J6:** Documented pass on staging with real OTP / test payments  
- [ ] **Config:** `VITE_GP_DAILY_ENABLED`, `VITE_RAZORPAY_KEY`, `VITE_API_BASE_URL` verified for target environment  

**QA lead:** _________________ **Date:** _________  
**Product / release owner:** _________________ **Date:** _________  

---

*This file is the human-facing production summary. Raw machine output: `LATEST_FULL_PLAN_REPORT.md`.*
