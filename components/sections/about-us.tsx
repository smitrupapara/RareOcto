import Image from "next/image";
import yashPortrait from "@/public/Yash.webp";

export function AboutUs() {
  return (
    <section id="about-us" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-12">
          <span className="mb-5 inline-flex items-center rounded-full border border-coral/30 bg-coral/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-coral">
            About Us
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Walls were never meant to stay the same.
          </h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16 lg:items-start">

          {/* Left — founder portrait */}
          <div className="flex flex-col items-center lg:items-start gap-4">
            <div className="relative w-48 lg:w-full aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src={yashPortrait}
                fill
                className="object-cover object-top"
                alt="Yash Bhanderi"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Founder
              </p>
              <p className="mt-1 font-display text-lg font-bold">
                Yash Bhanderi
              </p>
            </div>
          </div>

          {/* Right — brand statement + story card */}
          <div className="flex flex-col gap-10">
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                RareOcto is redefining how surfaces work by creating
                innovative magnetic solutions that make spaces flexible,
                changeable, and effortless to transform.
              </p>
              <p>
                We solve the everyday problem of traditional
                wallpapers—difficult removal, damage, and time-consuming
                updates—by offering a smarter, hassle-free alternative.
              </p>
              <p>
                Our focus is on building practical, durable, and design-driven
                products that allow people to refresh their spaces anytime,
                without mess or limitations.
              </p>
              <p className="font-semibold text-foreground">
                At RareOcto, we don&rsquo;t just create products—we make
                spaces adapt to you.
              </p>
            </div>

            {/* Story card */}
            <div className="rounded-2xl border border-border bg-card p-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-coral">
                The Story
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                RareOcto began with a simple insight—people want to refresh
                their spaces, but traditional wall solutions make it difficult
                and time-consuming.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Founder{" "}
                <span className="font-semibold text-foreground">
                  Yash Bhanderi
                </span>{" "}
                recognized this gap and set out to create a smarter, more
                flexible way to transform walls without damage or hassle.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Today, RareOcto is focused on building practical and innovative
                magnetic solutions that make spaces easier to change—while
                moving toward becoming a strong brand in the
                future.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
