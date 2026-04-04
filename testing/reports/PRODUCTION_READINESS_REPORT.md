# gp-frontend — production readiness report (GP customer app)

**Program:** Genda Phool customer web (`gp-frontend`)  
**Engineering tag:** `Fix_V0.9` (non-disruptive `data-testid` hooks + managed testing folder)  
**Report date:** 2026-04-02 (UTC)  
**Machine run:** automated plan + live API smoke against configured `VITE_API_BASE_URL`

---

## 1. Executive summary

| Gate | Result | Notes |
|------|--------|--------|
| TypeScript + Vite production build | **PASS** | `npm run build` completed |
| Static bundle integrity | **PASS** | `dist/` present; **Fix_V0.9** strings `gp-root-layout`, `gp-startup-screen`, `gp-bottom-nav` found in compiled JS |
| Backend reachability (same origin as API) | **PASS** | `GET /health/` → 200 healthy; `GET /api/schema/` → 200 |
| Playwright E2E (10 smoke tests) | **PASS** | After `npx playwright install-deps chromium` + `playwright install chromium`, full `test:gp-plan` run: **10/10 passed** (~19s). Re-run locally if deps missing. |
| Full manual catalog (164 cases) | **PENDING** | Execute `testing/generated/EXECUTION_CHECKLIST.md` — especially **53 critical (★)** rows |
| Connected journeys J1–J6 | **PENDING** | Require OTP, payment, and staging credentials — cannot be fully automated without secrets |

**Readiness statement:** The application **builds cleanly**, **Playwright smoke is green** (routing, shell, nav, legal, protected basket redirect), the **production bundle contains QA hooks**, and the **configured API origin is healthy with OpenAPI available**. Full **manual** catalog and **J1–J6** on staging remain **mandatory** for complete sign-off.

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
| FLOW-J1 | First purchase (GP Store) | Partial (shell only if E2E run) | **Required** — OTP, Razorpay, order |
| FLOW-J2 | Returning user + wallet | — | **Required** |
| FLOW-J3 | Subscription lifecycle | — | **Required** |
| FLOW-J4 | Support ticket + chat | — | **Required** |
| FLOW-J5 | GP Daily mirror | ENV-05 in E2E | **Required** if `VITE_GP_DAILY_ENABLED=true` |
| FLOW-J6 | Payment failure recovery | — | **Required** |
| FLOW-E2E-SMOKE | Playwright smoke suite | **PASS** (10 tests) | Re-run: `npm run test:e2e` or `npm run test:gp-plan` |

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
node testing/scripts/generate-artifacts.mjs --init-scenarios   # first-time JSON seed
npm run test:generate
SKIP_PLAYWRIGHT=1 node testing/scripts/run-full-plan.mjs      # build + static + API + report
# Optional full run with browser:
# npx playwright install-deps chromium   # Linux
# npm run test:gp-plan
```

---

## 6. Sign-off block (copy for release notes)

- [ ] **Build:** `npm run build` green on release branch  
- [ ] **Static smoke:** `npm run build && npm run test:static-smoke` green  
- [ ] **API:** `npm run test:api-smoke` green against **production** API URL (or dedicated prod smoke)  
- [ ] **E2E:** `npm run test:e2e` green on staging URL with `PLAYWRIGHT_BASE_URL` if not using bundled `webServer`  
- [ ] **Checklist:** All ★ rows in `testing/generated/EXECUTION_CHECKLIST.md`  
- [ ] **Flows J1–J6:** Documented pass on staging with real OTP / test payments  
- [ ] **Config:** `VITE_GP_DAILY_ENABLED`, `VITE_RAZORPAY_KEY`, `VITE_API_BASE_URL` verified for target environment  

**QA lead:** _________________ **Date:** _________  
**Product / release owner:** _________________ **Date:** _________  

---

*This file is the human-facing production summary. Raw machine output: `LATEST_FULL_PLAN_REPORT.md`.*
