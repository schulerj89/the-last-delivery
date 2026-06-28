# Changelog

All notable changes to The Last Delivery will be documented in this file.

## [0.53.3] - 2026-06-28

### Fixed

- Fixed the main game boot path so the promoted authored town layout renders in gameplay instead of only grass, fence, and the updated player spawn.
- Explicitly enabled authored collision, interactables, objective guidance, and markers for the main game while keeping the standalone town editor canvas clean.
- Fixed generated editor copy chains so exported `templateId` values resolve back to source templates instead of generated copy ids.
- Made layout debug labels tolerate generated replacements for important objects like the delivery board.
- Added smoke coverage to catch the main-game authored-layout opt-in, generated-template resolution, and active-layout interactables.

## [0.53.2] - 2026-06-28

### Fixed

- Restored visible town editor help access with a `Help / Controls` button in the compact builder HUD.
- Repositioned the standalone town editor help overlay so it appears above the editor canvas instead of being covered by the asset shelf.
- Added toolbar/docs/smoke coverage for the `F1` help path.
- Relaxed stale smoke assumptions so promoted editor layouts can include generated pavement and separated district placements.

## [0.53.1] - 2026-06-28

### Added

- Added a standalone town editor loading screen with progress text and a progress bar while the editor canvas and initial asset previews prepare.
- Added a bounded initial thumbnail wait so the editor does not stay hidden forever if an optional preview stalls.
- Added smoke coverage for the town editor loading screen and boot wait behavior.

## [0.53.0] - 2026-06-28

### Added

- Added `Duplicate Selected` and `Ctrl+D` support in the placement editor so reusable tiles and props can be copied without dragging from the palette again.
- Added empty-ground deselection in the editor so clicking away clears the current object selection.
- Added smoke coverage for duplicate object id generation, duplicate placement offsets, repeated generated tile placement, and updated editor toolbar hints.

### Changed

- Updated the town editor toolbar and editor workflow docs with duplicate and deselect controls.

## [0.52.0] - 2026-06-28

### Added

- Added FBX model loading support alongside the existing GLB path so lightweight source FBX props can be previewed and placed through the editor.
- Added the complete Low Poly Nature Pack Lite FBX model set under `public/assets/models/nature/source-fbx/` for grass, flowers, pine, logs, rocks, bushes, mushrooms, tents, and small nature props.
- Registered the full lightweight nature runtime set and mapped those assets to reusable town-editor placement templates.
- Added smoke coverage for FBX registry entries and town-editor grass/tree/flower palette availability.

### Changed

- Updated asset scan reporting and asset docs to count the approved nature FBX runtime set while keeping larger fantasy and character packs curated.

## [0.51.0] - 2026-06-28

### Added

- Added generated town-editor object placement so each palette drop creates a fresh `editor-*` world object instead of reusing a limited authored placement slot.
- Added layout override support for generated object metadata, including `kind` and `templateId`, with runtime merging and source-promotion validation.
- Added smoke coverage for reusable palette placement, generated object validation, generated object merging, and created-object export.

### Changed

- Updated town-editor palette copy to describe reusable drag placement instead of slot counts.
- Updated the editor workflow docs to explain generated object ids, template-backed placement, and promotion validation.

## [0.50.0] - 2026-06-28

### Added

- Added a World Markers section to the standalone town editor shelf for dragging player spawn, post office, delivery board, and mailbox targets into the editor.
- Added primitive placement previews for draggable marker objects so marker cards appear visibly when placed.

### Changed

- Made the standalone town editor default to the close 3D camera view.
- Hid layout debug circles, route outlines, and object labels from the standalone builder canvas so spawn, board, mailbox, and district concepts can be introduced from editor panels instead.
- Added smoke coverage for the standalone editor camera/default-helper behavior, marker palette, and marker primitive previews.

## [0.49.1] - 2026-06-28

### Fixed

- Centered town editor GLB asset thumbnails by scaling the preview wrapper after model recentering instead of scaling the model away from its corrected pivot.
- Added smoke coverage for the thumbnail wrapper-scale behavior.

## [0.49.0] - 2026-06-28

### Added

- Added rendered GLB thumbnail previews to the standalone town editor asset shelf using the existing asset loader and a shared thumbnail renderer.
- Added a save-focused builder HUD variant for `/town-editor.html` with save, load, copy, import, export, and delete controls instead of the full dropdown inspector.
- Added Delete-key and `Delete Selected` support for removing selected objects from the active editor layout without deleting asset files.
- Added smoke coverage for the builder HUD variant, asset thumbnail route wiring, and delete-draft behavior.

### Changed

- Updated town editor workflow docs to describe asset previews, the compact save panel, and safe layout deletion.

## [0.48.0] - 2026-06-28

### Added

- Added a standalone `/town-editor.html` builder route with a left-side asset shelf for dragging generated ground pieces and selected runtime GLB assets into the clean playground.
- Added a town editor catalog that maps palette asset cards to editable world-object slots while keeping the courier character out of prop placement.
- Added placement editor APIs for external drag/drop placement and editable object inspection.
- Added smoke coverage for the standalone town editor route, Vite build input, palette initialization, and draggable slot resolution.

### Changed

- Documented the standalone town builder workflow alongside the existing in-game F2 layout editor.

## [0.47.0] - 2026-06-28

### Added

- Added inactive generated pavement objects to the authored world list so they can be activated, dragged, scaled, and promoted through the placement editor.
- Added editor primitive previews for generated pavement so ground pieces can be placed without importing GLB assets.
- Added smoke coverage for generated pavement availability and preview initialization.

### Fixed

- Changed GLB asset fitting to ground-align visual bounds by default so scaled asset previews grow upward instead of sinking through the ground.
- Kept generated pavement previews and authored pavement renders clamped above ground while scaling.

## [0.46.0] - 2026-06-28

### Added

- Added explicit world gameplay metadata for object roles and interaction actions, including player spawn, post office, delivery board, mailbox, and decorative roles.
- Added placement editor gameplay controls and preset buttons for assigning spawn, post office, delivery board, mailbox target, or decorative behavior to selected objects/assets.
- Added a compact button-instructions panel inside the placement editor HUD.
- Added player spawn as an editable world object so spawn placement can be promoted through the layout override workflow.
- Extended layout override validation, generated source promotion, and smoke checks to cover gameplay roles, interaction actions, mailbox metadata, and spawn resolution.

## [0.45.0] - 2026-06-28

### Added

- Added layout editor camera modes so `V` switches between top-down overview and close perspective inspection while F2 layout mode is active.
- Added editor view zoom controls, including mouse-wheel zoom in overview mode and mouse-wheel distance control in close mode.
- Added close editor camera controls for right-drag orbit and middle-drag panning across the X/Z ground plane.
- Updated placement editor picking to raycast through the active editor camera.
- Added smoke checks for layout camera mode config, camera switching, and zoom clamping.

## [0.44.0] - 2026-06-28

### Changed

- Cleared the default playground composition to a clean editor canvas with only grass ground and the boundary fence rendered.
- Disabled authored playground collisions, interactables, delivery objective markers, and delivery guidance in the clean canvas so hidden objects do not block or direct the player.
- Kept authored village objects, colliders, and primitive fallbacks available on demand for layout debug, editor inspection, and smoke coverage.

## [0.43.0] - 2026-06-28

### Added

- Expanded the F2 placement editor with object and asset catalog panels for inspecting world object properties, colliders, interactables, objective anchors, mailbox destinations, and registered runtime GLB assets.
- Added active editor JSON persistence in `localStorage`, copy/import support, and optional browser file-picker open/save controls for explicit `.json` workflows.
- Added live object active/inactive toggles and selected-asset preview loading through the existing GLB asset manager.
- Extended layout override JSON validation and promotion to support active state, asset/render choices, dimensions, colliders, interactables, and objective anchors.
- Added smoke checks for active editor JSON fields, asset id validation, and browser file-picker capability detection.

## [0.42.0] - 2026-06-28

### Added

- Added `F10` as a dedicated collision-box debug toggle for the gameplay view while keeping the existing `C` shortcut.
- Added collision-box visibility to the central debug panel and documented the new F-key control.
- Added smoke coverage for the collision debug F-key binding.

## [0.41.0] - 2026-06-28

### Added

- Added mouse-wheel zoom for the third-person camera with tunable minimum distance, maximum distance, sensitivity, and smoothing.
- Added smoke checks for camera zoom limits and wheel direction behavior.

## [0.40.1] - 2026-06-28

### Fixed

- Locked courier `Hips.position` X/Z values during runtime animation sanitizing so walk/run clips keep vertical hip bounce without moving the visual root forward or sideways.
- Updated the animation harness to default `Lock Hips X/Z` on, matching runtime playback, while still allowing it to be toggled off for diagnosis.
- Added smoke checks for hip-track detection, default hip X/Z locking, preserved hip Y motion, and opt-out behavior.

## [0.40.0] - 2026-06-28

### Added

- Added an isolated `/animation-harness.html` Vite route for inspecting the courier visual and animation clips outside the main game loop.
- Added animation harness controls for clip selection, play/pause, frame stepping, scrub time, loop start/end trimming, playback speed, root-motion stripping, hip X/Z locking, skeleton visibility, mesh filtering, and copyable patch notes.
- Added a multi-page Vite build config so the harness is emitted in production builds.
- Added smoke checks for the animation harness route, build input, courier asset usage, root-motion control, and loop trim output.

## [0.39.1] - 2026-06-28

### Fixed

- Fixed player movement to use the third-person camera controller yaw for screen-relative WASD movement instead of a stale camera transform.
- Fixed player facing yaw so the courier faces the actual movement direction for left/right movement.
- Added smoke checks for camera-yaw movement mapping and player facing direction.

## [0.39.0] - 2026-06-28

### Added

- Added speed-driven courier animation states for idle, walk, and run using the existing Creative Characters animation source.
- Added expanded debug reporting for the active animation state and clip.
- Added smoke checks for motion animation selection, speed thresholds, and root-motion track cleanup.

### Fixed

- Removed top-level `Root.position` tracks from runtime player animation clips so walk/run animations stay in-place and the player controller remains the only owner of player movement.

## [0.38.0] - 2026-06-28

### Added

- Added a larger first-town district plan with playable/scenic bounds, district centers, route names, spacing rules, density budgets, and an ASCII layout map.
- Added animation-clip retention to the GLB asset cache so selected character animation sources can drive player visuals.
- Added player courier animation-source status, active animation reporting, and idle clip selection smoke coverage.

### Changed

- Split the courier setup so `courier-creative-character_2.glb` provides the visible skinned character mesh while `courier-creative-character.glb` provides the animation clips.
- Updated the player visual to play a preferred idle animation clip through `AnimationMixer` while preserving the existing player root, movement, collision, camera, and primitive fallback.
- Nudged the delivery board interact point to satisfy the stricter future-town clearance rule without changing the delivery loop.

## [0.37.0] - 2026-06-28

### Added

- Added authored `layout-edits/village-layout.json` placement overrides and generated `src/world/villageOverrides.generated.ts` from the permanent layout workflow.
- Added optional `fitMode` support to layout override validation, generation, and runtime merge for asset-backed world objects.
- Added smoke checks for generated layout override validation, asset fit tuning, and delivery-target approach clearance.

### Changed

- Cleaned up the first village composition by pushing houses and trees farther to the perimeter, moving foliage and dressing out of walk lanes, and clustering crates/barrels/cart dressing near edges.
- Moved the delivery board interact point to the front approach from spawn so the board reads sooner and has clearer access.
- Tuned object rotations, scale multipliers, Y offsets, and fit modes through generated layout overrides while keeping collision proxies independent from visual meshes.

## [0.36.0] - 2026-06-28

### Added

- Added a world environment module with a lightweight gradient skydome, scene fog, warm directional sun, soft hemisphere light, and ambient fill light.
- Added tunable environment presets for `morning`, `goldenHour`, and `overcast`, with `goldenHour` as the default.
- Added expanded debug UI reporting for the active environment preset.
- Added smoke checks for environment preset validity, fog ranges, scene application, and renderer-free cleanup.

### Changed

- Replaced the dark test-scene background and hard-coded lights in `main.ts` with the reusable environment module.

## [0.35.1] - 2026-06-28

### Fixed

- Fixed skinned GLB model instances by cloning cached character assets with Three.js `SkeletonUtils.clone` instead of `Object3D.clone(true)`, so the courier skeleton follows the moving player instance instead of remaining at the source asset origin.
- Added smoke coverage for skinned GLB instance cloning to ensure runtime instances do not share cached source skeleton bones.

## [0.35.0] - 2026-06-28

### Added

- Added a central developer debug panel manager with F3 visibility, F4 hidden/compact/expanded detail cycling, F5 performance detail toggling, and F1 help when layout mode is off.
- Added compact debug output for FPS, draw calls, active delivery, player position, and selected layout-editor object.
- Added expanded debug output for player visual status, camera values, delivery state, layout object counts, and optional performance details.
- Added `docs/DEBUG_UI.md` documenting developer UI controls.
- Added smoke checks for debug state initialization, detail levels, gameplay UI independence, and hidden-panel performance snapshot safety.

### Changed

- Consolidated runtime player, camera, delivery, performance, layout, and selected placement-editor debug readouts into one debug panel.
- Updated debug/dev panel CSS so developer UI stays away from center gameplay prompts, uses smaller text, scrolls when needed, and fades until hovered.
- Updated the placement editor workflow docs with the shared debug controls.

## [0.34.0] - 2026-06-28

### Added

- Added player visual status reporting for character load mode, asset URL, mesh counts, animation names, bounds, root transform, scale, rotation, offset, and fallback visibility.
- Added player debug overlay character visual diagnostics.
- Added dev visual toggles: `F6` force fallback, `F7` force character, `F8` show all character meshes, and `F9` restore the configured mesh filter.
- Added player-root axis helper visibility while F2 layout mode is active.
- Added smoke checks for safe visual status initialization, mesh-filter fallback behavior, safe bounds alignment, fallback availability, and single-root player visuals.

### Changed

- Updated courier mesh filtering so a bad allowlist cannot silently hide every mesh.
- Fixed the configured courier outerwear mesh name and added bounds-based character fitting so the loaded model is centered on the player origin with feet on the ground.

## [0.33.0] - 2026-06-28

### Added

- Added delta-time hold-to-move placement editing for WASD and arrow keys while F2 layout mode is active.
- Added placement editor speed modifiers: `Shift` for faster movement and `Alt` for finer movement.
- Added ground-plane mouse drag placement with snap-aware X/Z movement and live HUD coordinate feedback.
- Added placement editor undo/redo with capped history via `Ctrl+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y`.
- Added an F1 in-game placement editor help overlay.
- Added smoke checks for editor movement settings, modifier speeds, drag safety, stable serialization after drag/nudge edits, and undo history limits.

### Changed

- Updated placement editor docs with hold movement, drag placement, modifier speeds, undo/redo, and F1 help controls.

## [0.32.0] - 2026-06-28

### Added

- Added layout override document types, validation, stable JSON serialization, and runtime merging for generated village transform overrides.
- Added dev-mode placement editor draft persistence with `Ctrl+S`, `Ctrl+O`, `Ctrl+Shift+Delete`, HUD buttons, JSON copy, and validated JSON import.
- Added `scripts/applyLayoutOverrides.mjs` plus `npm run layout:apply` and `npm run layout:check` for promoting exported editor JSON into `src/world/villageOverrides.generated.ts`.
- Added `docs/EDITOR_WORKFLOW.md` documenting layout mode controls, local drafts, JSON export/import, and the source-promotion workflow.
- Added smoke checks for layout override validation, duplicate/unknown id rejection, stable JSON serialization, generated override merging, and placement JSON export.

### Changed

- Kept `src/world/villageDefinition.ts` as the readable base layout and merged generated overrides at runtime without changing object count.
- Updated all-edits placement copy (`Shift+C`) to emit layout override JSON for the promotion workflow.

## [0.31.0] - 2026-06-28

### Added

- Added per-instance material normalization for selected GLB asset kinds so trees, rocks, houses, props, and signs use calmer village palette colors without mutating cached source assets.
- Added an F3 debug overlay collapse toggle that hides debug panels by default while keeping objective guidance and interaction UI visible.
- Added a central plaza surface and smoke checks for visual-polish config, collapsed debug state, material override colors, gameplay UI visibility, and plaza fallback initialization.

### Changed

- Reduced central visual clutter by moving the remaining path rock to the boundary and making the path/plaza ground palette clearer.
- Hid the layout debug HUD during normal third-person play while preserving F2 layout mode and the placement editor.

## [0.30.0] - 2026-06-28

### Added

- Added a developer-only placement editor that works only while F2 layout mode is active.
- Added Tab and Shift+Tab selection cycling, top-down click selection, keyboard nudge/rotate/scale/Y-offset editing, snap-size keys, and Escape selection clearing.
- Added selected-object placement HUD details with object id, kind, position, rotation, scale multiplier, Y offset, render config, snap size, and a temporary-edit warning.
- Added clipboard serialization for the selected transform with `C` and all changed transforms with `Shift+C`.
- Added smoke checks for editable object initialization, safe missing-object lookup, positive snap values, and stable transform serialization.

### Changed

- Layout mode now activates the placement editor and resets temporary visual transforms when F2 exits so normal gameplay remains authored by source definitions.

## [0.29.0] - 2026-06-28

### Added

- Added an F2 top-down village layout debug mode with a separate orthographic camera.
- Added layout debug visuals for village bounds, configured zones, path lanes, interactable radii, collider outlines, objective anchors, and important object labels.
- Added a compact layout HUD with active/inactive state, object counts by kind, draw calls, and triangle counts.
- Added shared village path guide data so rendered paths and layout debug path lanes use the same route definitions.
- Added smoke checks for layout debug config, zone validity, important object resolution, path guide validity, and debug helper initialization.

### Changed

- Updated debug key handling so layout mode temporarily shows collider and visual-bounds helpers, then restores prior debug visibility when F2 exits.

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
