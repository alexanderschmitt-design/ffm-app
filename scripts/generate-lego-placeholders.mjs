// Generates placeholder assets for the GPC "Lego blueprint" bonus:
//   public/lego-guentner-teaser.webp  — teaser image (1200x630)
//   public/lego-guentner-plan.pdf     — placeholder PDF
//
// Both are intentionally minimal — the design team should replace them
// with the real Lego rendering and the real building instructions before
// the booth goes live. The web UI references these paths verbatim so
// no code change is needed when the files are swapped.
//
// Run with: node scripts/generate-lego-placeholders.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const outImage = path.join(root, "public", "lego-guentner-teaser.webp");
const outPdf = path.join(root, "public", "lego-guentner-plan.pdf");

// ---------- Teaser image (1200x630, Güntner-blue with Lego-stud motif) ----------

const BRAND = "#2666e1";
const BRAND_DARK = "#1c4fb0";
const ACCENT = "#1abc9c";
const WIDTH = 1200;
const HEIGHT = 630;

const studRows = 4;
const studCols = 10;
const studSize = 70;
const studGap = 18;
const studsBlockW = studCols * studSize + (studCols - 1) * studGap;
const studsStartX = WIDTH - studsBlockW - 60;
const studsStartY = 60;

let studs = "";
for (let r = 0; r < studRows; r++) {
  for (let c = 0; c < studCols; c++) {
    const cx = studsStartX + c * (studSize + studGap) + studSize / 2;
    const cy = studsStartY + r * (studSize + studGap) + studSize / 2;
    studs += `<circle cx="${cx}" cy="${cy}" r="${studSize / 2}" fill="${BRAND_DARK}" opacity="0.55"/>`;
    studs += `<circle cx="${cx - 6}" cy="${cy - 6}" r="${studSize / 2 - 14}" fill="${BRAND_DARK}" opacity="0.35"/>`;
  }
}

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="${BRAND}"/>
  ${studs}
  <rect x="60" y="${HEIGHT - 90}" width="240" height="6" fill="${ACCENT}"/>
  <text x="60" y="180" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="500" fill="rgba(255,255,255,0.85)" letter-spacing="4">GÜNTNER · GPC · FMM 2026</text>
  <text x="60" y="300" font-family="Helvetica, Arial, sans-serif" font-size="84" font-weight="700" fill="white">Build it yourself.</text>
  <text x="60" y="380" font-family="Helvetica, Arial, sans-serif" font-size="42" font-weight="400" fill="rgba(255,255,255,0.92)">A Lego blueprint of a Güntner unit —</text>
  <text x="60" y="430" font-family="Helvetica, Arial, sans-serif" font-size="42" font-weight="400" fill="rgba(255,255,255,0.92)">your take-home from the booth.</text>
  <rect x="60" y="510" width="380" height="64" rx="0" fill="white"/>
  <text x="80" y="552" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="${BRAND_DARK}" letter-spacing="2">DOWNLOAD PDF ↓</text>
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(outImage);

// ---------- Placeholder PDF (A4 portrait, one page of plain text) ----------

function escapePdfString(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdf(lines) {
  const objects = [];
  const push = (body) => {
    objects.push(body);
    return objects.length; // 1-based id
  };

  push(`<< /Type /Catalog /Pages 2 0 R >>`); // 1
  push(`<< /Type /Pages /Count 1 /Kids [3 0 R] >>`); // 2
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
  ); // 3

  let stream = "";
  let y = 760;
  let first = true;
  for (const line of lines) {
    if (first) {
      stream += `BT\n/F1 28 Tf\n72 ${y} Td\n(${escapePdfString(line)}) Tj\nET\n`;
      first = false;
      y -= 60;
      continue;
    }
    stream += `BT\n/F2 14 Tf\n72 ${y} Td\n(${escapePdfString(line)}) Tj\nET\n`;
    y -= 24;
  }

  push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`); // 4
  push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`); // 5
  push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`); // 6

  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(body, "binary"));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, "binary");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += `0000000000 65535 f \n`;
  for (const off of offsets) {
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, "binary");
}

const pdfBytes = buildPdf([
  "Güntner Lego Blueprint — Placeholder",
  "",
  "This is a placeholder PDF.",
  "Replace public/lego-guentner-plan.pdf with the real Lego",
  "building instructions before the booth goes live.",
  "",
  "Path: public/lego-guentner-plan.pdf",
  "Linked from: /quiz/[gameId] summary screen (gpc booth only).",
]);

await fs.writeFile(outPdf, pdfBytes);

console.log("Wrote:");
console.log("  public/lego-guentner-teaser.webp");
console.log("  public/lego-guentner-plan.pdf");
