"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { FavoriteToggle } from "@/components/catalog/favorite-toggle";
import { cn } from "@/lib/utils";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";
import { formatPaiseToINR } from "@/lib/catalog/format";
import type { Category, Product } from "@/types/database";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  className?: string;
  isAuthed?: boolean;
  isFavorite?: boolean;
};

const CATEGORY_LABEL: Record<Category, string> = {
  abstract: "Abstract",
  botanical: "Botanical",
  geometric: "Geometric",
  mural: "Mural",
  kids: "Kids",
  minimal: "Minimal",
  "3d": "3D",
  illustration: "Illustration",
};

export function ProductCard({
  product,
  priority = false,
  className,
  isAuthed = false,
  isFavorite = false,
}: ProductCardProps) {
  const cover = product.images[0];
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-coral/50 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <Link href={`/catalog/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
          {cover ? (
            <Image
              loader={cloudinaryLoader}
              src={cover}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              priority={priority}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
              no image
            </div>
          )}
          {product.category[0] ? (
            <Badge
              variant="secondary"
              className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 text-[10px] uppercase tracking-[0.18em] backdrop-blur"
            >
              {CATEGORY_LABEL[product.category[0]]}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="line-clamp-2 font-display text-base font-semibold tracking-tight">
            {product.name}
          </h3>
          <p className="mt-auto text-sm text-muted-foreground">
            From{" "}
            <span className="font-medium text-foreground">
              {formatPaiseToINR(product.base_price)}
            </span>
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteToggle
          productId={product.id}
          isAuthed={isAuthed}
          initialIsFavorite={isFavorite}
          size="icon-sm"
          className="h-9 w-9 bg-background/85 backdrop-blur hover:bg-background"
        />
      </div>
    </div>
  );
}
