# Placement Editor Workflow

The layout editor is a developer-only tool for tuning the village in the browser and promoting the result back into source control.

## Standalone Town Builder

- Run `npm run dev`.
- Open `/town-editor.html`.
- Use the left asset shelf to browse generated ground pieces and selected runtime model assets.
- Runtime asset cards show a small rendered preview when the model can be loaded.
- World Marker cards provide draggable gameplay/location anchors such as player spawn, post office, delivery board, and mailbox targets.
- Drag an asset square onto the grass to create a new editable world object from a safe template.
- Use the search box to filter the asset shelf.
- Use the compact right save panel to save, load, copy, import, or export the active layout JSON.
- Click `Help / Controls` or press `F1` to show the town editor control instructions.
- The standalone builder starts in the close 3D view. Press `V` to switch to overview when needed.
- Layout debug circles and labels are hidden in the standalone builder; spawn, board, mailbox, and district concepts come from the editor panels/catalog instead of appearing pre-drawn in the canvas.
- Click a placed object or use `Tab` to select it, then use the keyboard controls to fine tune position, rotation, scale, and Y offset.
- Click empty grass to clear selection.
- Press `Ctrl+D` or click `Duplicate Selected` to create another editable copy next to the selected object.
- Press `Delete` or click `Delete Selected` to remove the selected object from the active editor layout.
- The standalone builder starts on the clean playground canvas with grass and fence only, so authored village objects do not clutter the initial view.
- Asset squares are reusable. Each drop creates a generated `editor-*` object id that can be moved, scaled, deleted, saved, and promoted.
- Deleting from the editor does not delete model files or registry entries. It marks the selected object inactive in the exported layout JSON.

## Enter Layout Mode

- Run `npm run dev`.
- Open the game in the browser.
- Press `F2` to enter layout mode.
- Press `V` while layout mode is active to switch between top-down overview and close perspective view.
- Use the mouse wheel in layout mode to zoom the active editor view.
- The placement editor appears in the lower-right HUD.
- Press `F1` while in layout mode to toggle the editor help overlay.
- Press `F3` to hide or show developer UI panels.
- Press `F4` to cycle debug detail between hidden, compact, and expanded.
- Press `F5` to show or hide expanded performance details.
- Press `F10` to toggle gameplay collision boxes.
- The default playground view is a clean editor canvas: grass ground and boundary fence only.
- The Object panel lists editable world objects and their current collision, interactable, objective, and destination data.
- The Asset panel lists registered runtime model assets that are safe to preview.
- The Gameplay panel assigns the selected object a role/action such as spawn, post office, delivery board, mailbox target, or decorative.
- The Button Instructions panel explains the editor buttons inside the HUD.
- In the standalone town builder, the compact HUD uses `Help / Controls` instead of the full Button Instructions panel.
- Generated pavement pieces are available in the Object panel as inactive editable ground objects.

## Editor Camera

- Overview view is a top-down orthographic layout camera for broad town composition.
- Close view is a perspective inspection camera for checking scale, path readability, and placement relative to the world.
- `V`: switch overview / close view.
- Mouse wheel: zoom the active editor view.
- Right mouse drag in close view: orbit around the current target.
- Middle mouse drag in close view: pan across the X/Z ground plane.
- Left mouse click and drag still selects and moves editable objects.

## Move Objects

- `Tab` / `Shift+Tab`: cycle editable objects.
- Click near an object in the top-down layout view to select it.
- Click empty ground: clear selection.
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
- `Ctrl+D`: duplicate the selected object with a new `editor-*` id.
- `Escape`: clear selection.
- `Delete`: remove the selected object from the active editor layout.

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
- `Save Draft` and `Reload Draft` remain as compatibility buttons for the older draft storage key.

## Active JSON

- Active editor JSON is the live layout document used by the browser editor.
- It can include transform overrides, generated object ids, template ids, active/inactive state, and asset preview choices.
- Authored world objects remain in the catalog even when the default playground render is empty.
- Click `Save Active JSON` to persist it in `localStorage`.
- Click `Load Active JSON` to reload it without refreshing the page.
- Click `Copy JSON` or press `Shift+C` to copy the active JSON.
- In browsers with the File System Access API, `Open JSON File` and `Save JSON File` can load/save a real `.json` file directly.

Browser file saving is explicit. The editor does not silently write source files.

## Assets And Activity

- Select an object from the Object panel.
- Click `Toggle Active` to hide or show that object in the live editor.
- Select a registered asset from the Asset panel.
- Click `Preview Asset` to load that model onto the selected object using the current transform and dimensions.
- Click `Use Primitive` to clear the asset preview and export a primitive render override.
- Select `pavement-tile-square`, `pavement-tile-long`, or `pavement-tile-plaza` and click `Toggle Active` to place generated pavement without importing a model.
- Pavement tiles can be dragged, rotated, and scaled like other editable objects; they stay aligned to the ground while scaling.
- Collision remains authored from the world object data; visual asset previews do not create mesh collision.

## Gameplay Roles

- Click `Set Spawn` to make the selected object define the player spawn point when promoted to source.
- Click `Post Office` to mark a selected asset as the post office landmark.
- Click `Delivery Board` to assign the `open-delivery-board` interaction action.
- Click `Mailbox Target` to assign the `complete-delivery` interaction action and expose destination/variant fields.
- Click `Decorative` to clear gameplay behavior from a selected prop.
- Gameplay roles, interaction actions, destination names, and mailbox variants export into the active editor JSON.
- Existing authored objects remain available as starting templates, but behavior can now live on the selected asset/object through exported metadata.

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
- Generated object ids are accepted when they include a valid `kind` and either a known `templateId` or full position/dimensions data.

## Promote To Source

- Save or paste the active editor JSON into `layout-edits/village-layout.json`.
- Run `npm run layout:check`.
- Run `npm run layout:apply`.
- Review `src/world/villageOverrides.generated.ts`.
- Run validation and commit the generated override file with the layout JSON if the placement is meant to be permanent.
- Unknown object ids without generated-object metadata, duplicate ids, invalid tuples, and invalid scale values are rejected.

The apply script does not rewrite `src/world/villageDefinition.ts`. The base layout stays readable, and generated overrides are merged at runtime.
