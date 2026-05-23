"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const updateSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(5),
});

export async function updateCartQuantityAction(
  cartItemId: string,
  quantity: number,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse({ cartItemId, quantity });
  if (!parsed.success) return { ok: false, error: "Invalid quantity" };

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity: parsed.data.quantity })
    .eq("id", parsed.data.cartItemId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not update cart" };

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCartAction(
  cartItemId: string,
): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(cartItemId);
  if (!parsed.success) return { ok: false, error: "Invalid item" };

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not remove item" };

  revalidatePath("/cart");
  return { ok: true };
}

export async function clearCartAction(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not clear cart" };

  revalidatePath("/cart");
  return { ok: true };
}
