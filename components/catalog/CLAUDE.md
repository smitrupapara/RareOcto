# components/catalog — Reference

All catalog-facing UI: product cards, gallery, filters, pagination, cart drawer, reviews, JSON-LD. Mix of server and client components — the rule of thumb is **client only when you need state, event handlers, or `useOptimistic`**. Everything else stays server.

Consumers live mostly under `app/(public)/catalog/*`.

## Listing / search

### catalog-search.tsx (client)
- Free-text search input that drives the `q` URL param
- **280ms debounce** before pushing to URL (`setTimeout` cleared on each keystroke)
- `MAX_LEN = 80` — `maxLength` on input + truncation as defence-in-depth; matches `buildFtsQuery` cap in [[lib-catalog]]
- Syncs internal state with `searchParams.get("q")` so back/forward restores the input
- Uses `router.replace` (not `push`) wrapped in `useTransition` — `scroll: false`
- Resets `page` whenever `q` changes via `filtersToSearchString(filters, { q: next, page: 1 })`
- Clear (`×`) button shown when value non-empty — instant reset

### catalog-filters.tsx (client)
- Five `Select` dropdowns (category, room, color, pattern, style) + sort
- **`ALL_VALUE = "__all__"` sentinel** — Base UI Select can't take literal `""`; we map sentinel ↔ `null` at the boundary
- `sortedByLabel(values, labelMap)` — options ordered alphabetically by display label (not enum order). Style/Pattern/Room labels alphabetize in English so users find them
- `update(patch)` — patches one filter, rebuilds search string via `filtersToSearchString`, calls `router.replace(... , { scroll: false })` inside `useTransition`
- `clearAll()` removes every `FILTER_KEYS` member (preserves `q`, `sort`)
- **Dropdown scroll**: the underlying `Select.List` is `overflow-y-auto overscroll-contain` so wheel events inside an open dropdown scroll the list, not the page. (The old `data-lenis-prevent` opt-out was removed along with Lenis — scroll is native now; see [[components-providers]])
- "Active filter chips" rendered above the controls — clicking a chip clears that single filter

### catalog-pagination.tsx (server)
- **No longer wired into `/catalog`** — the catalog page now uses `load-more-products.tsx` (incremental "Load more") instead of numbered pages. Kept as a self-contained, reusable component; safe to delete if no future use emerges.
- Returns `null` if `pageCount ≤ 1` — never renders for single-page results
- `buildPageList(current, total)` — always shows first + last + (current, ±1); a single `"..."` ellipsis collapses any gap. Returns an array of `number | "ellipsis"`
- Hrefs built via `filtersToSearchString(filters, { page: n })` — preserves `q`/sort/filters
- All links carry `scroll: false` so the URL changes without jumping to top

### product-grid.tsx (server)
- Wraps a `.grid` layout around `<ProductCard>` instances
- Passes `priority={i < 4}` for the **first 4 cards** — they're typically above the fold and need Next/Image LCP optimisation
- Receives `favoriteIds: Set<string>` from the page so each card knows its own state without a per-card query
- Receives `isAuthed: boolean` to gate FavoriteToggle's click handler
- Still used by `account/favorites/page.tsx` (NOT the catalog page — that one uses `load-more-products.tsx`)

### load-more-products.tsx (client)
- The catalog page's grid + "Load more" button — replaces numbered pagination. Renders the same `grid grid-cols-2 … lg:grid-cols-3` of `<ProductCard>`s as `product-grid.tsx`.
- Props: `initialProducts` (server-rendered first page), `total`, `filters: CatalogFilters`, `isAuthed`, `favoriteIds: string[]` (the user's FULL favourite set, so newly loaded cards resolve their heart without a refetch)
- `loadMore()` calls `loadMoreProductsAction(filters, page + 1)` (`app/(public)/catalog/actions.ts`) inside `useTransition`; merges results de-duped by `id`; button shows "Loading…" while pending; `try/catch` surfaces a retry message
- `hasMore = products.length < total` — button + `"{n} of {total}"` count hide once everything is loaded
- **Must be `key`-ed by the filter signature** in the page so it remounts (state resets) when search/filters change — it does NOT read `useSearchParams`
- **Security**: the server action re-validates the client-supplied `filters` by round-tripping `filtersToSearchString` → `parseCatalogFilters` (never trusts raw client input — see [[lib-catalog]])

### product-card.tsx (client)
- Cover image (`images[0]`) via `cloudinaryLoader` + `priority` prop forwarded for LCP
- "From ₹X / sq ft" price label using `formatPaiseToINR(base_price)` — `base_price` is paise per sq ft, so this is the starting rate not a fixed item price
- Category badge (first category label) sits top-left over the image
- Hover: scale image + coral border on card
- FavoriteToggle absolutely-positioned top-right with `size="icon-sm"` and the user's `isAuthed` flag

## Product detail

### product-gallery.tsx (client)
- Main image + horizontal thumbnail strip; `active` index in local state
- Thumbnails: button per image, `aria-current` on active, coral ring (`ring-2 ring-coral`) for the active one
- All images routed through `cloudinaryLoader` — public ids only, never full URLs
- No keyboard arrow navigation today — keep that in mind before extending

### product-buy-box.tsx (client)
- Owns width / height / unit / material / quantity selection for one product
- **`MAX_QTY = 5`** — input clamped to `[1, 5]`; "+" disabled at 5
- Width and height are typed inputs (string state for typing UX), unit is a `<Select<DimensionUnit>>` (cm / inch / feet / meter). Defaults: 3 × 4 ft
- `dimError` useMemo validates each side against `[MIN_DIM_CM, MAX_DIM_CM]` via `toCm`; surfaced inline and blocks "Add to cart"
- `effectivePrice = priceForDimensions(basePrice, width, height, unit, materialPriceModifier[material] ?? 0)` — recomputed whenever any dimension input or material changes. Always in paise; formatted via `formatPaiseToINR`
- Header price renders as `"{formatPaiseToINR(basePrice)} per sq ft"`; effective unit price + line total render below
- Auth-gates the "Add to cart" button via `<AuthGatedButton isAuthed={...} onAction={addToCart} next={pathname}>` (see [[components-auth]])
- `addToCart` calls `addToCartAction({ productId, width, height, unit, material, quantity })` inside `useTransition`
- Shows a transient **"Added to cart"** confirmation for **1800ms** then reverts the button label
- Out-of-stock state disables every interactive control and replaces CTA with "Out of stock"

### dimensions-table.tsx (server)
- **Prop-less range info panel** — only takes optional `className`. Same component on every PDP since the allowed range is global
- Renders a 2-column table listing the allowed per-side range in Feet / Inches / Centimetres / Metres, derived from `MIN_DIM_FT` / `MAX_DIM_FT` in [[lib-catalog]]
- Sits in the "Dimensions" sidebar on the PDP next to the product description; the actual width/height/unit inputs live in `product-buy-box.tsx`

### review-summary.tsx (server)
- Top of PDP — average rating, count, and 1–5 distribution bars
- **Exports both `ReviewSummary` AND a `Stars` subcomponent** — `Stars` is reused by ProductCard, ReviewList, ReviewForm preview
- `Stars` renders an absolutely-positioned filled overlay over an outlined base; **fractional ratings use a percentage clip-path width** (e.g. 3.6 → 72% fill on the 4th star). Colour is marigold (`text-marigold`)
- Distribution rows: 5★ → 1★, each with a horizontal bar (`width = (count / total) * 100%`) — bar fill marigold

### review-list.tsx (server)
- Async server component; awaits `getReviewsForProduct` from [[lib-catalog]]
- Each review: stars + title + body + relative date
- **Verified badge** ("Verified purchase") shown when `verified_purchase` true — uses `text-sea` colour
- Empty state ("No reviews yet — be the first.") when list is empty

### review-form.tsx (client)
- zod-validated: `rating` integer 1–5, `title ≤ 120`, `body ≤ 2000`
- **Hover rating** — `useState<number | null>(hovered)`; while hovered, stars display the hover value; on mouse-out, falls back to the committed `rating` field
- Auth-gates the submit button via `AuthGatedButton`; unauthed users get pushed to `/login?next=`
- Calls `submitReviewAction` inside `useTransition`; surfaces `{ error }` via `setError("root")`
- Filled stars use marigold (`text-marigold`)

### related-products.tsx (server)
- Async server component; calls `getRelatedProducts(productId, category, 4)`
- Returns `null` when no related products — no empty section header
- Always asks for 4 (a single row on the PDP); the RPC handles its own ordering

### product-jsonld.tsx (server)
- Injects `<script type="application/ld+json">` for **two schemas**: `Product` and `BreadcrumbList` (see schema.org docs)
- `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL` with trailing `/` stripped — required for canonical URLs and image URLs
- Image URLs built via `og(publicId)` for each image — **non-`<Image>` context** so we use [[lib-cloudinary]] helpers directly
- `offers` is an **`AggregateOffer`** with `lowPrice` (rupees, not paise) because price now varies by customer-chosen area. `lowPrice = base_price / 100` works because the minimum 1×1 ft order has `area_sqft = 1`, so the starting unit price (in rupees) equals `base_price / 100`
- `aggregateRating` field only included when `reviewCount > 0` — Google flags Product entries with zero reviews if they declare `aggregateRating`

### breadcrumbs.tsx (server)
- `Breadcrumbs({ items })` — renders the visual breadcrumb trail at the top of the PDP / catalog page
- Last item gets `aria-current="page"` and styled as text, not link
- **`buildProductBreadcrumbs(category, productName)`** helper exported alongside — produces the standard `Home → Catalog → <Category> → <ProductName>` chain. Uses a `CATEGORY_LABEL` map (must stay in sync with the enum in [[lib-catalog]])
- For non-PDP pages, callers build the items array themselves

## Cart UI

### cart-drawer.tsx (client)
- `Sheet` from [[components-ui]] — right-side slide-over
- Badge on the trigger shows total qty; **capped display as `"99+"`** when actual > 99
- Empty state: centered icon + "Your cart is empty" + CTA back to catalog
- Subtotal rendered via `formatPaiseToINR(subtotal)` at the bottom
- "View cart" link to `/cart` for full checkout flow

### cart-line-item.tsx (client)
- One row per line — image, name, `formatDimensions(width, height, unit) · MATERIAL_LABEL[material]`, qty controls, line total, remove
- Displays dimensions in the **unit the customer originally typed** — no conversion. A `90cm × 120cm` line stays in cm; a `3ft × 4ft` line stays in feet
- Qty `+ / −` buttons clamp to `[1, 5]` (same MAX_QTY as ProductBuyBox); disabled at bounds
- `+ / −` and quantity input call `updateCartQuantityAction({ lineId, quantity })` inside `useTransition`
- `×` (remove) calls `removeFromCartAction({ lineId })` — no confirm prompt; cart removals are cheap to redo
- Line total = `unitPrice * quantity` formatted via `formatPaiseToINR`

### favorite-toggle.tsx (client)
- Heart icon button; coral fill when favorited (`text-coral fill-coral`)
- **`useOptimistic` for instant toggle** — UI flips immediately; rollback if the server action fails
- Unauthed clicks → `router.push("/login?next=" + encodeURIComponent(pathname))` instead of toggling
- Server side: `toggleFavoriteAction({ productId })` inserts or deletes the row; UI relies on the optimistic state until the action resolves

## Gotchas
- **`Stars` is exported, not internal** — if you change its props, update ReviewSummary, ReviewList, ReviewForm, ProductCard
- **Server vs client boundaries**: ProductGrid, RelatedProducts, ReviewList, ReviewSummary, DimensionsTable, ProductJsonLd, Breadcrumbs, Pagination — all server. Anything with state/handlers (search, filters, gallery, buy box, cart UI, favorite toggle, review form) — client
- **`scroll: false` on every router.replace** — filter/search/pagination changes must not jump the page to top
- **Always import enum constants from [[lib-catalog]] `search.ts`** — never re-list category/size/material/etc. in components
- **AuthGatedButton ALWAYS receives `isAuthed` from server props** — never call `getCurrentUser()` from client. See [[components-auth]]
- **`priority` only on first 4 ProductCards** in a grid (LCP target). Marking everything `priority` cancels the benefit
- **Cart and favorites are paise-based** — never divide and re-multiply; use `formatPaiseToINR` at the display boundary only
- **JSON-LD price is rupees, not paise** — only place we leak the unit conversion to a consumer. Uses `AggregateOffer.lowPrice` because per-sq-ft pricing has no single fixed price
- **`MAX_QTY = 5` is duplicated** in ProductBuyBox and CartLineItem. If you raise the cap, change both — and consider promoting it to a shared constant
- **Dimensions are stored as-typed** — `cart_items.width / height / unit` keep the user's original unit. The unique constraint `(user_id, product_id, material, width, height, unit)` treats different units as different rows even if they're the same physical size. Convert to cm via `toCm` only when comparing against the `[MIN_DIM_CM, MAX_DIM_CM]` bounds or computing area via `priceForDimensions`

## Related
- See [[components-auth]] for `AuthGatedButton` consumed by FavoriteToggle / BuyBox / ReviewForm
- See [[components-ui]] for `Select`, `Sheet`, `Button` primitives
- See [[lib-catalog]] for `parseCatalogFilters`, `filtersToSearchString`, all enum constant arrays, and the data-access functions consumed here
- See [[lib-cloudinary]] for `cloudinaryLoader` (`<Image>`) and `og()` (JSON-LD)
- See [[supabase-migrations]] for the underlying tables / RLS that power these queries
