# Debug UI

Developer UI is separate from gameplay UI. Objective guidance, interaction prompts, interaction messages, and the delivery board overlay stay readable even when debug panels are hidden.

## Controls

- `F1`: toggle debug help when layout mode is off.
- `F2`: toggle top-down layout mode.
- `F3`: show or hide developer UI panels.
- `F4`: cycle debug detail through hidden, compact, and expanded.
- `F5`: toggle expanded performance details.
- `F10`: toggle collision boxes in the gameplay view.

## Detail Levels

- Compact: FPS, draw calls, active delivery, player position, and selected editor object when layout mode is active.
- Expanded: compact information plus player visual status, camera values, delivery state, layout object counts, and optional performance details.

The placement editor remains available only in layout mode. Its save, import, export, and localStorage behavior is unchanged.
