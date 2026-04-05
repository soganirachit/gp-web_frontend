import { test, expect } from "@playwright/test";
import { injectCustomerJwt, hasJwtCredentials } from "../helpers/inject-auth";

/**
 * Full authenticated surface smoke — requires testing/e2e/.env.local
 * Maps to catalog: AUTH (post-login), CART, ORD, ACC, SUP, WAL, etc.
 * Fix_V0.9
 */

const needsJwt = () => {
  test.skip(!hasJwtCredentials(), "Set E2E_ACCESS_TOKEN in testing/e2e/.env.local");
};

test.describe("Authenticated — core (JWT)", () => {
  test.beforeEach(async ({ page }) => {
    needsJwt();
    await injectCustomerJwt(page);
  });

  test("GFP-AUTH-50 inverse: basket loads when logged in", async ({ page }) => {
    await page.goto("/gp-store/basket");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-ORD-01: orders list route", async ({ page }) => {
    await page.goto("/gp-store/orders");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-ACC-01: account / settings hub", async ({ page }) => {
    await page.goto("/gp-store/account");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-ACC-04: addresses list", async ({ page }) => {
    await page.goto("/gp-store/addresses");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-ACC-02: profile", async ({ page }) => {
    await page.goto("/gp-store/profile");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-WAL-01: wallet route (GP Store)", async ({ page }) => {
    await page.goto("/gp-store/wallet");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-LOC-01 shell: location page", async ({ page }) => {
    await page.goto("/gp-store/location");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-SUP-01: customer support", async ({ page }) => {
    await page.goto("/gp-store/customer-support");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-SUP-04: FAQ", async ({ page }) => {
    await page.goto("/gp-store/faq");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-REF-01: refer", async ({ page }) => {
    await page.goto("/gp-store/refer");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-CAT-01 auth context: products still loads", async ({ page }) => {
    await page.goto("/gp-store/products");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-HOM-01: gp-store home with session", async ({ page }) => {
    await page.goto("/gp-store");
    await expect(page.getByTestId("gp-bottom-nav")).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Authenticated — payment & subscription routes (JWT)", () => {
  test.beforeEach(async ({ page }) => {
    needsJwt();
    await injectCustomerJwt(page);
  });

  test("GFP-PAY-01 shell: payment-success route", async ({ page }) => {
    await page.goto("/gp-store/payment-success");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });

  test("GFP-SUB-01 shell: manage subscription (if routed)", async ({ page }) => {
    await page.goto("/gp-daily/manage-my-subscription");
    await page.waitForTimeout(800);
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20000 });
  });
});

test.describe("Connected flow — logged-in browse (JWT)", () => {
  test.beforeEach(async ({ page }) => {
    needsJwt();
    await injectCustomerJwt(page);
  });

  test("FLOW: store → products → basket → account", async ({ page }) => {
    await page.goto("/gp-store");
    await expect(page.getByTestId("gp-bottom-nav")).toBeVisible();
    await page.goto("/gp-store/products");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
    await page.goto("/gp-store/basket");
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/gp-store/account");
    await expect(page.getByTestId("gp-root-layout")).toBeVisible();
  });
});
