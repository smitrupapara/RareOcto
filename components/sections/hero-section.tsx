"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

const HERO_WORDS = ["Stick.", "Peel.", "Repeat."];

export function HeroSection() {
  const rootRef = useRef<HTMLElement | null>(null);
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const blobRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Query live DOM within the context scope — never stale
      const words = gsap.utils.toArray<HTMLElement>("[data-hero-word]");
      const eyebrow = rootRef.current!.querySelector<HTMLElement>("[data-hero-eyebrow]");
      const sub = rootRef.current!.querySelector<HTMLElement>("[data-hero-sub]");
      const cta = rootRef.current!.querySelector<HTMLElement>("[data-hero-cta]");

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(eyebrow, { y: 24, opacity: 0, duration: 0.7 })
        .from(
          words,
          { y: "110%", rotate: 6, opacity: 0, duration: 1.05, stagger: 0.12 },
          "-=0.3",
        )
        .from(sub, { y: 18, opacity: 0, duration: 0.7 }, "-=0.5")
        .from(cta, { y: 18, opacity: 0, duration: 0.6 }, "-=0.45")
        .from(
          orbitRef.current,
          { scale: 0.7, opacity: 0, rotate: -25, duration: 1.1, ease: "back.out(1.6)" },
          "-=0.95",
        )
        .from(
          logoRef.current,
          { scale: 0.4, opacity: 0, duration: 0.85, ease: "back.out(2)" },
          "<0.15",
        );

      gsap.to(orbitRef.current, {
        rotate: 360,
        duration: 28,
        ease: "none",
        repeat: -1,
      });

      gsap.to(blobRef.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      const h1 = rootRef.current!.querySelector<HTMLElement>("[data-hero-h1]");
      gsap.to(h1, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.4,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative isolate overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16 lg:pb-36 lg:pt-20"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background-image:linear-gradient(var(--ink)_1px,transparent_1px),linear-gradient(90deg,var(--ink)_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.05] dark:opacity-[0.08]"
      />
      <div
        ref={blobRef}
        aria-hidden
        className="absolute -top-32 left-1/2 -z-10 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-coral/40 blur-3xl will-change-transform sm:h-[800px] sm:w-[800px]"
      />
      <div
        aria-hidden
        className="absolute right-[-10%] top-[35%] -z-10 h-[420px] w-[420px] rounded-full bg-marigold/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute left-[-10%] bottom-[-10%] -z-10 h-[420px] w-[420px] rounded-full bg-sea/25 blur-3xl"
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.45fr_1fr] lg:gap-10 lg:px-8">
        <div className="flex flex-col justify-center">
          <p
            data-hero-eyebrow
            className="inline-flex items-center gap-2 self-start rounded-full border border-foreground/15 bg-background/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.32em] text-foreground/70 backdrop-blur"
          >
            <Sparkles className="size-3.5 text-coral" />
            magnetic wallpaper · india · drops monthly
          </p>

          <h1 data-hero-h1 className="mt-6 font-display text-[clamp(3.5rem,11vw,8.5rem)] font-bold leading-[0.85] tracking-[-0.04em]">
            {HERO_WORDS.map((word, i) => (
              <span key={word} className="block overflow-hidden pb-[0.04em]">
                <span
                  data-hero-word
                  className={
                    i === 1
                      ? "inline-block bg-gradient-to-br from-coral via-marigold to-coral bg-clip-text text-transparent"
                      : "inline-block"
                  }
                >
                  {word}
                </span>
              </span>
            ))}
          </h1>

          <p
            data-hero-sub
            className="mt-7 max-w-xl text-pretty text-base text-foreground/80 sm:text-lg"
          >
            Statement art that clings to any flat surface — no nails, no
            adhesive, no apology. Re-style your wall like you swap playlists.
          </p>

          <div
            data-hero-cta
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button asChild size="lg" className="group h-14 rounded-full px-7 text-base">
              <Link href="/catalog">
                Shop the catalog
                <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-foreground/20 px-7 text-base hover:border-foreground/60"
            >
              <Link href="/try-on">Try it on your wall</Link>
            </Button>
          </div>

          <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-foreground/10 pt-8">
            {[
              { k: "200+", v: "rare prints" },
              { k: "0", v: "nails needed" },
              { k: "48h", v: "ships pan-india" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-3xl font-bold leading-none">{s.k}</dt>
                <dd className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="relative aspect-square w-full max-w-[460px]">
            {/* Rotating orbit — rings + floating labels only */}
            <div
              ref={orbitRef}
              className="absolute inset-0 will-change-transform"
            >
              <div className="absolute inset-0 rounded-full border border-dashed border-foreground/15" />
              <div className="absolute inset-6 rounded-full border border-dashed border-foreground/10" />
              <div className="absolute inset-14 rounded-full bg-gradient-to-br from-coral/30 via-marigold/20 to-sea/30 blur-2xl" />

              {[
                { label: "peel", angle: 12 },
                { label: "stick", angle: 132 },
                { label: "repeat", angle: 252 },
              ].map(({ label, angle }) => (
                <span
                  key={label}
                  style={{ transform: `rotate(${angle}deg) translate(0, -210px) rotate(-${angle}deg)` }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/15 bg-background/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70 backdrop-blur"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Static logo — sits above the orbit, never rotates */}
            <div ref={logoRef} className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
              <Logo className="h-44 w-44 drop-shadow-[0_18px_40px_color-mix(in_oklch,var(--coral)_35%,transparent)] sm:h-56 sm:w-56" />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-16 flex select-none overflow-hidden border-y border-foreground/10 py-3 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      >
        <div className="flex shrink-0 animate-[marquee_28s_linear_infinite] gap-12 pr-12 font-display text-3xl font-bold tracking-tight">
          {Array.from({ length: 2 }).flatMap((_, group) =>
            ["No nails.", "No glue.", "No regrets.", "Just stick.", "Just peel.", "Just art."].map(
              (t, i) => (
                <span key={`${group}-${i}`} className="flex items-center gap-12">
                  <span>{t}</span>
                  <span className="text-coral">✦</span>
                </span>
              ),
            ),
          )}
        </div>
      </div>
    </section>
  );
}
