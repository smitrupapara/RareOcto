"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";
import { blurUrl } from "@/lib/cloudinary/transforms";
import {
  SHOW_PRICE,
  formatDimensions,
  formatPaiseToINR,
  toSqFt,
} from "@/lib/catalog/format";
import {
  removeFromCartAction,
  updateCartQuantityAction,
} from "@/app/(public)/cart/actions";
import type {
  CartItem,
  Category,
  Product,
  ProductMaterial,
} from "@/types/database";

const MATERIAL_LABEL: Record<ProductMaterial, string> = {
  "matte-vinyl": "Matte vinyl",
  "glossy-vinyl": "Glossy vinyl",
  "fabric-texture": "Fabric texture",
  "magnetic-base": "Magnetic base",
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

const MAX_QTY = 5;

type CartLineItemProps = {
  item: CartItem;
  product: Product;
  unitPrice: number;
  lineTotal: number;
};

export function CartLineItem({
  item,
  product,
  unitPrice,
  lineTotal,
}: CartLineItemProps) {
  const [isPending, startTransition] = useTransition();
  const cover = product.images[0];
  const blur = cover ? blurUrl(cover) : undefined;
  const category = product.category[0];
  const areaSqFt = toSqFt(item.width, item.height, item.unit);

  function setQty(next: number) {
    const clamped = Math.min(MAX_QTY, Math.max(1, next));
    if (clamped === item.quantity) return;
    startTransition(async () => {
      await updateCartQuantityAction(item.id, clamped);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeFromCartAction(item.id);
    });
  }

  return (
    <li className="flex gap-4 py-6">
      <Link
        href={`/catalog/${product.slug}`}
        className="relative aspect-[3/2] w-28 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:w-36"
      >
        {cover ? (
          <Image
            loader={cloudinaryLoader}
            src={cover}
            alt={product.name}
            fill
            sizes="(min-width: 640px) 144px, 112px"
            placeholder={blur ? "blur" : "empty"}
            blurDataURL={blur}
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            {category ? (
              <p className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABEL[category]}
              </p>
            ) : null}
            <Link
              href={`/catalog/${product.slug}`}
              className="font-display text-base font-semibold tracking-tight hover:text-coral"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDimensions(item.width, item.height, item.unit)} · {areaSqFt.toFixed(1)} sq ft
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {MATERIAL_LABEL[item.material]}
            </p>
            {SHOW_PRICE ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPaiseToINR(unitPrice)} each
              </p>
            ) : null}
          </div>
          {SHOW_PRICE ? (
            <p className="font-medium tabular-nums">
              {formatPaiseToINR(lineTotal)}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex items-center rounded-full border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty(item.quantity - 1)}
              disabled={isPending || item.quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-l-full hover:bg-muted disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty(item.quantity + 1)}
              disabled={isPending || item.quantity >= MAX_QTY}
              className="flex h-9 w-9 items-center justify-center rounded-r-full hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
