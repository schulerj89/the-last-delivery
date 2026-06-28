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
- The Object panel lists editable world objects and their current collision, interactable, objective, and destination data.
- The Asset panel lists registered runtime GLB assets that are safe to preview.

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

- `Ctrl+S`: save the active editor JSON to `localStorage`.
- `Ctrl+O`: reload the active editor JSON from `localStorage`.
- `Ctrl+Shift+Delete`: clear the saved local draft and in-memory edits.
- The same actions are available as buttons in the placement HUD.
- `Save Draft` and `Reload Draft` remain as compatibility buttons for the older draft slot.

## Active JSON

- Active editor JSON is the live layout document used by the browser editor.
- It can include transform overrides, active/inactive state, and asset preview choices.
- Click `Save Active JSON` to persist it in `localStorage`.
- Click `Load Active JSON` to reload it without refreshing the page.
- Click `Copy JSON` or press `Shift+C` to copy the active JSON.
- In browsers with the File System Access API, `Open JSON File` and `Save JSON File` can load/save a real `.json` file directly.

Browser file saving is explicit. The editor does not silently write source files.

## Assets And Activity

- Select an object from the Object panel.
- Click `Toggle Active` to hide or show that object in the live editor.
- Select a registered asset from the Asset panel.
- Click `Preview Asset` to load that GLB onto the selected object using the current transform and dimensions.
- Click `Use Primitive` to clear the asset preview and export a primitive render override.
- Collision remains authored from the world object data; visual asset previews do not create mesh collision.

## Drag Placement

- Dragging preserves the object's current Y position.
- Dragging snaps X/Z to the current snap size.
- The selected outline follows the live position.
- The placement HUD shows the live coordinate values while dragging.

Y offset is still adjusted with `[` and `]`.

Local drafts are loaded on page reload in dev mode. They are not source-controlled and do not affect production builds by themselves.

## Export JSON

- `Shift+C`: copy all edited transforms and active editor settings as JSON.
- Or click `Copy JSON` in the placement HUD.
- Single-object `C` still copies a TypeScript snippet for quick inspection.

## Import JSON

- Paste layout override JSON into the placement HUD text area.
- Click `Import JSON`.
- The editor validates the JSON before applying it.

## Promote To Source

- Save or paste the active editor JSON into `layout-edits/village-layout.json`.
- Run `npm run layout:check`.
- Run `npm run layout:apply`.
- Review `src/world/villageOverrides.generated.ts`.
- Run validation and commit the generated override file with the layout JSON if the placement is meant to be permanent.
- Unknown object ids, duplicate ids, invalid tuples, and invalid scale values are rejected.

The apply script does not rewrite `src/world/villageDefinition.ts`. The base layout stays readable, and generated overrides are merged at runtime.
