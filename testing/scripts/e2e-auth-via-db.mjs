#!/usr/bin/env node
/**
 * E2E auth without the OTP UI:
 *   POST send-otp → read otp_verifications (Postgres) → POST verify-otp → JWT in .env.local
 *
 * Requires: E2E_PHONE in testing/e2e/.env.local, VITE_API_BASE_URL in gp-frontend/.env
 * DB: E2E_DATABASE_URL or ../genda_phool_backend/.env (DB_*)
 *
 * Usage:
 *   node testing/scripts/e2e-auth-via-db.mjs           # write E2E_ACCESS_TOKEN (+ refresh) to .env.local
 *   node testing/scripts/e2e-auth-via-db.mjs --e2e   # same, then npm run test:e2e
 */
import { spawnSync } from "node:child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const E2E_DIR = path.join(FRONTEND_ROOT, "testing/e2e");
const ENV_LOCAL = path.join(E2E_DIR, ".env.local");
const BACKEND_ENV = path.resolve(FRONTEND_ROOT, "../genda_phool_backend/.env");

function loadE2eEnv() {
  if (!fs.existsSync(ENV_LOCAL)) return;
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key.startsWith("E2E_")) {
      process.env[key] = val;
    }
  }
}

function loadViteApiBase() {
  const envPath = path.join(FRONTEND_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*VITE_API_BASE_URL\s*=\s*(.+)$/);
    if (m) {
      let v = m[1].trim().replace(/^["']|["']$/g, "");
      if (!process.env.VITE_API_BASE_URL) process.env.VITE_API_BASE_URL = v;
    }
  }
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    out[k] = v;
  }
  return out;
}

function databaseUrlFromBackendEnv() {
  const b = parseEnvFile(BACKEND_ENV);
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = b;
  if (!DB_USER || !DB_HOST || !DB_NAME) return null;
  const pass = encodeURIComponent(DB_PASSWORD || "");
  const port = DB_PORT || "5432";
  return `postgresql://${DB_USER}:${pass}@${DB_HOST}:${port}/${DB_NAME}`;
}

async function fetchLatestOtp(client, phone10) {
  const q = `
    SELECT otp_code
    FROM otp_verifications
    WHERE is_verified = false
      AND expires_at > NOW()
      AND RIGHT(REGEXP_REPLACE(COALESCE(phone::text, ''), '[^0-9]', '', 'g'), 10) = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const r = await client.query(q, [phone10]);
  if (r.rows.length === 0) return null;
  return String(r.rows[0].otp_code || "").replace(/\D/g, "").slice(0, 6);
}

function mergeEnvLocal(accessToken, refreshToken) {
  let lines = [];
  if (fs.existsSync(ENV_LOCAL)) {
    lines = fs.readFileSync(ENV_LOCAL, "utf8").split("\n");
  }
  const stripKeys = new Set(["E2E_ACCESS_TOKEN", "E2E_REFRESH_TOKEN"]);
  lines = lines.filter((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return true;
    const eq = t.indexOf("=");
    if (eq === -1) return true;
    const k = t.slice(0, eq).trim();
    return !stripKeys.has(k);
  });
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
  }
  lines.push(`E2E_ACCESS_TOKEN=${accessToken}`);
  if (refreshToken) {
    lines.push(`E2E_REFRESH_TOKEN=${refreshToken}`);
  }
  fs.writeFileSync(ENV_LOCAL, lines.join("\n") + "\n", "utf8");
}

async function main() {
  const runE2e = process.argv.includes("--e2e");

  loadE2eEnv();
  loadViteApiBase();

  const phone10 = String(process.env.E2E_PHONE || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (phone10.length !== 10) {
    console.error("Set E2E_PHONE (10 digits) in testing/e2e/.env.local");
    process.exit(1);
  }

  const apiBase = (process.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiBase) {
    console.error("Missing VITE_API_BASE_URL in gp-frontend/.env");
    process.exit(1);
  }

  const phoneE164 = `+91${phone10}`;
  const sendUrl = `${apiBase}/auth/send-otp/`;
  const verifyUrl = `${apiBase}/auth/verify-otp/`;

  console.error(`[e2e-auth-via-db] send-otp ***${phone10.slice(-4)}`);
  const sendRes = await fetch(sendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ phone: phoneE164 }),
  });
  const sendBody = await sendRes.json().catch(() => ({}));
  if (!sendRes.ok || sendBody.success === false) {
    console.error("send-otp failed:", sendRes.status, JSON.stringify(sendBody).slice(0, 500));
    process.exit(1);
  }

  const dbUrl = process.env.E2E_DATABASE_URL || databaseUrlFromBackendEnv();
  if (!dbUrl) {
    console.error("Set E2E_DATABASE_URL or use monorepo ../genda_phool_backend/.env with DB_*.");
    process.exit(1);
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 15000 });
  let otp = null;
  try {
    await client.connect();
    const deadline = Date.now() + 45000;
    let wait = 200;
    while (Date.now() < deadline) {
      otp = await fetchLatestOtp(client, phone10);
      if (otp && otp.length === 6) break;
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(800, wait + 100);
    }
  } finally {
    await client.end().catch(() => {});
  }

  if (!otp || otp.length !== 6) {
    console.error("No fresh OTP row in otp_verifications for this number (check DB connectivity / expiry).");
    process.exit(1);
  }

  console.error("[e2e-auth-via-db] POST verify-otp");
  const verifyRes = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ phone: phone10, otp }),
  });
  const verifyBody = await verifyRes.json().catch(() => ({}));

  if (!verifyRes.ok || verifyBody.success === false) {
    console.error("verify-otp failed:", verifyRes.status, JSON.stringify(verifyBody).slice(0, 800));
    process.exit(1);
  }

  const data = verifyBody.data || {};
  const access = data.access_token;
  const refresh = data.refresh_token || "";
  if (typeof access !== "string" || !access) {
    console.error("verify-otp OK but no data.access_token in body:", JSON.stringify(verifyBody).slice(0, 400));
    process.exit(1);
  }

  mergeEnvLocal(access, refresh);
  process.env.E2E_ACCESS_TOKEN = access;
  if (refresh) process.env.E2E_REFRESH_TOKEN = refresh;

  console.error(`[e2e-auth-via-db] Wrote E2E_ACCESS_TOKEN (+ refresh) → ${path.relative(FRONTEND_ROOT, ENV_LOCAL)}`);

  if (!runE2e) {
    process.exit(0);
  }

  const r = spawnSync("npx", ["playwright", "test", "--config=testing/e2e/playwright.config.mjs"], {
    cwd: FRONTEND_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_ACCESS_TOKEN: access,
      E2E_REFRESH_TOKEN: refresh,
      E2E_PHONE: phone10,
    },
  });
  process.exit(r.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
