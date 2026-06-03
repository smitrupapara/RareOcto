/**
 * Bulk-upload local product images to Cloudinary under the rareocto namespace.
 *
 * Usage:
 *   tsx scripts/upload-cloudinary.ts ./images
 *
 * Expected local layout:
 *   ./images/<slug>/01.jpg
 *   ./images/<slug>/02.jpg
 *   ...
 *
 * Files land at `rareocto/products/<slug>/<NN>` (extension stripped — the
 * Cloudinary public ID is what we store in `products.images[]`). Re-runs
 * overwrite existing assets at the same public ID (`overwrite: true`).
 *
 * Requires (server-only) env vars:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Note: `cloudinary` is not in package.json by default — install it as a
 * dev dep before running:
 *   npm install -D cloudinary tsx
 * 
 *  npm run upload:images ./images
 */

import { readdir, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve, basename, extname, join } from "node:path";

// Load .env.local when running standalone outside Next.js
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local not present — env vars must be set externally
}

// `cloudinary` is intentionally not imported at the top so this file still
// type-checks without the dep installed. Require lazily in main().
type CloudinaryUploadResult = { public_id: string; secure_url: string };
type CloudinarySdk = {
  config: (opts: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
    secure: boolean;
  }) => void;
  uploader: {
    upload: (
      path: string,
      opts: {
        public_id: string;
        folder?: string;
        overwrite?: boolean;
        resource_type?: "image";
      },
    ) => Promise<CloudinaryUploadResult>;
  };
};

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(msg: string): never {
  console.error(`[upload] ${msg}`);
  process.exit(1);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

async function listSlugDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && SLUG_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function listImageFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && ALLOWED_EXTS.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

async function main() {
  const rootArg = process.argv[2];
  if (!rootArg) {
    fail("usage: tsx scripts/upload-cloudinary.ts <local-images-root>");
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    fail(
      "missing one of NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET",
    );
  }

  const root = resolve(process.cwd(), rootArg);
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) fail(`not a directory: ${root}`);

  // Lazy import via Function indirection so the file type-checks even when
  // `cloudinary` isn't installed yet (it's an optional dep for this script).
  let cloudinary: CloudinarySdk;
  try {
    const dyn = new Function("name", "return import(name)") as (
      name: string,
    ) => Promise<{ v2: CloudinarySdk }>;
    const mod = await dyn("cloudinary");
    cloudinary = mod.v2;
  } catch {
    fail("'cloudinary' package not installed. Run: npm install -D cloudinary");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const slugs = await listSlugDirs(root);
  if (slugs.length === 0) {
    fail(`no slug directories found under ${root} (expected ./<slug>/01.jpg layout)`);
  }
  console.log(`[upload] found ${slugs.length} slug directories`);

  let total = 0;
  let failed = 0;

  for (const slug of slugs) {
    const slugDir = join(root, slug);
    const files = await listImageFiles(slugDir);
    if (files.length === 0) {
      console.warn(`[upload] ${slug}: no images, skipping`);
      continue;
    }

    let index = 1;
    for (const file of files) {
      const localPath = join(slugDir, file);
      const publicId = `${pad2(index)}`;
      const folder = `rareocto/products/${slug}`;
      try {
        const result = await cloudinary.uploader.upload(localPath, {
          public_id: publicId,
          folder,
          overwrite: true,
          resource_type: "image",
        });
        console.log(`[upload] ${slug}/${basename(file)} -> ${result.public_id}`);
        total++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[upload] FAILED ${slug}/${basename(file)}: ${msg}`);
        failed++;
      }
      index++;
    }
  }

  console.log(`[upload] done — ${total} uploaded, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[upload] fatal", err);
  process.exit(1);
});
