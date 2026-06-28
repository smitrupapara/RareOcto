# supabase — Reference

Database schema, RLS policies, search_tsv FTS setup, and the RPC workarounds for PostgREST enum-array limitations. Migrations live under `supabase/migrations/` and run in numeric order.

## Migration sequence

| File | Purpose |
|------|---------|
| `0001_init_auth.sql` | Enums (`role`, `product_size`, `category` original 6, `order_status`), `profiles` table, RLS for profiles, `handle_new_user` trigger on `auth.users` |
| `0002_catalog.sql` | `pg_trgm` extension; `product_material` enum; `products` / `cart_items` / `favorites` / `reviews` tables; `search_tsv` trigger + GIN indexes; `is_verified_purchase` + `set_verified_purchase` reviews trigger; RLS on all four tables |
| `0003_profiles_insert_policy.sql` | RLS policy allowing a signed-in user to insert their own `profiles` row (recovers from missing trigger-created row during onboarding upsert) |
| `0004_catalog_filters.sql` | **Big migration**. New enums `room_type` / `color_palette` / `pattern_type` / `style_theme`; converts `products.category` from scalar → `category[]`; adds `rooms` / `colors` / `patterns` / `styles` array columns; refreshes the FTS trigger to include the new dimensions (weight C); adds GIN indexes on each array column |
| `0005_more_rooms.sql` | Adds 8 commercial / office room values to `room_type` |
| `0006_more_filters.sql` | Adds `category` values `3d` + `illustration`; six new `pattern_type` values; `egyptian` `style_theme` |
| `0007_related_products_rpc.sql` | Defines `public.get_related_products(p_product_id, p_category, p_limit)` SQL function — workaround for PostgREST enum-array operator inference (see Gotchas) |
| `0008_drop_sizes_use_dimensions.sql` | Replaces fixed S/M/L sizing with customer-entered `width × height + unit`. Drops `products.available_sizes`, `products.dimensions`, `cart_items.size`; drops `product_size` enum; adds `dimension_unit` enum (`cm | inch | feet | meter`); adds `cart_items.width / height / unit` (numeric / numeric / dimension_unit); replaces unique constraint with `(user_id, product_id, material, width, height, unit)`. `products.base_price` is now paise **per square foot** (not per piece) |

Run order is **strict** — 0004 alters the column type that 0002 created, 0005/0006 extend enums introduced in 0004, 0007 depends on the `category[]` column from 0004, 0008 drops the `size` column and enum introduced in 0001/0002.

## Tables

### `profiles`
- PK `id` ⇒ `auth.users.id` cascade
- `phone unique`, `email`, `name`, `role: public.role default 'user'`
- RLS: read/update **own** row only (`auth.uid() = id`). Insert allowed by `0003_profiles_insert_policy` (own row only) — needed by onboarding upsert fallback
- Trigger `on_auth_user_created` calls `handle_new_user()` ⇒ inserts `profiles(id, phone)` with `on conflict (id) do nothing`

### `products`
- `id uuid pk`, `slug text unique`, `name`, `description`
- `category public.category[]` (was scalar in 0002, converted in 0004)
- `base_price integer >= 0` — **paise per square foot** since 0008 (was paise per piece); final unit price computed at read time
- `images text[]` — Cloudinary public ids, in display order; `images[0]` is the cover
- `available_materials public.product_material[]` (the matching `available_sizes` column was dropped in 0008)
- `material_price_modifier jsonb` — `{"fabric-texture": 200}` shape, paise per material (flat additive, NOT multiplied by area)
- `rooms`, `colors`, `patterns`, `styles` — array enum columns added in 0004
- `tags text[]`, `stock integer >= 0`, `meta_title`, `meta_description`
- `search_tsv tsvector` — maintained by `products_search_tsv_update` trigger
- **Indexes**: GIN on `search_tsv`, `tags`, `name` (trigram), `category`, `rooms`, `colors`, `patterns`, `styles`; btree on `created_at desc`
- **RLS**: select public; insert/update/delete only for admins (`profiles.role = 'admin'` exists check)

### `cart_items`
- Unique `(user_id, product_id, material, width, height, unit)` since 0008 — adding the same product with the same material + dimensions + unit updates quantity instead. Different units count as different rows (e.g. `90cm × 120cm` and `3ft × 4ft` are stored separately; consumers convert on read)
- `width numeric > 0`, `height numeric > 0`, `unit public.dimension_unit` — per-side bounds are enforced in app code, NOT in DB (global `[MIN_DIM_FT, MAX_DIM_FT]` via `lib/catalog/format.toCm`)
- `quantity > 0` check
- RLS: full CRUD on own rows

### `favorites`
- PK `(user_id, product_id)` — natural composite
- RLS: read/insert/delete on own; **no update** policy (toggling is delete + insert)

### `reviews`
- Unique `(product_id, user_id)` — one review per user per product
- `rating smallint between 1 and 5`
- `verified_purchase boolean` set by **trigger** before insert — checks `orders` for paid/shipped/delivered containing this product
- RLS: select public; insert/update/delete on own

### `orders` (referenced but not defined in these 7 migrations)
- Used by `is_verified_purchase()` — assumes `orders.items jsonb` array of `{product_id, ...}`
- Migration that creates this table is not in the tracked set yet — add the file before shipping checkout

## Enums (current full set)

| Enum | Values |
|------|--------|
| `role` | `user`, `admin` |
| `dimension_unit` | `cm`, `inch`, `feet`, `meter` (added in 0008; replaces `product_size`) |
| `category` | `abstract`, `botanical`, `geometric`, `mural`, `kids`, `minimal`, `3d`, `illustration` |
| `product_material` | `matte-vinyl`, `glossy-vinyl`, `fabric-texture`, `magnetic-base` |
| `room_type` | 26 values (home + commercial + kids + feature walls) — see `0004` + `0005` |
| `color_palette` | 11 values |
| `pattern_type` | 18 values — see `0004` + `0006` |
| `style_theme` | 12 values — see `0004` + `0006` |
| `order_status` | `created`, `pending`, `paid`, `shipped`, `delivered`, `cancelled`, `refunded` |

**These must stay in sync** with the constant arrays in `lib/catalog/search.ts` and the union types in `types/database.ts`. There is no automated check — adding an enum value means three edits: SQL migration, `search.ts` constant, `types/database.ts` union.

## search_tsv FTS

- Trigger `products_search_tsv_trigger` (before insert/update) calls `products_search_tsv_update()`
- Weights (after the 0004 refresh):
  - **A**: `name` + `tags`
  - **B**: `description`
  - **C**: `category` + `rooms` + `colors` + `patterns` + `styles` (text-cast and space-joined)
- Indexed via GIN on `search_tsv`
- Consumed by `listProducts` via `.textSearch("search_tsv", buildFtsQuery(q))` (no `type` → raw `to_tsquery`). `buildFtsQuery` emits **prefix** lexemes (`ra:*`), so typing "ra" matches "rare" and a single box searches across every weighted field. (Was `{ type: "websearch" }`, which only matched whole words.)
- **0004 re-fires the trigger** with `update public.products set name = name` — required so existing rows pick up the new dimensions in their tsvector

## RPC: `get_related_products`

Defined in `0007_related_products_rpc.sql`. Signature:

```sql
public.get_related_products(
  p_product_id uuid,
  p_category   public.category,
  p_limit      integer default 8
) returns setof public.products
```

- Selects products where `category @> array[p_category]::public.category[]` AND `id <> p_product_id`
- Ordered `created_at desc`, limited to `p_limit`
- **Why it exists**: PostgREST cannot infer the array-side type when you call `.contains("category", [val])` against `public.category[]` from the JS client — the literal arrives as `unknown` and the operator lookup fails (`operator does not exist: category @> unknown`). Doing the cast inside the SQL function is the **permanent fix** (per the active "always provide permanent fixes" rule)
- Called from `getRelatedProducts` in [[lib-catalog]] via `supabase.rpc as unknown as (...)` because the hand-written `Database` type lacks function signatures

## RLS posture
- **Anon key is safe to expose** — RLS gates everything. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships to the browser
- **Service role key is server-only** — used only by `scripts/seed-products.ts`. Never imported in app code
- Admin gating on `products` writes via `exists (select 1 from profiles where id = auth.uid() and role = 'admin')`. **There is no admin role JWT claim** — every admin write incurs one extra query. Acceptable at current scale
- `reviews.verified_purchase` is **set by trigger**, not by the client. Even if a malicious client passes `verified_purchase: true`, the BEFORE INSERT trigger overwrites it

## Gotchas
- **PostgREST + enum arrays**: `.contains` happens to work in some codepaths (used in `listProducts`) but fails consistently for `.overlaps` and for `.contains` with a single-element literal that PostgREST can't bind. **If anything starts erroring with `operator does not exist: <enum> @>/&& unknown`, port the call to an RPC** the same way `getRelatedProducts` was — explicit `array[...]::public.<enum>[]` casts inside SQL
- **Enums in Postgres need three-way sync** (SQL migration + `search.ts` constants + `types/database.ts` union). No CI check yet — easy to drift
- **Adding enum values requires `alter type ... add value if not exists ...`** in its own migration (Postgres can't add values to an enum inside a transaction with other statements that use the new value). 0005 and 0006 follow this pattern
- **`profiles.role` is the only admin signal** — there is no separate `admin_users` table or JWT claim. Demoting a user is a single `update profiles set role = 'user'`
- **Cascade deletes on `auth.users`** wipe profile, cart_items, favorites, reviews — orders intentionally do NOT cascade (need to retain for accounting). If you add a new user-owned table, decide cascade explicitly
- **`unique (user_id, product_id, material, width, height, unit)` on cart_items** — `addToCartAction` must either upsert (`onConflict`) or fetch-then-update. Plain insert with the same SKU + dimensions will 409. Different units for the same physical size (e.g. `90cm × 120cm` vs `3ft × 4ft`) count as **distinct rows** — store-as-typed by design
- **`stock` is not decremented anywhere yet** — the column is `>= 0` but checkout logic that decrements it doesn't exist. Add this before live orders or oversells will happen

## Related
- See [[lib-catalog]] for the JS-side consumers and the RPC call site
- See [[lib-supabase]] for the three client factories and why the anon key is safe
- See [[components-admin]] for the form that writes most product columns
- `scripts/seed-products.ts` uses the **service role key** to bypass RLS for bulk inserts
