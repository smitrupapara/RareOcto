import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

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

type Crumb = { label: string; href?: string };

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!last ? (
                <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function buildProductBreadcrumbs(
  category: Category[],
  productName: string,
): Crumb[] {
  const primary = category[0];
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/catalog" },
  ];
  if (primary) {
    crumbs.push({
      label: CATEGORY_LABEL[primary],
      href: `/catalog?category=${primary}`,
    });
  }
  crumbs.push({ label: productName });
  return crumbs;
}
