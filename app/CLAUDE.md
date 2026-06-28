# app — Reference

## layout.tsx (root)
- Fonts: `Geist` (→ `--font-geist-sans`), `Geist_Mono` (→ `--font-geist-mono`), `Bricolage_Grotesque` (→ `--font-bricolage`, weights 400–800)
- CSS vars used in Tailwind: `font-sans` → Geist, `font-mono` → GeistMono, `font-display` → Bricolage
- `<html>`: applies all three font variables + `h-full`, `suppressHydrationWarning` (Grammarly ext compat)
- `<head>`: contains a synchronous inline `<script>` that reads `localStorage('theme')` and adds `class="dark"` to `<html>` before first paint — prevents FOUC on dark-mode reload. Falls back to `prefers-color-scheme: dark` if no stored value.
- `<body>`: `suppressHydrationWarning` — Grammarly injects `data-gr-*` attributes causing hydration mismatch without this
- Renders `{children}` directly — **no SmoothScrollProvider** (Lenis smooth-scroll was removed; native scroll only — see [[components-providers]]) and no ThemeProvider (theme is managed via direct DOM manipulation)
- `siteUrl`: `NEXT_PUBLIC_SITE_URL` env var, falls back to `"https://rareocto.com"`
- OG image: `/og.png` (1200×630), theme colors for light/dark

## globals.css — Dark mode
- Dark mode is **class-based**: add `class="dark"` to `<html>` to activate
- Light vars on `:root`, dark vars on `.dark` — both specificity 0,1,0; `.dark` wins because it comes later
- **`dark:*` utilities are bound to the `.dark` class** via `@custom-variant dark (&:where(.dark, .dark *));` in globals.css (right after the `@import`s). REQUIRED — without it Tailwind v4 defaults `dark:` to the `prefers-color-scheme` media query, so on an OS in dark mode every `dark:*` style activates even in light mode (e.g. `dark:bg-ink/40` painting a navy scrim over white sections). Use the `:where()` form (specificity 0, non-recursive); a malformed variant selector — not this one — was what previously hung the compile.
- Color palette: navy/blue brand theme — `--ink` (navy), `--cream` (off-white), `--coral` (brand blue CTA), `--marigold` (steel-sky blue), `--sea` (deep navy)

## (public)/layout.tsx
- Wraps all public pages: `/`, `/catalog`, `/catalog/[slug]`, `/cart`, `/account/favorites`, `/try-on`, `/about`
- Structure: `flex min-h-screen flex-col` → `<SiteNav cartCount={…} />` → `<main flex-1>` → `<SiteFooter />`
- Server component (no "use client"). Fetches `getCurrentProfile` + `getCurrentUser` in parallel, then `getCartCount(user.id)` if authed; passes cart count to `<SiteNav>` for the cart badge.

## (public)/page.tsx — Home (`/`)
- Renders `<HeroSection />` then `<HowItWorks />`
- Static prerender (no dynamic data)
- Metadata: title "RareOcto — Stick. Peel. Repeat."

## (public)/catalog/page.tsx — Catalog (`/catalog`)
- Server component; `searchParams: Promise<...>` (Next 16) parsed via `parseCatalogFilters` (`lib/catalog/search.ts`)
- Data via `listProducts(filters)` (`lib/catalog/queries.ts`) — page only uses `{ products, total }` (the first page); further pages load client-side
- Also fetches the current user (parallel) and, if authed, resolves `favoriteIds` (the user's FULL favourite set) via `getFavoritesForUser` so every card — including later-loaded ones — renders its saved heart state
- Layout: header (eyebrow + h1 + tagline) → search + result count (`"N pieces"`) row → filter row → `LoadMoreProducts`
- Renders `<EmptyState />` instead of the grid when `products.length === 0` (deep-links to `/catalog` to clear)
- **Load more, not pagination**: `<LoadMoreProducts>` (client) renders the grid and appends pages via the `loadMoreProductsAction` server action (`app/(public)/catalog/actions.ts`) on a "Load more" button. It's `key`-ed by `filtersToSearchString(filters)` so it remounts/resets when filters change. `CatalogPagination` still exists but is no longer wired here.
- Children: `CatalogSearch` (client, debounced 280ms, `router.replace`), `CatalogFilters` (client, URL-syncing selects + Clear all), `LoadMoreProducts` (client, takes `initialProducts`/`total`/`filters`/`isAuthed`/`favoriteIds`)
- Search/filter components are wrapped in `<Suspense>` because they call `useSearchParams()` — required for static prerender

## (public)/catalog/[slug]/page.tsx — Product detail
- Server component; `params: Promise<{ slug }>` (Next 16); 404s via `notFound()` when slug missing
- `generateMetadata` returns title/description/canonical/OpenGraph/Twitter from product fields; OG image is `og(product.images[0])`
- Sections in order: `Breadcrumbs` → gallery + `ProductBuyBox` + `FavoriteToggle` (showLabel) → About + `DimensionsTable` → `#reviews` (`ReviewSummary` size="lg" + `ReviewList` + `ReviewForm`) → `RelatedProducts` → `ProductJsonLd`
- Aggregate + current user fetched in parallel; `isFavorite` resolved separately if user present
- Server actions live at `app/(public)/catalog/[slug]/actions.ts`: `addToCartAction`, `toggleFavoriteAction`, `submitReviewAction` (all `requireUser()`-gated; duplicate review caught via Postgres code `23505`)

## (public)/cart/page.tsx — Cart
- Server component; protected via `middleware.ts` `PROTECTED` array
- Reads `getCartForUser(user.id)` for lines + subtotal; renders empty state or list of `CartLineItem`s + summary
- Actions in `actions.ts`: `updateCartQuantity`, `removeFromCart`, `clearCart`; revalidate `/cart`

## (public)/account/favorites/page.tsx — Saved pieces
- Server component; `requireUser()`; reads `getFavoritesForUser`
- Empty state nudges to `/catalog`; non-empty renders `ProductGrid` with `isAuthed` + all product IDs marked as favorite
- `metadata.robots: { index: false, follow: false }` — private page, kept out of crawlers

## sitemap.ts (`/sitemap.xml`)
- Emits `/`, `/catalog`, `/try-on`, `/about` + every `/catalog/<slug>` from `listAllProductSlugs()`
- Per-product `lastModified` comes from `created_at`; falls back to static-only if DB call throws (build-time safety)
- Site URL: `NEXT_PUBLIC_SITE_URL` → fallback `https://rareocto.com`

## robots.ts (`/robots.txt`)
- Allow all `*`; disallow `/api/`, `/account/`, `/cart`, `/admin/`, `/login`
- Points to `${SITE_URL}/sitemap.xml`

## not-found.tsx
- On-brand 404: "This page peeled off." / "404 — wall not found"
- `Button asChild` → `Link href="/"` back home

## error.tsx (`"use client"`)
- Global error boundary: logs error, shows reset button + back-home link
- "Eight arms, one knot." heading

## loading.tsx
- Animated loading state: pulsing dot + gradient "loading…" text using marquee animation
- No "use client" needed (server component)

## admin/* — Removed
- The admin dashboard (product CRUD UI) was removed; admin role infrastructure is preserved in `middleware.ts` (`ADMIN_ONLY`, `profile.role !== "admin"` check) and `profiles.role`, so reintroducing the dashboard later only needs the routes/components back.
