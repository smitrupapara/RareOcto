# lib/catalog — Reference

Three modules: `queries.ts` (data access), `search.ts` (URL ↔ filter ↔ search), `format.ts` (display).

## search.ts — Filter parsing and enum constants

### Constants
- `PAGE_SIZE = 24` — used for both query `range()` and pagination math. Don't redefine elsewhere
- `SORT_KEYS: SortKey[]` — `relevance | new | price_asc | price_desc`. Default sort is `"new"` (newest first)
- `CATEGORY_VALUES`, `MATERIAL_VALUES`, `DIMENSION_UNIT_VALUES`, `ROOM_VALUES`, `COLOR_VALUES`, `PATTERN_VALUES`, `STYLE_VALUES` — **single source of truth** for enum values. Filter dropdowns, validation, and seed scripts should import these instead of hard-coding strings. They must stay in sync with the Postgres enums in `supabase/migrations/0001_init.sql` / `0004_catalog_filters.sql` / `0008_drop_sizes_use_dimensions.sql`
- `MIN_DIM_FT = 1`, `MAX_DIM_FT = 30`, `MIN_DIM_CM`, `MAX_DIM_CM` — global per-side range for customer-entered dimensions. Width and height each must land in `[MIN_DIM_CM, MAX_DIM_CM]` after unit conversion. Enforced on the client (input validation) AND in the server action (`addToCartAction`). No per-product columns

### `parseCatalogFilters(searchParams)` → `CatalogFilters`
- Reads Next.js `searchParams` (string | string[] | undefined per key), returns a strongly-typed filter object
- All enum fields are validated against the constant arrays — unknown values become `null` (silent), so attackers / typos can't poison the query
- `q` is **trimmed and capped at 80 chars**
- `page` defaults to 1, clamped via `Math.max(1, ...)`
- `sort` defaults to `"new"` if missing or invalid
- Numeric `min` / `max` parsed with `parseInteger` (rejects negatives, NaN)

### `buildFtsQuery(q)` → string | null
- Builds a **prefix** `to_tsquery` string from free-text input: splits on non-alphanumerics, lowercases, and appends `:*` to each token, AND-ed together (`"blue floral"` → `"blue:* & floral:*"`)
- The `:*` prefix operator is the whole point — it makes "ra" match "rare", "living" match "living-room". `websearch_to_tsquery` (the old mode) only matched whole stemmed words
- Stripping to alphanumerics also sanitizes: the user can't inject `&`/`|`/`!`/`:` tsquery operators
- Returns `null` if no usable tokens — caller MUST check before passing to `.textSearch`
- **Caller uses `.textSearch("search_tsv", q)` with NO `type` option** — that selects raw `to_tsquery`, which honors `:*`. Passing `{ type: "websearch" }` would strip the prefix operators

### `filtersToSearchString(filters, overrides?)` → string
- Round-trips a `CatalogFilters` back to a URL search string (`?cat=...&page=2`)
- Only includes non-null/non-default keys (sort omitted if `"new"`, page omitted if `1`) so the URL stays clean
- `overrides` is a shallow merge — useful for pagination links: `filtersToSearchString(filters, { page: filters.page + 1 })`

## queries.ts — Server-only data access

All exports are `async`, all gate behind `createSupabaseServerClient()`. Top of the file has `import "server-only"` — importing into a Client Component will fail the build.

### `listProducts(filters)` → `ListProductsResult`
- Drives `/catalog`
- Applies all enum filters via `.contains("col", [value])` (works because `listProducts` runs server-side and PostgREST's enum-array inference happens to succeed for `contains` here — see RPC workaround note below)
- FTS via `.textSearch("search_tsv", buildFtsQuery(q))` (raw `to_tsquery`, prefix-enabled) — only if `buildFtsQuery` returns non-null
- Sort cases: `price_asc`, `price_desc`, `relevance` (textSearch order — Postgres ts_rank), `new` (default — `created_at desc`)
- Pagination via `.range(offset, offset + PAGE_SIZE - 1)`. `count: "exact"` so the response includes total count

### `getProductBySlug(slug)` → `Product | null`
- Single-row lookup via `.eq("slug", slug).maybeSingle()`
- Returns `null` on miss (does NOT throw on no-rows — only on actual errors)

### `getRelatedProducts(productId, category, limit=8)` → `Product[]`
- **PostgREST enum-array workaround** — calls the SQL function `public.get_related_products` (migration 0007) instead of a direct `.contains` / `.overlaps`
- Reason: PostgREST cannot resolve `category @> {literal}` against `public.category[]` — the value side is typed as `unknown` and the operator lookup fails. The function does the cast inside Postgres
- Defensive normalization: accepts a scalar string, array, or null for `category` (legacy rows / serialization quirks). If no usable primary category, falls back to "most recent, excluding self"
- Cast `supabase.rpc as unknown as (...)` is needed because the hand-written `Database` type doesn't include function signatures yet

### `getReviewsForProduct(productId, { page, pageSize=10 })` → `{ reviews, total }`
- Paginated, sorted newest first

### `getReviewAggregate(productId)` → `{ average, count, distribution }`
- Pulls all ratings (1-5), computes average rounded to 2 decimals, and a `{1..5: count}` distribution map
- O(reviews) — fine for current scale; if a product accumulates thousands of reviews, replace with a SQL function

### `getFavoritesForUser(userId)` → `Product[]`
- Two-query pattern: fetch favorite rows ordered by `created_at desc`, then `.in("id", productIds)` for products
- **Preserves order** via a `Map` lookup — the second query returns products in arbitrary order
- Returns empty array if no favorites (skip the second query)

### `listAllProductSlugs()` → `Array<{slug, created_at}>`
- For sitemap generation. No pagination

### `isFavorite(userId, productId)` → `boolean`
- Single-row `.maybeSingle()` check

### `getCartCount(userId)` → `number`
- Sums `quantity` across all cart_items rows. Used in nav badge

### `getCartForUser(userId)` → `{ lines: CartLine[], subtotal }`
- Two-query pattern: cart_items + `.in("id", productIds)` for products
- Computes `unitPrice = priceForDimensions(product.base_price, item.width, item.height, item.unit, materialModifier)` — area-based, paid per square foot
- Skips orphan items (deleted product) silently — does NOT raise
- `subtotal` and `lineTotal` are in **paise**, not rupees

## format.ts — Display formatting + dimension math

### `formatPaiseToINR(paise)` → string
- Divides paise by 100 (with `Math.round` for safety), formats via `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`
- Returns e.g. `"₹1,299"`. Always use this — never `${price/100}₹`

### `toCm(value, unit)` → number
- Unit conversion to centimetres for `DimensionUnit` (`cm | inch | feet | meter`)
- Constants: 1 inch = 2.54 cm, 1 foot = 30.48 cm, 1 m = 100 cm

### `toSqFt(width, height, unit)` → number
- Converts both sides to cm via `toCm`, multiplies, then divides by `929.0304` (1 sq ft = 929.0304 sq cm)

### `priceForDimensions(basePricePaise, width, height, unit, materialModifierPaise = 0)` → number
- **Per-square-foot pricing math**: `Math.round(area_sqft × base_price_paise) + material_modifier_paise`
- Result in paise. `base_price` is paise per sq ft (not per piece)
- Material modifier is a flat additive in paise — NOT multiplied by area

### `formatDimensions(width, height, unit)` → string
- Display helper used in cart line items and order receipts: e.g. `"3 × 4 ft"`
- Renders the raw user-entered values + a unit suffix; does NOT convert

## Gotchas
- **Prices are stored as paise (integer)** — never `Decimal`, never `float`. Multiply by 100 on input, divide on display
- **The `listProducts.contains` calls work** even though `getRelatedProducts` has to use the RPC — they apparently land in a different PostgREST codepath that gets the type inference right. If `listProducts` ever starts failing with `operator does not exist`, port it to an RPC the same way
- **`buildFtsQuery` returning null is a sentinel** — callers must skip `.textSearch` entirely when null. Passing an empty string to `to_tsquery` errors / matches nothing
- **`PAGE_SIZE` change** propagates to `range()` AND pageCount math. Update both via the constant; don't introduce a parallel constant in components

## Related
- See [[components-catalog]] for consumers of these queries (ProductGrid, CatalogFilters, Pagination)
- See [[supabase-migrations]] for the `search_tsv` tsvector column setup
- See [[lib-cloudinary]] for image URL building used in `<ProductCard>`
