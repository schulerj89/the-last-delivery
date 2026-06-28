# Placement Editor Workflow

The layout editor is a developer-only tool for tuning the village in the browser and promoting the result back into source control.

## Enter Layout Mode

- Run `npm run dev`.
- Open the game in the browser.
- Press `F2` to enter layout mode.
- The placement editor appears in the lower-right HUD.
- Press `F1` while in layout mode to toggle the editor help overlay.
- Press `F3` to hide or show developer UI panels.
- Press `F4` to cycle debug detail between hidden, compact, and expanded.
- Press `F5` to show or hide expanded performance details.
- Press `F10` to toggle gameplay collision boxes.

## Move Objects

- `Tab` / `Shift+Tab`: cycle editable objects.
- Click near an object in the top-down layout view to select it.
- Click and drag a selected object or object handle to move it across the X/Z ground plane.
- `WASD` or arrow keys: nudge on the X/Z plane.
- Hold `WASD` or arrow keys: continuously move the selected object using frame delta time.
- Hold `Shift` while moving: faster movement.
- Hold `Alt` while moving: finer movement.
- `Q` / `E`: rotate around Y.
- `Z` / `X`: scale multiplier down/up.
- `[` / `]`: adjust Y offset.
- `1` / `2` / `3`: change snap size.
- `Ctrl+Z`: undo the last editor operation.
- `Ctrl+Shift+Z` or `Ctrl+Y`: redo the last undone editor operation.
- `Escape`: clear selection.

Browser edits are temporary until exported and promoted.

## Debug UI

- Compact debug mode shows FPS, draw calls, active delivery, player position, and the selected editor object when layout mode is active.
- Expanded debug mode adds player visual details, camera values, delivery state, layout object counts, and optional performance details.
- The center objective, interaction prompt, interaction message, and delivery board overlay are gameplay UI and stay separate from debug visibility.
- `F1` toggles general debug help when layout mode is off. In layout mode, `F1` toggles placement-editor help.
- `F10` toggles the collision box debug view. Layout mode also shows collider outlines for top-down inspection.

## Save Draft Edits

- `Ctrl+S`: save current edited transforms to `localStorage`.
- `Ctrl+O`: reload the saved local draft.
- `Ctrl+Shift+Delete`: clear the saved local draft and in-memory edits.
- The same actions are available as buttons in the placement HUD.

## Drag Placement

- Dragging preserves the object's current Y position.
- Dragging snaps X/Z to the current snap size.
- The selected outline follows the live position.
- The placement HUD shows the live coordinate values while dragging.

Y offset is still adjusted with `[` and `]`.

Local drafts are loaded on page reload in dev mode. They are not source-controlled and do not affect production builds by themselves.

## Export JSON

- `Shift+C`: copy all edited transforms as layout override JSON.
- Or click `Copy JSON` in the placement HUD.
- Single-object `C` still copies a TypeScript snippet for quick inspection.

## Import JSON

- Paste layout override JSON into the placement HUD text area.
- Click `Import JSON`.
- The editor validates the JSON before applying it.
- Unknown object ids, duplicate ids, invalid tuples, and invalid scale values are rejected.

## Promote Edits Into Source

1. Paste the exported JSON into `layout-edits/village-layout.json`.
2. Run `npm run layout:check`.
3. Run `npm run layout:apply`.
4. Review `src/world/villageOverrides.generated.ts`.
5. Run validation:

```sh
npm run typecheck
npm run smoke
npm run build
npm run validate
```

6. Commit `layout-edits/village-layout.json` and `src/world/villageOverrides.generated.ts` with the gameplay/source changes they support.

The apply script does not rewrite `src/world/villageDefinition.ts`. The base layout stays readable, and generated overrides are merged at runtime.
