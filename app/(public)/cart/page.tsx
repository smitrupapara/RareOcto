import type { Metadata } from "next";
import Link from "next/link";

import { CartLineItem } from "@/components/catalog/cart-line-item";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCartForUser } from "@/lib/catalog/queries";
import { formatPaiseToINR } from "@/lib/catalog/format";

export const metadata: Metadata = {
  title: "Your cart — RareOcto",
  description: "Review and update the magnetic walls in your bag.",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const user = await requireUser();
  const { lines, subtotal } = await getCartForUser(user.id);

  if (lines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            your bag is empty
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Nothing stuck — yet.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
            Pick a piece from the catalog. We&apos;ll keep it warm here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/catalog">Browse catalog</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
          your bag
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Almost on the wall
        </h1>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <section aria-label="Cart items" className="lg:col-span-2">
          <ul className="divide-y divide-border border-y border-border">
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
        </section>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              order summary
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatPaiseToINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-muted-foreground">Calculated at checkout</dd>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-display text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPaiseToINR(subtotal)}</dd>
              </div>
            </dl>
            <Button
              type="button"
              size="lg"
              className="mt-6 h-12 w-full rounded-full text-base"
              disabled
            >
              Checkout (coming soon)
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Free shipping over ₹1,500. Easy returns within 14 days.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
