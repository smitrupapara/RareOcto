import { ProductCard } from "@/components/catalog/product-card";
import type { Product } from "@/types/database";

type ProductGridProps = {
  products: Product[];
  isAuthed?: boolean;
  favoriteIds?: Set<string>;
};

export function ProductGrid({ products, isAuthed = false, favoriteIds }: ProductGridProps) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={i < 4}
          isAuthed={isAuthed}
          isFavorite={favoriteIds?.has(product.id) ?? false}
        />
      ))}
    </div>
  );
}
