"use client";

import { useMemo, useState, useTransition } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { loadMoreProductsAction } from "@/app/(public)/catalog/actions";
import type { CatalogFilters } from "@/lib/catalog/search";
import type { Product } from "@/types/database";

type LoadMoreProductsProps = {
  initialProducts: Product[];
  total: number;
  filters: CatalogFilters;
  isAuthed: boolean;
  /** All of the current user's favourite product IDs (full set, not paged). */
  favoriteIds: string[];
};

/**
 * Renders the catalog grid and appends further pages on demand via a
 * "Load more" button instead of numbered pagination. The component is keyed by
 * the active filter set in the page, so it remounts (and resets) whenever the
 * filters/search change.
 */
export function LoadMoreProducts({
  initialProducts,
  total,
  filters,
  isAuthed,
  favoriteIds,
}: LoadMoreProductsProps) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(filters.page);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The page passes the user's complete favourite set, so newly loaded
  // products resolve their heart state without another round-trip.
  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const hasMore = products.length < total;

  function loadMore() {
    setError(null);
    const nextPage = page + 1;
    startTransition(async () => {
      try {
        const { products: more } = await loadMoreProductsAction(filters, nextPage);
        setPage(nextPage);
        if (more.length === 0) return;
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...more.filter((p) => !seen.has(p.id))];
        });
      } catch {
        setError("Couldn't load more pieces. Please try again.");
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={i < 4}
            isAuthed={isAuthed}
            isFavorite={favSet.has(product.id)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {hasMore ? (
        <div className="mt-10 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={isPending}
            className="rounded-full px-8"
          >
            {isPending ? "Loading…" : "Load more"}
          </Button>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {products.length} of {total}
          </p>
        </div>
      ) : null}
    </>
  );
}
