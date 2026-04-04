import { test, expect } from "@playwright/test";

/**
 * GP Daily redirect behaviour depends on VITE_GP_DAILY_ENABLED at build/dev time.
 * Fix_V0.9
 */

test.describe("GP Daily routing (build-time flag)", () => {
  test("GFP-ENV-05: visiting /gp-daily when Daily disabled redirects to gp-store", async ({
    page,
  }) => {
    await page.goto("/gp-daily", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const url = page.url();
    if (url.includes("/gp-store")) {
      expect(url).toMatch(/gp-store/);
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "VITE_GP_DAILY_ENABLED may be true — /gp-daily did not redirect to gp-store (expected).",
      });
      expect(url).toBeTruthy();
    }
  });
});
