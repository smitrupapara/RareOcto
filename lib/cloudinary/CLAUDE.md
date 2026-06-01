# lib/cloudinary — Reference

Two modules, two distinct use cases. **Pick the right one** — Next/Image needs a loader; non-`<Image>` contexts (OG, JSON-LD, sitemap, email) need pre-built URLs.

## loader.ts — `cloudinaryLoader`
- **Type**: `next/image` `ImageLoader`
- **Purpose**: passed to `<Image loader={cloudinaryLoader} src={publicId} width={...} />` so Next builds the responsive srcset by calling this loader for each breakpoint
- **Transform**: `f_auto,c_limit,w_{width},q_{quality ?? "auto"}`
  - `f_auto` — Cloudinary picks WebP/AVIF based on the `Accept` header
  - `c_limit` — never upscales beyond the source asset's intrinsic size
  - `q_auto` — quality auto unless an explicit `quality={n}` is passed via `<Image>` props
- **Cloud-name fallback**: if `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is unset, returns the original `src` unchanged so dev/local images still render
- **`src` normalization**: strips leading `/` from the public id — gives us tolerance against `images: ["/folder/file"]` vs `["folder/file"]`

## transforms.ts — pre-built URL helpers
Used in **non-`<Image>` contexts** only: `opengraph-image.tsx`, JSON-LD scripts, sitemap, email templates.

| Helper | Transform | Use when |
|--------|-----------|----------|
| `thumb(publicId, w=600)` | `c_fill,g_auto,w_{w},f_auto,q_auto` | Card thumbnail — square crop with auto-gravity (focuses on subject) |
| `detail(publicId, w=1600)` | `c_limit,w_{w},f_auto,q_auto` | Full-resolution PDP gallery — limit-fit, no upscale |
| `og(publicId)` | `c_fill,w_1200,h_630,f_auto,q_auto` | OG/Twitter card — **fixed 1200×630**, required by crawlers |
| `lqip(publicId)` | `c_fill,w_24,e_blur:1000,q_auto,f_auto` | 24-px blur placeholder for `<Image placeholder="blur" blurDataURL={...}>` |

All four call `ensureCloudName()` which **throws** if `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is unset — different from `loader.ts` (which falls back). Reason: a missing OG image is worse than a missing inline image; we want to know loudly.

## What goes in `products.images[]`

The `publicId` format we store in Postgres looks like:

```
rareocto/products/marigold/01
rareocto/products/marigold/02
```

- **No file extension** — `f_auto` decides
- **No `https://res.cloudinary.com/...` prefix** — built by the loader/helpers
- **No leading `/`** — tolerated but stripped

The seed script (`scripts/seed-products.ts`) and the admin uploader both store this exact shape.

## Gotchas
- **`<Image>` `src` is the public id, not a URL** — when using `cloudinaryLoader`, pass the public id as `src`. Don't paste a full Cloudinary URL or the loader will double-prefix it
- **`og()` is fixed 1200×630** — don't try to make it responsive. Social crawlers cache aggressively and odd aspect ratios get cropped weirdly
- **`lqip()` returns a Cloudinary URL, not a data URL** — for `<Image blurDataURL={...}>` you typically want a base64 data URL. To get one, fetch the lqip URL server-side and base64-encode the body. Today we don't — we use it directly as a `style: { backgroundImage }` (see `ProductCard`)
- **Quality "auto" vs numeric**: `q_auto` lets Cloudinary pick. Pass `quality={75}` to `<Image>` only if you have a measured reason
- **Image priority**: hero images should set `<Image priority>` so Next preloads them; this doesn't change the URL the loader builds

## Related
- Consumed by [[components-catalog]] (ProductCard, ProductGallery)
- Consumed by [[components-admin]] (ImageUploader uses `CldUploadWidget`, NOT these helpers — it talks to Cloudinary's upload API directly)
- OG image: `app/(public)/catalog/[slug]/opengraph-image.tsx` calls `og(publicId)`
