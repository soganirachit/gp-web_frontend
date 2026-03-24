# Backend APIs Needed for Search & Type-Ahead

This document lists backend APIs required (or recommended) for the unified search bar with type-ahead suggestions.

---

## Currently Used (Already Implemented)

### 1. Product Search
**Endpoint:** `GET /products/` (or equivalent)  
**Query params:** `search`, `store_id` (optional)  
**Purpose:** Powers product type-ahead on Home, GP Store, GP Daily.  
**Used by:** `productService.searchProducts(q, storeId)`  
**Response shape:** Array of products with `id`, `name`, `slug`, `primary_image`, `sellingPrice`/`effective_price`/`current_price`.

---

## Recommended (For Better UX)

### 2. Product Search Suggestions (Lightweight)
**Proposed endpoint:** `GET /products/search-suggestions/?q=xxx&store_id=xxx&limit=6`  
**Purpose:** Lighter response for type-ahead (fewer fields, lower limit) instead of full product search.  
**Response shape:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "Marigold Garland",
      "slug": "marigold-garland",
      "primary_image": "https://...",
      "effective_price": "99.00"
    }
  ]
}
```
**Fallback:** If not implemented, the frontend uses existing `GET /products/?search=xxx` with client-side slicing to 6 items.

---

### 3. GP Daily / Base Pack Search (If GP Daily Uses Different Products)
**Proposed endpoint:** `GET /basepacks/search/?q=xxx&limit=6`  
**Purpose:** Type-ahead for subscription base packs on GP Daily home page.  
**Response shape:** Same structure as product suggestions.  
**Note:** Currently the frontend uses `productService.searchProducts` for GP Daily too. If base packs are a separate catalog, this API would improve relevance.

---

### 4. Orders Search / Suggestions
**Current behavior:** Orders are fetched via `GET /orders/` and filtered client-side. No separate search API.  
**Proposed (optional):** `GET /orders/?search=xxx` for server-side search when order list is large/paginated.  
**Note:** If orders are always loaded in full, client-side filtering is sufficient. No backend change needed.

---

## Summary

| API                          | Status      | Required? |
|-----------------------------|------------|----------|
| `GET /products/?search=`    | In use     | Yes      |
| Product search suggestions  | Optional   | No       |
| Base pack search            | Optional   | No (if GP Daily uses product search) |
| Orders search               | Optional   | No (client-side filter works) |

---

**Last updated:** With unified SearchBar + type-ahead implementation.
