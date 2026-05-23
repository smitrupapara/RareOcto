import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";
import { formatPaiseToINR } from "@/lib/catalog/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Products — Admin",
  robots: { index: false, follow: false },
};

async function listAllProducts(): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`listAllProducts failed: ${error.message}`);
  return (data ?? []) as Product[];
}

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            inventory
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} total
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="font-display text-lg font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first SKU to start selling.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name / slug</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const cover = product.images[0];
                return (
                  <tr
                    key={product.id}
                    className="border-t border-border/60 transition hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-muted">
                        {cover ? (
                          <Image
                            loader={cloudinaryLoader}
                            src={cover}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{product.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {product.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {product.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatPaiseToINR(product.base_price)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          product.stock === 0
                            ? "text-destructive"
                            : product.stock < 5
                              ? "text-[var(--marigold)]"
                              : "text-foreground"
                        }
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
