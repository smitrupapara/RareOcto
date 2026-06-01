# components/admin — Reference

Admin-only UI gated behind the `/admin` route prefix. Route gating is enforced by root `middleware.ts` (`ADMIN_ONLY = ["/admin"]`) — these components assume the request already passed the admin check; do not re-check role here.

Two components today: `product-form.tsx` (create / edit / delete a single product) and `image-uploader.tsx` (Cloudinary upload widget used inside the form).

## product-form.tsx

### Shape
- 903 lines, one component (`ProductForm`) plus inline helpers
- react-hook-form + zod resolver
- Drives `createProductAction`, `updateProductAction`, `deleteProductAction` (defined in `app/admin/products/actions.ts`)
- Two modes: **create** (no `productId` prop) and **edit** (receives `productId` + `initial: Product`)

### Form schema (zod)
| Field | Rule |
|------|------|
| `slug` | kebab-case `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, 2-80 chars. **Locked in edit mode** (URL stability) |
| `name` | 2-120 chars |
| `description` | 8-4000 chars |
| `category` | non-empty array of `Category` enum values |
| `base_price` | integer ≥ 0 — **in paise**, never rupees |
| `available_sizes` | non-empty array of `ProductSize` |
| `available_materials` | non-empty array of `ProductMaterial` |
| `rooms`, `colors`, `patterns`, `styles` | arrays (may be empty) of their respective enums |
| `stock` | integer ≥ 0 |
| `tags_csv` | free text, comma-separated — split on submit |
| `meta_title`, `meta_description` | optional strings (≤ 70 / ≤ 160 typical SEO caps) |

### Local state (NOT in RHF)
RHF can't ergonomically hold dynamic-key records, so these live in `useState`:
- `images: string[]` — Cloudinary public ids in display order. Managed by `<ImageUploader>` callbacks
- `modifiers: MaterialPriceModifier` — `Partial<Record<ProductMaterial, number>>` in paise
- `dimensions: ProductDimensions` — `Partial<Record<ProductSize, { w_cm, h_cm }>>`

All three are merged into the submit payload by `buildPayload()`.

### Toggle helpers
- `toggleMulti(field, value)` — generic add/remove from `category` / `sizes` / `materials` / `rooms` / `colors` / `patterns` / `styles`. Wires the multi-select UIs
- Adding a size auto-creates an empty `dimensions[size]` row; removing one **does not** delete it (kept for undo)
- Adding a material does NOT auto-create a modifier row — modifier defaults to 0 ⇒ omitted

### `buildPayload()`
- **Trims dimensions**: only entries where `w_cm > 0 && h_cm > 0` survive
- **Trims modifiers**: only entries where the value is non-zero survive (zero is the implicit default)
- Splits `tags_csv` on commas, trims, drops empty strings
- Returns the typed `ProductPayload` consumed by the server action

### Submit flow
1. RHF `handleSubmit` → `buildPayload`
2. `createProductAction(payload)` or `updateProductAction(productId, payload)` — both run inside `useTransition`
3. Server returns either `{ ok: true, slug }` (success) or `{ error?, fieldErrors? }` (failure)
4. **Field-level errors mapped back** via `setError(field, { message })` — surfaced inline on the input
5. On success: `router.replace("/admin/products")` and `router.refresh()`

### Delete flow
- Edit mode only — button only renders when `productId` is present
- `confirm("Delete <name>? This cannot be undone.")` before calling — the only `window.confirm` in the app
- `deleteProductAction(productId)` → `router.replace("/admin/products")`

## image-uploader.tsx

### Shape
- 165 lines. Receives `value: string[]` (publicIds) + `onChange(next)` from `ProductForm`
- Wraps `CldUploadWidget` from `next-cloudinary`

### Env requirement
- **Requires `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`** — unsigned upload preset configured in the Cloudinary dashboard
- If unset, renders an **inline error block** (red border) explaining what to set and **disables uploads** — does not silently fail

### UI / behaviour
- "Upload images" button opens the Cloudinary widget
- **Max 20 images** total — widget capped via `maxFiles` AND a guard in `onUpload` (defence in depth if widget config drifts)
- Uploaded `public_id` is appended to the array, then **deduped** so re-uploading the same asset doesn't insert twice
- Move up / move down arrow buttons reorder; first slot always rendered as **`"01 · cover"`** label to signal LCP role
- Remove (`×`) on each tile takes the publicId out of the array
- Each tile renders the image via `cloudinaryLoader` at thumb size

### What it doesn't do
- No drag-to-reorder (use the arrows) — keep it in mind before swapping in a DnD lib
- No image cropping / transforms — Cloudinary stores the original; sizing happens via [[lib-cloudinary]] transforms at render time
- Does not call any server action — it only mutates the array; the form's submit handler persists `images`

## Gotchas
- **`slug` is locked in edit mode** — changing it breaks live URLs and SEO. If you genuinely need to rename, do it via a SQL update + 301 redirect, not the form
- **Prices are paise (integer)** everywhere — `base_price` and `material_price_modifier` values. The form input shows paise directly. Don't add a "this is in rupees" UX without converting on submit
- **Empty dimension rows are dropped silently** — to delete a size's dimensions, set both `w_cm` and `h_cm` to 0 (or empty) and save. There is no explicit "remove dimension" UI
- **Empty modifier rows are dropped silently** — same pattern. The base material's modifier is conceptually always 0 anyway
- **`category` is an array** since migration 0004 — even single-category products store `["abstract"]`, not `"abstract"`. RHF needs `category: Category[]` typing
- **Image order matters** — `images[0]` is the cover used everywhere (cards, OG, JSON-LD). Reordering changes the LCP asset
- **`CldUploadWidget` is a client-only React tree** — never import inside a server component. The whole admin form is `"use client"` so this is fine here
- **Don't bypass the form for one-off edits** — RLS allows admin direct updates, but the search_tsv trigger relies on the full row being present. Partial updates that omit `tags`/`description` will rebuild the tsvector based on those omissions

## Related
- See [[components-catalog]] — the listing/PDP consumers of every field this form writes
- See [[lib-catalog]] for the enum constants the multi-selects should iterate over (CATEGORY_VALUES, ROOM_VALUES, etc.)
- See [[lib-cloudinary]] for the publicId format these images end up as
- See [[supabase-migrations]] for the products table shape and the FTS trigger
- Server actions live in `app/admin/products/actions.ts` — `createProductAction`, `updateProductAction`, `deleteProductAction`
