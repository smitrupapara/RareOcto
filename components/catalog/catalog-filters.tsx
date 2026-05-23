"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_VALUES,
  MATERIAL_VALUES,
  SIZE_VALUES,
  SORT_KEYS,
  type SortKey,
} from "@/lib/catalog/search";

const CATEGORY_LABEL: Record<(typeof CATEGORY_VALUES)[number], string> = {
  abstract: "Abstract",
  botanical: "Botanical",
  geometric: "Geometric",
  mural: "Mural",
  kids: "Kids",
  minimal: "Minimal",
};

const MATERIAL_LABEL: Record<(typeof MATERIAL_VALUES)[number], string> = {
  "matte-vinyl": "Matte vinyl",
  "glossy-vinyl": "Glossy vinyl",
  "fabric-texture": "Fabric texture",
  "magnetic-base": "Magnetic base",
};

const SIZE_LABEL: Record<(typeof SIZE_VALUES)[number], string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
};

const SORT_LABEL: Record<SortKey, string> = {
  new: "Newest",
  relevance: "Best match",
  price_asc: "Price · Low → High",
  price_desc: "Price · High → Low",
};

const FILTER_KEYS = ["q", "category", "material", "size", "min", "max", "sort", "page"] as const;

const selectClass = cn(
  "h-10 rounded-full border border-border bg-background px-4 pr-9 text-sm",
  "appearance-none bg-[length:14px] bg-[right_0.85rem_center] bg-no-repeat",
  "bg-[url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27currentColor%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E\")]",
  "focus:outline-none focus:ring-2 focus:ring-coral/40",
);

export function CatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const k of FILTER_KEYS) params.delete(k);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const current = {
    category: searchParams.get("category") ?? "",
    material: searchParams.get("material") ?? "",
    size: searchParams.get("size") ?? "",
    sort: (searchParams.get("sort") as SortKey | null) ?? "new",
    min: searchParams.get("min") ?? "",
    max: searchParams.get("max") ?? "",
  };

  const anyActive =
    !!current.category ||
    !!current.material ||
    !!current.size ||
    !!current.min ||
    !!current.max ||
    !!searchParams.get("q");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Category"
        value={current.category}
        onChange={(e) => update({ category: e.target.value || null })}
        className={selectClass}
      >
        <option value="">All categories</option>
        {CATEGORY_VALUES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>

      <select
        aria-label="Material"
        value={current.material}
        onChange={(e) => update({ material: e.target.value || null })}
        className={selectClass}
      >
        <option value="">All materials</option>
        {MATERIAL_VALUES.map((m) => (
          <option key={m} value={m}>
            {MATERIAL_LABEL[m]}
          </option>
        ))}
      </select>

      <select
        aria-label="Size"
        value={current.size}
        onChange={(e) => update({ size: e.target.value || null })}
        className={selectClass}
      >
        <option value="">All sizes</option>
        {SIZE_VALUES.map((s) => (
          <option key={s} value={s}>
            {SIZE_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort"
        value={current.sort}
        onChange={(e) => update({ sort: e.target.value === "new" ? null : e.target.value })}
        className={selectClass}
      >
        {SORT_KEYS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABEL[s]}
          </option>
        ))}
      </select>

      {anyActive ? (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
