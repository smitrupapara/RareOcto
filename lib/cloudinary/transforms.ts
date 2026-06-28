/**
 * Centralized Cloudinary URL builders.
 *
 * Use `<Image loader={cloudinaryLoader} />` for everything that renders
 * inside React. Use these helpers only where `<Image>` is not available —
 * Open Graph tags, JSON-LD, email templates, sitemap entries.
 *
 * `publicId` is what we store in `products.images[]` (e.g.
 * `rareocto/products/marigold/01`). It MUST NOT include the file extension
 * or the Cloudinary base URL — Cloudinary derives both via `f_auto`.
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function ensureCloudName(): string {
  if (!cloudName) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. Add it to .env.local.",
    );
  }
  return cloudName;
}

function clean(publicId: string): string {
  return publicId.startsWith("/") ? publicId.slice(1) : publicId;
}

function build(transform: string, publicId: string): string {
  return `https://res.cloudinary.com/${ensureCloudName()}/image/upload/${transform}/${clean(publicId)}`;
}

/** Grid/card thumbnail. Square-ish fill, auto-gravity. */
export function thumb(publicId: string, width = 600): string {
  return build(`c_fill,g_auto,w_${width},f_auto,q_auto`, publicId);
}

/** Product detail gallery image. Limit-fit so we never upscale. */
export function detail(publicId: string, width = 1600): string {
  return build(`c_limit,w_${width},f_auto,q_auto`, publicId);
}

/** OpenGraph / social card. Locked 1200x630 for crawler compatibility. */
export function og(publicId: string): string {
  return build("c_fill,w_1200,h_630,f_auto,q_auto", publicId);
}

/** Tiny low-quality image placeholder (for blur backgrounds, etc.). */
export function lqip(publicId: string): string {
  return build("c_fill,w_24,e_blur:1000,q_auto,f_auto", publicId);
}

/**
 * Blur placeholder URL for `<Image placeholder="blur" blurDataURL={...}>`.
 *
 * Unlike the helpers above, this NEVER throws: if the cloud name is unset
 * (dev/local without Cloudinary), it returns `undefined` so callers can simply
 * omit the placeholder rather than crash the render. The returned URL is a
 * ~24px, heavily-blurred, tiny image (a few hundred bytes) that Next renders as
 * the card background until the full image finishes loading.
 */
export function blurUrl(publicId: string): string | undefined {
  if (!cloudName) return undefined;
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_24,e_blur:1000,q_auto,f_auto/${clean(publicId)}`;
}
