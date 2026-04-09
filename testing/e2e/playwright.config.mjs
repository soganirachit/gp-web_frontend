import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Fix_V0.9 — load testing/e2e/.env.local (E2E_* only) */
function loadE2eEnv() {
  const envLocal = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envLocal)) return;
  for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
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

loadE2eEnv();

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(__dirname, "../reports/playwright-html") }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:5173",
    // Reuse when 5173 is already up (avoids failure when CI=1 and a dev server exists).
    reuseExistingServer: process.env.PLAYWRIGHT_FORCE_NEW_SERVER !== "1",
    timeout: 120_000,
  },
});
