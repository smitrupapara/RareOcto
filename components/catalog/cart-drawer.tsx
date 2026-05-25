"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartLineItem } from "@/components/catalog/cart-line-item";
import { formatPaiseToINR } from "@/lib/catalog/format";
import type { CartItem, Product } from "@/types/database";

type CartLine = {
  item: CartItem;
  product: Product;
  unitPrice: number;
  lineTotal: number;
};

type CartDrawerProps = {
  lines: CartLine[];
  subtotal: number;
  cartCount: number;
};

export function CartDrawer({ lines, subtotal, cartCount }: CartDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}
          className="relative rounded-full"
        >
          <ShoppingBag className="size-5" />
          {cartCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-semibold leading-none text-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="font-display text-xl font-bold tracking-tight">
            Your bag
            {cartCount > 0 ? (
              <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                ({cartCount} {cartCount === 1 ? "item" : "items"})
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="size-10 text-muted-foreground/40" />
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              your bag is empty
            </p>
            <p className="text-sm text-muted-foreground">
              Pick something from the catalog.
            </p>
            <Button asChild size="sm" className="mt-1 rounded-full">
              <Link href="/catalog">Browse catalog</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {lines.map((line) => (
                <CartLineItem
                  key={line.item.id}
                  item={line.item}
                  product={line.product}
                  unitPrice={line.unitPrice}
                  lineTotal={line.lineTotal}
                />
              ))}
            </ul>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {formatPaiseToINR(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipping calculated at checkout.
              </p>
              <Button asChild size="lg" className="mt-4 h-11 w-full rounded-full">
                <Link href="/cart">View full cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
