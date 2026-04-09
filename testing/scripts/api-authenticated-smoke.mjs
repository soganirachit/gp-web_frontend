#!/usr/bin/env node
/**
 * Authenticated API checks using JWT from testing/e2e/.env.local (E2E_ACCESS_TOKEN).
 * Fix_V0.9
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, "../..");
const E2E_ENV = path.join(FRONTEND, "testing/e2e/.env.local");

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    out[k] = v;
  }
  return out;
}

function loadApiBase() {
  const rootEnv = parseEnvFile(path.join(FRONTEND, ".env"));
  return rootEnv.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || "";
}

async function get(url, token) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: ctrl.signal,
    });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 300);
    }
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(to);
  }
}

async function main() {
  const e2e = parseEnvFile(E2E_ENV);
  const token = e2e.E2E_ACCESS_TOKEN || process.env.E2E_ACCESS_TOKEN;
  const base = loadApiBase();
  const result = {
    timestamp: new Date().toISOString(),
    apiBase: base || "(missing)",
    hasToken: !!token,
    checks: [],
  };

  if (!base) {
    result.checks.push({ name: "VITE_API_BASE_URL", ok: false, detail: "missing" });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }

  if (!token) {
    result.skipped = true;
    result.checks.push({
      name: "E2E_ACCESS_TOKEN",
      ok: true,
      detail: "SKIPPED — add testing/e2e/.env.local with E2E_ACCESS_TOKEN to enable",
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 0;
    return;
  }

  const b = base.replace(/\/$/, "");
  const endpoints = [
    ["GET /users/me/", `${b}/users/me/`],
    ["GET /cart/", `${b}/cart/`],
    ["GET /orders/", `${b}/orders/`],
    ["GET /users/addresses/", `${b}/users/addresses/`],
  ];

  for (const [name, url] of endpoints) {
    const r = await get(url, token);
    result.checks.push({
      name,
      ok: r.ok,
      status: r.status,
      detail:
        typeof r.body === "object"
          ? JSON.stringify(r.body).slice(0, 220)
          : String(r.body).slice(0, 120),
    });
  }

  const failed = result.checks.some((c) => !c.ok);
  process.exitCode = failed ? 1 : 0;
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
