# Optional custom assets (SweetSprint)

Place PNG or WebP images here to override the built-in illustrated sprites. The game will load these at startup if present.

## Expected paths (relative to `public/`)

| Path | Description | Suggested size |
|------|-------------|----------------|
| `assets/character/run.png` | Player run cycle (frames left-to-right) | 336×100 (6 frames × 56×100) or 4×56×96 |
| `assets/cookie.png` | Cookie collectible | 56×56 |
| `assets/obstacle_vehicle.png` | Car obstacle | 120×70 |
| `assets/obstacle_pet.png` | Dog obstacle | 56×50 |
| `assets/obstacle_person.png` | Pedestrian obstacle | 40×90 |
| `assets/obstacle_waterPuddle.png` | Puddle obstacle | 80×28 |
| `assets/cloud.png` | Cloud (parallax) | 110×50 |
| `assets/parallax_far.png` | Far background layer | 800×220 |
| `assets/parallax_mid.png` | Mid background layer | 800×220 |
| `assets/parallax_near.png` | Near background layer | 800×220 |

If a file is missing, the game uses its built-in illustrated procedural sprites. All assets use bottom-center or center origin where applicable.
