"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHOW_PRICE } from "@/lib/catalog/format";
import {
  CATEGORY_VALUES,
  COLOR_VALUES,
  PATTERN_VALUES,
  ROOM_VALUES,
  SORT_KEYS,
  STYLE_VALUES,
  type SortKey,
} from "@/lib/catalog/search";

const CATEGORY_LABEL: Record<(typeof CATEGORY_VALUES)[number], string> = {
  abstract: "Abstract",
  botanical: "Botanical",
  geometric: "Geometric",
  mural: "Mural",
  kids: "Kids",
  minimal: "Minimal",
  "3d": "3D",
  illustration: "Illustration",
};

const ROOM_LABEL: Record<(typeof ROOM_VALUES)[number], string> = {
  "living-room": "Living room",
  bedroom: "Bedroom",
  "kids-room": "Kids room",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  study: "Study",
  hallway: "Hallway",
  "pooja-room": "Pooja room",
  "dining-area": "Dining area",
  pantry: "Pantry",
  foyer: "Foyer",
  cafe: "Cafe",
  restaurant: "Restaurant",
  office: "Office",
  retail: "Retail",
  salon: "Salon",
  "director-chamber": "Director chamber",
  "reception-area": "Reception area",
  "conference-room": "Conference room",
  "product-display": "Product display",
  "entrance-branding": "Entrance branding",
  nursery: "Nursery",
  classroom: "Classroom",
  playroom: "Playroom",
  "accent-wall": "Accent wall",
  entryway: "Entryway",
  balcony: "Balcony",
};

const COLOR_LABEL: Record<(typeof COLOR_VALUES)[number], string> = {
  neutral: "Neutral",
  pastel: "Pastel",
  vibrant: "Vibrant",
  dark: "Dark",
  earthy: "Earthy",
  monochrome: "Monochrome",
  blue: "Blue",
  green: "Green",
  pink: "Pink",
  gold: "Gold",
  multi: "Multi",
};

const PATTERN_LABEL: Record<(typeof PATTERN_VALUES)[number], string> = {
  floral: "Floral",
  geometric: "Geometric",
  abstract: "Abstract",
  stripes: "Stripes",
  "polka-dots": "Polka dots",
  scenery: "Nature & scenery",
  mandala: "Mandala",
  typography: "Typography",
  animal: "Animal",
  tropical: "Tropical forest",
  solid: "Solid",
  organic: "Organic",
  "marble-granite": "Marble & granite",
  "world-map": "World map",
  "wood-grain": "Wood grain",
  "stone-texture": "Stone texture",
  "canvas-texture": "Canvas texture",
  divine: "Gods & deities",
};

const STYLE_LABEL: Record<(typeof STYLE_VALUES)[number], string> = {
  modern: "Modern",
  vintage: "Vintage",
  boho: "Boho",
  "traditional-indian": "Ancient Indian art",
  scandinavian: "Scandinavian",
  japandi: "Japandi",
  minimal: "Minimal",
  "art-deco": "Art deco",
  "mid-century": "Mid-century",
  rustic: "Rustic",
  contemporary: "Contemporary",
  egyptian: "Egyptian art",
};

const SORT_LABEL: Record<SortKey, string> = {
  new: "Newest",
  relevance: "Best match",
  price_asc: "Price · Low → High",
  price_desc: "Price · High → Low",
};

function sortedByLabel<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): T[] {
  return [...values].sort((a, b) => labels[a].localeCompare(labels[b]));
}

const SORTED_CATEGORIES = sortedByLabel(CATEGORY_VALUES, CATEGORY_LABEL);
const SORTED_ROOMS = sortedByLabel(ROOM_VALUES, ROOM_LABEL);
const SORTED_COLORS = sortedByLabel(COLOR_VALUES, COLOR_LABEL);
const SORTED_PATTERNS = sortedByLabel(PATTERN_VALUES, PATTERN_LABEL);
const SORTED_STYLES = sortedByLabel(STYLE_VALUES, STYLE_LABEL);

const FILTER_KEYS = [
  "q",
  "category",
  "room",
  "color",
  "pattern",
  "style",
  "min",
  "max",
  "sort",
  "page",
] as const;

const ALL_VALUE = "__all__";

type FilterKey = "category" | "room" | "color" | "pattern" | "style";

type FilterConfig = {
  key: FilterKey;
  placeholder: string;
  allLabel: string;
  values: readonly string[];
  labels: Record<string, string>;
};

const FILTERS: FilterConfig[] = [
  {
    key: "category",
    placeholder: "Category",
    allLabel: "All categories",
    values: SORTED_CATEGORIES,
    labels: CATEGORY_LABEL,
  },
  {
    key: "room",
    placeholder: "Room",
    allLabel: "All rooms",
    values: SORTED_ROOMS,
    labels: ROOM_LABEL,
  },
  {
    key: "color",
    placeholder: "Color",
    allLabel: "All colors",
    values: SORTED_COLORS,
    labels: COLOR_LABEL,
  },
  {
    key: "pattern",
    placeholder: "Pattern",
    allLabel: "All patterns",
    values: SORTED_PATTERNS,
    labels: PATTERN_LABEL,
  },
  {
    key: "style",
    placeholder: "Style",
    allLabel: "All styles",
    values: SORTED_STYLES,
    labels: STYLE_LABEL,
  },
];

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
    room: searchParams.get("room") ?? "",
    color: searchParams.get("color") ?? "",
    pattern: searchParams.get("pattern") ?? "",
    style: searchParams.get("style") ?? "",
    sort: (searchParams.get("sort") as SortKey | null) ?? "new",
    min: searchParams.get("min") ?? "",
    max: searchParams.get("max") ?? "",
  };

  const anyActive =
    !!current.category ||
    !!current.room ||
    !!current.color ||
    !!current.pattern ||
    !!current.style ||
    !!current.min ||
    !!current.max ||
    !!searchParams.get("q");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
        {FILTERS.map((filter) => {
          const value = current[filter.key];
          return (
            <Select<string>
              key={filter.key}
              value={value === "" ? ALL_VALUE : value}
              onValueChange={(next) =>
                update({
                  [filter.key]: next === ALL_VALUE ? null : next,
                })
              }
            >
              <SelectTrigger
                aria-label={filter.placeholder}
                className={cn(
                  "w-full sm:w-auto",
                  value && "border-coral/60 bg-coral/5 text-foreground",
                )}
              >
                <SelectValue>
                  {value ? filter.labels[value] : filter.placeholder}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{filter.allLabel}</SelectItem>
                {filter.values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {filter.labels[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 sm:contents">
        {anyActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:order-first"
          >
            Clear all
          </button>
        ) : null}

        <Select<SortKey>
          value={current.sort}
          onValueChange={(next) =>
            update({ sort: next === "new" ? null : next })
          }
        >
          <SelectTrigger aria-label="Sort by" className="ml-auto">
            <ArrowUpDownIcon
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <SelectValue>{SORT_LABEL[current.sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_KEYS.filter(
              (s) => SHOW_PRICE || (s !== "price_asc" && s !== "price_desc"),
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
