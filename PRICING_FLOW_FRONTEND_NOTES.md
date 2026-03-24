# Pricing Flow — Frontend Notes

## API Price Fields (Product object)

| Field | Type | Description |
|---|---|---|
| `base_price` | string (decimal) | MRP — always present. Show as strikethrough when discount active. |
| `sale_price` | string \| null | Manual admin markdown. Null if not set. |
| `current_price` | string (decimal) | **Effective price the customer pays.** Use this for all cart/checkout logic. |
| `discount_percentage` | number | Effective % savings vs `base_price`. Covers both sale price and time-limited offers. Show as badge when > 0. |
| `cost_price` | string (decimal) | Internal BOM-computed cost. **Never show to customer.** Admin panels only. |

---

## Effective Price Logic (happens on backend, frontend just reads `current_price`)

```
If active auto-discount (store/category/product offer) exists:
    effective_price = base_price − discount(base_price)
    e.g. base=500, 10% offer → effective=450, discount_percentage=10%

Else if sale_price is set:
    effective_price = sale_price
    e.g. base=500, sale=400 → effective=400, discount_percentage=20%

Else:
    effective_price = base_price
    discount_percentage = 0
```

**Key rule**: Offers always apply on `base_price` (not `sale_price`). When an offer ends, it falls back to `sale_price` (if set) automatically — no frontend action needed.

---

## What to Show on Product Card / Detail Page

### No discount (discount_percentage = 0)
```
₹500
```
Just show `current_price`. No strikethrough needed.

### Sale price active (sale_price set, no offer running)
```
₹400    ← current_price
₹500    ← base_price (strikethrough)
20% off ← discount_percentage badge
```

### Offer running (time-limited auto-discount)
```
₹450    ← current_price  (offer applied on base_price)
₹500    ← base_price (strikethrough)
10% off ← discount_percentage badge
```

**Logic:** Show `base_price` as strikethrough whenever `discount_percentage > 0`.
Always use `current_price` as the selling price. Never compute price on frontend.

---

## Variant Pricing

Each variant in `product.variants[]` has:

| Field | Description |
|---|---|
| `price_adjustment` | +/- adjustment on product's `current_price` |
| `final_price` (computed on backend, exposed in variant serializer) | `product.current_price + price_adjustment` |

**Display:**
- When user selects a variant, show `variant.final_price` as the price.
- If `price_adjustment > 0`: can show "+₹X" label alongside.
- If no variant selected: show `product.current_price`.

**Cart:** Send `variant_id` in add-to-cart. Backend uses `variant.final_price` as `unit_price`.

---

## Cart Total Breakdown

```
subtotal         = Σ(unit_price × quantity)      [live, refreshed on every cart GET]
coupon_discount  = applied coupon saving (0 if none)
net              = subtotal - coupon_discount
delivery         = 0  if subtotal ≥ store.free_delivery_threshold
                 = store.delivery_fee  otherwise
tax              = (net + delivery) × 5%  [GST]
─────────────────────────────────────────
total            = net + delivery + tax
```

**Note on unit_price freshness:** Cart item `unit_price` is refreshed to the product's current `effective_price` on every cart GET. So if an offer goes live or expires after the customer added items, they'll see the updated price immediately.

---

## Coupon Display

- Show available coupons via `GET /api/v1/cart/coupons/?store_id=X`
- Each coupon has `discount_label` (e.g. "20% off (up to ₹100)") and `scope` ("global" or "store")
- After applying: show `coupon_discount` as the saving in cart summary
- `discount_amount` in cart response = `coupon_discount` (total discount shown in summary)

---

## Out-of-Stock Handling

- `is_available = false` → show "Out of Stock" label, disable "Add to Cart"
- `is_available` is auto-managed by BOM stock levels
- Perishable products (`is_perishable = true`) are always available (scheduled/advance order)

---

## Price Shown in Different Screens

| Screen | Price to show |
|---|---|
| Product card (list) | `current_price` + `base_price` strikethrough if `discount_percentage > 0` |
| Product detail | Same + `discount_percentage` badge |
| Variant selector | `variant.final_price` per variant option |
| Cart item | `unit_price` (snapshotted at add time, refreshed on GET) |
| Cart summary | `subtotal`, `coupon_discount`, `delivery_fee`, `tax_amount`, `total` |
| Order confirmation | Same fields from order response |
| Admin product list | `base_price`, `sale_price`, `cost_price`, `current_price` |
