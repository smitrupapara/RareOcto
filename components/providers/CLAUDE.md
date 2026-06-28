# components/providers — Reference

## Smooth scroll — REMOVED (native scroll only)
- The site previously wrapped `app/layout.tsx` in a `SmoothScrollProvider` backed by **Lenis** (virtual smooth-scroll driven by the GSAP ticker, `lerp: 0.1`). **It was removed** because it caused three intrinsic bugs: (1) the page got stuck partway down on tall pages (Lenis under-measured the scroll height vs the real bottom — worst on `/catalog`); (2) after a fast flick to the bottom you couldn't scroll back up until the `lerp` boundary-overshoot bled off ("wait before reversing"); (3) the how-it-works horizontal slider trapped the page (its `data-lenis-prevent` track + edge-bail wheel handler left no path to scroll vertically at the edges, and Lenis snapped the page back).
- **Now: plain native browser scrolling.** No provider, no `window.__lenis`, no `data-lenis-prevent`, no Lenis reset CSS, `lenis` removed from `package.json` + `next.config.ts` `transpilePackages`. Native scroll knows the true page height (no stuck-midway), reverses instantly, and nested scrollers (the how-it-works track, Select dropdowns) hand off at their edges naturally.
- **GSAP / ScrollTrigger still work** — they operate on native scroll directly; each consuming component still calls `gsap.registerPlugin(ScrollTrigger)` itself (hero-section, how-it-works). Nothing else was needed from the old provider.
- **Anchor links**: `SiteNav.scrollToAbout` uses native `document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" })` (was `window.__lenis.scrollTo`).
- **Do NOT reintroduce Lenis** without solving all three failure modes above — the down-then-up lock in particular is inherent to inertial smoothing near a boundary.

## theme-provider.tsx
- **Export**: `ThemeProvider({ children })` — client component wrapping `next-themes` `ThemeProvider`
- **Config**: `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- **Status**: created but NOT used in `app/layout.tsx` — theme is managed via direct DOM manipulation in `SiteNav` instead (next-themes had React 19 compatibility issues)
- **Do not add to layout** unless next-themes compatibility with React 19 is confirmed working
