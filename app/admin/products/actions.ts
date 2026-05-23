"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CATEGORY_VALUES,
  MATERIAL_VALUES,
  SIZE_VALUES,
} from "@/lib/catalog/search";
import type {
  Category,
  ProductMaterial,
  ProductSize,
} from "@/types/database";

type ProductInsertRow = {
  slug: string;
  name: string;
  description: string;
  category: Category;
  base_price: number;
  images: string[];
  available_sizes: ProductSize[];
  available_materials: ProductMaterial[];
  material_price_modifier: Partial<Record<ProductMaterial, number>>;
  dimensions: Partial<Record<ProductSize, { w_cm: number; h_cm: number }>>;
  tags: string[];
  stock: number;
  meta_title: string | null;
  meta_description: string | null;
};

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use kebab-case (a-z, 0-9, hyphens)");

const dimensionsSchema = z
  .record(
    z.enum(SIZE_VALUES as [string, ...string[]]),
    z.object({
      w_cm: z.number().int().positive().max(1000),
      h_cm: z.number().int().positive().max(1000),
    }),
  )
  .default({});

const modifiersSchema = z
  .record(
    z.enum(MATERIAL_VALUES as [string, ...string[]]),
    z.number().int().min(-100000).max(1000000),
  )
  .default({});

const productSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(5000),
  category: z.enum(CATEGORY_VALUES as [string, ...string[]]),
  base_price: z.number().int().min(0).max(100_000_00),
  images: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  available_sizes: z.array(z.enum(SIZE_VALUES as [string, ...string[]])).min(1),
  available_materials: z.array(z.enum(MATERIAL_VALUES as [string, ...string[]])).min(1),
  material_price_modifier: modifiersSchema,
  dimensions: dimensionsSchema,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  stock: z.number().int().min(0).max(100_000),
  meta_title: z.string().trim().max(160).optional().nullable(),
  meta_description: z.string().trim().max(320).optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/products");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

function flattenIssues(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createProductAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid product",
      fieldErrors: flattenIssues(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();
  const row = parsed.data as unknown as ProductInsertRow;
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with this slug already exists",
        fieldErrors: { slug: "Slug already in use" },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${parsed.data.slug}`);
  revalidatePath("/admin/products");
  return { ok: true, id: data.id };
}

export async function updateProductAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid product id" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid product",
      fieldErrors: flattenIssues(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();

  // Fetch existing slug so we can invalidate the old URL if the slug changed.
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const row = parsed.data as unknown as ProductInsertRow;
  const { error } = await supabase
    .from("products")
    .update(row)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with this slug already exists",
        fieldErrors: { slug: "Slug already in use" },
      };
    }
    return { ok: false, error: error.message };
  }

  if (existing?.slug && existing.slug !== parsed.data.slug) {
    revalidatePath(`/catalog/${existing.slug}`);
  }
  revalidatePath("/catalog");
  revalidatePath(`/catalog/${parsed.data.slug}`);
  revalidatePath(`/admin/products/${id}/edit`);
  revalidatePath("/admin/products");
  return { ok: true, id };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid product id" };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (existing?.slug) revalidatePath(`/catalog/${existing.slug}`);
  revalidatePath("/catalog");
  revalidatePath("/admin/products");
  return { ok: true, id };
}

export async function reorderProductImagesAction(
  id: string,
  images: string[],
): Promise<ActionResult> {
  await requireAdmin();
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid product id" };
  const imgParsed = z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .safeParse(images);
  if (!imgParsed.success) return { ok: false, error: "Invalid images list" };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("products")
    .update({ images: imgParsed.data })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (existing?.slug) revalidatePath(`/catalog/${existing.slug}`);
  revalidatePath(`/admin/products/${id}/edit`);
  return { ok: true, id };
}
