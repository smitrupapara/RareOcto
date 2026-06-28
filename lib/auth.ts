import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Request-level memoization (React `cache`) guarantees a single
// `supabase.auth.getUser()` per request render. Without this, the public
// layout (getCurrentProfile + getCurrentUser) and each page (getCurrentUser)
// fire multiple *concurrent* getUser() calls. When the access token is expired
// they all try to refresh with the same refresh token; @supabase/ssr rotates
// it, so the first call consumes it and the others refresh against a consumed
// token and return null — making an authenticated user look signed-out
// (broken add-to-cart / review). One shared call removes that race entirely.
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

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
