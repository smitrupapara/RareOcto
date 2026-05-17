# WhatsApp OTP Login Setup — RareOcto

Complete step-by-step guide for implementing phone-only login with WhatsApp OTP via Supabase's Send SMS Hook + MSG91. Follow phases in order; phases 1–5 are external (dashboard / accounts), phases 6–10 are code in this repo.

## Context

The Next.js 16 app already has Supabase clients scaffolded (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`) and `types/database.ts` with a `Profile`/`profiles` shape — but **no Supabase project exists, no env vars are set, the database tables haven't been created, no root `middleware.ts` invokes the session refresh, and there's no auth UI**. This guide closes all of those gaps.

Goal: phone-only login using **WhatsApp OTP** (no email/password fallback). Auth handled by Supabase Auth (`signInWithOtp` with `phone`); OTP delivery is intercepted via Supabase's **"Send SMS Hook"** which forwards the code to **MSG91 WhatsApp API**. First-time users are routed through `/onboarding` to fill name (and optional email) before being sent to `/`. Returning users go straight to `/`.

Why this stack:
- **Send SMS Hook** keeps Supabase as the single source of truth for sessions (no custom OTP storage), but lets us swap SMS for WhatsApp delivery transparently.
- **MSG91** is cheap in India, has fast WhatsApp template approval, and a simple HTTP API. (Gupshup/Interakt are interchangeable — same hook shape.)
- **DB trigger** auto-creates a `profiles` row with the phone when `auth.users` is inserted, so app code only deals with one table.

---

## Phase 1 — External setup (one-time, manual)

### 1a. Create Supabase project
- Go to https://supabase.com/dashboard → New project → name `rareocto`, region `Mumbai (ap-south-1)`, generate a strong DB password.
- After provisioning, grab from **Project Settings → API**:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
- **Authentication → Providers → Phone**: enable Phone provider. Don't pick a provider yet — we'll override delivery via the hook.

### 1b. Create MSG91 account + WhatsApp sender
- Sign up at https://msg91.com → KYC + add credits.
- **Inbox → WhatsApp** → register your business number with Meta (takes a few hours). Note the `integrated_number`.
- **Auth Key** at top right → save as `MSG91_AUTH_KEY`.
- Create a WhatsApp **template** named e.g. `rareocto_otp` with body: `Your RareOcto verification code is {{1}}. Valid for 10 minutes.` Submit for approval (usually <1 hour). Note the template name, language, and namespace.

### 1c. Configure Supabase Auth — phone settings
- **Authentication → Settings → Phone Auth**: set OTP length `6`, OTP expiry `600`s, enable "Allow phone signups".
- Do NOT configure Twilio/MessageBird here — the Send SMS Hook intercepts before any provider call.

---

## Phase 2 — Environment variables

Create `.env.local` at project root (gitignored). Do **not** commit.

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Add `.env.example` (committed, no secrets) listing the same keys with empty values.

MSG91 secrets live as **Edge Function secrets** (Phase 4), not in `.env.local`.

---

## Phase 3 — Database schema

Create `supabase/migrations/0001_init_auth.sql`. Run via Supabase SQL Editor (or `supabase db push` if CLI is set up).

```sql
-- enums
create type public.role as enum ('user', 'admin');
create type public.product_size as enum ('S', 'M', 'L');
create type public.category as enum ('abstract','botanical','geometric','mural','kids','minimal');
create type public.order_status as enum ('created','pending','paid','shipped','delivered','cancelled','refunded');

-- profiles (only this table is needed for login; products/orders deferred)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text,
  name text,
  role public.role not null default 'user',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
-- inserts happen via trigger (security definer), not user code

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

A profile is "complete" iff `name is not null`. Middleware uses this to choose between `/onboarding` and `/`.

Other tables (`products`, `cart_items`, `orders`, `saved_previews`) are out of scope for login.

---

## Phase 4 — Edge Function: WhatsApp OTP delivery

Create `supabase/functions/send-whatsapp-otp/index.ts`. Deploy with `supabase functions deploy send-whatsapp-otp`.

Receives the Send SMS Hook payload, verifies its HMAC signature, calls MSG91 WhatsApp API.

```ts
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET")!.replace("v1,whsec_", "");
  const wh = new Webhook(secret);
  const { user, sms } = wh.verify(payload, headers) as {
    user: { phone: string };
    sms: { otp: string };
  };

  const res = await fetch(
    "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      method: "POST",
      headers: {
        authkey: Deno.env.get("MSG91_AUTH_KEY")!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        integrated_number: Deno.env.get("MSG91_WHATSAPP_NUMBER"),
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: Deno.env.get("MSG91_TEMPLATE_NAME"),
            language: { code: "en", policy: "deterministic" },
            namespace: Deno.env.get("MSG91_TEMPLATE_NAMESPACE"),
            to_and_components: [{
              to: [user.phone],
              components: { body_1: { type: "text", value: sms.otp } },
            }],
          },
        },
      }),
    }
  );

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: await res.text() } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  return new Response("{}", { headers: { "content-type": "application/json" } });
});
```

Set function secrets:
```
supabase secrets set MSG91_AUTH_KEY=... MSG91_WHATSAPP_NUMBER=91xxxxxxxxxx \
  MSG91_TEMPLATE_NAME=rareocto_otp MSG91_TEMPLATE_NAMESPACE=...
# SEND_SMS_HOOK_SECRET is auto-set when the hook is registered (Phase 5)
```

---

## Phase 5 — Register the Send SMS Hook

In Supabase Dashboard: **Authentication → Hooks → Send SMS hook**:
- Type: HTTPS
- URL: `https://<project-ref>.functions.supabase.co/send-whatsapp-otp`
- Generate secret → copy it as `SEND_SMS_HOOK_SECRET` into Edge Function secrets (above).
- Enable.

Now any `signInWithOtp({ phone })` call routes through our function instead of Supabase's default SMS path.

---

## Phase 6 — Root middleware

Create `middleware.ts` at project root:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/account", "/onboarding"];
const AUTH_ONLY  = ["/login"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (PROTECTED.some(p => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (AUTH_ONLY.some(p => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/", request.url));
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
```

(Profile-completeness check runs on every authed request — cheap because it's a single indexed lookup. Move into a layout if it becomes a hot path.)

---

## Phase 7 — Auth helpers

Add `lib/auth.ts`:
```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  if (!user) redirect("/login");
  return user;
}
```

Reused by `/onboarding`, `/account`, and the nav.

---

## Phase 8 — Login flow

### Files
- `app/(auth)/layout.tsx` — minimal centered layout for auth pages (no nav/footer).
- `app/(auth)/login/page.tsx` — server component, renders `<LoginForm />`.
- `components/auth/login-form.tsx` — client component, two-step form (phone → OTP).
- `app/(auth)/login/actions.ts` — server actions: `requestOtp`, `verifyOtp`.

### `actions.ts`
```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const phoneSchema = z.object({ phone: z.string().regex(/^\+91[6-9]\d{9}$/) });
const otpSchema   = z.object({ phone: z.string(), token: z.string().regex(/^\d{6}$/) });

export async function requestOtp(formData: FormData) {
  const { phone } = phoneSchema.parse({ phone: formData.get("phone") });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: "sms" } });
  // channel: "sms" — Supabase doesn't know it's WhatsApp; the hook does the redirect transparently.
  if (error) return { error: error.message };
  return { ok: true, phone };
}

export async function verifyOtp(formData: FormData) {
  const { phone, token } = otpSchema.parse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { error: error.message };
  redirect("/");
}
```

### `<LoginForm />`
Uses **react-hook-form + Zod** (already installed). Two states: `step: 'phone' | 'otp'`. Country code locked to `+91` (display) + auto-prepended on submit; OTP can be six 1-character inputs or one 6-digit field. Resend OTP button visible after a 30s countdown. Style matches existing brand — `bg-background`, `font-display` for headings, `Button` from `components/ui/button.tsx`.

---

## Phase 9 — Onboarding flow

### Files
- `app/(auth)/onboarding/page.tsx` — server component. Calls `requireUser()`, fetches profile with `.select("*")` (not `.select("name")`); if `name` is set, `redirect("/")`. Else renders `<OnboardingForm />`.
- `components/auth/onboarding-form.tsx` — client component. Inputs: `name` (required, 2–60 chars), `email` (optional, valid email).
- `app/(auth)/onboarding/actions.ts`:

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().optional().or(z.literal("")),
});

export async function completeProfile(formData: FormData) {
  const parsed = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.name, email: parsed.email || null })
    .eq("id", user.id);
  if (error) return { error: error.message };
  redirect("/");
}
```

---

## Phase 10 — Nav integration + signout

### Update `app/(public)/layout.tsx`
Make it `async`, fetch profile via `getCurrentProfile()`, pass to `<SiteNav />`.

```tsx
const profile = await getCurrentProfile();
return (
  <div className="flex min-h-screen flex-col">
    <SiteNav profile={profile} />
    <main className="flex-1">{children}</main>
    <SiteFooter />
  </div>
);
```

### Update `components/sections/site-nav.tsx`
Add a `profile?: Profile | null` prop. Right-side action group:
- If `!profile` → `<Button asChild variant="ghost"><Link href="/login">Login</Link></Button>`
- Else → DropdownMenu (already in `components/ui/dropdown-menu.tsx`) with profile.name (header), `Account` link, and `<form action={signOut}>` button.

### Add `lib/auth-actions.ts`
```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

### Optional `/account` page
Server component rendering `profile.phone`, `profile.name`, `profile.email`, `created_at`, and a sign-out button. Can be deferred.

---

## Files to modify / create

**New**
- `.env.local`, `.env.example`
- `middleware.ts` (root)
- `lib/auth.ts`
- `lib/auth-actions.ts`
- `supabase/migrations/0001_init_auth.sql`
- `supabase/functions/send-whatsapp-otp/index.ts`
- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/actions.ts`
- `app/(auth)/onboarding/page.tsx`
- `app/(auth)/onboarding/actions.ts`
- `components/auth/login-form.tsx`
- `components/auth/onboarding-form.tsx`

**Modified**
- `app/(public)/layout.tsx` — async, fetch profile, pass to SiteNav
- `components/sections/site-nav.tsx` — `profile` prop, login button / user dropdown
- `types/database.ts` — see note below

**Reused (no changes)**
- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- `components/ui/button.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/sheet.tsx`

### `types/database.ts` — implementation divergence

The doc originally listed this as "Reused (no changes)", but it required three modifications to satisfy `@supabase/supabase-js`'s internal TypeScript constraints:

1. **`interface` → `type` aliases (required).** All seven domain types (`Profile`, `Product`, `SavedPreview`, `CartItem`, `Address`, `OrderLineItem`, `Order`) were declared as `interface`. TypeScript's conditional type evaluation treats `interface X {}` differently from `type X = {}` — specifically, `interface Profile` does **not** extend `Record<string, unknown>` in a distributive conditional check, but `type Profile = { ... }` does. Supabase's `GenericTable` requires `Row: Record<string, unknown>`, so `interface` Row types cause `Database['public'] extends GenericSchema` to evaluate to `false`, which makes `SupabaseClient` set `Schema = never`, and every `.from()` call returns `never`. Fix: convert all declarations to `type`.

2. **`Relationships: []` added to every table entry (required).** The `Database.public.Tables.*` entries must include `Relationships: []` (or a typed relationships array) to satisfy the full `GenericTable` shape.

3. **`Views`/`Functions` shape (minor).** Changed from `Record<string, never>` to `{ [_ in never]: never }` (empty mapped type). Both forms satisfy `GenericSchema`'s constraints, but the empty mapped type avoids potential index-signature intersection issues with stricter TypeScript settings.

---

## Verification

1. **Build**: `npm run build` — must succeed (TypeScript strict).
2. **Dev**: `npm run dev` → `http://localhost:3000`.
3. **Unauthed flow**:
   - Visit `/` → "Login" button appears in nav.
   - Click → `/login`. Enter your WhatsApp-active phone (`9876543210` → submitted as `+919876543210`).
   - WhatsApp message arrives within ~5s with the OTP. Inspect Edge Function logs in Supabase Dashboard if it doesn't.
   - Enter OTP → submit. Server verifies; middleware sees profile.name is null → redirects to `/onboarding`.
4. **Onboarding**: enter name, optional email → submit → land on `/`.
5. **Returning user**: sign out from nav dropdown → log in again → should land directly on `/` (no onboarding detour).
6. **Protected route**: visit `/onboarding` while logged out → bounced to `/login`. Visit `/login` while logged in → bounced to `/`.
7. **DB sanity**: Supabase Table Editor — confirm one `auth.users` row + one `profiles` row per user, with phone populated and `name` filled after onboarding.
8. **RLS**: from another user's session, `supabase.from('profiles').select('*')` must only return own row.

If WhatsApp delivery fails: check Edge Function logs for HMAC verification errors (secret mismatch) or MSG91 API errors (template not approved, number not opted-in during sandbox).

---

## Out of scope (do later)

- Other tables (`products`, `cart_items`, `orders`, `saved_previews`) and their RLS policies.
- Admin role workflows (`role = 'admin'` is in the schema but nothing reads it yet).
- Rate limiting on OTP requests beyond Supabase's defaults.
- E2E tests with Playwright.
- Account-page edit-profile form (phone change, email change).

---

## Public-first auth pattern

Most of the app is **public**. Login is only required for personal/account features and for protected actions like Add-to-Cart and Try-On. Anyone can browse `/` and `/catalog` without an account.

### What's protected

`middleware.ts` keeps an allowlist of protected path prefixes:

```ts
const PROTECTED = ["/account", "/onboarding", "/try-on"];
```

Anything not in that list is open. When an unauthenticated user hits a protected path, middleware redirects to `/login?next=<original-path>`, and on successful OTP verification `verifyOtp` redirects them back. If a logged-in user hits `/login?next=/catalog`, middleware short-circuits straight to `/catalog` instead of `/`.

### The `?next=` round-trip

`next` flows through four places — each layer validates with `safeNext()` from `lib/auth.ts` so an attacker can't redirect users off-site.

1. **`middleware.ts`** sets `?next=<pathname>` when bouncing a logged-out user from a protected route.
2. **`LoginForm`** (`components/auth/login-form.tsx`) reads `useSearchParams().get("next")` and includes it in the OTP submission `FormData`.
3. **`verifyOtp`** (`app/(auth)/login/actions.ts`) reads `formData.get("next")`, runs `safeNext()`, and `redirect()`s there.
4. **`requireUser`** (`lib/auth.ts`) reads the current pathname from the `x-pathname` request header (set by middleware) and builds the same `/login?next=...` URL.

`safeNext` rejects absolute URLs (`https://evil.com`), protocol-relative URLs (`//evil.com`), and `/login` itself (loop prevention). Always pipe untrusted `next` values through it before redirecting.

### How to gate a whole page

Two options — pick based on whether the gate is centralized or per-page logic.

**Option A — middleware (preferred when the rule is just "must be logged in")**:

Add the path prefix to `PROTECTED` in `middleware.ts`. Zero per-page code. This is what `/try-on` uses.

**Option B — `requireUser()` in a server component (when you also need the user object or per-page logic)**:

```tsx
// app/(public)/try-on/page.tsx
import { requireUser } from "@/lib/auth";

export default async function TryOnPage() {
  const user = await requireUser(); // redirects to /login?next=/try-on if logged out
  return <TryOnTool userId={user.id} />;
}
```

### How to gate a button (Add-to-Cart pattern)

Use `<AuthGatedButton>` from `components/auth/auth-gated-button.tsx`. The parent server component decides whether the viewer is logged in; the button handles the redirect itself if not.

```tsx
// In a server component (e.g. catalog page)
import { getCurrentUser } from "@/lib/auth";
import { AuthGatedButton } from "@/components/auth/auth-gated-button";
import { addToCart } from "./actions"; // a server action

export default async function CatalogPage() {
  const user = await getCurrentUser();
  return (
    <ProductCard>
      <AuthGatedButton
        isAuthed={!!user}
        onAction={() => addToCart(productId)}
        size="lg"
      >
        Add to cart
      </AuthGatedButton>
    </ProductCard>
  );
}
```

- Logged in → calls `onAction()` (the server action runs as normal).
- Logged out → `router.push('/login?next=' + encodeURIComponent(currentPath))`. After OTP, user lands back on the catalog and clicks Add-to-Cart again.

The button defaults `next` to `usePathname()` — pass `next="/catalog/some-product"` explicitly only if the current path isn't where you want them to return.

### How to gate a server action (defence in depth)

Any server action that mutates per-user state must still verify the session server-side, even if the UI gate is in place. Use `getCurrentUser()` and bail early:

```ts
"use server";
import { getCurrentUser } from "@/lib/auth";

export async function addToCart(productId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  // ... insert into cart_items
}
```

Don't rely on the client-side gate alone — a logged-out user could still invoke the action directly via the network layer.
