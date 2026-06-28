"use server";

import { listProducts } from "@/lib/catalog/queries";
import {
  filtersToSearchString,
  parseCatalogFilters,
  type CatalogFilters,
} from "@/lib/catalog/search";
import type { Product } from "@/types/database";

/**
 * Fetch a single page of catalog products for the "Load more" button.
 *
 * Server actions are public endpoints, so the client-supplied `filters` are
 * never trusted directly: we round-trip them through `filtersToSearchString`
 * + `parseCatalogFilters` — the exact same validation the page uses — which
 * drops unknown enum values, caps the query string, and rejects bad numbers.
 */
export async function loadMoreProductsAction(
  filters: CatalogFilters,
  page: number,
): Promise<{ products: Product[] }> {
  const qs = filtersToSearchString(filters, { page });
  const params = Object.fromEntries(new URLSearchParams(qs.replace(/^\?/, "")));
  const safeFilters = parseCatalogFilters(params);

  const { products } = await listProducts(safeFilters);
  return { products };
}
