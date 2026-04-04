#!/usr/bin/env node
/**
 * Optional API reachability checks against configured backend (no auth).
 * Reads VITE_API_BASE_URL from gp-frontend/.env or process.env.
 * Fix_V0.9
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "../..");

function loadEnv() {
  const envPath = path.join(FRONTEND_ROOT, ".env");
  const out = { ...process.env };
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*VITE_API_BASE_URL\s*=\s*(.+)$/);
      if (m) {
        let v = m[1].trim().replace(/^["']|["']$/g, "");
        if (!out.VITE_API_BASE_URL) out.VITE_API_BASE_URL = v;
      }
    }
  }
  return out;
}

function originFromApiV1(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, "").split("/");
    if (parts[parts.length - 1] === "v1" && parts[parts.length - 2] === "api") {
      u.pathname = "/";
      return u.origin;
    }
    return u.origin;
  } catch {
    return null;
  }
}

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep text */
    }
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const env = loadEnv();
  const apiBase = env.VITE_API_BASE_URL || "";
  const results = {
    timestamp: new Date().toISOString(),
    apiBaseUrl: apiBase || "(not set)",
    checks: [],
  };

  if (!apiBase) {
    results.checks.push({
      name: "VITE_API_BASE_URL",
      ok: false,
      detail: "Missing — set in .env for smoke tests",
    });
    console.log(JSON.stringify(results, null, 2));
    process.exitCode = 2;
    return;
  }

  const origin = originFromApiV1(apiBase);
  const healthUrl = origin ? `${origin}/health/` : null;
  const schemaUrl = origin ? `${origin}/api/schema/` : null;

  results.checks.push({
    name: "api_base_reachable",
    ok: true,
    detail: apiBase,
  });

  if (healthUrl) {
    const h = await fetchJson(healthUrl);
    results.checks.push({
      name: "GET /health/",
      ok: h.ok,
      status: h.status,
      detail: typeof h.body === "object" ? JSON.stringify(h.body).slice(0, 200) : String(h.body).slice(0, 200),
    });
  }

  if (schemaUrl) {
    const s = await fetchJson(schemaUrl, { headers: { Accept: "application/json" } });
    results.checks.push({
      name: "GET /api/schema/",
      ok: s.ok,
      status: s.status,
      detail: s.ok ? "OpenAPI schema reachable" : String(s.body).slice(0, 120),
    });
  }

  const failed = results.checks.some((c) => c.name !== "api_base_reachable" && c.ok === false);
  process.exitCode = failed ? 1 : 0;
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
