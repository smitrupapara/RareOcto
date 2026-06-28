"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SHOW_PRICE, formatPaiseToINR, priceForDimensions, toCm } from "@/lib/catalog/format";
import {
  DIMENSION_UNIT_VALUES,
  MAX_DIM_CM,
  MAX_DIM_FT,
  MIN_DIM_CM,
  MIN_DIM_FT,
} from "@/lib/catalog/search";
import { addToCartAction } from "@/app/(public)/catalog/[slug]/actions";
import type {
  DimensionUnit,
  MaterialPriceModifier,
  ProductMaterial,
} from "@/types/database";

const MATERIAL_LABEL: Record<ProductMaterial, string> = {
  "matte-vinyl": "Matte vinyl",
  "glossy-vinyl": "Glossy vinyl",
  "fabric-texture": "Fabric texture",
  "magnetic-base": "Magnetic base",
};

const UNIT_LABEL: Record<DimensionUnit, string> = {
  cm: "cm",
  inch: "inch",
  feet: "feet",
  meter: "meter",
};

type ProductBuyBoxProps = {
  productId: string;
  basePrice: number;
  stock: number;
  availableMaterials: ProductMaterial[];
  materialPriceModifier: MaterialPriceModifier;
  isAuthed: boolean;
  className?: string;
};

const MAX_QTY = 5;
const DEFAULT_UNIT: DimensionUnit = "feet";
const DEFAULT_WIDTH = 3;
const DEFAULT_HEIGHT = 4;

export function ProductBuyBox({
  productId,
  basePrice,
  stock,
  availableMaterials,
  materialPriceModifier,
  isAuthed,
  className,
}: ProductBuyBoxProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [widthStr, setWidthStr] = useState<string>(String(DEFAULT_WIDTH));
  const [heightStr, setHeightStr] = useState<string>(String(DEFAULT_HEIGHT));
  const [unit, setUnit] = useState<DimensionUnit>(DEFAULT_UNIT);
  const [material, setMaterial] = useState<ProductMaterial | null>(
    availableMaterials[0] ?? null,
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const width = Number.parseFloat(widthStr);
  const height = Number.parseFloat(heightStr);
  const widthValid = Number.isFinite(width) && width > 0;
  const heightValid = Number.isFinite(height) && height > 0;

  const widthCm = widthValid ? toCm(width, unit) : 0;
  const heightCm = heightValid ? toCm(height, unit) : 0;

  const dimError = useMemo<string | null>(() => {
    if (!widthValid || !heightValid) {
      return "Enter both width and height.";
    }
    const range = `${MIN_DIM_FT} ft – ${MAX_DIM_FT} ft`;
    if (widthCm < MIN_DIM_CM || heightCm < MIN_DIM_CM) {
      return `Each side must be at least ${MIN_DIM_FT} ft (${range}).`;
    }
    if (widthCm > MAX_DIM_CM || heightCm > MAX_DIM_CM) {
      return `Each side can be at most ${MAX_DIM_FT} ft (${range}).`;
    }
    return null;
  }, [widthValid, heightValid, widthCm, heightCm]);

  const effectivePrice = useMemo(() => {
    if (!material || dimError) return null;
    const modifier = materialPriceModifier[material] ?? 0;
    return priceForDimensions(basePrice, width, height, unit, modifier);
  }, [basePrice, material, materialPriceModifier, width, height, unit, dimError]);

  const outOfStock = stock <= 0;
  const canAdd =
    !outOfStock &&
    !isPending &&
    material !== null &&
    dimError === null &&
    qty >= 1 &&
    qty <= MAX_QTY;

  function handleAdd() {
    setError(null);
    if (!isAuthed) {
      const target = pathname ?? "/";
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    if (!canAdd || !material) return;

    startTransition(async () => {
      const result = await addToCartAction({
        productId,
        width,
        height,
        unit,
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
      {SHOW_PRICE ? (
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            price
          </p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight">
            {effectivePrice !== null ? formatPaiseToINR(effectivePrice) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPaiseToINR(basePrice)} per sq ft
            {material && (materialPriceModifier[material] ?? 0) !== 0
              ? ` · includes ${MATERIAL_LABEL[material].toLowerCase()} premium`
              : null}
          </p>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            dimensions
          </p>
          <p className="text-xs text-muted-foreground">
            Range: {MIN_DIM_FT} ft – {MAX_DIM_FT} ft
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Width</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={widthStr}
              onChange={(e) => setWidthStr(e.target.value)}
              className={cn(
                "h-11 w-24 rounded-full border border-border bg-background px-4 text-sm font-medium",
                "focus-visible:border-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40",
              )}
              aria-label="Width"
            />
          </label>
          <span aria-hidden="true" className="mt-5 text-muted-foreground">
            ×
          </span>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Height</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={heightStr}
              onChange={(e) => setHeightStr(e.target.value)}
              className={cn(
                "h-11 w-24 rounded-full border border-border bg-background px-4 text-sm font-medium",
                "focus-visible:border-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40",
              )}
              aria-label="Height"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Unit</span>
            <Select<DimensionUnit>
              value={unit}
              onValueChange={(next) => {
                if (next) setUnit(next);
              }}
            >
              <SelectTrigger aria-label="Unit" className="w-32">
                <SelectValue>{UNIT_LABEL[unit]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_UNIT_VALUES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        {dimError ? (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {dimError}
          </p>
        ) : null}
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
                {SHOW_PRICE && modifier > 0 ? (
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
