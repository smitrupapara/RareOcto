import { getRelatedProducts } from "@/lib/catalog/queries";
import { ProductCard } from "@/components/catalog/product-card";
import type { Category } from "@/types/database";

type RelatedProductsProps = {
  productId: string;
  category: Category[];
  limit?: number;
};

export async function RelatedProducts({
  productId,
  category,
  limit = 4,
}: RelatedProductsProps) {
  const related = await getRelatedProducts(productId, category, limit);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-20">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            keep browsing
          </p>
          <h2
            id="related-heading"
            className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl"
          >
            More from this category
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
