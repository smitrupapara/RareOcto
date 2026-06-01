/**
 * Bulk-insert products from a CSV file into Supabase.
 *
 * Usage:
 *   tsx scripts/seed-products.ts scripts/products.csv
 *
 * Requires (server-only) env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service-role key bypasses RLS; never expose
 *
 * CSV columns (header row required, see products-template.csv):
 *   slug, name, description, category, base_price, sizes, materials,
 *   rooms, colors, patterns, styles,
 *   material_modifiers_json, dimensions_json, tags, stock, image_count,
 *   meta_title, meta_description
 *
 *   - category/sizes/materials/rooms/colors/patterns/styles/tags are
 *     pipe-separated (`S|M|L`). category requires at least one value.
 *     rooms/colors/patterns/styles are optional (empty allowed).
 *   - *_json columns are inline JSON strings
 *   - image_count is the number of images in `rareocto/products/<slug>/`;
 *     resolves to `['rareocto/products/<slug>/01', ..., '<NN>']`
 *   - base_price is in paise (i.e. ₹2499.00 → 249900)
 *
 * The script upserts on `slug` so re-runs update existing rows in place.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import type {
  Category,
  ColorPalette,
  Database,
  MaterialPriceModifier,
  PatternType,
  ProductDimensions,
  ProductMaterial,
  ProductSize,
  Room,
  StyleTheme,
} from "../types/database";
import {
  CATEGORY_VALUES,
  COLOR_VALUES,
  MATERIAL_VALUES,
  PATTERN_VALUES,
  ROOM_VALUES,
  SIZE_VALUES,
  STYLE_VALUES,
} from "../lib/catalog/search";

type CsvRow = Record<string, string>;

type ProductInsert = {
  slug: string;
  name: string;
  description: string;
  category: Category[];
  base_price: number;
  images: string[];
  available_sizes: ProductSize[];
  available_materials: ProductMaterial[];
  rooms: Room[];
  colors: ColorPalette[];
  patterns: PatternType[];
  styles: StyleTheme[];
  material_price_modifier: MaterialPriceModifier;
  dimensions: ProductDimensions;
  tags: string[];
  stock: number;
  meta_title: string | null;
  meta_description: string | null;
};

function fail(msg: string): never {
  console.error(`[seed] ${msg}`);
  process.exit(1);
}

/** Minimal RFC-4180-ish CSV parser. Handles quoted fields and doubled-quote escapes. */
function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  const text = input.replace(/\r\n/g, "\n");

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  // flush trailing cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((cells) => {
      const obj: CsvRow = {};
      header.forEach((key, idx) => {
        obj[key] = (cells[idx] ?? "").trim();
      });
      return obj;
    });
}

function splitPipe(value: string): string[] {
  return value
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseJsonField<T>(value: string, fallback: T, field: string, slug: string): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    fail(`row ${slug}: invalid JSON in ${field}: ${value}`);
  }
}

function buildImageIds(slug: string, count: number): string[] {
  if (!Number.isFinite(count) || count < 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `rareocto/products/${slug}/${n}`;
  });
}

function rowToProduct(row: CsvRow): ProductInsert {
  const slug = row.slug;
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(`bad slug: "${slug}" (expected kebab-case)`);
  }

  const categories = splitPipe(row.category).map((c) => {
    if (!CATEGORY_VALUES.includes(c as Category)) {
      fail(`row ${slug}: category "${c}" must be one of ${CATEGORY_VALUES.join(", ")}`);
    }
    return c as Category;
  });
  if (categories.length === 0) {
    fail(`row ${slug}: at least one category is required`);
  }

  const sizes = splitPipe(row.sizes).map((s) => {
    if (!SIZE_VALUES.includes(s as ProductSize)) {
      fail(`row ${slug}: size "${s}" must be one of ${SIZE_VALUES.join(", ")}`);
    }
    return s as ProductSize;
  });

  const materials = splitPipe(row.materials).map((m) => {
    if (!MATERIAL_VALUES.includes(m as ProductMaterial)) {
      fail(
        `row ${slug}: material "${m}" must be one of ${MATERIAL_VALUES.join(", ")}`,
      );
    }
    return m as ProductMaterial;
  });

  const rooms = splitPipe(row.rooms ?? "").map((r) => {
    if (!ROOM_VALUES.includes(r as Room)) {
      fail(`row ${slug}: room "${r}" must be one of ${ROOM_VALUES.join(", ")}`);
    }
    return r as Room;
  });

  const colors = splitPipe(row.colors ?? "").map((c) => {
    if (!COLOR_VALUES.includes(c as ColorPalette)) {
      fail(`row ${slug}: color "${c}" must be one of ${COLOR_VALUES.join(", ")}`);
    }
    return c as ColorPalette;
  });

  const patterns = splitPipe(row.patterns ?? "").map((p) => {
    if (!PATTERN_VALUES.includes(p as PatternType)) {
      fail(`row ${slug}: pattern "${p}" must be one of ${PATTERN_VALUES.join(", ")}`);
    }
    return p as PatternType;
  });

  const styles = splitPipe(row.styles ?? "").map((s) => {
    if (!STYLE_VALUES.includes(s as StyleTheme)) {
      fail(`row ${slug}: style "${s}" must be one of ${STYLE_VALUES.join(", ")}`);
    }
    return s as StyleTheme;
  });

  const basePrice = Number.parseInt(row.base_price, 10);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    fail(`row ${slug}: base_price must be a positive integer (paise), got "${row.base_price}"`);
  }
  const stock = Number.parseInt(row.stock || "0", 10);
  const imageCount = Number.parseInt(row.image_count || "0", 10);

  return {
    slug,
    name: row.name,
    description: row.description,
    category: categories,
    base_price: basePrice,
    images: buildImageIds(slug, imageCount),
    available_sizes: sizes,
    available_materials: materials,
    rooms,
    colors,
    patterns,
    styles,
    material_price_modifier: parseJsonField<MaterialPriceModifier>(
      row.material_modifiers_json,
      {},
      "material_modifiers_json",
      slug,
    ),
    dimensions: parseJsonField<ProductDimensions>(
      row.dimensions_json,
      {},
      "dimensions_json",
      slug,
    ),
    tags: splitPipe(row.tags),
    stock: Number.isFinite(stock) ? stock : 0,
    meta_title: row.meta_title ? row.meta_title : null,
    meta_description: row.meta_description ? row.meta_description : null,
  };
}

async function main() {
  const csvPathArg = process.argv[2];
  if (!csvPathArg) {
    fail("usage: tsx scripts/seed-products.ts <path-to-csv>");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    fail("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }

  const csvPath = resolve(process.cwd(), csvPathArg);
  const raw = await readFile(csvPath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    fail(`no data rows found in ${csvPath}`);
  }

  const products = rows.map(rowToProduct);
  console.log(`[seed] parsed ${products.length} products from ${csvPath}`);

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  let updated = 0;
  for (const product of products) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("products")
        .update(product)
        .eq("id", existing.id);
      if (error) fail(`update ${product.slug} failed: ${error.message}`);
      updated++;
      console.log(`[seed] updated ${product.slug}`);
    } else {
      const { error } = await supabase.from("products").insert(product);
      if (error) fail(`insert ${product.slug} failed: ${error.message}`);
      inserted++;
      console.log(`[seed] inserted ${product.slug}`);
    }
  }

  console.log(`[seed] done — ${inserted} inserted, ${updated} updated`);
}

main().catch((err) => {
  console.error("[seed] fatal", err);
  process.exit(1);
});
