# RareOcto Catalog — Phased Implementation Plan

> This document is the in-repo copy of the approved catalog plan. It mirrors
> `~/.claude/plans/now-let-s-create-catalog-lucky-rain.md`. Update both if the
> approach changes mid-build.

## Context

`/catalog` is currently a placeholder ("Something rare is dropping soon" —
`app/(public)/catalog/page.tsx`). We need to ship a real storefront for
200–400 magnetic-wallpaper SKUs with categorized browsing, search by
name/tag, an Amazon-style product detail page (multi-image gallery, size +
**material** picker, dimensions, favorite, add-to-cart, reviews), and the
SEO scaffolding (sitemap, JSON-LD, OG images) needed for "magnetic
wallpaper India" to rank.

The codebase has already laid most of the foundation: `Product` is typed in
`types/database.ts`, the Cloudinary `next/image` loader is scaffolded at
`lib/cloudinary/loader.ts`, `next-cloudinary@6.17` is installed,
`next.config.ts` whitelists `res.cloudinary.com`, `AuthGatedButton` exists
for protected actions, and shadcn/ui + Tailwind v4 + RHF/Zod are already in
use. What's missing is (a) the DB migration for
`products`/`cart_items`/`favorites`/`reviews`, (b) wiring Cloudinary
end-to-end, (c) the pages and components, (d) a seed pipeline for the
initial 200–400 SKUs, and (e) SEO surfaces.

### Confirmed decisions

| Question | Decision |
|---|---|
| Material modeling | Postgres enum `product_material` (`matte-vinyl`, `glossy-vinyl`, `fabric-texture`, `magnetic-base`) |
| Guest cart/favorites | Auth-required — `AuthGatedButton` bounces to `/login?next=...` |
| Plan scope | Full storefront through admin CRUD |
| Initial data load | Seed script + manual Cloudinary dashboard upload for the first 200–400 SKUs |

### Architecture notes

- **Cloudinary public IDs**, not URLs, are what we store in `products.images[]`.
  The `next/image` loader builds the URL at render time. Lets us change
  transforms globally.
- **Search**: Postgres full-text (`tsvector` + GIN index) on
  `name + description + array_to_string(tags)`. Trigram extension for fuzzy
  tag-matching. 200–400 rows is well within FTS comfort.
- **Filtering** drives URL state
  (`?q=&category=&material=&size=&min=&max=&sort=&page=`). Server components
  stay cacheable per URL.
- **Variants**: size (S/M/L) and material are *availability arrays* on the
  product, not separate variant rows. Price modifier per material is a
  `jsonb` map (`{ "matte-vinyl": 0, "fabric-texture": 200 }`). Stock is
  per-product for now; promote to per-variant only if needed.
- **Reviews**: 1–5 stars + text. Photo reviews deferred. `verified_purchase`
  flag joined from `orders`.

---

## Phase 0 — Cloudinary setup (manual, one-time)

1. Create a free account at https://cloudinary.com/users/register/free.
   Pick a memorable cloud name (e.g. `rareocto`) — **becomes part of every
   image URL; not easily changeable later**.
2. Dashboard → note **Cloud name**, **API Key**, **API Secret** (Settings →
   Account → API Keys).
3. Create folder structure in the Media Library (Media Library → New folder):
   - `rareocto/products/` — one subfolder per product slug; images named
     `01`, `02`, …
   - `rareocto/og/` — pre-composed 1200×630 social cards.
   - `rareocto/site/` — brand/UI assets (logo can stay in `/public`).
4. Create an unsigned upload preset for the future admin UI (Settings →
   Upload → Add upload preset):
   - Preset name: `rareocto_admin_unsigned`
   - Signing mode: **Unsigned**
   - Folder: `rareocto/products`
   - Allowed formats: `jpg, png, webp, avif`
   - Incoming transformation: `q_auto,f_auto`
5. Set environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=rareocto
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   CLOUDINARY_ADMIN_UPLOAD_PRESET=rareocto_admin_unsigned
   ```
6. Update `.env.example` to document these (no values).

**Done when:** uploading a test image and visiting
`https://res.cloudinary.com/<cloud>/image/upload/w_800,q_auto,f_auto/rareocto/products/test/01`
returns it.

---

## Phase 1 — Database migration

File: `supabase/migrations/0002_catalog.sql`.

- New enum `product_material` (matte-vinyl, glossy-vinyl, fabric-texture,
  magnetic-base).
- New tables `products`, `cart_items`, `favorites`, `reviews`.
- `products.search_tsv` is a generated `tsvector` over name (weight A) +
  description (B) + tags (A). GIN index on `search_tsv`. Trigram index on
  name via `pg_trgm`.
- RLS:
  - `products`: public select; insert/update/delete only `role='admin'`.
  - `cart_items`, `favorites`: CRUD on own rows only.
  - `reviews`: public select; insert by authenticated; update/delete on own
    rows.

Apply with `supabase db push` (linked to remote project).

---

## Phase 2 — Types & Cloudinary loader wiring

- **Modify** `types/database.ts`:
  - Add `ProductMaterial` union.
  - Extend `Product` with `available_materials`, `material_price_modifier`,
    `dimensions`, `tags`, `meta_title`, `meta_description`.
  - Add `Favorite` and `Review` types.
  - Register new tables in the `Database` envelope.
- **Do NOT** register the loader globally in `next.config.ts` — would break
  `/public` assets like `<Logo>`. Pass `loader={cloudinaryLoader}` per
  `<Image>` instead.
- **New** `lib/cloudinary/transforms.ts` — `thumb()`, `detail()`, `og()`
  URL builders for use outside `<Image>` (OG, JSON-LD).
- **New** `lib/catalog/queries.ts` — `listProducts(filters)`,
  `getProductBySlug(slug)`, `getRelatedProducts(productId, category)`,
  `getReviewsForProduct(productId)`, `getReviewAggregate(productId)`,
  `getFavoritesForUser(userId)`, `getCartCount(userId)`.
- **New** `lib/catalog/search.ts` — URL → filter parsing + FTS sanitizer.

---

## Phase 3 — Catalog page

- **Rewrite** `app/(public)/catalog/page.tsx` — server component, reads
  `searchParams`, fetches via `lib/catalog/queries.ts`.
- New components under `components/catalog/`:
  - `product-grid.tsx`, `product-card.tsx` (server)
  - `catalog-search.tsx`, `catalog-filters.tsx`, `catalog-pagination.tsx`
    (client, URL-driven)
- Pagination 24/page; sort options (`new`, `price_asc`, `price_desc`,
  `relevance`); empty-state with reset button.

---

## Phase 4 — Product detail page

- `app/(public)/catalog/[slug]/page.tsx` — server; `generateMetadata`,
  optionally `generateStaticParams` for top-N.
- `app/(public)/catalog/[slug]/not-found.tsx`
- `app/(public)/catalog/[slug]/actions.ts` — `addToCart`, `toggleFavorite`,
  `submitReview` (all `requireUser()`).
- Components: `product-gallery.tsx`, `variant-selector.tsx`,
  `add-to-cart-form.tsx`, `favorite-toggle.tsx`, `dimensions-table.tsx`,
  `breadcrumbs.tsx`, `related-products.tsx`, `product-jsonld.tsx`.
- SEO: per-page `title`/`description`, `canonical`, OpenGraph, Twitter
  Card, `Product` + `BreadcrumbList` JSON-LD.

---

## Phase 5 — Cart

- `app/(public)/cart/page.tsx` (add `/cart` to `PROTECTED` in
  `middleware.ts`).
- `app/(public)/cart/actions.ts` — `updateCartQuantity`, `removeFromCart`,
  `clearCart`.
- `components/catalog/cart-drawer.tsx` — Sheet-based slide-out.
- Modify `components/sections/site-nav.tsx` — cart icon with count badge
  via lightweight `getCartCount()` RSC helper.

---

## Phase 6 — Favorites

- `app/(protected)/account/favorites/page.tsx`.
- Heart toggle on `ProductCard` and detail page share the same
  `toggleFavorite` server action.

---

## Phase 7 — Reviews

- `components/catalog/review-list.tsx` (server), `review-form.tsx`
  (client, RHF/Zod), `review-summary.tsx` (server).
- `submitReview` action; `unique (product_id, user_id)` prevents
  duplicates.
- Verified-purchase trigger via SQL function that scans `orders.items`.

---

## Phase 8 — SEO essentials

- `app/sitemap.ts`, `app/robots.ts`.
- `app/(public)/catalog/[slug]/opengraph-image.tsx` (Edge `ImageResponse`,
  optional).
- Validate with Google Rich Results Test, https://opengraph.dev/,
  Lighthouse SEO ≥ 95.

---

## Phase 9 — Seed script + initial SKUs

- `scripts/seed-products.ts` — Node + `@supabase/supabase-js` (service
  role) reading `scripts/products.csv`.
- `scripts/products-template.csv` — `slug,name,description,category,
  base_price,sizes,materials,material_modifiers_json,dimensions_json,
  tags,stock,image_count,meta_title,meta_description`.
- `scripts/upload-cloudinary.ts` — optional bulk uploader for
  `./images/<slug>/NN.jpg` → `rareocto/products/<slug>/<NN>`.
- Add `seed` and `upload:images` npm scripts.

---

## Phase 10 — Admin product CRUD (deferred)

- `app/admin/layout.tsx` (role-gate via middleware).
- `app/admin/products/...` with RHF/Zod forms and `<CldUploadWidget>`
  using `CLOUDINARY_ADMIN_UPLOAD_PRESET`.
- Actions: `createProduct`, `updateProduct`, `deleteProduct`,
  `reorderImages`.

---

## Cross-cutting tasks

- Add `/cart`, `/account/favorites`, `/admin` to `PROTECTED` in
  `middleware.ts` as the corresponding phases land.
- Update `docs/PROJECT.md` § 3 (Routes) and § 7 (Planned features) as each
  phase ships.
- Update `app/CLAUDE.md` with new routes after Phases 3–6.

---

## Risks / open questions

- **`loader: "custom"` is global** — stay per-component for now; promote
  only after every Image usage moves to Cloudinary (or loader gains `/`
  bypass).
- **FTS dictionary is `english`** — fine for English catalog; switch to
  `simple` for multilingual.
- **Stock per-product, not per-variant** — fine at launch SKU count;
  promote to `product_variants` if oversells happen.
- **Anonymous cart UX** — auth-required is the confirmed default; revisit
  with localStorage merge if conversion drops at login.
- **Image weight** — `f_auto,q_auto` handles most; consider LQIP blur
  placeholders after Phase 3 ships.
