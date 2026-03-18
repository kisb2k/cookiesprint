/**
 * Generate game spritesheets using Google Gemini (Imagen) API.
 *
 * Usage:
 *   npm run generate:spritesheet
 *
 * API key (pick one):
 *   - config/gemini-api.key (one line, raw key)
 *   - GOOGLE_GENAI_API_KEY or GEMINI_API_KEY in .env
 */

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const NUM_FRAMES = 6;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'character');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'run.png');

const RUN_FRAME_PROMPTS = [
  'Pixel art, 5 year old girl running, right leg forward, left arm forward, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
  'Pixel art, 5 year old girl running, mid-stride left leg forward, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
  'Pixel art, 5 year old girl running, right leg forward again, transition frame, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
  'Pixel art, 5 year old girl running, mid-air jump both feet off ground, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
  'Pixel art, 5 year old girl running, left leg forward, right leg back, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
  'Pixel art, 5 year old girl running, right leg forward, completing cycle, side view, 64x64px, transparent background, childish cute style, pink hoodie, blue pants, small child proportions',
];

/** Make background pixels transparent so only the character is visible. */
async function makeBackgroundTransparent(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const getPixel = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };
  const sample = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    return getPixel(x, y);
  };
  const corners = [
    sample(0, 0),
    sample(w - 1, 0),
    sample(0, h - 1),
    sample(w - 1, h - 1),
  ].filter(Boolean) as [number, number, number, number][];
  const bgR = corners.reduce((a, c) => a + c[0], 0) / corners.length;
  const bgG = corners.reduce((a, c) => a + c[1], 0) / corners.length;
  const bgB = corners.reduce((a, c) => a + c[2], 0) / corners.length;
  const tolerance = 25;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const match = Math.abs(r - bgR) < tolerance && Math.abs(g - bgG) < tolerance && Math.abs(b - bgB) < tolerance;
    if (match || (r >= 240 && g >= 240 && b >= 240)) {
      data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function stitchFrames(frames: Buffer[]): Promise<Buffer> {
  const totalWidth = FRAME_WIDTH * NUM_FRAMES;
  const compositeOps = frames.map((buf, i) => ({
    input: buf,
    left: i * FRAME_WIDTH,
    top: 0,
  }));

  return sharp({
    create: {
      width: totalWidth,
      height: FRAME_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOps)
    .png()
    .toBuffer();
}

function loadApiKey(): string | undefined {
  const keyPath = path.join(process.cwd(), 'config', 'gemini-api.key');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8').trim();
  }
  try {
    require('dotenv').config();
  } catch {
    // dotenv optional
  }
  return process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('Missing API key. Either:');
    console.error('  1. Create config/gemini-api.key with your key (copy from config/gemini-api.key.example)');
    console.error('  2. Set GOOGLE_GENAI_API_KEY or GEMINI_API_KEY in .env');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log('Generating run cycle frames via Gemini Imagen API...\n');

  const frames: Buffer[] = [];

  for (let i = 0; i < NUM_FRAMES; i++) {
    console.log(`  Frame ${i + 1}/${NUM_FRAMES}...`);
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: RUN_FRAME_PROMPTS[i],
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          personGeneration: 'allow_all',
        },
      });

      if (!response.generatedImages?.length || !response.generatedImages[0]?.image?.imageBytes) {
        throw new Error(`No image returned for frame ${i + 1}`);
      }

      const buffer = Buffer.from(response.generatedImages[0].image.imageBytes, 'base64');
      const resized = await sharp(buffer)
        .resize(FRAME_WIDTH, FRAME_HEIGHT)
        .ensureAlpha()
        .png()
        .toBuffer();
      const transparent = await makeBackgroundTransparent(resized);
      frames.push(transparent);
    } catch (err) {
      console.error(`  Failed frame ${i + 1}:`, err);
      throw err;
    }
  }

  console.log('\nStitching spritesheet...');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const spritesheet = await stitchFrames(frames);
  fs.writeFileSync(OUTPUT_FILE, spritesheet);

  console.log(`\nSpritesheet saved to ${OUTPUT_FILE}`);
  console.log(`  Size: ${FRAME_WIDTH * NUM_FRAMES}x${FRAME_HEIGHT} (${NUM_FRAMES} frames × ${FRAME_WIDTH}x${FRAME_HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
