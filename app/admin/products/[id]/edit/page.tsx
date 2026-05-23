import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit product — Admin",
  robots: { index: false, follow: false },
};

async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProductById failed: ${error.message}`);
  return (data as Product) ?? null;
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Loose UUID check before hitting the DB to give a clean 404 for bad URLs.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div>
      <nav className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground">
          ← Products
        </Link>
      </nav>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {product.name}
        </h1>
        <Link
          href={`/catalog/${product.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View on site ↗
        </Link>
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {product.slug}
      </p>

      <div className="mt-8">
        <ProductForm mode="edit" initial={product} productId={product.id} />
      </div>
    </div>
  );
}
