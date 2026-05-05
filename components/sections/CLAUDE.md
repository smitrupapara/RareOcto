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
- **Layout**: full-screen **horizontal pinned scroll** — section is pinned by GSAP while `<ol>` slides left; each step occupies `100vw`
- **Refs**: `sectionRef` (pinned section), `trackRef` (`<ol>` element that translates)
- **State**: `activeStep: number` — updated by ScrollTrigger `onUpdate` for progress dots
- **GSAP**: `gsap.to(track, { x: -(scrollWidth - innerWidth), scrollTrigger: { pin: true, scrub: 1, invalidateOnRefresh: true } })`
- **Track width**: `style={{ width: \`${STEPS.length * 100}vw\` }}` — set inline; each `<li>` is `w-screen flex-shrink-0`
- **Section layout**: `h-screen flex flex-col overflow-hidden isolate`; `<ol>` is `flex min-h-0 flex-1 will-change-transform`
- **Progress dots**: coral pill `w-8` for active step, `w-1.5 bg-foreground/20` for inactive; inline `style` for `var(--coral)` (not Tailwind class — avoids purge)
- **Benefits row**: placed OUTSIDE the pinned `<section>`, in the outer `<div id="how-it-works">` wrapper — renders after the pin releases
- **Watermark**: static (no scroll animation), positioned absolute inside section
- **Step type**: no `align` field (removed — not needed for horizontal layout)
- **3 steps**: "Mount the base", "Snap the art", "Swap the vibe"
- **SVG illustrations**: `PrimerArt`, `SnapArt`, `SwapArt` — inline private components, OKLCH token colors

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
- **Layout**: 2-col grid — brand block (Logo + tagline + "Made in India") + 3-col link groups
- **Link groups**: Shop (`/catalog`, `/try-on`, `/catalog?gift=1`), RareOcto (`/about`, `/about#materials`, `/about#contact`), Help (`/about#shipping`, `/about#returns`, `/about#faq`)
- **Coral accent**: 1px gradient line at top border (`via-coral/60`)
- **Legal strip**: copyright (dynamic year) + Privacy/Terms/Shipping links
