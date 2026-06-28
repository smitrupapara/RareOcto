import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { LoadMoreProducts } from "@/components/catalog/load-more-products";
import {
  getFavoritesForUser,
  listProducts,
  type ListProductsResult,
} from "@/lib/catalog/queries";
import { getCurrentUser } from "@/lib/auth";
import {
  filtersToSearchString,
  parseCatalogFilters,
  type CatalogFilters as CatalogFiltersType,
} from "@/lib/catalog/search";

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

  // Kick off the data fetches but DON'T await them here. Passing the promises
  // into <Suspense> boundaries lets the page shell (header, search, filters)
  // paint immediately while the product grid streams in behind a skeleton —
  // the page no longer blocks on the DB query before showing anything. The
  // same `resultsPromise` is shared by the count + grid, so the query runs once.
  const resultsPromise = listProducts(filters);
  const userPromise = getCurrentUser();
  const streamKey = filtersToSearchString(filters) || "all";

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-6 md:py-8">
      <header className="mb-6 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          catalog
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.025em]">
          Every wall, on demand.
        </h1>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          Magnetic wallpaper art that peels, snaps, and swaps.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Suspense fallback={<div className="h-11 w-full max-w-md" />}>
          <CatalogSearch />
        </Suspense>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading…</p>
          }
        >
          <ResultCount resultsPromise={resultsPromise} />
        </Suspense>
      </div>

      <div className="mb-8">
        <Suspense fallback={<div className="h-10" />}>
          <CatalogFilters />
        </Suspense>
      </div>

      {/* Keyed by the filter signature so it remounts (showing the skeleton
          again) whenever the search/filters change. */}
      <Suspense key={streamKey} fallback={<CatalogGridSkeleton />}>
        <CatalogResults
          resultsPromise={resultsPromise}
          userPromise={userPromise}
          filters={filters}
        />
      </Suspense>
    </main>
  );
}

async function ResultCount({
  resultsPromise,
}: {
  resultsPromise: Promise<ListProductsResult>;
}) {
  const { total } = await resultsPromise;
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {total === 0
        ? "No products yet"
        : `${total} ${total === 1 ? "piece" : "pieces"}`}
    </p>
  );
}

async function CatalogResults({
  resultsPromise,
  userPromise,
  filters,
}: {
  resultsPromise: Promise<ListProductsResult>;
  userPromise: ReturnType<typeof getCurrentUser>;
  filters: CatalogFiltersType;
}) {
  const [{ products, total }, user] = await Promise.all([
    resultsPromise,
    userPromise,
  ]);
  const favoriteIds = user
    ? new Set((await getFavoritesForUser(user.id)).map((p) => p.id))
    : new Set<string>();

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <LoadMoreProducts
      initialProducts={products}
      total={total}
      filters={filters}
      isAuthed={Boolean(user)}
      favoriteIds={[...favoriteIds]}
    />
  );
}

function CatalogGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-border/60 bg-card"
        >
          <div className="aspect-[3/2] w-full animate-pulse bg-muted" />
          <div className="flex flex-col gap-2 p-2.5 sm:p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
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
