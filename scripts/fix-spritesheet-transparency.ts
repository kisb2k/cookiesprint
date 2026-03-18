/**
 * Make background transparent on existing run.png so only the character is visible.
 * Usage: npm run fix:spritesheet
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FILE = path.join(process.cwd(), 'public', 'assets', 'character', 'run.png');

async function makeBackgroundTransparent(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const sample = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    const i = (Math.floor(y) * w + Math.floor(x)) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  const corners = [
    sample(0, 0),
    sample(w - 1, 0),
    sample(0, h - 1),
    sample(w - 1, h - 1),
  ].filter(Boolean) as [number, number, number][];
  const bgR = corners.reduce((a, c) => a + c[0], 0) / corners.length;
  const bgG = corners.reduce((a, c) => a + c[1], 0) / corners.length;
  const bgB = corners.reduce((a, c) => a + c[2], 0) / corners.length;
  const tolerance = 35;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const match = Math.abs(r - bgR) < tolerance && Math.abs(g - bgG) < tolerance && Math.abs(b - bgB) < tolerance;
    if (match || (r >= 230 && g >= 230 && b >= 230)) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(FILE);
  const out = await makeBackgroundTransparent(buffer);
  fs.writeFileSync(FILE, out);
  console.log(`Fixed transparency: ${FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
