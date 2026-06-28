# Changelog

All notable changes to The Last Delivery will be documented in this file.

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
