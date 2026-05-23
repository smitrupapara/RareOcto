import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getFavoritesForUser, listProducts } from "@/lib/catalog/queries";
import { getCurrentUser } from "@/lib/auth";
import { PAGE_SIZE, parseCatalogFilters } from "@/lib/catalog/search";

export const metadata: Metadata = {
  title: "Catalog — RareOcto",
  description:
    "Browse the full RareOcto collection of magnetic wallpaper art. Filter by style, material, and size.",
};

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const raw = await searchParams;
  const filters = parseCatalogFilters(raw);
  const [{ products, total, page, pageCount }, user] = await Promise.all([
    listProducts(filters),
    getCurrentUser(),
  ]);
  const favoriteIds = user
    ? new Set((await getFavoritesForUser(user.id)).map((p) => p.id))
    : new Set<string>();

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          catalog
        </p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.025em]">
          Every wall, on demand.
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">
          Magnetic wallpaper art that peels, snaps, and swaps. Curated in
          Bengaluru, shipped India-wide.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Suspense fallback={<div className="h-11 w-full max-w-md" />}>
          <CatalogSearch />
        </Suspense>
        <p
          className="text-sm text-muted-foreground"
          aria-live="polite"
        >
          {total === 0
            ? "No products yet"
            : `Showing ${start}–${end} of ${total}`}
        </p>
      </div>

      <div className="mb-8">
        <Suspense fallback={<div className="h-10" />}>
          <CatalogFilters />
        </Suspense>
      </div>

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ProductGrid
            products={products}
            isAuthed={Boolean(user)}
            favoriteIds={favoriteIds}
          />
          <CatalogPagination filters={filters} pageCount={pageCount} />
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border/70 py-20 text-center">
      <div className="max-w-md px-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          nothing here
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Nothing matched your filters.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Try widening the search or clearing filters to see the full
          collection.
        </p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link href="/catalog">Clear filters</Link>
        </Button>
      </div>
    </div>
  );
}
