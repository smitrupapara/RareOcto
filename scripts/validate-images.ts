/**
 * Pre-flight validator for the Cloudinary upload staging folder.
 *
 * Usage:
 *   tsx scripts/validate-images.ts [imagesRoot]
 *   npm run images:validate                 # defaults to ./images
 *   npm run images:validate ./images
 *
 * Enforces every rule the upload + render pipeline depends on. Exits non-zero if
 * any ERROR is found, so it can gate the upload step.
 *
 * Rules (per slug folder directly under <imagesRoot>):
 *   ERROR  folder name must be kebab-case  ^[a-z0-9]+(-[a-z0-9]+)*$  (the
 *          uploader SILENTLY SKIPS anything else)
 *   ERROR  at least one image
 *   ERROR  every file named NN.<ext> (zero-padded), allowed ext only
 *   ERROR  numbering contiguous 1..N — no gaps, no duplicate numbers
 *   ERROR  long edge >= 1500 px  (accepted minimum; Cloudinary never upscales)
 *   ERROR  file size <= 10 MB
 *   WARN   aspect ratio outside 3:2 ±5% (1.425–1.575)
 *   WARN   mixed extensions within a folder
 *   WARN   long edge < 1536 px (slightly soft; passes but worth a glance)
 *
 * Escape hatch: set IMAGES_BYPASS_SIZE=1 to demote the resolution + file-size
 * ERRORs to WARNs (structural checks still gate). Lets you ship sub-spec images
 * now and re-export later, e.g.  IMAGES_BYPASS_SIZE=1 npm run images:validate
 */

import { readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, extname, basename, resolve } from "node:path";

const MIN_LONG_EDGE = 1500; // hard gate — below this is an error
const SOFT_LONG_EDGE = 1536; // native target — [1500,1536) only warns
const MAX_BYTES = 10 * 1024 * 1024;
// Opt-in escape hatch: when IMAGES_BYPASS_SIZE is set, the resolution and
// file-size rules are demoted from ERROR to WARN so a run can proceed with
// sub-spec images (they still surface, they just don't gate the upload).
// Structural rules (kebab-case name, NN.<ext>, contiguous numbering) are NEVER
// bypassed — the uploader silently skips folders that break those.
const BYPASS_SIZE = /^(1|true|yes)$/i.test(process.env.IMAGES_BYPASS_SIZE ?? "");
const TARGET_RATIO = 1.5; // 3:2
const RATIO_TOLERANCE = 0.05;

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAME_RE = /^(\d+)\.(jpg|jpeg|png|webp|avif)$/i;

type Dims = { w: number; h: number };

function dimsPNG(b: Buffer): Dims | null {
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) return null; // 'IHDR'
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function dimsJPEG(b: Buffer): Dims | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
/** WebP (VP8/VP8L/VP8X). Returns null for animated/odd variants we can't read. */
function dimsWEBP(b: Buffer): Dims | null {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF") return null;
  const fmt = b.toString("ascii", 12, 16);
  if (fmt === "VP8 ") {
    return { w: (b.readUInt16LE(26) & 0x3fff), h: (b.readUInt16LE(28) & 0x3fff) };
  }
  if (fmt === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fmt === "VP8X") {
    const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { w, h };
  }
  return null;
}

function readDims(file: string, ext: string): Dims | null {
  let fd: number | undefined;
  try {
    fd = openSync(file, "r");
    const buf = Buffer.alloc(131072);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const b = buf.subarray(0, n);
    if (ext === ".png") return dimsPNG(b);
    if (ext === ".jpg" || ext === ".jpeg") return dimsJPEG(b);
    if (ext === ".webp") return dimsWEBP(b);
    return null; // .avif — header parsing not implemented; dim check skipped
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function main() {
  const root = resolve(process.cwd(), process.argv[2] ?? "images");
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`[validate] not a directory: ${root}`);
    process.exit(1);
  }

  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  if (dirs.length === 0) {
    console.error(`[validate] no slug folders under ${root}`);
    process.exit(1);
  }

  let errorFolders = 0;
  let warnFolders = 0;
  const errors: string[] = [];
  const warns: string[] = [];

  for (const slug of dirs) {
    const dir = join(root, slug);
    const e: string[] = [];
    const w: string[] = [];

    if (!SLUG_RE.test(slug)) {
      e.push(`folder name "${slug}" is not kebab-case — uploader will skip it`);
    }

    const files = readdirSync(dir, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name);
    const images = files.filter((f) => ALLOWED_EXTS.has(extname(f).toLowerCase()));
    const nonImages = files.filter(
      (f) => !ALLOWED_EXTS.has(extname(f).toLowerCase()),
    );

    if (nonImages.length) w.push(`non-image files present: ${nonImages.join(", ")}`);
    if (images.length === 0) {
      e.push("no images");
      report(slug, e, w);
      if (e.length) errorFolders++;
      else if (w.length) warnFolders++;
      errors.push(...e.map((m) => `${slug}: ${m}`));
      warns.push(...w.map((m) => `${slug}: ${m}`));
      continue;
    }

    const exts = new Set(images.map((f) => extname(f).toLowerCase()));
    if (exts.size > 1) w.push(`mixed extensions: ${[...exts].join(", ")}`);

    const numbers: number[] = [];
    const seen = new Map<number, string>();
    for (const name of images) {
      const m = NAME_RE.exec(name);
      if (!m) {
        e.push(`bad filename "${name}" — must be NN.<ext>`);
        continue;
      }
      const n = parseInt(m[1], 10);
      if (seen.has(n)) {
        e.push(`duplicate number ${n}: "${name}" and "${seen.get(n)}"`);
        continue;
      }
      seen.set(n, name);
      numbers.push(n);

      const ext = extname(name).toLowerCase();
      const full = join(dir, name);
      const size = statSync(full).size;
      if (size > MAX_BYTES) {
        const m = `"${name}" is ${(size / 1048576).toFixed(1)} MB (> 10 MB)`;
        (BYPASS_SIZE ? w : e).push(BYPASS_SIZE ? `${m} [bypassed]` : m);
      }
      const d = readDims(full, ext);
      if (d) {
        const longEdge = Math.max(d.w, d.h);
        const ratio = Math.max(d.w, d.h) / Math.min(d.w, d.h);
        if (longEdge < MIN_LONG_EDGE) {
          const m = `"${name}" ${d.w}×${d.h} — long edge < ${MIN_LONG_EDGE}px`;
          (BYPASS_SIZE ? w : e).push(BYPASS_SIZE ? `${m} [bypassed]` : m);
        } else if (longEdge < SOFT_LONG_EDGE) {
          w.push(`"${name}" ${d.w}×${d.h} — slightly soft (< ${SOFT_LONG_EDGE}px)`);
        }
        if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
          w.push(`"${name}" ratio ${ratio.toFixed(2)} — not ~3:2`);
        }
      } else if (ext !== ".avif") {
        w.push(`"${name}" — could not read dimensions`);
      }
    }

    // contiguity 1..N
    numbers.sort((a, b) => a - b);
    if (numbers.length) {
      for (let i = 1; i <= numbers[numbers.length - 1]; i++) {
        if (!seen.has(i)) e.push(`missing number ${String(i).padStart(2, "0")}`);
      }
      if (numbers[0] !== 1) e.push(`numbering must start at 01 (starts at ${numbers[0]})`);
    }

    report(slug, e, w);
    if (e.length) errorFolders++;
    else if (w.length) warnFolders++;
    errors.push(...e.map((m) => `${slug}: ${m}`));
    warns.push(...w.map((m) => `${slug}: ${m}`));
  }

  const ok = dirs.length - errorFolders - warnFolders;
  console.log(
    `\n[validate] ${dirs.length} folders — ${ok} clean, ${warnFolders} warn-only, ${errorFolders} with errors`,
  );
  if (errorFolders > 0) {
    console.error(`[validate] FAILED — ${errors.length} error(s). Fix before uploading.`);
    process.exit(1);
  }
  console.log("[validate] PASSED — staging is upload-ready.");
}

function report(slug: string, e: string[], w: string[]) {
  if (!e.length && !w.length) {
    console.log(`  ✓ ${slug}`);
    return;
  }
  const tag = e.length ? "✗" : "⚠";
  console.log(`  ${tag} ${slug}`);
  for (const m of e) console.log(`      ERROR  ${m}`);
  for (const m of w) console.log(`      warn   ${m}`);
}

main();
