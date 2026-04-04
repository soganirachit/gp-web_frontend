import { test, expect } from "@playwright/test";

/**
 * Production-readiness smoke: public routes, shell, auth guards.
 * Fix_V0.9
 */

test.describe("Startup & shell", () => {
  test("GFP-AUTH-01: root shows startup then navigates to /home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gp-startup-screen")).toBeVisible({ timeout: 3000 });
    await page.waitForURL("**/home", { timeout: 8000 });
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
  });

  test("GFP-HOM-03: /home loads inside layout", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
  });
});

test.describe("GP Store navigation", () => {
  test("GFP-NAV-01: /gp-store shows bottom nav with Home and Basket", async ({ page }) => {
    await page.goto("/gp-store");
    const nav = page.getByTestId("gp-bottom-nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /home/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /basket/i })).toBeVisible();
  });

  test("GFP-CAT-01: /gp-store/products loads without crash", async ({ page }) => {
    await page.goto("/gp-store/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("GFP-LAY-03: /gp-store/login hides bottom nav", async ({ page }) => {
    await page.goto("/gp-store/login");
    await expect(page.getByTestId("gp-bottom-nav")).toHaveCount(0);
  });

  test("GFP-AUTH-50: /gp-store/basket redirects to login when logged out", async ({
    page,
  }) => {
    await page.goto("/gp-store/basket");
    await page.waitForURL(/\/gp-store\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/gp-store/login");
  });
});

test.describe("Legal & static", () => {
  test("GFP-LEG-01: Terms page renders", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
  });

  test("GFP-LEG-02: Privacy page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Connected flow — browse shell (no auth)", () => {
  test("FLOW partial: home → gp-store → products", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
    await page.goto("/gp-store");
    await expect(page.getByTestId("gp-bottom-nav")).toBeVisible();
    await page.goto("/gp-store/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
  });
});
