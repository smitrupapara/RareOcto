# lib/supabase — Reference

Three Supabase client factories — one per execution context. **Never import the wrong one.** Each uses the typed `Database` from `@/types/database`.

## server.ts — `createSupabaseServerClient()`
- **Use in**: Server Components, Server Actions, Route Handlers
- **Async**: yes — uses `cookies()` from `next/headers`
- **Cookie strategy**:
  - `getAll()`: reads from the request cookie store
  - `setAll()`: wrapped in `try/catch` — Server Components are read-only for cookies and will throw. The middleware (`updateSession`) is responsible for actually refreshing cookies on the response. Swallowing the error here is correct, not a bug
- **Auth refresh**: does NOT refresh tokens itself. Relies on middleware running on the request first
- **Marker**: must be imported only in files marked `"use server"` or in server components — adding `import "server-only"` at the top of consumers (like `lib/catalog/queries.ts`) enforces this at build time

## client.ts — `createSupabaseBrowserClient()`
- **Use in**: Client Components (`"use client"`)
- **Sync**: yes — no cookies prelude
- **Underlying**: `@supabase/ssr` `createBrowserClient` (reads cookies via `document.cookie`)
- **Pattern**: instantiate once per component, or memoize via `useMemo`. The factory itself is cheap but creating a new client every render means losing auth listener registrations

## middleware.ts — `updateSession(request)`
- **Use in**: ONLY `middleware.ts` at project root
- **Returns**: `NextResponse` with refreshed Supabase cookies
- **Cookie dance**: critical and easy to get wrong
  1. Start with `NextResponse.next({ request })`
  2. Build a server client whose `getAll` reads the request, whose `setAll` writes to BOTH `request.cookies` (so downstream Route Handlers see fresh values) AND a freshly-recreated response (so the browser receives the Set-Cookie headers)
  3. **`setAll` reassigns `response` to a new `NextResponse.next({ request })` after mutating request cookies** — this is required, not optional. Skipping it leaves stale cookies on the response object
  4. Call `await supabase.auth.getUser()` — this triggers the refresh if tokens are expired
- **Why call getUser() if we don't use the result?** It's the only documented way to force `@supabase/ssr` to run its refresh-and-Set-Cookie path

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL` — used by all three factories. `NEXT_PUBLIC_*` because the browser client needs it
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same. RLS guards data; anon key is safe to expose
- `SUPABASE_SERVICE_ROLE_KEY` — never imported here. Only `scripts/seed-products.ts` uses it (via raw `createClient`) and it must never be sent to the browser

## Gotchas
- **Never `await createSupabaseBrowserClient()`** — it's sync. TypeScript will flag this but error messages can mislead
- **Calling `createSupabaseServerClient()` outside an async context fails** (`cookies()` requires the request scope). Don't put it at module top-level
- **The middleware client uses `setAll: () => {}` in `middleware.ts:22`** — a SECOND server client built inside the root middleware just to read the user. It does not refresh cookies; that's already done by `updateSession()` higher up. Don't merge them
- **Cookies from `setAll()` in server.ts silently fail in RSC** — that's intentional. If you genuinely need to write cookies (logout, OTP verify), do it in a Server Action or Route Handler, not an RSC

## Related
- See [[middleware]] for how the root `middleware.ts` chains `updateSession()` with route gating
- See [[lib-auth]] for `getCurrentUser()`/`requireUser()` consumers
- See [[supabase-migrations]] for RLS policies that make the anon key safe
