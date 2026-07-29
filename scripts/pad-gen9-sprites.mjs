#!/usr/bin/env node
/**
 * Pad the local Gen 9 box sprites onto the same canvas pokesprite uses.
 *
 * Every non Gen 9 sprite comes from pokesprite, whose gen8 box sprites all sit
 * on a 68x56 transparent canvas: the pokemon is centered horizontally and its
 * feet rest about 3px above the bottom edge. The Gen 9 PNGs in
 * public/images/sprites/gen9 were exported cropped tight to the artwork, so any
 * UI that sizes a sprite by its box (the starter picker, team slots, the
 * pokedex grid) blew them up to fill it and they towered over everything else.
 *
 * Padding them to 68x56 leaves the pixel art untouched and makes both sources
 * render at the same scale. The script is idempotent: files already on the
 * target canvas are skipped, so it is safe to re-run after adding sprites.
 *
 * Usage (from the repo root):
 *   node scripts/pad-gen9-sprites.mjs           apply
 *   node scripts/pad-gen9-sprites.mjs --check   report only, write nothing
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const CANVAS_W = 68;
const CANVAS_H = 56;
// pokesprite leaves roughly this much room under the feet; taller sprites eat
// into it, which is exactly what the reference sprites do.
const BASELINE_GAP = 3;

const ROOT = path.resolve(process.cwd(), "public/images/sprites/gen9");
const DIRS = [ROOT, path.join(ROOT, "shiny")];
const check = process.argv.includes("--check");

/** Pad one sprite, or return null when it is already the right canvas. */
async function padded(file) {
  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  if (meta.width === CANVAS_W && meta.height === CANVAS_H) return null;
  if (meta.width > CANVAS_W || meta.height > CANVAS_H) {
    throw new Error(
      `${path.basename(file)} is ${meta.width}x${meta.height}, larger than the ${CANVAS_W}x${CANVAS_H} canvas`
    );
  }

  const left = Math.round((CANVAS_W - meta.width) / 2);
  const top = Math.max(0, CANVAS_H - BASELINE_GAP - meta.height);
  const buffer = await sharp(input)
    .ensureAlpha()
    .extend({
      top,
      bottom: CANVAS_H - meta.height - top,
      left,
      right: CANVAS_W - meta.width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { buffer, from: `${meta.width}x${meta.height}` };
}

let changed = 0;
let skipped = 0;
for (const dir of DIRS) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".png"));
  for (const name of files) {
    const file = path.join(dir, name);
    const result = await padded(file);
    if (!result) {
      skipped += 1;
      continue;
    }
    changed += 1;
    if (!check) await writeFile(file, result.buffer);
    console.log(`${check ? "would pad" : "padded"} ${path.relative(ROOT, file)} (${result.from})`);
  }
}

console.log(
  `\n${check ? "Would pad" : "Padded"} ${changed} sprite(s) to ${CANVAS_W}x${CANVAS_H}; ${skipped} already sized.`
);
