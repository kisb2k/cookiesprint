/**
 * Remove checkered/white/gray background from existing obstacle images.
 * Processes PNGs in place - does not recreate from SVG.
 *
 * Usage: npm run fix:obstacles
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const OBSTACLE_DIR = path.join(process.cwd(), 'public', 'assets', 'obstacle');

async function makeBackgroundTransparent(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Checkered pattern: white and light/dark gray squares
    const isWhite = r >= 250 && g >= 250 && b >= 250;
    const isLightGray = r >= 180 && g >= 180 && b >= 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
    const isMidGray = r >= 100 && r <= 180 && g >= 100 && g <= 180 && b >= 100 && b <= 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
    const isDarkGray = r >= 50 && r <= 120 && g >= 50 && g <= 120 && b >= 50 && b <= 120 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
    if (isWhite || isLightGray || isMidGray || isDarkGray) {
      data[i + 3] = 0;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(OBSTACLE_DIR)) {
    console.error(`Directory not found: ${OBSTACLE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(OBSTACLE_DIR).filter((f) => f.endsWith('.png'));
  if (files.length === 0) {
    console.error(`No PNG files in ${OBSTACLE_DIR}`);
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(OBSTACLE_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const result = await makeBackgroundTransparent(buffer);
    fs.writeFileSync(filePath, result);
    console.log(`Fixed ${file}`);
  }

  console.log(`Done. Removed checkered background from ${files.length} images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
