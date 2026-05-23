# RareOcto — Project Outline

Internal working doc. One place to see every section/feature, where the code lives, what state it's in, and what's missing. Update as features ship — don't rewrite.

**Status legend:** ✅ Built · 🚧 Stubbed (placeholder/partial) · 📋 Planned (not started)

**Companion docs:** [`docs/auth-setup.md`](./auth-setup.md) — full WhatsApp-OTP setup steps.

---

## 1. Overview

RareOcto is a Made-in-India direct-to-consumer brand for **peel-and-stick magnetic wall art**. The product line solves the pain points of traditional wallpaper — no nails, no glue, no residue, reusable base sheet, swap designs in minutes. Founded by Yash Bhanderi, based in Ahmedabad.

The web app is a Next.js storefront. Current stage: pre-launch — animated landing page is live, auth flow is wired (pending MSG91 credentials), product catalog and try-on tool are next.

---

## 2. Tech stack

Strategic stack with the *why* behind each pick. Status reflects whether it's wired in today.

### Framework & UI
- **Next.js 16.2.4** ✅ — App Router + Server Components. Same codebase serves public site, admin dashboard, and API routes. SEO matters because global English-speaking buyers will Google "magnetic wallpaper India". *Originally specced as Next 15; project shipped on 16.*
- **React 19.2.4 + TypeScript 5 strict** ✅ — Latest React with stable Actions API and Server Component improvements. Strict mode catches drift early.
- **Tailwind CSS 4.2.4** ✅ — New engine, zero config, ~10× faster than v3. Class-based dark mode (no `next-themes`) via DOM script in `app/layout.tsx`. OKLCH brand palette: `--ink`, `--cream`, `--coral`, `--marigold`, `--sea`.
- **shadcn/ui (base-nova)** ✅ — Components copied into `components/ui/`, not installed as a dependency. We own the code, so the bold-artistic look isn't fighting an opinionated library. Also the de-facto standard v0 generates against, so prototypes translate cleanly.
- **lucide-react** ✅ — Icon set, consistent stroke weight, tree-shakeable.
- **Fonts** ✅ — Geist (sans) + Geist Mono + Bricolage Grotesque (display, 400–800).
- **Forms** ✅ — `react-hook-form` + `zod` + `@hookform/resolvers/zod`. Used in `components/auth/login-form.tsx` and `onboarding-form.tsx`.

### Animation
- **GSAP 3.15 + ScrollTrigger** ✅ — Frame-by-frame scroll control, perfect for the planned octopus scroll narrative and the pinned-horizontal How-It-Works section. The gold-standard for Awwwards-style sites.
- **Lenis 1.3** ✅ — Buttery smooth scroll that makes the site feel premium. Wrapped in `components/providers/smooth-scroll-provider.tsx`. *Gap: Lenis ↔ ScrollTrigger sync not wired yet.*
- **Framer Motion 12** ✅ — Available for component-level micro-interactions; GSAP handles narrative/scroll work.

### Backend, data, auth
- **Supabase** ✅ — Replaces Shopify + Sanity in the original stack. With 30–100 designs and a manual dashboard, Shopify's ₹3,237/month is overkill — you're paying for inventory automation you don't need. Supabase covers four roles in one platform on a generous free tier:
  1. **Auth** ✅ — Phone OTP via built-in `signInWithOtp` (`@supabase/ssr` 0.10, `@supabase/supabase-js` 2.105). See section 5.
  2. **Postgres DB** 🚧 — Catalog, user accounts, orders, saved previews. Only `profiles` migrated so far; others typed but not in DB. See section 6.
  3. **Storage** 📋 — PNG files of saved try-on previews. Bucket not created yet.
  4. **Edge functions** 🚧 — Razorpay webhook receiver + transactional email triggers. WhatsApp OTP function is the only one shipped (`supabase/functions/send-whatsapp-otp/`).
- **MSG91 (WhatsApp)** 🚧 — India-first OTP delivery. Wired to Supabase via Send-SMS-Hook → Deno edge function. Pending live credentials (see section 5 and `docs/auth-setup.md`).

### Try-on tool (planned)
- **TensorFlow.js + DeepLab v3** 📋 — In-browser wall-surface segmentation, pre-trained on millions of indoor scenes. Decent for typical rooms; always paired with a manual corner-drag fallback for edge cases. No deps installed yet.
- **Fabric.js** 📋 — Canvas engine that takes wall coordinates from TF.js and warps/overlays the wallpaper onto the wall photo. Fully client-side, no server compute. No deps installed yet.

### Commerce & ops (planned, partly scaffolded)
- **Razorpay** 📋 — India focus: UPI, Indian cards, net banking, EMI. Strong Next.js docs and webhook support. `orders` table already has `razorpay_order_id` + `razorpay_payment_id` slots (`types/database.ts`). Webhook handler will live in a Supabase edge function. *Add Stripe later only if global sales pick up.*
- **Cloudinary** 🚧 — Wallpaper catalog images. Auto-converts to WebP/AVIF, serves device-right sizes via global CDN — critical for India + international audience. `next-cloudinary` 6.17 installed; `lib/cloudinary/loader.ts` scaffolded but no `<Image loader={...}>` usage yet. Domains whitelisted in `next.config.ts`.
- **Resend** 📋 — Transactional emails (order confirmation, shipping updates). Cleaner API than SendGrid, right scale for our volume. Will be called from a Supabase edge function on order state changes.
- **Shiprocket** 📋 — Indian shipping aggregator (Delhivery, Blue Dart, etc.). One API for pickup, label generation, tracking. Wired after first paid orders flow.

### Infra
- **Vercel** 📋 — Hosting. Free tier covers year-one traffic comfortably. Same team as Next.js, one-click deploy. Not deployed yet.
- **GitHub** ✅ — Version control. Auto-deploy to Vercel on push once Vercel is wired.
- **Sentry** 📋 — Production error tracking with full stack traces and release tagging. Not installed yet.

### Scripts
`npm run dev | build | start | lint`

---

## 3. Routes map

| Route | Group | Status | File |
|---|---|---|---|
| `/` | `(public)` | ✅ | `app/(public)/page.tsx` |
| `/catalog` | `(public)` | ✅ grid + search + filters (no products in DB yet) | `app/(public)/catalog/page.tsx` |
| `/catalog/[slug]` | `(public)` | ✅ gallery, buy box, reviews, JSON-LD | `app/(public)/catalog/[slug]/page.tsx` |
| `/cart` | `(public)` | ✅ protected | `app/(public)/cart/page.tsx` |
| `/account/favorites` | `(public)` | ✅ protected | `app/(public)/account/favorites/page.tsx` |
| `/try-on` | `(public)` | 📋 protected | — |
| `/about` | `(public)` | 📋 | — |
| `/blog` | `(public)` | 📋 | — |
| `/login` | `(auth)` | ✅ | `app/(auth)/login/page.tsx` |
| `/onboarding` | `(auth)` | ✅ protected | `app/(auth)/onboarding/page.tsx` |
| `/account` | — | 📋 protected | — |
| `/admin` | — | ✅ role-gated → redirects to `/admin/products` | `app/admin/page.tsx` |
| `/admin/products` | — | ✅ role-gated list | `app/admin/products/page.tsx` |
| `/admin/products/new` | — | ✅ role-gated create form | `app/admin/products/new/page.tsx` |
| `/admin/products/[id]/edit` | — | ✅ role-gated edit + delete | `app/admin/products/[id]/edit/page.tsx` |
| `/sitemap.xml` | — | ✅ | `app/sitemap.ts` |
| `/robots.txt` | — | ✅ | `app/robots.ts` |

Global states: `app/error.tsx` (✅), `app/loading.tsx` (✅), `app/not-found.tsx` (✅).

Auth routing logic lives in `middleware.ts` (`PROTECTED = ["/account","/onboarding","/try-on","/cart","/admin"]`, `AUTH_ONLY = ["/login"]`, `ADMIN_ONLY = ["/admin"]`). It includes an incomplete-profile bounce to `/onboarding` when `profiles.name IS NULL`, and redirects non-admin users away from `/admin/*` to `/`.

---

## 4. Landing page sections

Order on `/` is: Hero → HowItWorks → OurVision → AboutUs ([`app/(public)/page.tsx:13`](../app/(public)/page.tsx)).

### Hero · ✅
Purpose: Brand-defining first impression — animated headline ("Stick. Peel. Repeat."), rotating orbit rings around static logo, parallax blob, two CTAs ("Shop the catalog", "Try it on your wall"), 200+/0/48h stats row, marquee strip.
Files: `components/sections/hero-section.tsx`
Notes: GSAP entrance timeline + continuous animations; respects `prefers-reduced-motion`. "Try it on your wall" CTA links to `/try-on` which is not built — clicking it triggers the middleware login redirect.

### How It Works · ✅
Purpose: Educate visitor on the 4-step install flow (Prepare → Install base sheet → Apply design → Replace anytime), then list 4 benefits (no wall damage / zero residue / reusable base / no tools).
Files: `components/sections/how-it-works.tsx`
Notes: Horizontal pinned-scroll via GSAP ScrollTrigger. Lenis ↔ ScrollTrigger sync is **not** wired — fine on desktop, may feel mismatched on touch.

### Our Vision · ✅
Purpose: "Built in India. Built for the world." — positioning statement on becoming the leading Made-in-India magnetic solutions brand.
Files: `components/sections/our-vision.tsx`
Notes: Server component, static content.

### About Us · ✅
Purpose: Founder portrait (Yash Bhanderi) + brand origin story — why traditional wallpaper is broken and what RareOcto fixes.
Files: `components/sections/about-us.tsx`, `public/Yash.webp`
Notes: Server component. Used as scroll anchor from nav "About" link until `/about` ships.

### Site Nav · ✅
Purpose: Sticky top header — Logo + brand mark, Catalog/About links, theme toggle, profile dropdown (authed) or Login button.
Files: `components/sections/site-nav.tsx`, `components/sections/logo.tsx`, `components/ui/sheet.tsx` (mobile drawer), `components/ui/dropdown-menu.tsx`
Notes: Theme toggle uses **direct DOM manipulation + `localStorage('theme')`** — not `next-themes` (React 19 compat issue). Backdrop blurs after 24px scroll. Mobile uses right-side Sheet drawer.

### Site Footer · ✅
Purpose: Brand details, navigation, contact info (hello@rareocto.com · +91 98240 83085 · B-911 Titanium City Center, Ahmedabad), legal/GST.
Files: `components/sections/site-footer.tsx`
Notes: 3-column grid. "Coming Soon" column lists Try-On / About / Blog.

---

## 5. Authentication — WhatsApp OTP

Two-step flow: phone → OTP. WhatsApp delivery routed via MSG91 from a Supabase Send-SMS-Hook edge function. After verify, incomplete profiles bounce to `/onboarding`.

### Login form (two-step) · ✅
Purpose: Phone input (locked +91, 10 digits) → 6-digit OTP with 30s resend countdown.
Files: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `components/auth/login-form.tsx`
Server actions: `requestOtp` and `verifyOtp` in `app/(auth)/login/actions.ts`.

### Onboarding · ✅
Purpose: Capture name (required, 2–60 chars) + email (optional) immediately after first login; redirect home when complete.
Files: `app/(auth)/onboarding/page.tsx`, `app/(auth)/onboarding/actions.ts`, `components/auth/onboarding-form.tsx`
Server action: `completeProfile`.

### Server helpers · ✅
Files: `lib/auth.ts` — `getCurrentUser`, `getCurrentProfile`, `requireUser` (redirect-to-login with `?next=`), `safeNext` (validates redirect targets); `lib/auth-actions.ts` — `signOut`.

### Middleware · ✅
Files: `middleware.ts`
Notes: Sets `x-pathname` header so `requireUser()` can construct redirects; refreshes Supabase session every request via `updateSession`; redirects unauth users away from `PROTECTED` and authed users away from `AUTH_ONLY`; bounces null-name profiles to `/onboarding`.

### Supabase clients · ✅
Files: `lib/supabase/server.ts` (SSR + admin), `lib/supabase/client.ts` (browser), `lib/supabase/middleware.ts` (session refresh).

### MSG91 edge function · 🚧
Purpose: Receive Supabase Send-SMS-Hook payload, verify HMAC, forward OTP via MSG91 WhatsApp template.
Files: `supabase/functions/send-whatsapp-otp/index.ts`, `supabase/functions/deno.json`, `supabase/functions/tsconfig.json`, `supabase/functions/types.d.ts`
Notes: Code complete. **Pending:** MSG91 credentials (`MSG91_AUTH_KEY`, `MSG91_WHATSAPP_NUMBER`, `MSG91_TEMPLATE_NAME`, `MSG91_TEMPLATE_NAMESPACE`) need to be set in Supabase function secrets before live messages flow. `SEND_SMS_HOOK_SECRET` auto-set on hook registration. Full setup steps in [`docs/auth-setup.md`](./auth-setup.md).

### Auth-gated CTA · ✅
Purpose: Wrap any action button (e.g. Add to Cart) so unauth users get bounced to login with `?next=<path>` preserved.
Files: `components/auth/auth-gated-button.tsx`

---

## 6. Data layer

### Schema (live in DB) — `profiles`
Live migration: `supabase/migrations/0001_init_auth.sql`
- Columns: `id` (uuid, PK → `auth.users.id`), `phone` (unique), `email`, `name`, `role` (enum, default `user`), `created_at`
- RLS: select + update own row
- Trigger: `handle_new_user()` auto-inserts a profile row on `auth.users` insert, copying the phone

### Schema (typed, not migrated)
Defined in [`types/database.ts`](../types/database.ts), no migrations yet:
- `products` — `id, slug, name, description, category, base_price, images[], available_sizes[], stock, created_at`
- `cart_items` — `id, user_id, product_id, size, quantity`
- `saved_previews` — `id, user_id, product_id, wall_image_url, composited_image_url, created_at`
- `orders` — `id, user_id, items[], total, address, status, razorpay_order_id, razorpay_payment_id, created_at`

### Enums (live)
`role` (user/admin) · `product_size` (S/M/L) · `category` (abstract/botanical/geometric/mural/kids/minimal) · `order_status` (created/pending/paid/shipped/delivered/cancelled/refunded).

### Types
- `types/database.ts` — hand-written Supabase `Database` envelope (not yet auto-generated from `supabase gen types`)
- `types/index.ts` — re-exports + `NavLink` interface

---

## 7. Planned features

### `/catalog` product listing · 🚧
Server-rendered grid + URL-driven search/filters/pagination is built ([`docs/catalog-setup.md`](./catalog-setup.md), Phase 3). Awaiting product seed (Phase 9) — empty state shows "Nothing matched" until rows land.
Files: `app/(public)/catalog/page.tsx`, `components/catalog/{product-card,product-grid,catalog-search,catalog-filters,catalog-pagination}.tsx`, `lib/catalog/{queries,search,format}.ts`

### `/try-on` wall preview tool · 📋
Upload-a-wall-photo → segment wall surface → composite a chosen design onto it → save preview. Protected route (already in `middleware.ts:6`).
Stack: **TensorFlow.js + DeepLab v3** for in-browser wall segmentation, **Fabric.js** for the canvas warp/overlay (both client-side, zero server compute). Manual corner-drag fallback for when ML fails on tricky rooms.
Depends on: `saved_previews` migration, Supabase storage bucket for PNG output, design-asset URLs from the catalog.

### `/account` profile management · 📋
View phone/name/email/role/created_at; edit name + email; trigger phone change flow; sign out. Protected. No design yet.

### `/about` standalone page · 📋
Currently a scroll anchor to the `AboutUs` section on home. Promote to a real page when there's more brand content (team, press, sustainability).

### `/blog` · 📋
Listed in footer "Coming Soon" — no decision yet on MDX vs CMS vs Supabase table.

### Cart + checkout + Razorpay · 📋
`orders` table already has `razorpay_order_id` + `razorpay_payment_id` slots. Need: cart UI wired to `cart_items`, checkout server action, Razorpay order creation, **webhook handler in a Supabase edge function** for payment verification, order confirmation page. India-first methods: UPI, cards, net banking, EMI.

### Transactional email (Resend) · 📋
Order confirmation, shipping updates, account events. Triggered from Supabase edge functions on order state changes. Templates not designed yet.

### Shipping (Shiprocket) · 📋
Pickup, label generation, tracking across Indian couriers (Delhivery, Blue Dart, etc.) via one API. Wires up after first paid orders flow.

### Error tracking (Sentry) · 📋
Production stack traces with release tagging. Wire into `app/error.tsx` boundary, server actions, and edge functions.

### Admin dashboard · 📋
`role: 'admin'` enum value exists; no UI, no permission middleware, no admin routes. Likely scope: product CRUD, order list/status updates, profile lookups.

### Rate limiting on OTP · 📋
Currently relies on Supabase defaults. Plan: per-phone + per-IP throttle in the edge function or middleware before calling `signInWithOtp`.

### Account edit form, E2E tests (Playwright) · 📋
Out-of-scope from initial auth shipment. Tracked in [`docs/auth-setup.md`](./auth-setup.md) "Out of scope" list.

---

## 8. Infra & ops

### Environment variables
**Public (committed in `.env.example` if added):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (defaults to `https://rareocto.com`)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (optional)

**Server-only (Vercel project secrets):**
- `SUPABASE_SERVICE_ROLE_KEY`

**Supabase function secrets (set via `supabase secrets set`):**
- `MSG91_AUTH_KEY`, `MSG91_WHATSAPP_NUMBER`, `MSG91_TEMPLATE_NAME`, `MSG91_TEMPLATE_NAMESPACE`
- `SEND_SMS_HOOK_SECRET` (Supabase auto-sets on hook registration)

### Image domains
Configured in [`next.config.ts`](../next.config.ts): Cloudinary, Unsplash, Supabase storage buckets. Formats: AVIF + WebP.

### Animation stack
- `components/providers/smooth-scroll-provider.tsx` — Lenis RAF loop, exposes `window.__lenis` for programmatic `scrollTo`
- GSAP + ScrollTrigger transpiled via `next.config.ts` `transpilePackages`
- `components/providers/theme-provider.tsx` exists but is **not** wrapped into `app/layout.tsx`

### Dark mode
Activated by `class="dark"` on `<html>`. A synchronous inline script in `app/layout.tsx` reads `localStorage('theme')` before first paint to avoid FOUC; falls back to `prefers-color-scheme: dark`. Toggled by `site-nav.tsx`.

### Deployment
Target: **Vercel** (Next.js host) + **Supabase** (DB + auth + edge functions). No CI configured yet.

---

## 9. Known gaps / tech debt

- `README.md` is still create-next-app boilerplate — replace or remove
- `next-themes` is installed (`package.json:25`) but unused; theme is DOM-managed instead
- `theme-provider.tsx` exists but is not mounted in any layout
- `components/ui/navigation-menu.tsx` imported nowhere
- `lib/cloudinary/loader.ts` scaffolded but no `<Image loader={...}>` usage
- Lenis ↔ GSAP ScrollTrigger not bridged (`lenis.on('scroll', ScrollTrigger.update)` missing)
- Supabase types are hand-written; not generated via `supabase gen types typescript`
- No CI, no tests (unit or E2E)
- `app/CLAUDE.md` says `/` renders only Hero + HowItWorks — actual page renders 4 sections. Keep CLAUDE.md in sync as sections change.

---

## 10. How to run

```bash
npm install
# create .env.local with the public + service-role vars from section 8
npm run dev   # http://localhost:3000
```

For the WhatsApp OTP path end-to-end (Supabase project + MSG91 account + edge-function deploy + Send-SMS-Hook), follow [`docs/auth-setup.md`](./auth-setup.md) phase-by-phase.

**Build sanity:**
```bash
npm run lint
npm run build
```
