// Generates favicon.ico + icon.png + apple-icon.png from public/Güntner_logo_rgb.jpg
// Run with: node scripts/generate-favicon.mjs
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "public", "Güntner_logo_rgb.jpg");
const appDir = path.join(root, "app");

async function squarePngBuffer(size) {
  // Fit the logo into a square white canvas with a small margin so it isn't
  // flush against the edges (favicons read better with a bit of padding).
  const inner = Math.round(size * 0.86);
  const resized = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();
  return await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

function buildIco(pngBuffers) {
  // Modern ICO format with PNG-encoded entries.
  // Spec: https://en.wikipedia.org/wiki/ICO_(file_format)
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffsetStart = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type = 1 (icon)
  header.writeUInt16LE(count, 4); // image count

  const entries = [];
  const payloads = [];
  let cursor = dataOffsetStart;

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2);                       // color palette
    entry.writeUInt8(0, 3);                       // reserved
    entry.writeUInt16LE(1, 4);                    // color planes
    entry.writeUInt16LE(32, 6);                   // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);        // size of image data
    entry.writeUInt32LE(cursor, 12);              // offset to image data
    entries.push(entry);
    payloads.push(buffer);
    cursor += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map(async (size) => ({ size, buffer: await squarePngBuffer(size) })),
);

const ico = buildIco(pngs);
await fs.writeFile(path.join(appDir, "favicon.ico"), ico);

// Modern PNG icons (Next.js will emit appropriate <link> tags).
await fs.writeFile(path.join(appDir, "icon.png"), await squarePngBuffer(192));
await fs.writeFile(path.join(appDir, "apple-icon.png"), await squarePngBuffer(180));

console.log("Wrote:");
console.log("  app/favicon.ico  (16, 32, 48)");
console.log("  app/icon.png     (192)");
console.log("  app/apple-icon.png (180)");
