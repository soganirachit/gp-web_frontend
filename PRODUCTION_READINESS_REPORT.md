# Production Readiness Report — gp-frontend
**Date:** 2026-03-07
**Verdict: NOT PRODUCTION READY**

Several critical security, performance, and code quality issues must be resolved before deploying to production.

---

## CRITICAL ISSUES (Must Fix Before Launch)

### 1. `.env` File Committed to Git — Security Breach
**File:** `.env`

The `.env` file is tracked in the git repository. It contains:
- A live Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`)
- The production API base URL (`VITE_API_BASE_URL`)
- Commented-out alternate API URLs with internal IP addresses (`http://185.137.122.250:8083`)

**Risk:** Anyone with repository access can steal the API key and abuse it (billing fraud, quota exhaustion). Internal server IPs are exposed.

**Fix:**
1. Add `.env` to `.gitignore` immediately.
2. Rotate/regenerate the Google Maps API key — the exposed one must be considered compromised.
3. Create a `.env.example` file with placeholder values for developer documentation.
4. Use environment variable injection at the CI/CD level (Vercel dashboard, GitHub Secrets) for production builds.

---

### 2. `NODE_ENV="development"` in `.env`
**File:** `.env` line 1

The `.env` sets `NODE_ENV="development"`. This means even if the app is deployed, it runs in development mode. The `console.log` suppression in `main.tsx` checks `process.env.NODE_ENV === 'production'` — this condition will never be true.

**Fix:** Remove `NODE_ENV` from `.env`. Vite handles `NODE_ENV` automatically based on the build command (`vite build` sets it to `production`). Never hardcode it.

---

### 3. `razorpay` Server SDK in Frontend Dependencies
**File:** `package.json` line 27

The `razorpay` npm package is a **server-side Node.js SDK** (for creating orders, verifying webhooks). It must never be in a frontend bundle — it is designed to hold secret API keys and exposes sensitive server logic.

**Fix:** Remove `razorpay` from `dependencies` in `package.json`. The frontend only needs to load the Razorpay checkout script dynamically (already done correctly in `RezorpayPayment.tsx` via `document.createElement("script")`).

---

### 4. `constants.ts` Uses `process.env` Instead of `import.meta.env`
**File:** `src/config/constants.ts` line 1

```ts
export const BASE_URL = process.env.VITE_API_BASE_URL
```

Vite is the build tool. In a Vite project, environment variables are accessed via `import.meta.env.VITE_*`, not `process.env`. This line will always return `undefined` at runtime, silently breaking anything that imports `BASE_URL` from this file.

**Fix:** Change to `import.meta.env.VITE_API_BASE_URL`.

---

### 5. `ErrorBoundary` Exists but Is Not Used at the App Root
**Files:** `src/components/ErrorBoundary.tsx`, `src/App.tsx`, `src/main.tsx`

A well-implemented `ErrorBoundary` class component exists, but it is never wrapped around the root of the application. Unhandled render errors will crash the entire UI with a blank white screen.

**Fix:** Wrap the root render in `main.tsx` or the top of `App.tsx` with `<ErrorBoundary>`.

---

## HIGH SEVERITY ISSUES

### 6. No Route-Level Code Splitting / Lazy Loading
**File:** `src/routes/Router.tsx`

Every single page component (40+ imports) is eagerly imported at the top of Router.tsx. This means the entire application is bundled into one large JavaScript file. Users must download all code — including subscription management, wallet, admin flows — before they can see any page.

**Fix:** Convert all route component imports to `React.lazy()` with `<Suspense>` fallbacks:
```ts
// Instead of:
import GpStore_Homepage from '../pages/GpStore_Homepage';

// Use:
const GpStore_Homepage = React.lazy(() => import('../pages/GpStore_Homepage'));
```
Wrap the `<RouterProvider>` in `<Suspense fallback={<Spinner />}>`.

---

### 7. `via.placeholder.com` Used as Image Fallback in 14 Files
**Files:** `GpStore_Homepage.tsx`, `storeProductsDisplayPage.tsx`, `Cart.tsx`, `StoreProductsPage/page.tsx`, `SearchPage.tsx`, `ExploreMore.tsx`, `MyOrders.tsx`, `OrderDetails.tsx`, `ProductDisplaypage.tsx`, `Modify_subscription.tsx`, `ProductPage/page.tsx`, `Unsubscribed_User_Home.tsx`, `GpDaily_Homepage.tsx`, `main.tsx`

`via.placeholder.com` is a third-party external service. It:
- Adds a network request to an external domain for every broken image.
- Has no guaranteed uptime or SLA.
- Is blocked by some corporate/school firewalls.
- Shows an ugly gray box — bad UX.

**Fix:** Create a small local SVG placeholder (e.g., `src/assets/placeholder.svg`) and use that as the fallback `src` and `onError` target in all `<img>` tags.

---

### 8. 316 `console.log/warn/error` Calls Across 56 Files
**Files:** All service files and many components

The `console.log` suppression in `main.tsx` only suppresses `console.log`. Calls to `console.error` and `console.warn` in all 56 files still fire in production. These can leak:
- API endpoint URLs
- User data (phone numbers, addresses, order details)
- Backend error messages
- Authentication flow details

**Fix:**
- Remove all development-only `console.log` calls.
- Keep `console.error` only for genuine unexpected errors.
- In `main.tsx`, also suppress `console.warn` and `console.error` in production (or use a proper logging service like Sentry).

---

### 9. `node-fetch` as a Frontend Production Dependency
**File:** `package.json` line 22

`node-fetch` is a polyfill for Node.js environments. Modern browsers have the native `fetch` API built in. Including `node-fetch` in a browser bundle adds dead weight and can cause bundler warnings.

**Fix:** Remove `node-fetch` from `package.json` dependencies. Use the native browser `fetch` or `axios` (already in dependencies).

---

### 10. No Build Optimization in `vite.config.ts`
**File:** `vite.config.ts`

The Vite config has no production build tuning at all:
- No manual chunk splitting — vendor libraries (React, framer-motion, chart.js, Razorpay) are not separated from application code.
- No asset size warning threshold configured.
- No sourcemap configuration for production.

**Fix:** Add a `build` section:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        motion: ['framer-motion'],
        charts: ['chart.js', 'react-chartjs-2'],
        maps: ['@react-google-maps/api'],
      }
    }
  },
  chunkSizeWarningLimit: 500,
  sourcemap: false, // set to true only for monitored production with error tracking
}
```

---

### 11. JWT Tokens Stored in `localStorage` — XSS Risk
**Files:** `src/services/auth.service.ts`, `src/services/api.ts`

Access tokens and refresh tokens are stored in `localStorage`. If any third-party script or XSS vulnerability exists, an attacker can steal all tokens and impersonate users.

**Fix:** The most secure approach is to use HttpOnly cookies (set server-side) for tokens. If cookies are not feasible, store the short-lived access token in memory (React state/context) and the refresh token in an HttpOnly cookie. At minimum, document this risk and ensure the Content Security Policy (see item 14) is enforced.

---

### 12. Missing `loading="lazy"` on All Product Images
**Files:** `storeProductsDisplayPage.tsx`, `GpStore_Homepage.tsx`, `StoreProductsPage/page.tsx`, `ProductCard.tsx`, `Cart.tsx`, and others

No `<img>` tag in the codebase uses the `loading="lazy"` attribute. On pages with many products, all images download simultaneously, causing:
- Network congestion
- Slow Time-to-Interactive (TTI)
- High data usage on mobile

**Fix:** Add `loading="lazy"` to all product/listing `<img>` tags. Only hero/above-the-fold images should use `loading="eager"` (the default).

---

## MEDIUM SEVERITY ISSUES

### 13. Large Unoptimized Local Assets in `src/assets`
**File:** Multiple asset files

Several locally bundled assets are extremely large and will inflate the production JS/CSS bundle:

| File | Size |
|------|------|
| `src/assets/svg/banner.svg` | 3.6 MB |
| `src/assets/svg/daily_scooter.svg` | 3.0 MB |
| `src/assets/A1.jpeg` | 3.7 MB |
| `src/assets/A1/A4.jpeg` | 3.3 MB |
| `src/assets/A1/A3.jpeg` | 2.6 MB |
| `src/assets/A1/A2.jpeg` | 2.6 MB |
| `src/assets/Low_balance.png` | 420 KB |

SVG files of 3+ MB indicate embedded raster data (base64-encoded images inside the SVG). This completely defeats the purpose of SVG.

**Fix:**
- Run all JPEG/PNG assets through an optimizer (e.g., `sharp`, `squoosh`, or `imagemin`). Target <100 KB for UI images.
- Convert large JPEG/PNG files to WebP format for 30-80% size reduction.
- For the large SVGs: extract the embedded raster images, optimize them separately, and reference them via `<image href="...">` or convert to proper vector SVGs.
- Move large promotional/banner images to a CDN and load them as `<img src="https://cdn...">` rather than bundling them in the app.

---

### 14. Missing Security Headers in `vercel.json`
**File:** `vercel.json`

The Vercel config only has SPA rewrites. There are no HTTP security headers configured:
- No `Content-Security-Policy` (CSP) — allows XSS attacks
- No `X-Frame-Options` — allows clickjacking
- No `X-Content-Type-Options` — allows MIME sniffing
- No `Referrer-Policy`
- No `Permissions-Policy`

**Fix:** Add a `headers` section to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: https:; script-src 'self' https://checkout.razorpay.com https://maps.googleapis.com; connect-src 'self' https://apigp.mygendaphool.com;" }
      ]
    }
  ],
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### 15. Debug/Test Files in the Repository Root
**Files:** `test-api.js`, `token-check.html`

These appear to be developer debug utilities left in the project root. They may expose API structure or token-handling logic.

**Fix:** Delete `test-api.js` and `token-check.html`. Add them to `.gitignore` if needed during development.

---

### 16. `.DS_Store` Files Committed to Git
**Files:** `src/.DS_Store`, `src/assets/.DS_Store`, `src/components/.DS_Store`

macOS metadata files are tracked in git. They expose folder structure information and are useless to other developers.

**Fix:** Add to `.gitignore`:
```
.DS_Store
**/.DS_Store
```
Then run `git rm --cached` to stop tracking existing ones.

---

### 17. No Error Tracking / Monitoring Service
**Files:** N/A

There is no integration with error tracking (e.g., Sentry, Datadog). In production, errors will be silent — you will have no visibility into crashes, failed API calls, or user-facing errors.

**Fix:** Integrate Sentry (free tier available):
```bash
npm install @sentry/react
```
Initialize in `main.tsx` before rendering, and configure the `ErrorBoundary` to report to Sentry.

---

### 18. Duplicate Toast Libraries
**File:** `package.json`

The project has **three** toast/notification libraries installed:
- `react-hot-toast`
- `react-toastify`
- `sonner`

Only `react-hot-toast` appears to be actively used in most components. The others add bundle size for no benefit.

**Fix:** Audit usage, pick one library, and remove the others.

---

### 19. `auth.service.ts` Has a `console.log` That Prints the API URL
**File:** `src/services/auth.service.ts` line 20

```ts
console.log("API URL:", API_URL);
```

This fires on every OTP send request in production, logging the backend URL to the browser console.

**Fix:** Remove this line.

---

### 20. Large Commented-Out Code Blocks
**Files:** `src/services/auth.service.ts` (lines 165-217), `src/routes/Router.tsx` (multiple commented blocks)

Large blocks of old code are left as comments. This makes the codebase harder to read and maintain.

**Fix:** Delete commented-out code. Git history preserves it if ever needed.

---

## IMAGE SLOW LOADING — ROOT CAUSE ANALYSIS & FIXES

This is the most visible user experience problem. The slow loading has multiple causes:

### Root Cause 1: No `loading="lazy"` on Images
Every `<img>` tag loads immediately on page render, regardless of whether it's in the viewport. On the store listing page with many products, this fires 20-50+ simultaneous image requests.

**Fix:** Add `loading="lazy"` to all product listing images. Example in `ProductCard.tsx`:
```tsx
<img
  src={imageUrl}
  alt={packName}
  loading="lazy"   // ADD THIS
  className="w-full h-full object-cover"
/>
```

### Root Cause 2: Product Images Not Served from a CDN
Product images are fetched from `apigp.mygendaphool.com` (the API server). API servers are not optimized for serving static assets — they have no edge caching, no CDN distribution, and images are served with no cache headers by default.

**Fix:**
- Set up a CDN in front of image storage (Cloudflare R2, AWS CloudFront, or Bunny CDN are cost-effective options).
- Configure `Cache-Control: public, max-age=31536000, immutable` for product images.
- Alternatively, use Cloudinary or imgix for on-the-fly image transformation (auto WebP conversion, resizing by URL parameters).

### Root Cause 3: No Image Dimensions / Aspect Ratio Hints
Without explicit `width` and `height` attributes on `<img>` tags, the browser cannot reserve layout space before images load, causing Cumulative Layout Shift (CLS) and re-paints that slow perceived performance.

**Fix:** Always set `width` and `height` attributes matching the display size, or use CSS `aspect-ratio` on the container (already partially done with `aspect-square` classes — ensure this applies everywhere).

### Root Cause 4: Large Locally Bundled Assets (See Issue 13)
The `svg/banner.svg` (3.6 MB) and `svg/daily_scooter.svg` (3.0 MB) are imported directly into components and bundled with the app. Any user loading the homepage must download these multi-megabyte files before the page is usable.

**Fix:** Move large banner/hero images out of `src/assets` and onto a CDN. Reference them as external URLs.

### Root Cause 5: No WebP / Modern Format Usage
All images are JPEG/PNG/SVG (with embedded raster data). WebP provides 25-35% smaller files than JPEG at equivalent quality. AVIF provides even better compression.

**Fix:**
- Convert all static assets to WebP.
- For API-served product images, configure the backend/CDN to serve WebP when the browser supports it (via `Accept: image/webp` header or Cloudinary auto-format).
- Use `<picture>` elements for critical local images:
```html
<picture>
  <source srcset="banner.webp" type="image/webp" />
  <img src="banner.jpg" alt="Banner" loading="lazy" />
</picture>
```

### Root Cause 6: No Skeleton / Progressive Loading UX
Images appear as empty space or jump in abruptly. There is no blur-up, skeleton screen, or progressive enhancement.

**Fix:** Add a skeleton loading state or a CSS blur-up technique where images fade in once loaded:
```tsx
<img
  src={imageUrl}
  loading="lazy"
  className="w-full h-full object-cover transition-opacity duration-300"
  onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
  style={{ opacity: 0 }}
/>
```

---

## SUMMARY CHECKLIST

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | `.env` committed to git / rotate API key | CRITICAL | Low |
| 2 | `NODE_ENV=development` in `.env` | CRITICAL | Low |
| 3 | `razorpay` server SDK in frontend | CRITICAL | Low |
| 4 | `constants.ts` uses `process.env` (always undefined) | CRITICAL | Low |
| 5 | `ErrorBoundary` not used at root | CRITICAL | Low |
| 6 | No route-level lazy loading | HIGH | Medium |
| 7 | `via.placeholder.com` as image fallback | HIGH | Low |
| 8 | 316 console calls leaking data in production | HIGH | Medium |
| 9 | `node-fetch` in browser bundle | HIGH | Low |
| 10 | No Vite build optimization | HIGH | Low |
| 11 | JWT in localStorage (XSS risk) | HIGH | High |
| 12 | No `loading="lazy"` on images | HIGH | Low |
| 13 | Large unoptimized local assets (3.7MB JPEG, 3.6MB SVG) | MEDIUM | Medium |
| 14 | Missing security headers in vercel.json | MEDIUM | Low |
| 15 | Debug files in repo root | MEDIUM | Low |
| 16 | `.DS_Store` files committed | MEDIUM | Low |
| 17 | No error tracking (Sentry) | MEDIUM | Low |
| 18 | Three duplicate toast libraries | MEDIUM | Low |
| 19 | API URL logged in production on every OTP request | MEDIUM | Low |
| 20 | Large commented-out code blocks | LOW | Low |

**Quick wins (can fix in <1 day):** Issues 1, 2, 3, 4, 5, 7, 9, 12, 14, 15, 16, 19 — these are all 1-5 line changes each and collectively remove the most critical blockers.
