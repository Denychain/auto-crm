#!/usr/bin/env node
/**
 * Generates PWA icons from public/source-icon.png
 * Usage: npm run icons
 * Requires: public/source-icon.png (at least 512x512, square)
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const PUBLIC = path.join(__dirname, "..", "public");
const SRC = path.join(PUBLIC, "source-icon.png");

if (!fs.existsSync(SRC)) {
  console.error("❌  Missing source: public/source-icon.png");
  console.error("    Place a square PNG (≥512×512) there and re-run.");
  process.exit(1);
}

const targets = [
  { file: "icon-192.png",        size: 192 },
  { file: "icon-512.png",        size: 512 },
  { file: "apple-touch-icon.png",size: 180 },
];

async function run() {
  console.log("🖼  Generating icons from", SRC);

  for (const { file, size } of targets) {
    const dest = path.join(PUBLIC, file);
    await sharp(SRC).resize(size, size).png().toFile(dest);
    console.log(`  ✓  ${file} (${size}×${size})`);
  }

  // favicon.ico — use sharp to produce a 32×32 PNG; rename to .ico
  // (browsers accept PNG served as image/x-icon for favicon)
  const favDest = path.join(PUBLIC, "favicon.ico");
  await sharp(SRC).resize(32, 32).png().toFile(favDest);
  console.log("  ✓  favicon.ico (32×32)");

  console.log("\n✅  Done! Icons written to public/");
}

run().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
