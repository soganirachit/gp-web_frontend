#!/usr/bin/env node
/**
 * Orchestrates: artifact generation → production build → Playwright smoke → API smoke → report.
 * Run from gp-frontend: npm run test:gp-plan
 * Fix_V0.9
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REPORTS = path.join(ROOT, "testing", "reports");

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: opts.silent ? "pipe" : "inherit",
      env: { ...process.env, ...opts.env },
    });
    return { ok: true, out: out || "" };
  } catch (e) {
    return {
      ok: false,
      code: e.status,
      stderr: e.stderr?.toString?.() || e.message,
    };
  }
}

function main() {
  fs.mkdirSync(REPORTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = path.join(REPORTS, `FULL_PLAN_${stamp}.md`);
  const latestPath = path.join(REPORTS, "LATEST_FULL_PLAN_REPORT.md");

  const sections = [];
  sections.push(`# gp-frontend — Full test plan report`);
  sections.push(``);
  sections.push(`**Generated:** ${new Date().toISOString()}`);
  sections.push(`**Tag:** Fix_V0.9`);
  sections.push(``);
  sections.push(`## 1. Artifact generation`);
  const gen = run("node testing/scripts/generate-artifacts.mjs", { silent: true });
  sections.push(gen.ok ? "- **generate-artifacts:** PASS" : `- **generate-artifacts:** FAIL — ${JSON.stringify(gen)}`);
  if (gen.ok && gen.out) sections.push("```\n" + gen.out.trim() + "\n```");

  sections.push(``);
  sections.push(`## 2. Production build (tsc + vite)`);
  const build = run("npm run build", { silent: true });
  sections.push(build.ok ? "- **npm run build:** PASS" : `- **npm run build:** FAIL`);
  if (!build.ok) sections.push(`> ${build.stderr || build.code}`);

  sections.push(``);
  sections.push(`## 3. Static build smoke (no browser)`);
  const stat = run("node testing/scripts/static-smoke.mjs", { silent: true });
  sections.push(stat.ok ? "- **static-smoke:** PASS" : `- **static-smoke:** FAIL`);
  if (stat.out) sections.push("```json\n" + stat.out.trim() + "\n```");

  sections.push(``);
  sections.push(`## 4. Playwright E2E (testing/e2e)`);
  let pw = { ok: false, skipped: false };
  if (process.env.SKIP_PLAYWRIGHT === "1") {
    pw = { ok: true, skipped: true };
    sections.push("- **Playwright:** SKIPPED (`SKIP_PLAYWRIGHT=1`)");
  } else {
    pw = run("npx playwright test --config=testing/e2e/playwright.config.mjs", {
      env: { CI: process.env.CI || "" },
    });
    if (pw.ok) {
      sections.push("- **Playwright:** PASS");
    } else {
      sections.push(`- **Playwright:** FAIL or environment (install OS deps: \`npx playwright install-deps chromium\` on Linux)`);
      sections.push(`> See \`testing/reports/playwright-html\` or console. On minimal containers without libatk, use \`SKIP_PLAYWRIGHT=1 npm run test:gp-plan\` and run E2E locally.`);
    }
  }

  sections.push(``);
  sections.push(`## 5. API smoke (unauthenticated)`);
  const api = run("node testing/scripts/api-smoke.mjs", { silent: true });
  sections.push(api.ok ? "- **api-smoke:** PASS" : `- **api-smoke:** FAIL or partial`);
  if (api.out) sections.push("```json\n" + api.out.trim() + "\n```");

  sections.push(``);
  sections.push(`## 6. API smoke (authenticated JWT — testing/e2e/.env.local)`);
  const apiAuth = run("node testing/scripts/api-authenticated-smoke.mjs", { silent: true });
  sections.push(apiAuth.ok ? "- **api-auth-smoke:** PASS or SKIPPED" : `- **api-auth-smoke:** FAIL`);
  if (apiAuth.out) sections.push("```json\n" + apiAuth.out.trim() + "\n```");

  sections.push(``);
  sections.push(`## 7. Coverage summary`);
  try {
    const stats = JSON.parse(
      fs.readFileSync(path.join(ROOT, "testing", "generated", "stats.json"), "utf8")
    );
    sections.push(`- **Catalog cases:** ${stats.caseCount}`);
    sections.push(`- **Suites:** ${stats.suiteCount}`);
    sections.push(`- **Flows:** ${stats.flowCount}`);
    sections.push(`- **Critical (★) cases:** ${stats.criticalCount}`);
    sections.push(`- **By automation:** \`${JSON.stringify(stats.byAutomation)}\``);
  } catch {
    sections.push(`_(stats.json missing — run generate-artifacts)_`);
  }

  sections.push(``);
  sections.push(`## 8. Manual / follow-up before production`);
  sections.push(`- [ ] Execute \`testing/generated/EXECUTION_CHECKLIST.md\` — all ★ rows`);
  sections.push(`- [ ] Run connected flows J1–J6 with real OTP on staging`);
  sections.push(`- [ ] Razorpay **live** vs **test** key verification`);
  sections.push(`- [ ] Cross-browser spot check (Safari iOS, Chrome Android)`);
  sections.push(`- [ ] Verify \`VITE_GP_DAILY_ENABLED\` matches release config`);
  sections.push(`- [ ] \`testing/e2e/.env.local\` with JWT for full auth E2E + \`npm run test:api-auth-smoke\``);
  sections.push(``);
  sections.push(`---`);
  sections.push(`*Artifacts: \`testing/generated/\` · Scenarios: \`testing/scenarios/gp-frontend-scenarios.json\`*`);

  const strictE2e = process.env.STRICT_E2E === "1";
  const e2eFailed = !pw.skipped && !pw.ok;
  if (e2eFailed && strictE2e) {
    sections.push(`\n> **STRICT_E2E=1:** failing process due to Playwright.\n`);
  }

  const body = sections.join("\n");
  fs.writeFileSync(reportPath, body, "utf8");
  fs.writeFileSync(latestPath, body, "utf8");
  console.log("\nReport written:", reportPath);
  console.log("Latest symlink copy:", latestPath);

  const exitBad = !build.ok || !stat.ok || (strictE2e && e2eFailed);
  process.exitCode = exitBad ? 1 : 0;
}

main();
