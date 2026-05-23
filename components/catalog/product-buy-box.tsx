"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPaiseToINR } from "@/lib/catalog/format";
import { addToCartAction } from "@/app/(public)/catalog/[slug]/actions";
import type {
  MaterialPriceModifier,
  ProductMaterial,
  ProductSize,
} from "@/types/database";

const SIZE_LABEL: Record<ProductSize, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
};

const MATERIAL_LABEL: Record<ProductMaterial, string> = {
  "matte-vinyl": "Matte vinyl",
  "glossy-vinyl": "Glossy vinyl",
  "fabric-texture": "Fabric texture",
  "magnetic-base": "Magnetic base",
};

type ProductBuyBoxProps = {
  productId: string;
  basePrice: number;
  stock: number;
  availableSizes: ProductSize[];
  availableMaterials: ProductMaterial[];
  materialPriceModifier: MaterialPriceModifier;
  isAuthed: boolean;
  className?: string;
};

const MAX_QTY = 5;

export function ProductBuyBox({
  productId,
  basePrice,
  stock,
  availableSizes,
  availableMaterials,
  materialPriceModifier,
  isAuthed,
  className,
}: ProductBuyBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [size, setSize] = useState<ProductSize | null>(availableSizes[0] ?? null);
  const [material, setMaterial] = useState<ProductMaterial | null>(
    availableMaterials[0] ?? null,
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectivePrice = useMemo(() => {
    const modifier = material ? (materialPriceModifier[material] ?? 0) : 0;
    return basePrice + modifier;
  }, [basePrice, material, materialPriceModifier]);

  const outOfStock = stock <= 0;
  const canAdd =
    !outOfStock &&
    !isPending &&
    size !== null &&
    material !== null &&
    qty >= 1 &&
    qty <= MAX_QTY;

  function handleAdd() {
    setError(null);
    if (!isAuthed) {
      const target = pathname ?? "/";
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    if (!canAdd || !size || !material) return;

    startTransition(async () => {
      const result = await addToCartAction({
        productId,
        size,
        material,
        quantity: qty,
      });
      if (result.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      } else {
        setError(result.error ?? "Could not add to cart");
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          price
        </p>
        <p className="mt-1 font-display text-3xl font-bold tracking-tight">
          {formatPaiseToINR(effectivePrice)}
        </p>
        {material && (materialPriceModifier[material] ?? 0) !== 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Includes {MATERIAL_LABEL[material].toLowerCase()} premium
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            size
          </p>
          {size ? (
            <p className="text-xs text-muted-foreground">{SIZE_LABEL[size]}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => setSize(s)}
              className={cn(
                "h-11 min-w-14 rounded-full border px-4 text-sm font-medium transition",
                s === size
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/40",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          material
        </p>
        <div className="flex flex-wrap gap-2">
          {availableMaterials.map((m) => {
            const modifier = materialPriceModifier[m] ?? 0;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={m === material}
                onClick={() => setMaterial(m)}
                className={cn(
                  "h-11 rounded-full border px-4 text-sm font-medium transition",
                  m === material
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {MATERIAL_LABEL[m]}
                {modifier > 0 ? (
                  <span className="ml-1.5 text-xs opacity-70">
                    +{formatPaiseToINR(modifier)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          quantity
        </p>
        <div className="inline-flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-11 w-11 items-center justify-center rounded-l-full hover:bg-muted disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span aria-live="polite" className="min-w-10 text-center text-sm font-medium">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            disabled={qty >= MAX_QTY}
            className="flex h-11 w-11 items-center justify-center rounded-r-full hover:bg-muted disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          onClick={handleAdd}
          disabled={!canAdd}
          className="h-12 w-full rounded-full text-base"
        >
          {added ? (
            <>
              <Check className="size-5" />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingCart className="size-5" />
              {outOfStock ? "Out of stock" : isPending ? "Adding…" : "Add to cart"}
            </>
          )}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!isAuthed ? (
          <p className="text-xs text-muted-foreground">
            You&apos;ll be asked to sign in to save your cart.
          </p>
        ) : null}
      </div>
    </div>
  );
}
