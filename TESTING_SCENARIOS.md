# gp-frontend — testing catalog (location moved)

The **full customer-app scenario catalog** and all **managed testing assets** live under:

**[`testing/docs/TESTING_SCENARIOS.md`](./testing/docs/TESTING_SCENARIOS.md)**

Runbooks, Playwright E2E, API smoke, checklist generation, and **production gate reports**:

**[`testing/README.md`](./testing/README.md)**

Quick commands (from `gp-frontend/`):

```bash
npm run test:generate    # Regenerate checklist + stats from JSON
npm run test:api-smoke   # Health + OpenAPI reachability
npm run test:e2e         # Playwright smoke
npm run test:gp-plan     # Build + E2E + API + LATEST_FULL_PLAN_REPORT.md
```
