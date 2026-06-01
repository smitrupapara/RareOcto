"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { safeNext } from "@/lib/auth";

const phoneSchema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/) });
const otpSchema = z.object({
  phone: z.string(),
  token: z.string().regex(/^\d{6}$/),
});

// Max 3 OTP requests per phone per 10 minutes
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX = 3;
const otpRateMap = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = otpRateMap.get(phone);
  if (!entry || now >= entry.resetAt) {
    otpRateMap.set(phone, { count: 1, resetAt: now + OTP_WINDOW_MS });
    return true;
  }
  if (entry.count >= OTP_MAX) return false;
  entry.count++;
  return true;
}

export async function requestOtp(formData: FormData) {
  const result = phoneSchema.safeParse({ phone: formData.get("phone") });
  if (!result.success) return { error: "Enter a valid 10-digit Indian mobile number" };

  if (!checkOtpRateLimit(result.data.phone)) {
    return { error: "Too many OTP requests. Please wait 10 minutes before trying again." };
  }

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
  return { ok: true, next };
}
