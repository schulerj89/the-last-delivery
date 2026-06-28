# Asset Pipeline

The Last Delivery keeps downloaded Fab packs out of the browser build by default.

## Folders

- `raw-assets/` is source-only. It is ignored by Git and must not be served by Vite.
- `public/assets/models/` is runtime-only. Put only selected, small, optimized assets here.

Expected local source folders:

- `raw-assets/low-poly-nature-pack-lite/`
- `raw-assets/fantasy-free-low-poly/`
- `raw-assets/creative-characters-free/`

## Workflow

1. Place or copy downloaded packs into `raw-assets/` using the expected folder names.
2. Run `npm run assets:scan` to inspect available source models and sizes.
3. Pick one small candidate for a specific world object.
4. Copy only that selected runtime model into `public/assets/models/`.
5. Register the runtime model in `src/game/assets/assetRegistry.ts`.
6. Keep colliders, interactables, and delivery logic in world data. Do not derive gameplay collision from GLB meshes.

Prefer GLB when available. Avoid full packs, character models, animations, DRACO, KTX2, and meshopt until the runtime path is intentionally expanded.
