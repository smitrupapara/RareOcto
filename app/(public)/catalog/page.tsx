import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/sections/logo";

export const metadata: Metadata = {
  title: "Catalog — RareOcto",
  description: "Browse the full RareOcto collection of magnetic wallpaper art.",
};

export default function CatalogPage() {
  return (
    <main className="grid min-h-[80vh] place-items-center px-6 py-20">
      <div className="max-w-lg text-center">
        <Logo className="mx-auto mb-8 h-20 w-20 opacity-80" />
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          catalog
        </p>
        <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] font-bold leading-[0.9] tracking-[-0.03em]">
          The catalog.
        </h1>
        <p className="mt-5 text-pretty text-muted-foreground sm:text-lg">
          Something rare is dropping soon. Eight arms are busy curating the
          next collection — check back shortly.
        </p>
        <Button asChild className="mt-10 rounded-full" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
