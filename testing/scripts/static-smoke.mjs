#!/usr/bin/env node
/**
 * Validates production build output without a browser (CI-friendly).
 * Fix_V0.9
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const DIST = path.join(ROOT, "dist");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function main() {
  const results = { ok: true, checks: [] };

  const index = path.join(DIST, "index.html");
  const indexOk = fs.existsSync(index);
  results.checks.push({ name: "dist/index.html", ok: indexOk });
  if (!indexOk) results.ok = false;

  const assets = walk(path.join(DIST, "assets"));
  const jsFiles = assets.filter((f) => f.endsWith(".js"));
  results.checks.push({ name: "dist/assets/*.js count", ok: jsFiles.length > 0, detail: String(jsFiles.length) });

  const bundleText = jsFiles
    .slice(0, 80)
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
  const hasRoot = bundleText.includes("gp-root-layout");
  const hasStartup = bundleText.includes("gp-startup-screen");
  const hasNav = bundleText.includes("gp-bottom-nav");
  results.checks.push({ name: "Fix_V0.9 testids in bundle", ok: hasRoot && hasStartup && hasNav, detail: { hasRoot, hasStartup, hasNav } });
  if (!hasRoot || !hasStartup || !hasNav) results.ok = false;

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...results }, null, 2));
  process.exitCode = results.ok ? 0 : 1;
}

main();
