# gp-frontend — managed testing (Fix_V0.9)

All GP customer-app testing assets live **only** under this folder (plus minimal `data-testid` hooks in the app marked `Fix_V0.9`).

## Contents

| Path | Purpose |
|------|---------|
| `docs/TESTING_SCENARIOS.md` | Full human-readable scenario catalog (mirror of repo narrative). |
| `scenarios/gp-frontend-scenarios.json` | Machine-readable cases + **connected flows** (J1–J6). Regenerate with `--init-scenarios` if you reset. |
| `scripts/generate-artifacts.mjs` | Builds `generated/EXECUTION_CHECKLIST.md`, `FLOW_COVERAGE_MATRIX.md`, `stats.json`. |
| `scripts/api-smoke.mjs` | `GET /health/` + `/api/schema/` from API origin (reads `.env` `VITE_API_BASE_URL`). |
| `scripts/run-full-plan.mjs` | Build + Playwright + API smoke + **report** to `reports/`. |
| `e2e/` | Playwright config + smoke specs. |
| `generated/` | **Gitignored** — produced by scripts (checklists). |
| `reports/` | Full plan reports + Playwright HTML (subfolder). |

## Commands (from `gp-frontend/` root)

```bash
npm run test:generate          # Checklist + stats + matrix only
npm run test:api-smoke         # Backend reachability (needs .env API URL)
npm run test:static-smoke      # After `npm run build` — verify dist + Fix_V0.9 testids in bundle
npm run test:e2e               # Playwright (starts dev server if needed)
npm run test:gp-plan           # Full orchestration + LATEST_FULL_PLAN_REPORT.md
npm run test:gp-plan:no-e2e    # Same but skips Playwright (minimal Linux CI / headless deps)
```

**Linux:** if Playwright fails with `libatk-1.0.so.0`, run `npx playwright install-deps chromium` (may need `sudo`) or use `test:gp-plan:no-e2e` and run `test:e2e` on a developer machine.

**Strict CI:** set `STRICT_E2E=1` with `test:gp-plan` to fail the job when Playwright fails.

### Regenerate scenario JSON from embedded defaults

```bash
node testing/scripts/generate-artifacts.mjs --init-scenarios
```

Edit `testing/scenarios/gp-frontend-scenarios.json` for custom cases, then run `npm run test:generate` again.

## Prerequisites

- Node 18+
- `npm install` in `gp-frontend` (includes `@playwright/test`)
- First time: `npx playwright install chromium`

## Production gate

1. `npm run test:gp-plan` — green build + green Playwright + review API smoke JSON.
2. Manually complete every **★** row in `testing/generated/EXECUTION_CHECKLIST.md`.
3. Run end-to-end journeys **J1–J6** on staging with real credentials and OTP.

The root `TESTING_SCENARIOS.md` points here for the canonical catalog path.
