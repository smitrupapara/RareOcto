# components/sections — Reference

## logo.tsx
- **Export**: `Logo({ className? })`
- Renders `<Image src="/logo.webp" width={512} height={512} priority />` via `next/image`
- Intrinsic size 512×512; display size entirely controlled by `className` (e.g. `h-10 w-10`)
- `object-contain` always applied via `cn()`
- Usage: `<Logo className="h-10 w-10" />` — no other changes needed at call sites

## hero-section.tsx
- **Export**: `HeroSection()` — client component
- **Refs**: `rootRef` (section), `orbitRef` (rotating ring), `blobRef` (coral blob)
- **GSAP pattern**: `gsap.context(fn, rootRef)` with `ctx.revert()` on cleanup
- **Targeting**: data-attributes only — never ref arrays (prevents stale-ref bug on client-side navigation)
  - `data-hero-eyebrow` — pill badge
  - `data-hero-h1` — the h1 wrapper (used for scroll parallax)
  - `[data-hero-word]` — inner word spans inside overflow:hidden containers (entrance animation only)
  - `data-hero-sub` — subtitle paragraph
  - `data-hero-cta` — CTA button row
- **Entrance timeline**: eyebrow → words stagger (y:110%→0) → sub → cta → orbit (back.out)
- **Continuous**: orbit ring rotates 360° / 28s, repeat:-1
- **Scroll parallax**: blob yPercent:-20 scrub on `data-hero-h1` (NOT on word spans — moving word spans inside overflow:hidden clips them)
- **Words**: `HERO_WORDS = ["Stick.", "Peel.", "Repeat."]` — index 1 ("Peel.") gets coral→marigold gradient
- **Marquee strip** at bottom: static CSS animation, no GSAP

## how-it-works.tsx
- **Export**: `HowItWorks()` — client component
- **Layout**: a **user-driven horizontal slider** (NOT pinned/forced scroll) — `<ol>` is a `snap-x snap-mandatory overflow-x-auto` track; each `<li>` is `w-full shrink-0 snap-center`. The page scrolls normally; this section never traps the user.
- **Refs**: `sectionRef`, `headlineRef`, `trackRef` (the scrollable `<ol>`), `benefitsRef`
- **State**: `active: number` — current step, derived in `handleScroll` from `Math.round(scrollLeft / clientWidth)`
- **Navigation**: prev/next `ChevronLeft`/`ChevronRight` buttons (absolute, flank the track, `disabled` at the ends) + clickable progress dots; both call `goTo(i)` → `track.scrollTo({ left: i * clientWidth, behavior: "smooth" })`
- **No vertical-wheel hijack**: we deliberately do NOT map `deltaY → scrollLeft`. That conversion is a scroll trap — on any middle/last step a vertical scroll just walks the slider sideways instead of moving the page, so scrolling up "does nothing" until you reverse through every step. Horizontal nav is arrows + dots + touch-drag + native sideways/trackpad scroll (`deltaX` on `overflow-x-auto`, no JS). Vertical page scroll is never intercepted. (Lenis already removed, scroll is native; see [[components-providers]])
- **Resize**: re-aligns `scrollLeft` to `active * clientWidth` on viewport resize
- **GSAP**: entrance reveals ONLY (headline + benefits stagger, `once: true`) — the pinned/scrubbed ScrollTrigger was removed (it fought Lenis and caused the down-then-up scroll lock)
- **Custom images**: each step has an `image: "/how-it-works/step-N.webp"` field. `StepArt` layers a plain `<img>` (eslint-disabled `no-img-element` — intentional, user-managed asset) over the inline SVG fallback; the image fades in only on `onLoad`, and `onError` removes it, so a missing/not-yet-added file simply shows the SVG with no broken-image flash
- **Progress dots**: coral pill `w-8` for active step, `w-2.5 bg-foreground/20` for inactive; inline `style` for `var(--coral)` (not a Tailwind class — avoids purge)
- **Benefits row**: still OUTSIDE the `<section>`, in the outer `<div id="how-it-works">` wrapper
- **4 steps**: "Prepare the surface.", "Install the base sheet.", "Apply your design.", "Replace anytime."
- **SVG illustrations**: `PrepArt`, `BaseArt`, `PlaceArt`, `ReplaceArt` — inline private components, CSS-var token colors (`--coral`, `--marigold`, `--sea`, `--ink`, `--cream`)

## site-nav.tsx
- **Export**: `SiteNav()` — client component
- **State**: `scrolled` (blur backdrop at scroll > 24px), `open` (mobile sheet), `isDark` (tracks `<html>` dark class)
- **Theme toggle**: Sun/Moon button in right actions — directly calls `document.documentElement.classList.toggle('dark', next)` and writes to `localStorage('theme')`; `MutationObserver` on `<html>` keeps `isDark` in sync
- **`isDark` init**: `useState(false)` — reads actual DOM state in `useEffect` after hydration; `false` on SSR avoids hydration mismatch. Brief icon flash on dark-mode load is acceptable.
- **Desktop nav**: hidden below md, plain Link pills with hover:bg-accent/40
- **Mobile nav**: `Sheet` (right drawer) triggered by Menu icon, hidden above md
  - All links wrapped in `SheetClose asChild` so drawer closes on navigation
  - CTA "Shop the catalog" at bottom of drawer
- **Right actions** (left to right): theme toggle, cart icon (ghost), Login (ghost, hidden xs), Shop CTA (hidden below md)
- **`NAV_LINKS`**: `[{href:"/catalog"}, {href:"/try-on"}, {href:"/about"}]`
- **asChild usage**: `Button asChild` wraps `Link` — uses Radix Slot bridge in button.tsx
- **No next-themes dependency** — toggle is pure DOM; `useTheme` was removed after React 19 / next-themes compat issues

## site-footer.tsx
- **Export**: `SiteFooter()` — server component (no "use client")
- **Layout**: 2-col grid — brand block (Logo + tagline + "Shipped worldwide") + 3-col link groups
- **Link groups**: Shop (`/catalog`, `/try-on`, `/catalog?gift=1`), RareOcto (`/about`, `/about#materials`, `/about#contact`), Help (`/about#shipping`, `/about#returns`, `/about#faq`)
- **Coral accent**: 1px gradient line at top border (`via-coral/60`)
- **Legal strip**: copyright (dynamic year) + Privacy/Terms/Shipping links
