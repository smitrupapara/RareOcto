"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().optional().or(z.literal("")),
});

export async function completeProfile(formData: FormData) {
  const result = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!result.success) return { error: "Please enter a valid name" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : null,
        name: result.data.name,
        email: result.data.email || null,
      },
      { onConflict: "id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
