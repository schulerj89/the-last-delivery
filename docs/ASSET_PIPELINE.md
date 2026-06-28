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
3. Pick a small candidate or approved small pack subset for specific world/editor use.
4. Convert selected source formats into runtime GLB when needed. For Low Poly Nature Pack Lite, run `npm run assets:convert:nature`.
5. Copy or generate only selected runtime models into `public/assets/models/`.
6. Register the runtime model in `src/game/assets/assetRegistry.ts`.
7. Keep colliders, interactables, and delivery logic in world data. Do not derive gameplay collision from GLB meshes.

Registry entries should include `id`, `url`, `sourcePack`, `defaultScale`, and optional `notes`. The asset loader builds primitive fallbacks first and treats GLB/FBX models as optional visuals.

Prefer GLB for runtime assets. FBX source files belong in `raw-assets/`, not under `public/`, so Vite does not serve source pack files. Avoid full larger packs, animation sets, DRACO, KTX2, and meshopt until the runtime path is intentionally expanded.

## Current Runtime Nature Selection

The Low Poly Nature Pack Lite source folder is source-only. Runtime nature props are converted from `raw-assets/low-poly-nature-pack-lite/models/*.fbx` into GLB files under `public/assets/models/nature/converted-glb/`.

Run:

```sh
npm run assets:convert:nature
```

The script uses the dev-only `fbx2gltf` wrapper around the open-source FBX2glTF converter and writes one GLB per source FBX. The town editor uses those converted GLBs for the full lightweight nature prop catalog, including grass, flowers, pine, logs, rocks, bushes, mushrooms, tents, and other small nature props. These are decorative visuals with primitive fallbacks. Collision remains authored separately in world definitions, and nature dressing intentionally does not add colliders unless explicitly marked.

## Current Runtime Fantasy Selection

The Fantasy Free Low Poly source folder remains source-only. The current village uses selected individual GLBs under `public/assets/models/fantasy/`:

- `house_001.glb`, `house_002.glb`, and `house_003.glb` for the post office and cottages
- `barrel_001.glb` for barrel props
- `box_001.glb` for crates and boxes
- `pointer_001.glb` for signpost props
- `cart_001.glb` for one large dressing blocker
- `bag_001.glb` for small non-blocking sack dressing

These assets are optional visuals with primitive fallbacks. Major blockers still use simple world-definition colliders; small dressing props stay non-collidable unless explicitly marked otherwise.

## Current Runtime Character Selection

The Creative Characters FREE source folder remains source-only. The current player uses one selected assembled GLB under `public/assets/models/characters/`:

- `courier-creative-character.glb` from `Creative_Character_free.glb`

The player controller still owns movement, collision, reset, and camera targeting. The character GLB is a visual child only, with the primitive player mesh retained as the fallback.
