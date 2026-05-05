# app — Reference

## layout.tsx (root)
- Fonts: `Geist` (→ `--font-geist-sans`), `Geist_Mono` (→ `--font-geist-mono`), `Bricolage_Grotesque` (→ `--font-bricolage`, weights 400–800)
- CSS vars used in Tailwind: `font-sans` → Geist, `font-mono` → GeistMono, `font-display` → Bricolage
- `<html>`: applies all three font variables + `h-full`, `suppressHydrationWarning` (Grammarly ext compat)
- `<head>`: contains a synchronous inline `<script>` that reads `localStorage('theme')` and adds `class="dark"` to `<html>` before first paint — prevents FOUC on dark-mode reload. Falls back to `prefers-color-scheme: dark` if no stored value.
- `<body>`: `suppressHydrationWarning` — Grammarly injects `data-gr-*` attributes causing hydration mismatch without this
- Wraps everything in `SmoothScrollProvider` (no ThemeProvider — theme is managed via direct DOM manipulation)
- `siteUrl`: `NEXT_PUBLIC_SITE_URL` env var, falls back to `"https://rareocto.com"`
- OG image: `/og.png` (1200×630), theme colors for light/dark

## globals.css — Dark mode
- Dark mode is **class-based**: add `class="dark"` to `<html>` to activate
- Light vars on `:root`, dark vars on `.dark` — both specificity 0,1,0; `.dark` wins because it comes later
- No `@custom-variant dark` — do NOT add it; it caused Tailwind PostCSS to hang on compile
- Color palette: navy/blue brand theme — `--ink` (navy), `--cream` (off-white), `--coral` (brand blue CTA), `--marigold` (steel-sky blue), `--sea` (deep navy)

## (public)/layout.tsx
- Wraps all public pages: `/`, `/catalog`, `/try-on`, `/about`
- Structure: `flex min-h-screen flex-col` → `<SiteNav />` → `<main flex-1>` → `<SiteFooter />`
- Server component (no "use client")

## (public)/page.tsx — Home (`/`)
- Renders `<HeroSection />` then `<HowItWorks />`
- Static prerender (no dynamic data)
- Metadata: title "RareOcto — Stick. Peel. Repeat."

## (public)/catalog/page.tsx — Catalog (`/catalog`)
- Placeholder — no products yet (blocked on Supabase env vars)
- Shows Logo + "The catalog." headline + "Something rare is dropping soon." + back-home button
- Static prerender

## not-found.tsx
- On-brand 404: "This page peeled off." / "404 — wall not found"
- `Button asChild` → `Link href="/"` back home

## error.tsx (`"use client"`)
- Global error boundary: logs error, shows reset button + back-home link
- "Eight arms, one knot." heading

## loading.tsx
- Animated loading state: pulsing dot + gradient "loading…" text using marquee animation
- No "use client" needed (server component)
