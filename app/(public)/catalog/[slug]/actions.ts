"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MATERIAL_VALUES,
  SIZE_VALUES,
} from "@/lib/catalog/search";
import type { ProductMaterial, ProductSize } from "@/types/database";

const addToCartSchema = z.object({
  productId: z.string().uuid(),
  size: z.enum(SIZE_VALUES as [string, ...string[]]),
  material: z.enum(MATERIAL_VALUES as [string, ...string[]]),
  quantity: z.number().int().min(1).max(5),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addToCartAction(
  input: AddToCartInput,
): Promise<ActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid selection" };
  }
  const size = parsed.data.size as ProductSize;
  const material = parsed.data.material as ProductMaterial;

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, stock, available_sizes, available_materials")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  if (prodErr || !product) {
    return { ok: false, error: "Product unavailable" };
  }
  if (product.stock <= 0) {
    return { ok: false, error: "Out of stock" };
  }
  if (!product.available_sizes.includes(size)) {
    return { ok: false, error: "Size not available" };
  }
  if (!product.available_materials.includes(material)) {
    return { ok: false, error: "Material not available" };
  }

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId)
    .eq("size", size)
    .eq("material", material)
    .maybeSingle();

  if (existing) {
    const nextQty = Math.min(5, existing.quantity + parsed.data.quantity);
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Could not update cart" };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: parsed.data.productId,
      size,
      material,
      quantity: parsed.data.quantity,
    });
    if (error) return { ok: false, error: "Could not add to cart" };
  }

  revalidatePath(`/catalog/${product.slug}`);
  revalidatePath("/cart");
  return { ok: true };
}

export async function toggleFavoriteAction(
  productId: string,
): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(productId);
  if (!parsed.success) return { ok: false, error: "Invalid product" };

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();
  if (prodErr || !product) return { ok: false, error: "Product unavailable" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) return { ok: false, error: "Could not remove favorite" };
  } else {
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      product_id: productId,
    });
    if (error) return { ok: false, error: "Could not add favorite" };
  }

  revalidatePath(`/catalog/${product.slug}`);
  revalidatePath("/account/favorites");
  return { ok: true };
}

const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().max(2000).optional().nullable(),
});

export type SubmitReviewInput = z.infer<typeof reviewSchema>;

export async function submitReviewAction(
  input: SubmitReviewInput,
): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid review" };

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product unavailable" };

  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.productId,
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already reviewed this product" };
    }
    return { ok: false, error: "Could not save review" };
  }

  revalidatePath(`/catalog/${product.slug}`);
  return { ok: true };
}
