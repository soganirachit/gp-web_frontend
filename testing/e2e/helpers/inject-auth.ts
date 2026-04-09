import type { Page } from "@playwright/test";

/** Fix_V0.9 — matches AuthContext + auth.service.verifyOTP storage */
export async function injectCustomerJwt(page: Page): Promise<void> {
  const accessToken = process.env.E2E_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("E2E_ACCESS_TOKEN is not set (testing/e2e/.env.local)");
  }
  const refreshToken = process.env.E2E_REFRESH_TOKEN || "";
  const phone = process.env.E2E_PHONE || "";

  await page.goto("/gp-store/login");
  await page.evaluate(
    ({ accessToken, refreshToken, phone }) => {
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      if (phone) localStorage.setItem("phoneNumber", phone);
    },
    { accessToken, refreshToken, phone }
  );
}

export function hasJwtCredentials(): boolean {
  return !!process.env.E2E_ACCESS_TOKEN?.trim();
}

export function hasOtpCredentials(): boolean {
  return (
    !!process.env.E2E_PHONE?.trim() &&
    !!process.env.E2E_OTP?.trim() &&
    process.env.E2E_OTP!.replace(/\s/g, "").length === 6
  );
}
