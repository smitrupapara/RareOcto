import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground">
          404 — wall not found
        </p>
        <h1 className="mt-3 font-display text-6xl font-bold leading-[0.9]">
          This page peeled off.
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          Looks like the magnet lost its grip. Let&apos;s stick something else up.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </main>
  );
}
