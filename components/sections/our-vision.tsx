export function OurVision() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-56 -top-20 h-[640px] w-[640px] rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle, var(--coral), transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, var(--marigold), transparent 68%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-24 lg:items-center">
          {/* Left — headline */}
          <div>
            <span className="mb-6 inline-flex items-center rounded-full border border-coral/30 bg-coral/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-coral">
              Our Vision
            </span>
            <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Built in India.
              <br />
              <span style={{ color: "var(--coral)" }}>Built for</span>
              <br />
              the world.
            </h2>
          </div>

          {/* Right — body */}
          <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
            <p>
              To build RareOcto as a leading &ldquo;Made in India&rdquo;
              magnetic solutions brand, driving innovation across industries and
              everyday applications.
            </p>
            <p>
              We aim to develop a wide range of high-quality magnets, expand
              their use across multiple sectors, and strengthen India&rsquo;s
              position in the global magnetic manufacturing space.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
