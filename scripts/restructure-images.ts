/**
 * Restructure the messy "High Quality images" tree into the flat, kebab-case
 * staging layout that `upload-cloudinary.ts` expects.
 *
 * Usage:
 *   tsx scripts/restructure-images.ts [srcRoot] [outRoot]
 *   npm run images:restructure                      # uses the defaults below
 *   npm run images:restructure "Product_list/High Quality images" ./images
 *
 * Source layout (nested Room ▸ Category ▸ Product, names with spaces/caps/_/&):
 *   Product_list/High Quality images/BedRoom/3D/Sakura Tide/01.png
 *
 * Output layout (flat, one slug dir per product, contiguous NN.<ext>):
 *   ./images/sakura-tide/01.png
 *
 * Behaviour:
 *   - NON-DESTRUCTIVE: copies files; the source tree is never modified.
 *   - Slugifies each product (leaf) folder name to kebab-case.
 *   - Copies only properly NUMBER-named files (01.png, 2.jpg, ...), preserving
 *     each file's own number (zero-padded). It does NOT renumber-collapse, so a
 *     mislabelled file can never silently overwrite a correct one.
 *   - SKIPS any `Before*` mock-up folders.
 *   - Strays (raw `file_0000…`, `Copy of …`, `02(1).png` duplicates) are NOT
 *     copied — they are reported so a human renames them at the source.
 *   - Slug collisions, numbering gaps, and duplicate numbers are reported, never
 *     silently merged.
 *
 * Run `npm run images:validate` afterwards to gate the result before uploading.
 */

import {
  readdirSync,
  statSync,
  mkdirSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join, extname, basename, resolve, relative, sep } from "node:path";

const DEFAULT_SRC = "Product_list/High Quality images";
const DEFAULT_OUT = "images";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
/** Path segments (case-insensitive) whose subtree is skipped entirely. */
const SKIP_SEGMENTS = [/^before/i];

type Leaf = { srcDir: string; relPath: string; product: string };
type PlanItem = {
  slug: string;
  srcDir: string;
  relPath: string;
  files: { from: string; to: string }[];
  strays: string[];
  gaps: number[];
  dups: string[];
};

function slugify(name: string): string {
  return name
    .replace(/['']/g, "") // drop apostrophes
    .replace(/_s\b/gi, "s") // encoded possessive: Voyager_s -> Voyagers, Kid_s -> Kids
    .toLowerCase()
    .replace(/&/g, " ") // ampersand acts as a word separator
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

function isImage(name: string): boolean {
  return ALLOWED_EXTS.has(extname(name).toLowerCase());
}

/** True if any segment of the relative path is in the skip list. */
function isSkipped(relPath: string): boolean {
  return relPath
    .split(sep)
    .some((seg) => SKIP_SEGMENTS.some((re) => re.test(seg)));
}

/** Collect leaf folders (those directly containing image files). */
function collectLeaves(srcRoot: string): Leaf[] {
  const leaves: Leaf[] = [];
  const walk = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const hasImages = entries.some((e) => e.isFile() && isImage(e.name));
    const rel = relative(srcRoot, dir);
    if (hasImages) {
      if (!isSkipped(rel)) {
        leaves.push({ srcDir: dir, relPath: rel, product: basename(dir) });
      }
      return; // leaves don't recurse further
    }
    for (const e of entries) if (e.isDirectory()) walk(join(dir, e.name));
  };
  walk(srcRoot);
  return leaves;
}

/** Build the copy plan for one leaf: number-named files preserve their number. */
function planLeaf(leaf: Leaf): Omit<PlanItem, "slug"> {
  const files: { from: string; to: string }[] = [];
  const strays: string[] = [];
  const dups: string[] = [];
  const byNumber = new Map<number, string>();

  const names = readdirSync(leaf.srcDir, { withFileTypes: true })
    .filter((e) => e.isFile() && isImage(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const name of names) {
    const ext = extname(name).toLowerCase();
    const stem = basename(name, extname(name));
    const m = /^(\d+)$/.exec(stem);
    if (!m) {
      strays.push(name);
      continue;
    }
    const n = parseInt(m[1], 10);
    if (byNumber.has(n)) {
      dups.push(`${name} (number ${n} already taken by ${byNumber.get(n)})`);
      continue;
    }
    byNumber.set(n, name);
    files.push({
      from: join(leaf.srcDir, name),
      to: `${String(n).padStart(2, "0")}${ext}`,
    });
  }

  // detect gaps in the 1..max range
  const nums = [...byNumber.keys()].sort((a, b) => a - b);
  const gaps: number[] = [];
  if (nums.length > 0) {
    for (let i = 1; i <= nums[nums.length - 1]; i++) {
      if (!byNumber.has(i)) gaps.push(i);
    }
  }

  files.sort((a, b) => a.to.localeCompare(b.to, "en", { numeric: true }));
  return { srcDir: leaf.srcDir, relPath: leaf.relPath, files, strays, gaps, dups };
}

function main() {
  const srcRoot = resolve(process.cwd(), process.argv[2] ?? DEFAULT_SRC);
  const outRoot = resolve(process.cwd(), process.argv[3] ?? DEFAULT_OUT);

  if (!statSync(srcRoot, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`[restructure] source not found: ${srcRoot}`);
    process.exit(1);
  }

  const leaves = collectLeaves(srcRoot).sort((a, b) =>
    a.relPath.localeCompare(b.relPath),
  );
  console.log(
    `[restructure] src=${srcRoot}\n[restructure] out=${outRoot}\n[restructure] ${leaves.length} product folders (Before mock-ups excluded)\n`,
  );

  // Build plan + detect slug collisions before touching the filesystem.
  const plan: PlanItem[] = [];
  const slugOwner = new Map<string, string>();
  const collisions: string[] = [];

  for (const leaf of leaves) {
    const slug = slugify(leaf.product);
    if (!slug) {
      collisions.push(`EMPTY SLUG from "${leaf.relPath}" — skipped`);
      continue;
    }
    if (slugOwner.has(slug)) {
      collisions.push(
        `"${slug}" — "${leaf.relPath}" collides with "${slugOwner.get(slug)}" — skipped`,
      );
      continue;
    }
    slugOwner.set(slug, leaf.relPath);
    plan.push({ slug, ...planLeaf(leaf) });
  }

  // Prune: staging must mirror the source exactly, so drop any pre-existing
  // output folder that isn't in this run's plan (stale slugs from earlier runs).
  const planned = new Set(plan.map((p) => p.slug));
  const pruned: string[] = [];
  if (statSync(outRoot, { throwIfNoEntry: false })?.isDirectory()) {
    for (const e of readdirSync(outRoot, { withFileTypes: true })) {
      if (e.isDirectory() && !planned.has(e.name)) {
        rmSync(join(outRoot, e.name), { recursive: true, force: true });
        pruned.push(e.name);
      }
    }
  }

  // Execute: each slug dir is wiped then repopulated (idempotent re-runs).
  let copied = 0;
  for (const item of plan) {
    const destDir = join(outRoot, item.slug);
    rmSync(destDir, { recursive: true, force: true });
    mkdirSync(destDir, { recursive: true });
    for (const f of item.files) {
      copyFileSync(f.from, join(destDir, f.to));
      copied++;
    }
  }

  // Report.
  console.log("[restructure] mapping (product -> slug : images):");
  for (const item of plan) {
    console.log(
      `  ${item.relPath.split(sep).join(" / ")}  ->  ${item.slug} : ${item.files.length}`,
    );
  }

  const issues = plan.filter(
    (p) => p.strays.length || p.gaps.length || p.dups.length,
  );
  if (issues.length) {
    console.log("\n[restructure] ⚠ needs attention at the SOURCE:");
    for (const p of issues) {
      console.log(`  ${p.slug}:`);
      if (p.gaps.length) console.log(`    - missing number(s): ${p.gaps.join(", ")}`);
      if (p.dups.length) for (const d of p.dups) console.log(`    - duplicate: ${d}`);
      if (p.strays.length)
        console.log(`    - not copied (rename at source): ${p.strays.join(", ")}`);
    }
  }
  if (collisions.length) {
    console.log("\n[restructure] ⚠ slug collisions / empties:");
    for (const c of collisions) console.log(`  - ${c}`);
  }
  if (pruned.length) {
    console.log(`\n[restructure] pruned ${pruned.length} stale folder(s): ${pruned.join(", ")}`);
  }

  console.log(
    `\n[restructure] done — ${plan.length} slugs, ${copied} files copied to ${outRoot}` +
      `${issues.length ? `, ${issues.length} folders flagged` : ""}` +
      `${collisions.length ? `, ${collisions.length} collisions` : ""}`,
  );
  console.log("[restructure] next: npm run images:validate");
}

main();
