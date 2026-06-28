# Performance Policy

The game targets stable 60 FPS, but gameplay must not assume exactly 60 frames per second.

## Rules

- Use `renderer.setAnimationLoop` or `requestAnimationFrame`.
- Movement must use delta time or fixed-step simulation.
- Clamp large delta times.
- Avoid per-frame object allocation in hot update loops.
- Cap renderer pixel ratio to `1.5` by default.
- Keep debug performance metrics visible during development.
- Track `renderer.info.render.calls`, `renderer.info.render.triangles`, `renderer.info.memory.geometries`, and `renderer.info.memory.textures`.
- Do not import whole asset packs into `public/`.
- Reuse materials, textures, geometries, and loaded GLB assets where practical.
- Dispose GPU resources when removing permanent scene content.
- Do not dispose shared cached assets while instances still use them.
