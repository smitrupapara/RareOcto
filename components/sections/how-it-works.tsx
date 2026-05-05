"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Step = {
  index: string;
  title: string;
  copy: string;
  art: React.ReactNode;
};

const STEPS: Step[] = [
  {
    index: "01",
    title: "Prepare the surface.",
    copy: "Ensure the wall is clean, dry, and free from dust or grease. No sanding, no priming, no special paint needed. If it passes the tape test, it passes ours — most smooth walls, glass, and tiles work perfectly.",
    art: <PrepArt />,
  },
  {
    index: "02",
    title: "Install the base sheet.",
    copy: "Peel off the protective backing and press the base sheet flat against the wall. Smooth out any air bubbles with your palm — no tools required. It goes up once and stays put until you decide to move on.",
    art: <BaseArt />,
  },
  {
    index: "03",
    title: "Apply your design.",
    copy: "Align your chosen wallpaper panel and lay it onto the base sheet. The system lets you adjust position before it sets — get it exactly right, then press flat. Edges align themselves. Looks like it was always there.",
    art: <PlaceArt />,
  },
  {
    index: "04",
    title: "Replace anytime.",
    copy: "Lift a corner, peel the panel off in one smooth motion, roll it up, slip it back in its sleeve. Pull out any other design and press it on. Same base sheet, completely new look — no tools, no mess, no waiting.",
    art: <ReplaceArt />,
  },
];

const BENEFITS = [
  { label: "No wall damage" },
  { label: "Zero residue" },
  { label: "Reusable base" },
  { label: "No tools needed" },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const trackRef = useRef<HTMLOListElement | null>(null);
  const benefitsRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.from(headlineRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      });

      const track = trackRef.current;
      if (track) {
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              setActiveStep(Math.round(self.progress * (STEPS.length - 1)));
            },
          },
        });
      }

      if (benefitsRef.current) {
        gsap.from(benefitsRef.current.children, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: benefitsRef.current,
            start: "top 88%",
            once: true,
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      id="how-it-works"
      className="relative border-y border-foreground/10 bg-cream/40 dark:bg-ink/40"
    >
      <section
        ref={sectionRef}
        className="relative isolate flex h-screen flex-col overflow-hidden"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_1px_1px,var(--ink)_1px,transparent_0)] [background-size:24px_24px] opacity-[0.06] dark:opacity-[0.1]"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 left-0 -z-10 flex w-[200%] gap-12 whitespace-nowrap font-display text-[18vw] font-bold leading-none tracking-[-0.04em] text-foreground/[0.04] sm:text-[14vw]"
        >
          <span>Peel·Place·Replace · Peel·Place·Replace · Peel·Place·Replace ·</span>
          <span>Peel·Place·Replace · Peel·Place·Replace · Peel·Place·Replace ·</span>
        </div>

        <div className="flex-shrink-0 px-4 pt-12 pb-6 text-center sm:pt-16 sm:pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-coral">
            simple application
          </p>
          <h2
            ref={headlineRef}
            className="mt-4 font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[0.9] tracking-[-0.03em]"
          >
            Peel. Place.{" "}
            <span className="bg-gradient-to-r from-coral via-marigold to-coral bg-clip-text text-transparent">
              Replace.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-foreground/75 sm:text-base">
            No tools. No damage. No professional required — quick installation
            without any permanent changes to your wall.
          </p>
        </div>

        <ol
          ref={trackRef}
          className="flex min-h-0 flex-1 will-change-transform"
          style={{ width: `${STEPS.length * 100}vw` }}
        >
          {STEPS.map((step) => (
            <li
              key={step.index}
              className="flex w-screen flex-shrink-0 items-center px-6 pb-4 sm:px-10 lg:px-16"
            >
              <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
                    step / {step.index}
                  </span>
                  <h3 className="mt-3 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-pretty text-base text-foreground/80 sm:text-lg">
                    {step.copy}
                  </p>
                  <div
                    aria-hidden
                    className="mt-6 h-px w-24 bg-gradient-to-r from-coral via-marigold to-transparent"
                  />
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-foreground/10 bg-background/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] backdrop-blur">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--coral)_0%,transparent_55%),radial-gradient(circle_at_80%_80%,var(--sea)_0%,transparent_50%)] opacity-40"
                  />
                  <div className="absolute inset-0 grid place-items-center p-8">
                    {step.art}
                  </div>
                  <span className="absolute right-5 top-5 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/60">
                    rareocto · {step.index}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-shrink-0 items-center justify-center gap-2 pb-6">
          {STEPS.map((step, i) => (
            <div
              key={step.index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeStep ? "w-8" : "w-1.5 bg-foreground/20"
              }`}
              style={i === activeStep ? { backgroundColor: "var(--coral)" } : undefined}
            />
          ))}
        </div>
      </section>

      <div
        ref={benefitsRef}
        className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-16 sm:grid-cols-4 sm:px-6 lg:px-8"
      >
        {BENEFITS.map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-center rounded-2xl border border-foreground/10 bg-background/50 px-4 py-5 text-center backdrop-blur"
          >
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-foreground/70">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrepArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full max-h-[280px]">
      <rect x="30" y="20" width="260" height="200" rx="12" fill="var(--ink)" fillOpacity="0.05" stroke="var(--ink)" strokeOpacity="0.12" strokeWidth="1.5" />
      <g stroke="var(--ink)" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="3 8">
        <line x1="30" y1="80" x2="290" y2="80" />
        <line x1="30" y1="140" x2="290" y2="140" />
        <line x1="100" y1="20" x2="100" y2="220" />
        <line x1="180" y1="20" x2="180" y2="220" />
      </g>
      <g transform="translate(195 60)">
        <rect width="72" height="100" rx="8" fill="var(--coral)" fillOpacity="0.15" stroke="var(--coral)" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="36" cy="34" r="18" fill="none" stroke="var(--coral)" strokeWidth="2" />
        <path d="M36 16 Q52 34, 36 52 Q20 34, 36 16" fill="var(--coral)" fillOpacity="0.3" />
        <rect x="12" y="64" width="48" height="6" rx="3" fill="var(--coral)" fillOpacity="0.35" />
        <rect x="20" y="76" width="32" height="6" rx="3" fill="var(--coral)" fillOpacity="0.25" />
      </g>
      <g transform="translate(52 90)">
        <ellipse cx="42" cy="50" rx="34" ry="12" fill="var(--marigold)" fillOpacity="0.2" />
        <rect x="18" y="10" width="48" height="68" rx="6" fill="var(--marigold)" fillOpacity="0.25" stroke="var(--marigold)" strokeOpacity="0.5" strokeWidth="1.5" />
        <path d="M18 30 Q42 22, 66 30" stroke="var(--marigold)" strokeWidth="2" fill="none" strokeOpacity="0.6" />
        <path d="M18 46 Q42 38, 66 46" stroke="var(--marigold)" strokeWidth="2" fill="none" strokeOpacity="0.4" />
        <path d="M18 62 Q42 54, 66 62" stroke="var(--marigold)" strokeWidth="2" fill="none" strokeOpacity="0.3" />
      </g>
      <text x="160" y="218" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3" fill="var(--ink)" fillOpacity="0.45">
        CLEAN · DRY · READY
      </text>
    </svg>
  );
}

function BaseArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full max-h-[280px]">
      <rect x="30" y="20" width="180" height="200" rx="12" fill="var(--ink)" fillOpacity="0.06" stroke="var(--ink)" strokeOpacity="0.14" strokeWidth="1.5" />
      <rect x="50" y="40" width="140" height="160" rx="8" fill="var(--sea)" fillOpacity="0.18" stroke="var(--sea)" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="120" y="130" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="2" fill="var(--sea)" fillOpacity="0.8">BASE SHEET</text>
      <g transform="translate(200 60)">
        <path d="M0 0 L80 0 L80 130 Q60 110, 40 130 Q20 110, 0 130 Z" fill="var(--marigold)" fillOpacity="0.2" stroke="var(--marigold)" strokeOpacity="0.5" strokeWidth="1.5" />
        <path d="M0 0 Q40 15, 80 0" stroke="var(--marigold)" strokeWidth="2" fill="none" strokeOpacity="0.6" />
        <path d="M10 30 Q40 42, 70 30" stroke="var(--marigold)" strokeWidth="1.5" fill="none" strokeOpacity="0.35" />
        <path d="M10 55 Q40 67, 70 55" stroke="var(--marigold)" strokeWidth="1.5" fill="none" strokeOpacity="0.25" />
        <path d="M40 125 L40 160" stroke="var(--ink)" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="4 4" />
        <path d="M28 148 L40 160 L52 148" fill="none" stroke="var(--coral)" strokeWidth="2" strokeOpacity="0.7" strokeLinejoin="round" />
      </g>
      <text x="160" y="218" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3" fill="var(--ink)" fillOpacity="0.45">
        PEEL · PRESS · DONE
      </text>
    </svg>
  );
}

function PlaceArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full max-h-[280px]">
      <rect x="30" y="20" width="160" height="200" rx="12" fill="var(--sea)" fillOpacity="0.15" stroke="var(--sea)" strokeOpacity="0.3" strokeWidth="1.5" />
      <text x="110" y="130" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="9" letterSpacing="2" fill="var(--sea)" fillOpacity="0.7">BASE</text>
      <g transform="translate(100 25) rotate(5)">
        <rect width="140" height="180" rx="10" fill="var(--coral)" fillOpacity="0.88" />
        <circle cx="70" cy="65" r="28" fill="var(--cream)" fillOpacity="0.9" />
        <circle cx="70" cy="65" r="14" fill="var(--ink)" fillOpacity="0.7" />
        <rect x="20" y="110" width="100" height="8" rx="4" fill="var(--cream)" fillOpacity="0.5" />
        <rect x="30" y="128" width="80" height="8" rx="4" fill="var(--cream)" fillOpacity="0.35" />
        <rect x="24" y="146" width="92" height="8" rx="4" fill="var(--cream)" fillOpacity="0.25" />
      </g>
      <g stroke="var(--ink)" strokeWidth="2" fill="none" strokeOpacity="0.5" strokeLinecap="round">
        <line x1="58" y1="18" x2="58" y2="32" />
        <line x1="42" y1="25" x2="74" y2="25" />
        <line x1="58" y1="210" x2="58" y2="224" />
        <line x1="42" y1="217" x2="74" y2="217" />
      </g>
      <text x="160" y="232" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3" fill="var(--ink)" fillOpacity="0.45">
        ALIGN · PRESS · PERFECT
      </text>
    </svg>
  );
}

function ReplaceArt() {
  return (
    <svg viewBox="0 0 320 240" className="h-full w-full max-h-[280px]">
      <g transform="translate(30 30)">
        <rect width="100" height="150" rx="8" fill="var(--sea)" fillOpacity="0.7" />
        <g stroke="var(--cream)" strokeWidth="2.5" fill="none" strokeOpacity="0.6" strokeLinecap="round">
          <path d="M12 38 Q50 22, 88 38 T88 74" />
          <path d="M12 74 Q50 58, 88 74 T88 110" />
        </g>
        <path d="M88 10 Q100 30, 88 50" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeOpacity="0.3" strokeDasharray="3 4" />
        <path d="M88 10 L78 22 M88 10 L100 18" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.8" />
      </g>
      <g transform="translate(175 30)">
        <rect width="110" height="150" rx="8" fill="var(--marigold)" fillOpacity="0.85" />
        <circle cx="55" cy="52" r="24" fill="var(--coral)" fillOpacity="0.85" />
        <rect x="18" y="92" width="74" height="7" rx="3.5" fill="var(--ink)" fillOpacity="0.4" />
        <rect x="24" y="110" width="62" height="7" rx="3.5" fill="var(--ink)" fillOpacity="0.28" />
        <rect x="18" y="128" width="74" height="7" rx="3.5" fill="var(--ink)" fillOpacity="0.2" />
      </g>
      <g stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M143 90 Q158 72, 172 90" />
        <path d="M172 90 L162 82 M172 90 L164 100" />
        <path d="M172 118 Q157 136, 143 118" />
        <path d="M143 118 L153 126 M143 118 L151 108" />
      </g>
      <text x="160" y="218" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3" fill="var(--ink)" fillOpacity="0.45">
        PEEL · ROLL · REPLACE
      </text>
    </svg>
  );
}
