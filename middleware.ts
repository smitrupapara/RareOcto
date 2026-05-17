import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "@/lib/auth";

const PROTECTED = ["/account", "/onboarding", "/try-on"];
const AUTH_ONLY = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Expose the current path to server components via headers() so requireUser()
  // can construct a /login?next=<path> redirect without each caller passing it.
  request.headers.set("x-pathname", pathname);

  const response = await updateSession(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (PROTECTED.some(p => pathname.startsWith(p)) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (AUTH_ONLY.some(p => pathname.startsWith(p)) && user) {
    const requestedNext = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(requestedNext ?? "/", request.url));
  }

  if (user && !pathname.startsWith("/onboarding") && !pathname.startsWith("/auth")) {
    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (profile && profile.name === null) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|mp4)$).*)"],
};
