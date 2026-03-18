/**
 * Generate a procedural 5-year-old girl run-cycle spritesheet (no API needed).
 * Output: public/assets/character/run.png (384×64, 6 frames)
 *
 * Usage: npm run generate:spritesheet:procedural
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const NUM_FRAMES = 6;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'character');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'run.png');

function svgFrame(frameIndex: number): string {
  const cx = 32;
  const cy = 56;
  const legSwing = [0, 12, 20, 12, 0, -12][frameIndex];
  const armSwing = [0, -14, -18, -14, 0, 14][frameIndex];

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_WIDTH}" height="${FRAME_HEIGHT}" viewBox="0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}">
  <rect width="100%" height="100%" fill="none"/>
  <!-- legs -->
  <rect x="${cx - 8}" y="${cy - 18 + legSwing * 0.4}" width="6" height="22" rx="2" fill="#3b82f6"/>
  <rect x="${cx + 2}" y="${cy - 18 - legSwing * 0.4}" width="6" height="22" rx="2" fill="#3b82f6"/>
  <!-- shoes -->
  <rect x="${cx - 9}" y="${cy + 2}" width="7" height="4" fill="#ffffff" stroke="#1e293b"/>
  <rect x="${cx + 1}" y="${cy + 2}" width="7" height="4" fill="#ffffff" stroke="#1e293b"/>
  <!-- torso (pink hoodie) -->
  <rect x="${cx - 12}" y="${cy - 42}" width="24" height="28" rx="4" fill="#f472b6" stroke="#1e293b"/>
  <!-- arms -->
  <rect x="${cx - 18 + armSwing * 0.3}" y="${cy - 38}" width="6" height="20" fill="#f472b6"/>
  <rect x="${cx + 12 - armSwing * 0.3}" y="${cy - 38}" width="6" height="20" fill="#f472b6"/>
  <!-- head -->
  <circle cx="${cx}" cy="${cy - 52}" r="12" fill="#ffdbac" stroke="#1e293b"/>
  <!-- hair -->
  <ellipse cx="${cx}" cy="${cy - 56}" rx="14" ry="10" fill="#634433"/>
  <circle cx="${cx + 12}" cy="${cy - 58}" r="6" fill="#634433"/>
  <!-- eyes -->
  <circle cx="${cx - 3}" cy="${cy - 54}" r="2" fill="#1e293b"/>
  <circle cx="${cx + 3}" cy="${cy - 54}" r="2" fill="#1e293b"/>
</svg>`;
}

async function main() {
  const frames: Buffer[] = [];
  for (let i = 0; i < NUM_FRAMES; i++) {
    const img = await sharp(Buffer.from(svgFrame(i)))
      .resize(FRAME_WIDTH, FRAME_HEIGHT)
      .png()
      .toBuffer();
    frames.push(img);
  }

  const composite = frames.map((buf, i) => ({
    input: buf,
    left: i * FRAME_WIDTH,
    top: 0,
  }));

  const spritesheet = await sharp({
    create: {
      width: FRAME_WIDTH * NUM_FRAMES,
      height: FRAME_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composite)
    .png()
    .toBuffer();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, spritesheet);

  console.log(`Spritesheet saved to ${OUTPUT_FILE}`);
  console.log(`  5-year-old girl run cycle, ${FRAME_WIDTH * NUM_FRAMES}×${FRAME_HEIGHT} (${NUM_FRAMES} frames)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
