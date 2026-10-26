# Customer app route map (`gp-frontend`)

Canonical paths live in `src/config/routes.config.ts`. Use `ROUTES` and helpers (`productsListPath`, `walletPathForFeature`, etc.) instead of string literals in `navigate()` and share links.

## Hub & deep links

| URL | Screen |
|-----|--------|
| `/home` | Product picker (GP Daily / GP Store) |
| `/products/:slug` | Universal product deep link → redirects to store or daily PDP |
| `/products` | Redirect → `/gp-store/products` (query preserved) |

## GP Store (`/gp-store/...`)

| URL | Screen |
|-----|--------|
| `/gp-store` | Store home |
| `/gp-store/products` | Catalog (`?category=` slug supported) |
| `/gp-store/product/:slug` | Product detail |
| `/gp-store/basket` | Cart (auth) |
| `/gp-store/wallet` | Wallet (auth) |
| `/gp-store/login` … `/gp-store/allset` | Auth flow |
| `/gp-store/account`, `/gp-store/addresses`, … | Account area |

## GP Daily (`/gp-daily/...`)

Same shape as store where applicable. Subscription flows use **kebab-case**:

- `/gp-daily/modify-subscription`
- `/gp-daily/cancel-subscription`
- `/gp-daily/manage-subscription`
- `/gp-daily/products` (legacy `/gp-daily/Products` redirects here)

## Bare paths (redirect)

These redirect to the **last-used** feature (`sessionStorage gp_last_feature`) or default feature flag:

- `/login`, `/faq`, `/refer`, `/customer-support`, …

**Wallet (GP Daily only):** `/wallet` and `/gp-store/wallet` always go to `/gp-daily/wallet` (`DAILY_WALLET_PATH`). Store orders pay via Razorpay at checkout — there is no store wallet.

**Payment success:** `/gp-store/payment-success` and `/gp-daily/payment-success` use order confirmation UI; bare `/payment-success` is a generic fallback with order state when provided.

## Legacy redirects (still work)

| Old | New |
|-----|-----|
| `/gp-daily/Products` | `/gp-daily/products` |
| `/gp-daily/modify-Subscription` | `/gp-daily/modify-subscription` |
| `/gp-daily/Cancel-Subscription` | `/gp-daily/cancel-subscription` |
| `/gp-daily/manage-my-subscription` | `/gp-daily/manage-subscription` |
| `/gp-daily/manage-my-storeProducts` | `/gp-daily/manage-my-store-products` |

## Notes

- Delivery **slot** and **date** in basket are session/cart state — not in the URL (by design).
- Post-login return: `ProtectedRoute` sets `returnUrl` (path + query); auth screens pass it through OTP → name → location.
