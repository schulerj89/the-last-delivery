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

Registry entries should include `id`, `url`, `sourcePack`, `defaultScale`, and optional `notes`. The asset loader builds primitive fallbacks first and treats GLB models as optional visuals.

Prefer GLB when available. If a selected source pack only provides FBX, convert only the chosen source files outside `public/`, then copy the selected runtime GLBs into `public/assets/models/`. Avoid full packs, character models, animations, DRACO, KTX2, and meshopt until the runtime path is intentionally expanded.

## Current Runtime Nature Selection

The Low Poly Nature Pack Lite source folder is source-only. The current village uses three selected converted GLBs under `public/assets/models/nature/`:

- `nature-tree01.glb` from `tree01.fbx`
- `nature-rock.glb` from `rock.fbx`
- `nature-simple-bush.glb` from `simple_bush.fbx`

These are decorative visuals with primitive fallbacks. Collision remains authored separately in world definitions, and the new forest-edge trees and path foliage intentionally do not add colliders.

## Current Runtime Fantasy Selection

The Fantasy Free Low Poly source folder remains source-only. The current village uses selected individual GLBs under `public/assets/models/fantasy/`:

- `house_001.glb`, `house_002.glb`, and `house_003.glb` for the post office and cottages
- `barrel_001.glb` for barrel props
- `box_001.glb` for crates and boxes
- `pointer_001.glb` for signpost props
- `cart_001.glb` for one large dressing blocker
- `bag_001.glb` for small non-blocking sack dressing

These assets are optional visuals with primitive fallbacks. Major blockers still use simple world-definition colliders; small dressing props stay non-collidable unless explicitly marked otherwise.
