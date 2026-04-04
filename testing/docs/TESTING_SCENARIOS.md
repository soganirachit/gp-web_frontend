# gp-frontend — Complete Testing Scenario Catalog

This document lists **all test scenarios** for the Genda Phool **customer** web app (`gp-frontend`). Routes are split between **GP Store** (`/gp-store/...`), **GP Daily** (`/gp-daily/...`, gated by `VITE_GP_DAILY_ENABLED`), and **legacy/generic** paths. Use for QA, UAT, accessibility, payment regression, and automation.

**API:** `VITE_API_BASE_URL`, **Maps:** `VITE_GOOGLE_MAPS_API_KEY`, **Payments:** `VITE_RAZORPAY_KEY`, **Analytics:** `VITE_META_PIXEL_ID`, **Errors:** `VITE_SENTRY_DSN`.

**★** = demo-critical or revenue-impacting.

---

## 1. Environment & build

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-ENV-01 | `npm run build` (`tsc && vite build`) | Zero TS errors |
| GFP-ENV-02 | `npm run dev` | App serves |
| GFP-ENV-03 | Missing `VITE_API_BASE_URL` | `api.ts` fallback `localhost:3000` — **verify** staging never ships this |
| GFP-ENV-04 | `VITE_GP_DAILY_ENABLED=true` | `/gp-daily` routes render GP Daily |
| GFP-ENV-05 | `VITE_GP_DAILY_ENABLED=false` | `/gp-daily/*` redirects to `/gp-store/*` per `Router.tsx` |
| GFP-ENV-06 | Feature query `?feature=gpStore` / `?feature=gpDaily` | `FeatureThemeProvider` picks theme |
| GFP-ENV-07 | Sentry DSN empty | No init error |
| GFP-ENV-08 | Sentry DSN set | Events in project (staging) |

---

## 2. Routing, layout & navigation

### 2.1 Layout (`Layout.tsx`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-LAY-01 | Scroll to top on route change | `window.scrollTo(0,0)` |
| GFP-LAY-02 | Meta Pixel `trackPageView` | Fires on pathname + search change |
| GFP-LAY-03 | Auth routes hide bottom padding pattern | `/gp-store/login`, `/startup`, `/`, etc. |
| GFP-LAY-04 | `/location` hides BottomNav | |
| GFP-LAY-05 | `customer-support/questions` hides BottomNav | |
| GFP-LAY-06 | GP Store/Daily routes avoid double bottom padding | `pb-0` where documented |

### 2.2 Bottom navigation (`BottomNav.tsx`) ★

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-NAV-01 | GP Store: Home, Store logo, Basket, Orders, Account | Correct links |
| GFP-NAV-02 | Basket when logged out | Redirect to login with `returnUrl` to basket |
| GFP-NAV-03 | GP Daily theme (if enabled) | Icons / paths use `/gp-daily` base |
| GFP-NAV-04 | Active state / banner graphics | Visual regression |
| GFP-NAV-05 | Cart badge count | Matches `CartContext` item count |

### 2.3 Error & loading

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-ERR-01 | Route throws | `RouteErrorPage` |
| GFP-ERR-02 | Lazy chunk fail | `lazyWithRetry` retries |
| GFP-ERR-03 | Suspense fallback | `PageFadeFallback` |

---

## 3. Authentication & onboarding ★

**Flow:** `Startup` → `Login` (phone) → `OTPVerification` → `NameInput` (if new user) → `Allset` → home.

**Services:** `auth.service.ts` — OTP request/verify, tokens in `localStorage`.

### 3.1 Startup (`Startup`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-01 | First visit | Shown at `/`, `/startup` |
| GFP-AUTH-02 | Already logged in | Redirect behavior per implementation |
| GFP-AUTH-03 | Choose GP Store vs Daily entry | If UI offers | Correct `basePath` |

### 3.2 Login (`Login`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-10 | Valid phone format | OTP requested |
| GFP-AUTH-11 | Invalid phone | Validation message |
| GFP-AUTH-12 | Rate limit from API | User-visible error |
| GFP-AUTH-13 | Network error | Retry UX |

### 3.3 OTP (`Otp_verification`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-20 | Correct OTP | Tokens stored; navigate forward |
| GFP-AUTH-21 | Wrong OTP | Error |
| GFP-AUTH-22 | Resend OTP | Cooldown if any |
| GFP-AUTH-23 | Expired OTP | Message |

### 3.4 Name (`NameInput`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-30 | New user name submit | Profile created |
| GFP-AUTH-31 | Skip if existing user | Route guard |

### 3.5 All set (`Allset`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-40 | Completion CTA | Lands on correct home |

### 3.6 Protected routes (`ProtectedRoute`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-50 | Access protected URL logged out | Redirect to `/gp-store/login` or `/gp-daily/login` based on `getFeatureFromPath` |
| GFP-AUTH-51 | `isLoggedIn` true but no `access_token` in localStorage | Treat as logged out | **Edge case** |
| GFP-AUTH-52 | `state.from` / `returnUrl` | After login return to intended page |

### 3.7 Session expiry / logout

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-AUTH-60 | 401 from API | Redirect to login (per interceptors) |
| GFP-AUTH-61 | Manual logout | Clears storage; navigate `/gp-store/startup` or equivalent |
| GFP-AUTH-62 | Token refresh if implemented | Silent refresh |

---

## 4. Store context & location ★

**Context:** `StoreContext` — assigned store, switching, cart clear on store switch (align with API).

**Pages:** `Home_page_location`, `location.tsx`, address flows.

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-LOC-01 | Update location | `store.service` / users API | Store assigned |
| GFP-LOC-02 | Nearby stores | List + distance |
| GFP-LOC-03 | Switch store | Cart cleared message if API says so |
| GFP-LOC-04 | Out of delivery zone | User messaging |
| GFP-LOC-05 | Maps autocomplete / pin | `VITE_GOOGLE_MAPS_API_KEY` |
| GFP-LOC-06 | Denied geolocation | Fallback (manual address) |
| GFP-LOC-07 | `Unsubscribed_User_Home` | CTA to subscribe / login |

---

## 5. Home & catalog browsing ★

### 5.1 Homepages

| ID | Page | Scenarios |
|----|------|-----------|
| GFP-HOM-01 | `GpStore_Homepage` | Banners, categories, navigation |
| GFP-HOM-02 | `GpDaily_Homepage` | Only when flag true |
| GFP-HOM-03 | `home_page` | Legacy `/home` |
| GFP-HOM-04 | `OffersBannerCarousel` | Links, autoplay |

### 5.2 Product listing (`ProductPage/page`, `StoreProductsPage`)

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-CAT-01 | `/gp-store/products` | Grid loads |
| GFP-CAT-02 | `/gp-daily/Products` (flag on) | Same |
| GFP-CAT-03 | Category filters | API params |
| GFP-CAT-04 | Pagination / infinite scroll | No duplicates |
| GFP-CAT-05 | Out of stock display | Badge / disable add |
| GFP-CAT-06 | `SearchPage` | Query debounce; empty state |
| GFP-CAT-07 | `ExploreMore` | Cross-sell |

### 5.3 Product detail

| ID | Route | Scenario |
|----|-------|----------|
| GFP-PDP-01 | `/gp-store/product/:slug` | `storeProductsDisplayPage` — correct product |
| GFP-PDP-02 | `/gp-daily/product/:id` (flag) | Numeric id |
| GFP-PDP-03 | Invalid slug / id | 404 UX |
| GFP-PDP-04 | Variant selector | Price updates |
| GFP-PDP-05 | Add to cart from PDP | Cart count + line item |

### 5.4 Images & media

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-IMG-01 | `resolveMediaUrl` / `ProductImageTag` | Broken image fallback |
| GFP-IMG-02 | Lazy load | Performance |

---

## 6. Cart & checkout ★

**Component:** `features/cart/components/Cart.tsx` (large). **Service:** `cart.service.ts`.

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-CART-01 | Add item | Line appears |
| GFP-CART-02 | Update quantity | Subtotal |
| GFP-CART-03 | Remove item | |
| GFP-CART-04 | Apply coupon | `discounts` / cart API |
| GFP-CART-05 | Delivery slot selection | If required |
| GFP-CART-06 | Address selection | Must have default |
| GFP-CART-07 | Delivery fee / free threshold | Correct math |
| GFP-CART-08 | Wallet balance application | `wallet.service` |
| GFP-CART-09 | Razorpay checkout | `VITE_RAZORPAY_KEY` + order create | Success / failure URLs |
| GFP-CART-10 | Payment failure | Order state not “paid” incorrectly |
| GFP-CART-11 | Network drop during payment | Recovery message |
| GFP-CART-12 | Empty cart checkout | Block |
| GFP-CART-13 | Store switch with items | Clear per business rule |

---

## 7. Payment success & confirmations ★

| ID | Route | Scenario |
|----|-------|----------|
| GFP-PAY-01 | `/gp-store/payment-success` | `StoreOrderConfirmation` — order summary |
| GFP-PAY-02 | `/payment-success` | `PaymentSuccessful` |
| GFP-PAY-03 | Deep link without order context | Graceful |
| GFP-PAY-04 | Invoice link | `invoice.service` if present |

---

## 8. Wallet ★

**Page:** `Payment/Wallet/wallet.tsx`. **Service:** `wallet.service.ts`.

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-WAL-01 | View balance | |
| GFP-WAL-02 | Top-up via Razorpay | `RezorpayPayment` / create order |
| GFP-WAL-03 | Transaction history | Pagination |
| GFP-WAL-04 | Insufficient balance at checkout | Message |

---

## 9. Orders ★

**List:** `Order/MyOrders`. **Detail:** `Order/OrderDetails`.

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-ORD-01 | List orders | Status badges |
| GFP-ORD-02 | Filter by status / date | |
| GFP-ORD-03 | Open detail `/gp-store/orders/:orderNumber` | Timeline |
| GFP-ORD-04 | Track delivery | Map or status text |
| GFP-ORD-05 | Cancel order (if allowed) | Confirmation |
| GFP-ORD-06 | Reorder | Cart prefill |
| GFP-ORD-07 | GP Daily order routes | Same with `/gp-daily/orders` |

---

## 10. Subscriptions ★

**Components:** `ManageMySubscription`, `AddressSelection`, `ConfirmSubscription`, `Modify_subscription`, `PauseSubscription`, `Paused_susbcription_Landing`, `Cancel_subscription_Landingpage`, `CancelSubscriptionReason`, `CancelSubscriptionSuccess`.

**Service:** `subscription.service.ts`, `basepack.service.ts` where used.

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-SUB-01 | View active subscription | Dates, frequency, products |
| GFP-SUB-02 | New subscription — address | `AddressSelection` validation |
| GFP-SUB-03 | Confirm subscription | Payment + create |
| GFP-SUB-04 | Modify — change pack / frequency | Proration messaging if any |
| GFP-SUB-05 | Pause | Start + end dates; `PauseSubscription` |
| GFP-SUB-06 | Paused landing | Resume CTA |
| GFP-SUB-07 | Cancel — landing | |
| GFP-SUB-08 | Cancel — reason | Required fields |
| GFP-SUB-09 | Cancel success | |
| GFP-SUB-10 | `manageMyStoreProducts` | Store-linked subscription products |
| GFP-SUB-11 | GP Daily vs Store route pairs | All mirrored paths when flag on |

---

## 11. Account, profile & settings

| ID | Page | Scenarios |
|----|------|-----------|
| GFP-ACC-01 | `More/Settings` | Sections navigate |
| GFP-ACC-02 | `EditProfile` | `editcustomer.service` / `getcustomer` | Photo, name |
| GFP-ACC-03 | Logout from settings | |
| GFP-ACC-04 | `Addresses` | List |
| GFP-ACC-05 | `AddEditAddress` | Create / edit / default / delete — `address.service` |
| GFP-ACC-06 | Map in address form | Geocode, pin move |
| GFP-ACC-07 | Validation — pincode, phone | |

---

## 12. Customer support ★

| ID | Page | Scenarios |
|----|------|-----------|
| GFP-SUP-01 | `CustomerSupport` | Ticket list / categories |
| GFP-SUP-02 | `SupportTicketChat` | Messages send/receive |
| GFP-SUP-03 | `TicketQuestionForm` | Create ticket |
| GFP-SUP-04 | `FAQ` | `faq.service`; search |
| GFP-SUP-05 | Upload attachment | If supported | Size/type limits |
| GFP-SUP-06 | `support.service` errors | Offline |

---

## 13. Referral

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-REF-01 | `Refer/Refer` | Code copy |
| GFP-REF-02 | Share link | Deep link opens app |
| GFP-REF-03 | Referral API failure | |

---

## 14. Legal & static

| ID | Page | Scenarios |
|----|------|-----------|
| GFP-LEG-01 | `Terms` | Render |
| GFP-LEG-02 | `Privacy` | Render |
| GFP-LEG-03 | Links from footer/settings | |

---

## 15. Services — API smoke matrix

Map each service to at least one E2E or integration test.

| Service file | Primary flows |
|--------------|----------------|
| `api.ts` | Base client, interceptors |
| `auth.service.ts` | OTP, token storage |
| `product.service.ts` | Catalog, PDP |
| `cart.service.ts` | Cart CRUD, checkout prep |
| `store.service.ts` | Store assignment, catalog by store |
| `order.service.ts` | Orders list/detail |
| `payment.service.ts` | Payment intents |
| `wallet.service.ts` | Balance, top-up |
| `subscription.service.ts` | Lifecycle |
| `basepack.service.ts` | Packs |
| `address.service.ts` | Addresses |
| `support.service.ts` | Tickets |
| `faq.service.ts` | FAQ |
| `invoice.service.ts` | Invoices |
| `editcustomer.service.ts` | Profile patch |
| `getcustomer.service.ts` | Profile get |
| `headers.service.ts` | Auth headers |

---

## 16. Cross-cutting non-functional

| ID | Area | Scenarios |
|----|------|-----------|
| GFP-NFR-01 | Performance | LCP on home, PDP |
| GFP-NFR-02 | Accessibility | Keyboard nav cart, focus trap modals |
| GFP-NFR-03 | SEO | `react-helmet-async` titles if used |
| GFP-NFR-04 | PWA / mobile safe area | `env(safe-area-inset-bottom)` in nav |
| GFP-NFR-05 | Chart.js | `react-chartjs-2` — any dashboard widgets |
| GFP-NFR-06 | Date handling | `date-fns` timezones for delivery |
| GFP-NFR-07 | Redux (`@reduxjs/toolkit`) | If any global slice — persistence |

---

## 17. GP Daily vs GP Store duplication ★

For **each** protected customer flow, execute **twice** when `VITE_GP_DAILY_ENABLED=true`:

| Flow | GP Store path | GP Daily path |
|------|---------------|---------------|
| Login | `/gp-store/login` | `/gp-daily/login` |
| Basket | `/gp-store/basket` | `/gp-daily/basket` |
| Account | `/gp-store/account` | `/gp-daily/account` |
| … | … | … |

When flag is **false**, verify **every** `/gp-daily/*` URL redirects to the `/gp-store/*` equivalent (per `Router.tsx`).

---

## 18. End-to-end customer journeys (demo scripts)

**J1 — First purchase (GP Store)**  
Startup → Login → OTP → Location/store → Browse → PDP → Cart → Address → Pay → Payment success → Order visible.

**J2 — Returning user**  
Login → Cart has saved state? → Checkout with wallet partial pay.

**J3 — Subscription**  
Subscribe flow → Pause → Resume → Cancel with reason.

**J4 — Support**  
Open ticket → Chat reply → Resolve.

**J5 — GP Daily mirror**  
Repeat J1 on `/gp-daily/...` with flag on.

**J6 — Failure recovery**  
Payment declined → Cart still consistent → Retry success.

---

## 19. Negative & security

| ID | Scenario | Expected |
|----|----------|----------|
| GFP-SEC-01 | XSS in search query | Escaped |
| GFP-SEC-02 | IDOR — another user’s order URL | 403/404 |
| GFP-SEC-03 | CSRF | Cookies not used blindly if SameSite |
| GFP-SEC-04 | Token in URL | Never logged |

---

## 20. Regression checklist (release gate)

- [ ] Auth: login → OTP → protected page  
- [ ] `ProtectedRoute` + `access_token` consistency  
- [ ] Store selection + cart  
- [ ] Checkout Razorpay (test mode)  
- [ ] Order detail + invoice  
- [ ] Subscription modify/pause/cancel  
- [ ] Address CRUD + map  
- [ ] Support create + chat  
- [ ] Feature flag off: no broken `/gp-daily` links in marketing  
- [ ] Meta Pixel no JS error  
- [ ] Sentry sample rate in staging  

---

## 21. Automation mapping (suggested IDs)

| Layer | Tooling | Scope |
|-------|---------|--------|
| API | Postman / pytest | Auth, cart, order, subscription |
| E2E | Playwright | J1, J2, J6 on staging |
| Visual | Percy / Chromatic | Home, PDP, cart |
| Contract | OpenAPI diff | Backend releases |

---

## 22. Out of scope / external

- WhatsApp OTP delivery (vendor).  
- Razorpay settlement / webhooks (backend).  
- Firebase (dependency present — document actual usage if push/analytics).  

---

*Generated from `gp-frontend` routes and services. Update when `Router.tsx` or services change.*
