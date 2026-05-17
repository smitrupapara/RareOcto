import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const h = await headers();
    const pathname = h.get("x-pathname");
    const next = safeNext(pathname);
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}

// Validates a redirect target to prevent open-redirect attacks.
// Only same-origin relative paths are accepted, and /login itself is rejected
// to avoid post-login bounce loops.
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/login")) return null;
  return raw;
}
