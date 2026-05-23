import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/catalog/product-grid";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getFavoritesForUser } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Saved pieces — RareOcto",
  description: "The wallpapers you've kept warm.",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const user = await requireUser();
  const products = await getFavoritesForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          your saved pieces
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          The ones you kept warm
        </h1>
      </header>

      {products.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            nothing saved yet
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
            Tap the heart to keep one here.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
            Browse the catalog and save anything that catches your eye.
          </p>
          <Button asChild className="mt-6">
            <Link href="/catalog">Browse catalog</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid
            products={products}
            isAuthed
            favoriteIds={new Set(products.map((p) => p.id))}
          />
        </div>
      )}
    </main>
  );
}
