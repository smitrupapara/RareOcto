"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 280;
const MAX_LEN = 80;

export function CatalogSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";

  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef(initial);

  // Keep local state in sync if the URL changes from outside (browser back/forward).
  useEffect(() => {
    const next = searchParams.get("q") ?? "";
    if (next !== lastPushed.current) {
      lastPushed.current = next;
      setValue(next);
    }
  }, [searchParams]);

  function push(nextQ: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) {
      params.set("q", nextQ);
    } else {
      params.delete("q");
    }
    params.delete("page");
    const qs = params.toString();
    lastPushed.current = nextQ;
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next.trim()), DEBOUNCE_MS);
  }

  function onClear() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    push("");
  }

  return (
    <div className="relative w-full max-w-md">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search wallpapers, tags, vibes…"
        value={value}
        maxLength={MAX_LEN}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-full border border-border bg-background pl-10 pr-10 text-sm",
          "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-coral/40",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
