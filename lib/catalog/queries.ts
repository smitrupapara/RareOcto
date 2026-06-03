import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product, Review } from "@/types/database";
import {
  buildFtsQuery,
  type CatalogFilters,
  PAGE_SIZE,
} from "@/lib/catalog/search";
import { priceForDimensions } from "@/lib/catalog/format";

export type ListProductsResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/**
 * Catalog listing — drives `/catalog`. Filters and pagination come from
 * the URL (parsed by `parseCatalogFilters`). Returns the page slice plus
 * total count for pagination.
 */
export async function listProducts(filters: CatalogFilters): Promise<ListProductsResult> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  const ftsQuery = buildFtsQuery(filters.q);
  if (ftsQuery) {
    query = query.textSearch("search_tsv", ftsQuery, { type: "websearch" });
  }

  if (filters.category) {
    query = query.contains("category", [filters.category]);
  }
  if (filters.material) {
    query = query.contains("available_materials", [filters.material]);
  }
  if (filters.room) {
    query = query.contains("rooms", [filters.room]);
  }
  if (filters.color) {
    query = query.contains("colors", [filters.color]);
  }
  if (filters.pattern) {
    query = query.contains("patterns", [filters.pattern]);
  }
  if (filters.style) {
    query = query.contains("styles", [filters.style]);
  }
  if (filters.minPrice !== null) {
    query = query.gte("base_price", filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    query = query.lte("base_price", filters.maxPrice);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "relevance":
      // Postgres FTS ranks via ts_rank; without a custom order Supabase
      // returns the textSearch results in match order, which is fine.
      query = query.order("created_at", { ascending: false });
      break;
    case "new":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const offset = (filters.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`listProducts failed: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    products: (data ?? []) as Product[],
    total,
    page: filters.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProductBySlug failed: ${error.message}`);
  return (data as Product | null) ?? null;
}

export async function getRelatedProducts(
  productId: string,
  category: Product["category"],
  limit = 8,
): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();

  // `category` is typed as an array but legacy rows / serialization can
  // hand us a scalar or null. Normalize before reading the primary value.
  const categories = Array.isArray(category)
    ? category.filter((c): c is Product["category"][number] => Boolean(c))
    : typeof category === "string" && category
      ? [category as Product["category"][number]]
      : [];
  const primary = categories[0];

  // No category to match against — return most recent products excluding
  // the current one. This branch never hits the enum-array filter.
  if (!primary) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`getRelatedProducts failed: ${error.message}`);
    return (data ?? []) as Product[];
  }

  // PostgREST cannot resolve `category @> {...}` against the public.category[]
  // enum column (the value-side comes through as `unknown`). The RPC
  // get_related_products (migration 0007) does the array filter inside a
  // SQL function where the casts are explicit.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: Product[] | null; error: { message: string } | null }>)(
    "get_related_products",
    {
      p_product_id: productId,
      p_category: primary,
      p_limit: limit,
    },
  );
  if (error) throw new Error(`getRelatedProducts failed: ${error.message}`);
  return (data ?? []) as Product[];
}

export async function getReviewsForProduct(
  productId: string,
  { page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
): Promise<{ reviews: Review[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const offset = (page - 1) * pageSize;
  const { data, error, count } = await supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw new Error(`getReviewsForProduct failed: ${error.message}`);
  return { reviews: (data ?? []) as Review[], total: count ?? 0 };
}

export type ReviewAggregate = {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function getReviewAggregate(productId: string): Promise<ReviewAggregate> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId);
  if (error) throw new Error(`getReviewAggregate failed: ${error.message}`);

  const distribution: ReviewAggregate["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of data ?? []) {
    const r = row.rating as 1 | 2 | 3 | 4 | 5;
    if (r >= 1 && r <= 5) {
      distribution[r] += 1;
      sum += r;
    }
  }
  const count = data?.length ?? 0;
  return {
    average: count > 0 ? Number((sum / count).toFixed(2)) : 0,
    count,
    distribution,
  };
}

export async function getFavoritesForUser(userId: string): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data: favRows, error: favErr } = await supabase
    .from("favorites")
    .select("product_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (favErr) throw new Error(`getFavoritesForUser failed: ${favErr.message}`);

  const productIds = (favRows ?? []).map((r) => r.product_id);
  if (productIds.length === 0) return [];

  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);
  if (prodErr) throw new Error(`getFavoritesForUser failed: ${prodErr.message}`);

  const byId = new Map<string, Product>(
    ((products ?? []) as Product[]).map((p) => [p.id, p]),
  );
  return productIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => p !== undefined);
}

export async function listAllProductSlugs(): Promise<
  Array<{ slug: string; created_at: string }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAllProductSlugs failed: ${error.message}`);
  return (data ?? []) as Array<{ slug: string; created_at: string }>;
}

export async function isFavorite(userId: string, productId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw new Error(`isFavorite failed: ${error.message}`);
  return data !== null;
}

export async function getCartCount(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("user_id", userId);
  if (error) throw new Error(`getCartCount failed: ${error.message}`);
  return (data ?? []).reduce((acc, row) => acc + (row.quantity ?? 0), 0);
}

export type CartLine = {
  item: import("@/types/database").CartItem;
  product: Product;
  unitPrice: number;
  lineTotal: number;
};

export async function getCartForUser(
  userId: string,
): Promise<{ lines: CartLine[]; subtotal: number }> {
  const supabase = await createSupabaseServerClient();
  const { data: items, error: itemsErr } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (itemsErr) throw new Error(`getCartForUser failed: ${itemsErr.message}`);
  if (!items || items.length === 0) return { lines: [], subtotal: 0 };

  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);
  if (prodErr) throw new Error(`getCartForUser failed: ${prodErr.message}`);

  const byId = new Map<string, Product>(
    ((products ?? []) as Product[]).map((p) => [p.id, p]),
  );

  const lines: CartLine[] = [];
  let subtotal = 0;
  for (const item of items) {
    const product = byId.get(item.product_id);
    if (!product) continue;
    const modifier = product.material_price_modifier[item.material] ?? 0;
    const unitPrice = priceForDimensions(
      product.base_price,
      item.width,
      item.height,
      item.unit,
      modifier,
    );
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    lines.push({ item, product, unitPrice, lineTotal });
  }
  return { lines, subtotal };
}
