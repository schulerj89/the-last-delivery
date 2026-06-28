# Changelog

All notable changes to The Last Delivery will be documented in this file.

## [0.28.0] - 2026-06-28

### Added

- Added smoke validation for village bounds, spawn bounds, interactable bounds, interactable clearance from major colliders, world object counts by kind, and decorative prop budget.
- Added explicit layout object budgets for decorative prop count and crate/barrel dressing clusters.

### Changed

- Reworked the first village into the documented `x -14..14` and `z -12..14` bounds.
- Moved spawn, post office, delivery board, well, cottages, mailboxes, signs, forest-edge props, and dressing clusters into a cleaner open village composition.
- Rebuilt visible pathing into a wider spawn-to-plaza-to-north-house main path plus blue-house, red-house, and post-office side paths.
- Updated playground collision bounds to use the shared village layout config.
- Removed loose sack dressing and the south-corner rock to reduce decorative clutter while preserving the delivery loop.

## [0.27.0] - 2026-06-28

### Added

- Added a reusable GLB asset fitting utility with `none`, `contain`, `cover`, and explicit `exact` fit modes.
- Added optional per-world-object asset render settings for fit mode, scale multiplier, Y offset, and render rotation.
- Added visual asset bounds debug helpers so fitted GLB bounds can be compared with existing collider debug boxes.
- Added smoke checks for fit modes, invalid fit-mode fallback, zero-dimension safety, target bounds, world render settings, and primitive fallback initialization.

### Changed

- Updated village GLB rendering to fit per-instance clones through the shared fitting utility without mutating cached source assets.
- Added a `B` debug key path that shows both intended collider boxes and visual asset bounds.

## [0.26.0] - 2026-06-28

### Added

- Added `docs/WORLD_LAYOUT.md` with the first-village coordinate system, intended bounds, major zones, spacing rules, density budget, and ASCII top-down map.
- Added a typed `villageLayoutConfig` module for intended bounds, spacing, density, and zone definitions.
- Added smoke checks for the layout config so future layout edits keep the documented rules valid.

## [0.25.0] - 2026-06-28

### Added

- Added one selected Creative Characters FREE runtime GLB for the player courier visual.
- Added a player visual module with character scale, rotation, offset, and visible-mesh tuning constants.
- Added fallback-safe character attachment to the existing player controller while preserving movement, collision, reset, and camera behavior.
- Added GLB animation-name metadata logging when loaded assets provide animations.
- Added smoke checks for the selected character asset, runtime file presence, player fallback visual initialization, and player visual config.

### Changed

- Updated asset scan reporting and asset docs to include selected character runtime assets.

## [0.24.0] - 2026-06-28

### Added

- Added a reusable procedural mailbox prop built from primitive Three.js geometry.
- Added blue, red, and green mailbox variants with wooden posts, rounded bodies, flags, front doors, and mail symbols.
- Added a Post Office Return Box target so delivery destinations map to three distinct mailbox objects.
- Added smoke checks for procedural mailbox initialization, mailbox variants, delivery target anchors, and active target resolution.

### Changed

- Updated village mailbox rendering to use the in-code mailbox prop instead of inline blockout boxes.
- Updated delivery destination text and wrong-mailbox feedback to show player-readable destination names.

## [0.23.0] - 2026-06-28

### Added

- Added selected Fantasy Free Low Poly runtime GLBs for houses, barrels, boxes, pointer signs, a cart, and sacks.
- Added fantasy asset registry entries and selected-fantasy asset smoke checks.
- Added fantasy-backed world definitions for cottages, post office, crates, barrels, signposts, cart dressing, and sack dressing.
- Added runtime fantasy asset budget reporting to `npm run assets:scan`.

### Changed

- Updated village rendering so selected fantasy props replace primitive blockout visuals when available while keeping primitive fallbacks.
- Kept delivery board, mailbox interactions, delivery targets, and simple render-independent colliders intact.

## [0.22.1] - 2026-06-28

### Fixed

- Added an asset-cache disposal guard so in-flight GLB loads dispose their source resources if they finish after the cache has been shut down.

## [0.22.0] - 2026-06-28

### Added

- Added an explicit cached GLB source asset layer so repeated asset ids share one fetch/parse result.
- Added disposable asset instance handles that remove world clones and decrement usage counts without disposing shared GLB resources.
- Added runtime asset stats for loaded asset ids and scene instance counts by asset id.
- Added asset runtime counts to the performance debug snapshot and overlay.
- Added smoke checks for cache reuse, invalid asset ids, fallback-safe load failures, guarded cached-source disposal, and instance count floors.

### Changed

- Updated world GLB rendering to create cached asset instances while keeping primitive fallbacks on load failure.
- Updated scene-root cleanup to run asset instance cleanup callbacks before removing tracked roots.

## [0.21.1] - 2026-06-28

### Added

- Added `docs/PERFORMANCE.md` with the project performance policy for frame timing, renderer metrics, pixel-ratio limits, asset imports, and GPU resource disposal.

## [0.21.0] - 2026-06-28

### Added

- Added a performance monitor for FPS, frame time, recent frame-time averages, worst recent frame time, draw calls, triangles, geometries, and textures.
- Added a performance debug overlay panel and debug-only budget warnings for FPS, frame time, draw calls, and triangles.
- Added a configurable renderer pixel-ratio cap with a default max of `1.5`.
- Added a global frame-delta clamp so tab stalls do not advance gameplay with huge deltas.
- Added an ownership-aware resource tracker for Object3D roots, geometries, materials, material texture references, textures, and cleanup callbacks.
- Added smoke checks for performance budgets, pixel-ratio capping, delta clamping, performance snapshots, and resource disposal behavior.

## [0.20.0] - 2026-06-28

### Added

- Added selected Low Poly Nature Pack Lite runtime GLBs for tree, rock, and bush props.
- Added decorative forest-edge trees plus path-framing rocks and foliage through world definitions.
- Added runtime model payload reporting to `npm run assets:scan`.
- Added smoke checks for selected nature asset ids, runtime file presence, world asset references, and fallback initialization.

### Changed

- Kept new nature assets decorative by preserving existing collision proxies and delivery behavior.
- Documented the selected nature asset workflow and runtime model budget.

## [0.19.0] - 2026-06-28

### Changed

- Updated the optional GLB loader to use `three/addons/loaders/GLTFLoader.js`.
- Added source pack, default scale, and notes metadata to asset registry entries.
- Added `loadModel` and `loadModelInstance` asset loading helpers while preserving primitive fallbacks.
- Expanded smoke checks for registry URL, source pack, default scale, and world asset references.

## [0.18.0] - 2026-06-28

### Added

- Added source-only `raw-assets/` ignore policy for downloaded Fab asset packs.
- Added asset pipeline and asset catalog documentation for separating source packs from runtime models.
- Added `npm run assets:scan` to inventory expected raw asset packs and report model file counts and sizes.

## [0.17.0] - 2026-06-28

### Added

- Added a small asset registry and Three.js GLTFLoader path for optional prop GLBs.
- Added one optional crate GLB target under `public/assets/models/` with README placement guidance.
- Added world `render` definitions so objects can opt into primitive or asset-backed rendering.
- Added smoke checks for unique asset ids, known world asset references, and primitive fallback initialization.

### Changed

- Let `crate-large` try the optional crate GLB while preserving its primitive fallback, collider, and gameplay behavior.

## [0.16.0] - 2026-06-28

### Added

- Added simple village sign labels for the post office, blue house, red house, and side path.
- Added a player-facing active destination guidance line.
- Added smoke checks for village labels, clearer delivery destination names, and objective marker readability.

### Changed

- Improved house, path, mailbox, and interactable color separation for village readability.
- Enlarged the objective marker with a halo and stronger bobbing so active targets read from farther away.

## [0.15.0] - 2026-06-28

### Added

- Added a simple delivery board overlay for choosing from available delivery jobs.
- Added number-key, Escape, and click controls for delivery board job selection.
- Added accept-by-id delivery controller behavior and available-job filtering for completed jobs.
- Updated smoke validation for job list initialization, selected job acceptance, completed job tracking, and invalid job ids.

## [0.14.0] - 2026-06-28

### Added

- Added simple delivery job definitions with ids, titles, notes, mailbox targets, and rewards.
- Added next-available delivery acceptance, active delivery tracking, active target tracking, and completed delivery ids.
- Added multi-mailbox delivery completion checks, wrong-mailbox feedback, and active-target objective marker retargeting.
- Expanded smoke validation for delivery job targets, wrong-target completion, and objective marker target resolution.

## [0.13.0] - 2026-06-28

### Added

- Expanded the first village square blockout with a post office, three cottages, two mailbox placeholders, a central well, and primitive props.
- Moved new village layout objects and colliders into the world definition layer.
- Updated smoke validation for village object counts, active delivery target rules, post office proximity, and generated collision data.

## [0.12.0] - 2026-06-28

### Added

- Added a small world definition layer for first-village object records.
- Centralized delivery board and mailbox positions, collider data, interaction data, and objective anchors.
- Added smoke checks for world object uniqueness, interactable positions, collider sizes, and delivery target existence.

## [0.11.0] - 2026-06-28

### Added

- Added iteration 009 tiny village square blockout expansion.
- Added primitive house placeholders, a main delivery route path, a spawn side path, and village props.
- Expanded playground boundaries and collision to fit the first village square while preserving the original delivery board and mailbox loop.

## [0.10.1] - 2026-06-28

### Fixed

- Added root lifecycle cleanup for Vite HMR, event listeners, animation frames, controller disposal, canvas removal, and renderer disposal.
- Added a clearer delivery objective line that directs the player to the delivery board before a delivery is accepted.

## [0.10.0] - 2026-06-28

### Added

- Added iteration 008 playground readability and game-feel polish.
- Added visible ground cues for player spawn and interactable stand points.
- Added delivery board and mailbox objective markers with subtle animation.

### Changed

- Improved primitive material contrast for interactables and obstacles.
- Improved interaction prompt placement and message timing.

## [0.9.0] - 2026-06-28

### Added

- Added project-scoped Codex reviewer agents for game feel, Three.js architecture, browser performance, and validation review.

## [0.8.0] - 2026-06-28

### Added

- Added iteration 007 lightweight smoke validation for the current delivery loop.
- Added a TypeScript smoke script covering delivery state transitions, interaction callbacks, key constants, collision bounds, and objective marker initialization.
- Updated validation to run smoke checks as part of `npm run validate`.

## [0.7.1] - 2026-06-28

### Fixed

- Clarified pre-delivery mailbox interaction so players are directed to start at the delivery board.

## [0.7.0] - 2026-06-28

### Added

- Added iteration 006 first delivery loop.
- Added a minimal delivery state machine with idle, delivery accepted, and delivery completed states.
- Added delivery board acceptance and mailbox completion interactions.
- Added a mailbox objective marker while a delivery is active and a delivery status overlay with completed count.

## [0.6.0] - 2026-06-28

### Added

- Added iteration 005 basic interaction system.
- Added nearby interaction prompts for the mailbox and delivery board.
- Added `E` key interaction handling with simple on-screen result messages.
- Added playground interactable data separate from full delivery state.

## [0.5.0] - 2026-06-28

### Added

- Added iteration 004 simple playground collision.
- Added render-independent collision data for playground bounds, crates, mailbox, and delivery board blockers.
- Added simple player collision resolution without a physics engine.
- Added a `C` key debug visualization toggle for playground collision boxes.

## [0.4.0] - 2026-06-28

### Added

- Added iteration 003 third-person follow camera.
- Added mouse orbit around the placeholder player with smoothed camera movement.
- Added tunable third-person camera settings with clamped vertical pitch.
- Added camera debug overlay values for yaw, pitch, and distance.

## [0.3.0] - 2026-06-28

### Added

- Added iteration 002 placeholder player movement.
- Added a primitive placeholder player mesh.
- Added WASD ground-plane movement with acceleration, deceleration, max speed, and rotation toward movement direction.
- Added reset-to-spawn input and a player debug overlay for position, speed, and grounded state.

## [0.2.0] - 2026-06-28

### Added

- Added iteration 001 movement playground blockout.
- Added a dedicated playground world module for primitive yard geometry.
- Added a fenced test yard with ground, ramp, crates, mailbox placeholder, and delivery board placeholder.
- Added debug names and labels to playground objects.

## [0.1.0] - 2026-06-27

### Added

- Added iteration 000 project scaffold for a tiny browser Three.js game.
- Added a Vite + TypeScript + Three.js setup with development, typecheck, build, and validation scripts.
- Added a basic rendered scene with a ground plane, one cube, a camera, and simple lighting.
