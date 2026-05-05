# components/providers — Reference

## smooth-scroll-provider.tsx
- **Export**: `SmoothScrollProvider({ children })` — client component, wraps `app/layout.tsx` body
- **Library**: `lenis` with `smoothWheel: true`, `duration: 1.15`, custom easing
- **RAF loop**: uses `requestAnimationFrame` directly (`lenis.raf(time)`) — NOT connected to `gsap.ticker`
- **Reduced motion**: bails out early if `prefers-reduced-motion: reduce`
- **IMPORTANT**: Lenis and GSAP ScrollTrigger run independently. ScrollTrigger listens to native scroll events; Lenis intercepts them for smooth interpolation. To connect them properly, you would need to add `lenis.on('scroll', ScrollTrigger.update)` — this is NOT currently done. This is acceptable for most uses but can cause subtle sync issues at high scroll speeds.
- **Cleanup**: cancels RAF + calls `lenis.destroy()` on unmount

## theme-provider.tsx
- **Export**: `ThemeProvider({ children })` — client component wrapping `next-themes` `ThemeProvider`
- **Config**: `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`
- **Status**: created but NOT used in `app/layout.tsx` — theme is managed via direct DOM manipulation in `SiteNav` instead (next-themes had React 19 compatibility issues)
- **Do not add to layout** unless next-themes compatibility with React 19 is confirmed working
