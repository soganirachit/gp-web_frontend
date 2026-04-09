import { test, expect } from "@playwright/test";
import { hasOtpCredentials } from "../helpers/inject-auth";

/**
 * Optional UI smoke: real OTP in the browser (manual E2E_OTP from WhatsApp).
 * For automation, prefer npm run test:e2e:auth-db (API verify → JWT, no OTP UI).
 * Fix_V0.9
 */

test.describe.configure({ retries: 0 });

test.describe("OTP login (live API)", () => {
  test("GFP-AUTH-10→20: send OTP + verify → session", async ({ page }) => {
    test.skip(!hasOtpCredentials(), "Set E2E_PHONE and E2E_OTP in testing/e2e/.env.local, or use test:e2e:auth-db");

    test.setTimeout(120_000);

    const phone = process.env.E2E_PHONE!.replace(/\D/g, "").slice(-10);
    const otp = process.env.E2E_OTP!.replace(/\D/g, "").slice(0, 6);

    await page.goto("/gp-store/login");

    await page.getByTestId("gp-login-phone-input").fill(phone);
    await page.getByRole("button", { name: /get otp/i }).click();

    await page.waitForURL(/\/gp-store\/otp-verification/, { timeout: 60_000 });

    const first = page.getByTestId("gp-otp-input-first");
    await first.click();
    await first.fill(otp);
    await page.getByRole("button", { name: /^Continue$/i }).click();

    await page.waitForFunction(() => !!localStorage.getItem("access_token"), null, { timeout: 45_000 });

    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    expect(token).toBeTruthy();

    await page.goto("/gp-store/basket");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("gp-root-layout")).toBeVisible({ timeout: 20_000 });
  });
});
