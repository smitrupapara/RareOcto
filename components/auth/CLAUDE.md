# components/auth — Reference

Forms and helpers for the WhatsApp/SMS OTP login flow and post-signup onboarding. All client components — server actions live in `app/(auth)/*/actions.ts`.

## login-form.tsx
- **Export**: `LoginForm()` — client component
- **Two-step state machine**: `step: "phone" | "otp"` (local `useState`)
- **Validation**: two `zod` schemas
  - `phoneSchema`: `/^[6-9]\d{9}$/` — 10-digit Indian mobile, must start 6/7/8/9 (no `+91` prefix in the input; it's prepended on submit)
  - `otpSchema`: `/^\d{6}$/` — 6-digit code
- **Forms**: two independent `useForm()` instances (`phoneForm`, `otpForm`) so resetting one doesn't touch the other
- **Server actions**: `requestOtp(FormData)` and `verifyOtp(FormData)` from `@/app/(auth)/login/actions`. Errors come back as `{ error: string }`; success returns `{ ok: true, next? }` (verify) or `{ ok, phone }` (request)
- **`next` redirect**: read from `useSearchParams().get("next")` and forwarded to `verifyOtp`; server passes it through `safeNext()`
- **Resend cooldown**: 30s countdown via `useState(countdown)` + `setTimeout(1s)` decrement loop. Resend button disabled while `countdown > 0 || isPending`
- **bfcache fix**: `pageshow` listener — if `e.persisted` (page restored from back/forward cache after logout/login), force `window.location.replace("/")` to bypass the stale logged-in shell
- **OTP input**: `inputMode="numeric"`, `maxLength={6}`, `autoFocus`, monospace with `tracking-[0.5em]` so each digit visually separates
- **Phone input**: `inputMode="numeric"`, `maxLength={10}`, baked-in `+91` prefix as a non-interactive `<span>` inside the bordered group
- **Error surfacing**: `serverError` (string) shown above the submit button; `setServerError("")` cleared on every new submit / Change number / Resend
- **`useTransition`**: wraps both server-action calls so the button can show "Sending…"/"Verifying…" without blocking re-render
- **`router.replace` on success** — never `push`, so the login page isn't in history

## onboarding-form.tsx
- **Export**: `OnboardingForm()` — client component
- **Purpose**: shown at `/onboarding` after OTP verify when `profiles.name` is null. Captures `name` (required) + `email` (optional)
- **Validation**: zod `{ name: 2-60 chars, email: valid OR empty string }`. The `.or(z.literal(""))` lets the field be left blank (RHF gives `""` not `undefined`)
- **Server action**: `completeProfile(FormData)` — upserts into `public.profiles` with `onConflict: "id"` so re-submits are idempotent
- **bfcache fix**: same `pageshow` listener as login-form
- **Redirect**: `window.location.replace("/")` on success — NOT `router.replace`. Full reload forces the middleware to re-evaluate the profile gate (otherwise the user gets bounced back to `/onboarding` from the prior cached server render)
- **`errors.root`**: server-side errors set via `setError("root", { message })` and shown above submit
- **Layout**: identical visual shell to login-form (same `max-w-sm` card + centered heading)

## auth-gated-button.tsx
- **Export**: `AuthGatedButton({ isAuthed, onAction, next?, ...buttonProps })`
- **Props**: extends `ButtonProps` (minus `onClick`); adds `isAuthed: boolean`, `onAction: () => void`, optional `next?: string`
- **Behavior**: if `isAuthed`, calls `onAction()`. Otherwise `router.push("/login?next=" + encodeURIComponent(next ?? pathname ?? "/"))`
- **Why this exists**: server components can't gate clicks directly — pass `isAuthed` down from the server boundary, hand off the click intent to this component. Used by FavoriteToggle, ProductBuyBox, ReviewForm, etc.
- **`next` precedence**: explicit prop `next` > current `pathname` > `/`
- **Important**: this component does NOT call any server action itself. The caller's `onAction` decides what runs once auth is confirmed

## Pages that consume these forms

| Route | Server file | Form |
|------|-------------|------|
| `/login` | `app/(auth)/login/page.tsx` | `<LoginForm />` |
| `/onboarding` | `app/(auth)/onboarding/page.tsx` | `<OnboardingForm />` — gated by `requireUser()`; redirects to `/` if profile already has a name |

The shared layout `app/(auth)/layout.tsx` is a one-liner: full-screen centered flex.

## Server-action contracts

Defined in `app/(auth)/login/actions.ts` and `app/(auth)/onboarding/actions.ts`.

- `requestOtp(formData)` — validates phone matches `^\+91[6-9]\d{9}$`, applies in-memory rate limit (3 requests / 10 min / phone) before calling `supabase.auth.signInWithOtp({ phone, options: { channel: "sms" } })`. Returns `{ error }` or `{ ok: true, phone }`.
- `verifyOtp(formData)` — calls `supabase.auth.verifyOtp({ phone, token, type: "sms" })`, runs `safeNext()` on the `next` field, returns `{ ok, next }`.
- `completeProfile(formData)` — `requireUser`-like inline check, upserts `profiles { id, phone, name, email }` with `onConflict: "id"`, `revalidatePath("/", "layout")` so the SiteNav re-renders authed state.

## Gotchas
- **Rate limit is in-memory** (`Map<phone, {count, resetAt}>` in `actions.ts`). It resets on server restart and is per-instance — if you scale horizontally you'll need Redis. Acceptable for current single-instance deploy
- **`isAuthed` must come from the server** (page-level `getCurrentUser()`). Reading it client-side is a hydration mismatch waiting to happen
- **`safeNext()` rejects `/login` itself** — prevents `?next=/login` bounce loops
- **OTP channel = "sms" not "whatsapp"** in the verify call (Supabase API treats both as `type: "sms"`); the WhatsApp/MSG91 routing is configured upstream in Supabase auth settings, not in this codebase
