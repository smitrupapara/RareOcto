"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";

const phoneSchema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/) });
const otpSchema = z.object({
  phone: z.string(),
  token: z.string().regex(/^\d{6}$/),
});

export async function requestOtp(formData: FormData) {
  const result = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!result.success) return { error: "Enter a valid 10-digit Indian mobile number" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: result.data.phone,
    options: { channel: "sms" },
  });
  if (error) return { error: error.message };
  return { ok: true, phone: result.data.phone };
}

export async function verifyOtp(formData: FormData) {
  const result = otpSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });
  if (!result.success) return { error: "Enter the 6-digit code from WhatsApp" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: result.data.phone,
    token: result.data.token,
    type: "sms",
  });
  if (error) return { error: error.message };
  const next = safeNext(formData.get("next")?.toString());
  redirect(next ?? "/");
}
