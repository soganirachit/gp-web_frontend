# How to run **full** authenticated tests

## 1. JWT (recommended)

1. Log in to the app in a browser (staging or prod) with your test account.
2. Open DevTools → **Application** → **Local Storage** → copy `access_token` (and optionally `refresh_token`, `phoneNumber`).
3. Create `testing/e2e/.env.local`:

```bash
cp testing/e2e/.env.example testing/e2e/.env.local
```

4. Paste values:

```
E2E_ACCESS_TOKEN=paste_here
E2E_REFRESH_TOKEN=paste_if_present
E2E_PHONE=9876543210
```

5. Run:

```bash
npm run test:api-auth-smoke
npm run test:e2e
```

Playwright loads `.env.local` via `testing/e2e/playwright.config.mjs`.

**Note:** Access tokens expire. Refresh the token in `.env.local` when tests start failing with 401.

## 1b. JWT via API + database (no OTP UI)

Put only **`E2E_PHONE`** (10 digits) in `.env.local`. The script calls `send-otp`, reads the row from **`otp_verifications`**, then **`POST /auth/verify-otp/`** and saves **`E2E_ACCESS_TOKEN`** (+ refresh).

Optional **`E2E_DATABASE_URL`**; in the monorepo, `../genda_phool_backend/.env` **`DB_*`** is used if unset.

```bash
npm run test:e2e:auth-db       # refresh JWT in .env.local
npm run test:e2e:auth-db:run   # same, then full Playwright
```

## 2. OTP in the browser (optional UI smoke)

1. Put **10-digit** mobile and the **current 6-digit OTP** in `.env.local`:

```
E2E_PHONE=9876543210
E2E_OTP=123456
```

2. Run `npm run test:e2e` (the OTP spec requests a **new** send-otp unless you only run that file with a fresh code).

Do **not** commit `.env.local`.
