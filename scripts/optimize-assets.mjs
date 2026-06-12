// One-off asset optimizer. Run with: node scripts/optimize-assets.mjs
//
// - SVG (Plakat.SVG): minified in place with svgo.
// - Large PNGs: re-encoded as WebP at ~80 quality; original PNG kept around so
//   any external references don't break, but app references the .webp twin.
// - hero-pusher-preview.gif: converted to animated WebP.
//
// Idempotent — running twice does no harm; svgo and sharp both overwrite.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { optimize as svgoOptimize } from "svgo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function fileSize(p) {
  try {
    const s = await fs.stat(p);
    return s.size;
  } catch {
    return null;
  }
}

async function minifySvg(relPath) {
  const abs = path.join(publicDir, relPath);
  const before = await fileSize(abs);
  if (before === null) return console.log(`skip (missing): ${relPath}`);
  const src = await fs.readFile(abs, "utf8");
  const result = svgoOptimize(src, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
            cleanupIds: false,
          },
        },
      },
    ],
  });
  if ("error" in result) throw new Error(result.error);
  await fs.writeFile(abs, result.data, "utf8");
  const after = await fileSize(abs);
  console.log(
    `svgo ${relPath}: ${kb(before)} -> ${kb(after)} (-${((1 - after / before) * 100).toFixed(0)}%)`,
  );
}

async function pngToWebp(relPath, { quality = 80 } = {}) {
  const abs = path.join(publicDir, relPath);
  const before = await fileSize(abs);
  if (before === null) return console.log(`skip (missing): ${relPath}`);
  const outAbs = abs.replace(/\.png$/i, ".webp");
  await sharp(abs).webp({ quality, effort: 6 }).toFile(outAbs);
  const after = await fileSize(outAbs);
  console.log(
    `webp ${relPath} -> ${path.basename(outAbs)}: ${kb(before)} -> ${kb(after)} (-${((1 - after / before) * 100).toFixed(0)}%)`,
  );
}

async function gifToWebp(relPath, { quality = 75 } = {}) {
  const abs = path.join(publicDir, relPath);
  const before = await fileSize(abs);
  if (before === null) return console.log(`skip (missing): ${relPath}`);
  const outAbs = abs.replace(/\.gif$/i, ".webp");
  await sharp(abs, { animated: true })
    .webp({ quality, effort: 6, loop: 0 })
    .toFile(outAbs);
  const after = await fileSize(outAbs);
  console.log(
    `webp ${relPath} -> ${path.basename(outAbs)}: ${kb(before)} -> ${kb(after)} (-${((1 - after / before) * 100).toFixed(0)}%)`,
  );
}

await minifySvg("work/Plakat.SVG");
await pngToWebp("myGPC-Home.png");
await pngToWebp("lego-bauanleitung-teaser.png");
await pngToWebp("Lego_Bridge.png");
await pngToWebp("final_screen.png");
await gifToWebp("hero-pusher-preview.gif");
