import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { filtersToSearchString, type CatalogFilters } from "@/lib/catalog/search";

type CatalogPaginationProps = {
  filters: CatalogFilters;
  pageCount: number;
  basePath?: string;
};

function pageHref(
  filters: CatalogFilters,
  page: number,
  basePath: string,
): string {
  const qs = filtersToSearchString(filters, { page });
  return `${basePath}${qs}`;
}

/**
 * Compact page list: always show first, last, current and its neighbors.
 * Inserts a single ellipsis where the window doesn't touch the edges.
 */
function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}

export function CatalogPagination({
  filters,
  pageCount,
  basePath = "/catalog",
}: CatalogPaginationProps) {
  if (pageCount <= 1) return null;
  const current = filters.page;
  const pages = buildPageList(current, pageCount);
  const prevPage = Math.max(1, current - 1);
  const nextPage = Math.min(pageCount, current + 1);
  const prevDisabled = current <= 1;
  const nextDisabled = current >= pageCount;

  return (
    <nav
      aria-label="Catalog pagination"
      className="mt-12 flex items-center justify-center gap-1"
    >
      <Link
        href={pageHref(filters, prevPage, basePath)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : 0}
        scroll={false}
        className={cn(
          "flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm transition",
          prevDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-accent/40",
        )}
      >
        <ChevronLeft className="size-4" />
        Prev
      </Link>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`gap-${i}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(filters, p, basePath)}
            scroll={false}
            aria-current={p === current ? "page" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm transition",
              p === current
                ? "bg-foreground text-background"
                : "border border-border hover:bg-accent/40",
            )}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={pageHref(filters, nextPage, basePath)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : 0}
        scroll={false}
        className={cn(
          "flex h-9 items-center gap-1 rounded-full border border-border px-3 text-sm transition",
          nextDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-accent/40",
        )}
      >
        Next
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
