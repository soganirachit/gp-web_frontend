# Backend Architecture Refactor — Doubts & Compatibility Notes

All questions resolved. Summary below.

---

## 1. Cart Add API — Variant Support ✅ RESOLVED

- **Q1:** Yes, different variants = separate cart lines. `unique_together = (cart, product, variant)` allows Marigold 2ft and Marigold 4ft as distinct items (null variant = base product line).
- **Q2:** Fixed. Cart view now passes `variant` to `check_bom_availability(product, qty, variant=variant)` — BOM overrides are respected.
- **Q3:** Fixed. Cart uses `variant.final_price` when a variant is selected, `product.current_price` otherwise.

---

## 2. Product API Response Shape ✅ RESOLVED

- **Q4:** `product_type` is already marked optional (`product_type?: string`) in the frontend interface. No further action needed.
- **Q5:** Use `is_available` to show/hide "Out of Stock" UI state or disable "Add to Cart". Backend auto-manages this from BOM stock.

---

## 3. Product List Filtering by Store ✅ RESOLVED

- **Q6:** Products with `store=null` were from the old architecture; all new products must have a store. Admin list now filters by `store_id` when provided. Frontend passes `store_id` correctly.

---

## 4. `syncCart` Bug ✅ ALREADY FIXED

The bug (passing `inventory_id` as `storeId`) was already fixed in `cart.service.ts` — `syncCart` now takes `storeId` as a separate parameter.

---

## 5. Postman Collection Alignment ✅ RESOLVED

- Admin product create/update: `bom_items_input`, `store` (single FK), removed deprecated fields.
- Admin inventory: InventoryItem shape, `item_id` param on stock report, `/inventory-items/` picker.
- POS create order: `product_id` + optional `variant_id` per item (not `inventory_id`).

---

## 6. Frontend `product_type` ✅ RESOLVED

Already optional in the Product interface. No change needed.

---

## 7. Frontend `inventory_id` / `inventoryId` ✅ RESOLVED

- **Q9:** `inventory_id` / `inventoryId` have no meaning in the new model. Cart and order APIs use `variant_id`. Frontend should migrate any remaining `inventory_id` references to `variant_id` when passing to the cart add API.

---

## Backend Follow-ups ✅ RESOLVED

- **Admin products list `store_id` filter:** Added to `AdminProductListCreateView.get_queryset` — `?store_id=1` now filters correctly.
- **Bulk import template:** `GET /admin-ops/products/bulk-import/template/` now returns new format: `name, sku, description, short_description, base_price, sale_price, availability_type, category, is_active, is_featured, is_perishable, shelf_life_days, store_id, label_ids, bom_items`. Removed: `cost_price`, `track_inventory`, `low_stock_threshold`, `sub_products`, `store_ids`.

---

## 8. Phone Number Format ✅ RESOLVED

**Change:** `PHONENUMBER_DEFAULT_FORMAT` changed from `NATIONAL` to `E164`.

**Before:** All phone fields returned `09876543210` (Indian national format with leading `0` trunk prefix).
**After:** All phone fields return `+919876543210` (E.164, international standard).

**Affected API responses (every place a phone appears):**
- `GET /admin-ops/staff/` — `phone` field
- `GET /admin-ops/staff/<pk>/` — `phone` field
- `POST /admin-ops/staff/` — `phone` in response
- Customer profile, address `receiver_phone`, delivery partner phone

**Frontend action required:**
- Strip `+91` for display if showing a 10-digit local number: `phone.replace('+91', '')`
- Do **not** strip in inputs sent to the API — always send full E.164 `+919876543210` or the backend will still accept bare `9876543210` (PhoneNumberField parses it with region=IN)
- Any place that previously stripped a leading `0` can remove that workaround
