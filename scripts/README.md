# Scripts

## generate:spritesheet (procedural, default)

Generates a 5-year-old girl run-cycle spritesheet with **no API key** required.

```bash
npm run generate:spritesheet
```

Output: `public/assets/character/run.png` (384×64, 6 frames). The game uses this as the main character when present.

## generate:obstacles

Generates static PNG images for game obstacles (car, pet, person, water puddle).

```bash
npm run generate:obstacles
```

Output: `public/assets/obstacle/obstacle_vehicle.png`, `obstacle_pet.png`, `obstacle_person.png`, `obstacle_waterPuddle.png`.

## generate:spritesheet:ai (Gemini/Imagen)

Uses Google Gemini (Imagen) API to generate frames. Requires a paid Imagen plan.

1. Copy `config/gemini-api.key.example` to `config/gemini-api.key` and add your key.
2. Run: `npm run generate:spritesheet:ai`
