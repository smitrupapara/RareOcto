import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground">
          404 — product not found
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95]">
          That wallpaper rolled away.
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          The piece you&apos;re looking for isn&apos;t in the catalog. Try the full
          collection — there&apos;s plenty more to stick on a wall.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href="/catalog">Browse catalog</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
