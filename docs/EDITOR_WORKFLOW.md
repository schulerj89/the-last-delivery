# Placement Editor Workflow

The layout editor is a developer-only tool for tuning the village in the browser and promoting the result back into source control.

## Enter Layout Mode

- Run `npm run dev`.
- Open the game in the browser.
- Press `F2` to enter layout mode.
- The placement editor appears in the lower-right HUD.

## Move Objects

- `Tab` / `Shift+Tab`: cycle editable objects.
- Click near an object in the top-down layout view to select it.
- `WASD` or arrow keys: nudge on the X/Z plane.
- `Q` / `E`: rotate around Y.
- `Z` / `X`: scale multiplier down/up.
- `[` / `]`: adjust Y offset.
- `1` / `2` / `3`: change snap size.
- `Escape`: clear selection.

Browser edits are temporary until exported and promoted.

## Save Draft Edits

- `Ctrl+S`: save current edited transforms to `localStorage`.
- `Ctrl+O`: reload the saved local draft.
- `Ctrl+Shift+Delete`: clear the saved local draft and in-memory edits.
- The same actions are available as buttons in the placement HUD.

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
