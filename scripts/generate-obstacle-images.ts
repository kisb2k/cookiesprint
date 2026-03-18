/**
 * Generate static PNG images for game obstacles (car, pet, person, waterPuddle).
 * Output: public/assets/obstacle/*.png
 *
 * Usage: npm run generate:obstacles
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'assets', 'obstacle');

function svgCar(): string {
  const w = 120;
  const h = 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- body -->
  <rect x="10" y="15" width="100" height="45" rx="8" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
  <!-- windshield -->
  <rect x="35" y="8" width="50" height="25" rx="5" fill="#fef2f2" stroke="#fecaca" stroke-width="1"/>
  <!-- window -->
  <rect x="42" y="12" width="18" height="14" rx="2" fill="#7dd3fc"/>
  <!-- wheels -->
  <circle cx="28" cy="58" r="10" fill="#000000"/>
  <circle cx="28" cy="58" r="6" fill="#374151"/>
  <circle cx="92" cy="58" r="10" fill="#000000"/>
  <circle cx="92" cy="58" r="6" fill="#374151"/>
</svg>`;
}

function svgPet(): string {
  const w = 56;
  const h = 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- body -->
  <ellipse cx="28" cy="30" rx="22" ry="18" fill="#d97706" stroke="#b45309" stroke-width="2"/>
  <!-- head -->
  <circle cx="28" cy="12" r="14" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
  <!-- ears -->
  <ellipse cx="18" cy="4" rx="10" ry="14" fill="#78350f"/>
  <ellipse cx="38" cy="4" rx="10" ry="14" fill="#78350f"/>
  <!-- eye -->
  <circle cx="32" cy="11" r="3" fill="#000000"/>
  <!-- nose -->
  <rect x="20" y="16" width="16" height="4" rx="2" fill="#fbbf24"/>
</svg>`;
}

function svgPerson(): string {
  const w = 40;
  const h = 90;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- legs -->
  <rect x="10" y="66" width="8" height="24" rx="3" fill="#15803d"/>
  <rect x="22" y="66" width="8" height="24" rx="3" fill="#15803d"/>
  <!-- body -->
  <rect x="8" y="28" width="24" height="38" rx="5" fill="#22c55e" stroke="#16a34a" stroke-width="1"/>
  <!-- collar/vest top -->
  <rect x="12" y="0" width="16" height="28" rx="3" fill="#166534" stroke="#14532d" stroke-width="1"/>
  <!-- head -->
  <circle cx="20" cy="-5" r="12" fill="#ffdbac" stroke="#92400e" stroke-width="1" opacity="0.8"/>
  <!-- hat -->
  <rect x="6" y="-12" width="28" height="10" rx="4" fill="#1e40af"/>
  <!-- eyes -->
  <circle cx="16" cy="-7" r="2" fill="#333333"/>
  <circle cx="24" cy="-7" r="2" fill="#333333"/>
</svg>`;
}

function svgWaterPuddle(): string {
  const w = 80;
  const h = 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- puddle -->
  <ellipse cx="40" cy="14" rx="36" ry="11" fill="#06b6d4" stroke="#0891b2" stroke-width="2"/>
  <!-- highlight -->
  <ellipse cx="32" cy="10" rx="12" ry="5" fill="#67e8f9"/>
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const assets = [
    { name: 'vehicle', svg: svgCar(), width: 120, height: 70 },
    { name: 'pet', svg: svgPet(), width: 56, height: 50 },
    { name: 'person', svg: svgPerson(), width: 40, height: 90 },
    { name: 'waterPuddle', svg: svgWaterPuddle(), width: 80, height: 28 },
  ];

  for (const { name, svg, width, height } of assets) {
    const outPath = path.join(OUT_DIR, `obstacle_${name}.png`);
    await sharp(Buffer.from(svg))
      .resize(width, height)
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath}`);
  }

  console.log(`Done. ${assets.length} obstacle images in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
