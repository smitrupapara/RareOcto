# types & middleware — Reference

Cross-cutting concerns: the hand-written database type envelope (`types/database.ts`) and the root `middleware.ts` (auth refresh + route gating + path header). Grouped here because middleware consumes these types and the auth gating closely tracks the schema.

## types/database.ts

Hand-written until we run `supabase gen types typescript`. **Single source of truth for TypeScript** consumed by `createClient<Database>` in [[lib-supabase]].

### What it contains
- **Enum unions**: `DimensionUnit`, `ProductMaterial`, `Category`, `Room`, `ColorPalette`, `PatternType`, `StyleTheme`, `OrderStatus`, `Role`
- **Row types**: `Profile`, `Product`, `SavedPreview`, `CartItem`, `Favorite`, `Review`, `Order`, plus helper types `Address`, `OrderLineItem`, `MaterialPriceModifier`. `CartItem` and `OrderLineItem` carry `{ width, height, unit }` (customer-entered) instead of a fixed size column
- **Supabase-shaped envelope**: `Database = { public: { Tables: {...}, Views, Functions, Enums } }` — the shape `@supabase/ssr` expects so `.from("products").select()` types fields correctly

### Per-table `Insert` vs `Update`
- `Insert` omits server-generated columns (`id`, `created_at`, `verified_purchase` on reviews) and makes them optional
- `Update` is `Partial<Row>` — every field optional
- This matches PostgREST behaviour: omitted columns use their default

### What it DOESN'T cover
- **`Functions` is `{ [_ in never]: never }`** — no RPC signatures. `getRelatedProducts` casts `supabase.rpc as unknown as (...)` to work around this (see [[lib-catalog]])
- **No view types** — we don't use views yet
- **No `auth.users` type** — only the `public` schema. Access auth via `supabase.auth.getUser()` which returns `User` from `@supabase/supabase-js`

### Keeping it in sync
Three-way sync required whenever schema changes:
1. SQL migration in `supabase/migrations/` ([[supabase-migrations]])
2. Constant array in `lib/catalog/search.ts` ([[lib-catalog]])
3. Union type in this file

There is **no automated check**. The most common drift is an `alter type ... add value` migration where the constant and the union don't get updated. Search for the enum name across these three locations after any migration that touches enums.

### Gotchas
- **`Category` is a union of strings**, but `Product.category` is `Category[]` (since migration 0004). Single-category products store `["abstract"]`, not `"abstract"`. Older code that destructures `category` as a string will need updating
- **Prices typed as `number`** but conceptually paise. The type system can't enforce the unit — comments and conventions do. Look for `formatPaiseToINR` at every display boundary
- **`SavedPreview` is typed** but the table isn't in the tracked migrations. Either add a migration before relying on it, or remove the type
- **`material_price_modifier: Partial<Record<ProductMaterial, number>>`** — adding a new material here is implicitly safe (existing rows just don't have a key for it); removing a material is breaking (orphan keys lurk in jsonb)

## middleware.ts (root)

### What it does, in order
1. **`request.headers.set("x-pathname", pathname)`** — exposes the current path to Server Components via `headers()`. Consumed by `requireUser()` in [[lib-auth]] to build `/login?next=<path>` without each caller threading the path down
2. **`await updateSession(request)`** — [[lib-supabase]] middleware client. Refreshes Supabase tokens and writes Set-Cookie headers on the response
3. **Second Supabase client** with `setAll: () => {}` (read-only) — used just to call `auth.getUser()` for the gating logic below. Does NOT re-refresh; that's already done by `updateSession`
4. **Route gating**:
   - `PROTECTED = ["/account", "/onboarding", "/try-on", "/cart", "/admin"]` → unauthed users redirected to `/login?next=<pathname>`
   - `AUTH_ONLY = ["/login"]` → authed users redirected to `safeNext(?next=...) ?? "/"`
   - `ADMIN_ONLY = ["/admin"]` → authed non-admins redirected to `/`
5. **Profile completeness check** — if the user is authed and not already on `/onboarding` or `/auth/*`, looks up `profiles.name`; if missing/null → redirect to `/onboarding`. This is what enforces "complete your profile before doing anything else"

### Matcher
```ts
matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp4)$).*)"]
```

Skips static assets and images so the middleware (and its DB call) doesn't fire on every Next image request. **Don't add new extensions casually** — each one is a perf win, but each one also bypasses the auth refresh.

### Gotchas
- **The two Supabase clients are intentional**. The `updateSession` one writes cookies, the inline one just reads the user. Merging them re-runs the cookie dance per request unnecessarily and the cookie-setting client is heavier
- **`profiles.maybeSingle()` returning null** (auth.users row exists, profiles row deleted) **redirects to `/onboarding`** — which then upserts via policy `0003_profiles_insert_policy`. This is the recovery path
- **Admin check runs every request to `/admin/*`** — one extra `select` per page nav. Acceptable; if it ever shows up in p99 latency, cache the role on the user JWT via Supabase auth hooks (not done today)
- **`safeNext` is imported from `lib/auth`** — keep `lib/auth.ts` cookie-free / `next/headers`-free so middleware can use it. Middleware has no `headers()` scope
- **Don't `redirect()` from middleware** — that's Next App Router server code. In middleware return `NextResponse.redirect(...)` instead
- **`updateSession` already constructs and returns a `NextResponse`** — we mutate gate decisions on top of it; only return that response when no gate redirect fires

## Related
- [[lib-supabase]] for the `updateSession` cookie dance this middleware drives
- [[lib-auth]] for `requireUser` / `safeNext` consumers of `x-pathname` and the AUTH_ONLY redirect path
- [[supabase-migrations]] for the schema this `Database` type mirrors
- [[components-admin]] / [[components-catalog]] / [[components-auth]] are the main consumers of the row types via the typed Supabase client
