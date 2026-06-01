# lib — Reference

Top-level shared utilities. Sub-packages have their own CLAUDE.md:
- [[lib-supabase]] — Supabase client factories
- [[lib-catalog]] — catalog queries, filter parsing, price formatting
- [[lib-cloudinary]] — image URL builders

This file covers the loose top-level files only.

## utils.ts — `cn(...)`
- Single export: `cn(...inputs: ClassValue[]) → string`
- Implementation: `twMerge(clsx(...inputs))`
- **Use everywhere we conditionally compose Tailwind classes**. Standard shadcn convention
- `clsx` handles truthy/falsy/object/array inputs; `twMerge` resolves Tailwind conflicts (e.g. `cn("p-2", isLarge && "p-4")` → `"p-4"`)

## auth.ts — Auth helpers (server-only by convention)

### `getCurrentUser()` → `User | null`
- Wraps `supabase.auth.getUser()` — returns the user or null
- Always async — uses the server client which needs `cookies()`
- Does NOT throw — callers check for null

### `getCurrentProfile()` → `Profile | null`
- Fetches `public.profiles` row for the current user
- Returns null if not authed OR if profile row missing (newly-created auth.users with no profile yet)

### `requireUser()` → `User` (or redirects)
- Calls `getCurrentUser()`; if null, **redirects to `/login?next=<x-pathname>`**
- Reads `x-pathname` header (set by root `middleware.ts`) so the login page knows where to send the user back
- `safeNext` sanitizes the next path before encoding it
- Uses `redirect()` from `next/navigation` — this throws a `NEXT_REDIRECT` error which Next intercepts. Don't wrap in try/catch
- Use in any Server Component / Server Action that requires auth: `const user = await requireUser()`

### `safeNext(raw)` → `string | null`
- Open-redirect guard
- Accepts only same-origin relative paths starting with `/`
- Rejects `//host.com` (would be parsed as absolute)
- Rejects `/login` itself (prevents post-login bounce loops)
- Exported for use in middleware AUTH_ONLY redirect target

## auth-actions.ts — `signOut`
- `"use server"` server action
- Calls `supabase.auth.signOut()` then `redirect("/")`
- Used by SiteNav and account menu
- Form-action pattern: `<form action={signOut}><button>Sign out</button></form>` — no JS required on the client

## Gotchas
- **Don't `await getCurrentUser()` in middleware** — middleware has its own Supabase client (`updateSession`). Mixing them causes the cookie refresh dance to misbehave
- **`requireUser()` only works inside a request scope** — calling it from a cron job or background worker will fail because `cookies()` and `headers()` need the request context
- **`safeNext` does NOT validate that the target exists** — only that it's same-origin and not /login. A 404 after login is acceptable; an open redirect is not
- **`auth-actions.ts` is the only place we explicitly mark `"use server"` at file level for these helpers** — `auth.ts` exports both server-callable functions (`getCurrentUser`, etc.) and a pure function (`safeNext`). It is conventionally used only from server contexts. If you ever need `safeNext` on the client, factor it into its own file with no Supabase imports

## Related
- See [[components-auth]] for the form consumers
- See [[middleware]] for the `x-pathname` header bridge
- See [[lib-supabase]] for the underlying client factories
