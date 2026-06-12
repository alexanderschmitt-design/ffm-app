// Render a booth print page to a DIN A2 PDF using existing Chrome via puppeteer-core.
//
// Usage: node scripts/print-booth-pdf.mjs [slug] [outFile]
// Defaults: slug=tax, outFile=public/booth-<slug>-A2.pdf
// Requires the Next.js dev server (or any server) running on http://localhost:3000.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const slug = process.argv[2] ?? "tax";
const outArg = process.argv[3] ?? path.join("public", `booth-${slug}-A2.pdf`);
const outFile = path.isAbsolute(outArg) ? outArg : path.join(projectRoot, outArg);

const url = process.env.PRINT_URL ?? `http://localhost:3000/booth/${slug}/print`;

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

const executablePath = candidates.find((p) => p && fs.existsSync(p));
if (!executablePath) {
  console.error("Could not locate Chrome or Edge. Set CHROME_PATH env var.");
  process.exit(1);
}

// DIN A2 portrait in inches (1 in = 25.4 mm). 420 x 594 mm.
const A2_WIDTH_IN = 420 / 25.4;
const A2_HEIGHT_IN = 594 / 25.4;

const browser = await puppeteer.launch({
  executablePath,
  headless: "shell",
  args: ["--no-sandbox", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  await page.emulateMediaType("print");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

  await page.pdf({
    path: outFile,
    width: `${A2_WIDTH_IN}in`,
    height: `${A2_HEIGHT_IN}in`,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: false,
  });

  const stat = fs.statSync(outFile);
  console.log(`Wrote ${outFile} (${stat.size.toLocaleString()} bytes)`);
} finally {
  await browser.close();
}
