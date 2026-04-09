import { test, expect } from "@playwright/test";

/**
 * GP Daily routes are always mounted; they are no longer gated by VITE_GP_DAILY_ENABLED.
 */

test.describe("GP Daily routing", () => {
  test("GFP-ENV-05: visiting /gp-daily loads GP Daily (no redirect to gp-store)", async ({
    page,
  }) => {
    await page.goto("/gp-daily", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/gp-daily/);
  });
});
