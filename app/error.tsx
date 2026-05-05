"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          something tangled up
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold">Eight arms, one knot.</h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          A wall went off the grid. Try again — usually a refresh untangles it.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <a href="/">Back home</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
