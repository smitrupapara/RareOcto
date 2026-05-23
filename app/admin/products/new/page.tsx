import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New product — Admin",
  robots: { index: false, follow: false },
};

export default function NewProductPage() {
  return (
    <div>
      <nav className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground">
          ← Products
        </Link>
      </nav>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        New product
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in the details and upload images. Slug becomes the public URL.
      </p>

      <div className="mt-8">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
