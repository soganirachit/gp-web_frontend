# Backend Discrepancies to Update

All items resolved. See notes below.

---

## 1. Cart Add — Variant Support ✅ DONE

**Implemented:**
- `CartItem.variant` FK (nullable, `SET_NULL`, to `ProductVariant`)
- `unique_together` updated to `(cart, product, variant)` — (product A, null) and (product A, variant 1) are distinct lines
- `AddToCartSerializer.variant_id` — optional IntegerField; validates variant belongs to product
- `AddToCartView` — passes `variant` to `check_bom_availability(product, quantity, variant=variant)`; uses `variant.final_price` when variant present, else `product.current_price`
- `CartItemSerializer` — includes `variant` (id, name, variant_type, sku)
- Migration: `cart/0004_cartitem_variant`

---

## 2. Postman — Admin Create Product ✅ DONE (update Postman)

**New payload:**
```
bom_items_input: [{ inventory_item_id: 1, quantity: 50 }, ...]
variants_input: [{ name, variant_type, sku, price_adjustment, bom_overrides: [{ inventory_item_id, quantity }] }]
store: 1
```
Remove: `product_type`, `track_inventory`, `cost_price`, `low_stock_threshold`, `sub_products_input`, `store_ids`.

---

## 3. Postman — Admin Update Product ✅ DONE (update Postman)

Same removals: `product_type`, `track_inventory`, `cost_price`, `low_stock_threshold`.

---

## 4. Postman — Admin Inventory Endpoints ✅ DONE (update Postman)

- List: `GET /admin-ops/inventory/?store_id=1` (InventoryItem — raw materials, no product_id param)
- Create: `POST /admin-ops/inventory/` — payload: `name`, `unit`, `cost_price`, `is_perishable`, `store`, `bin_location`, `reorder_level`, `quantity`
- Stock report param: `item_id` (not `product_id`)
- Inventory picker: `GET /admin-ops/inventory-items/` (replaces `/sub-products/`)

---

## 5. Postman — POS Create Order ✅ DONE (update Postman)

```json
{
  "customer_phone": "9876543210",
  "store_id": 1,
  "payment_method": "pos_cash",
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 2, "variant_id": 5, "quantity": 1}
  ]
}
```

---

## 6. Cart Response — Variant in Items ✅ DONE

Cart GET response now includes `variant: { id, name, variant_type, sku }` per item (null when no variant selected).
