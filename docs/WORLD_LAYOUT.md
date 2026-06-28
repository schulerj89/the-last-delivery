# World Layout

This document defines the intended first-village layout rules before any broad asset repositioning pass.
The current village can drift toward clutter as more GLB props arrive, so future world edits should keep this page and `src/world/villageLayoutConfig.ts` aligned.

## Coordinate System

- `X` is left/right across the village.
- `Y` is height.
- `Z` is forward/back through the village.

The intended first village bounds are:

- `x`: `-14` to `14`
- `z`: `-12` to `14`

These bounds describe the target readable village square. They are a planning contract for the next layout pass, not a request to expand gameplay systems.

## Major Zones

- Spawn/start path: the player starts on a readable approach path with a clear view toward the post office and delivery board.
- Post office / delivery board: the board remains the first action, placed near the post office with open space in front of the prompt.
- Central plaza / well: the well anchors the middle of the square and keeps a clean circular walking area around it.
- Blue house delivery target: a distinct blue-house destination with its mailbox in front and at least one clear approach lane.
- Red house delivery target: a distinct red-house destination with a readable mailbox and sign, separated from the blue route.
- North house delivery target: a third delivery target near the north side, readable from the plaza and not hidden behind trees.
- Forest edge / decorative boundary: trees, rocks, and bushes frame the playable area while staying out of primary paths.
- Market/cart dressing corner: crates, barrels, sacks, and the cart cluster together as a dressing corner instead of being scattered everywhere.

## Spacing Rules

- Keep the main path `3.0` to `4.0` units wide.
- Keep a `4.0` unit open plaza radius around the well.
- Keep at least `2.0` units clear around interactables.
- Keep trees outside primary paths.
- Keep decorative props in clusters, not scattered everywhere.
- Keep each decorative cluster to `3` to `5` props.

## Density Budget

- `70%` open walkable space.
- `20%` landmark structures.
- `10%` decorative clutter.

When a prop does not improve navigation, destination identity, or boundary readability, it should probably be removed or moved into a small cluster.

## Top-Down Plan

Approximate top-down map, with north at the top and `Z` increasing downward in this diagram.

```text
                 x -14                         x 0                         x 14
z -12  +-----------------------------------------------------------------------+
       |   Forest edge / rocks          North House Target          Forest edge |
       |        T   R   B                 H3 + mailbox                T   B     |
       |                                                                       |
       |              Post Office / Delivery Board                              |
       |                 PO + BOARD + return box                                |
       |                         |                                             |
z  -2  |  Blue House Target ---- main path ---- Central Plaza / Well ---- Red   |
       |      H1 + mailbox                    O                    H2 + mailbox|
       |                         |                                             |
       |                    spawn/start path                                    |
z   6  |                         |                 Market / cart dressing       |
       |                    side path                 cart + crates + barrels   |
       |                                                                       |
z  14  +-----------------------------------------------------------------------+

Legend:
PO = post office
BOARD = delivery board
O = well / plaza landmark
H1/H2/H3 = house delivery targets
T = tree
B = bush
R = rock
```

## Next Layout Pass Checklist

- Move objects only after checking the path width, plaza radius, and interactable clearance rules.
- Treat houses, delivery board, mailbox targets, and the well as landmarks first.
- Move decorative nature props to the edge or into small clusters.
- Keep colliders simple and tied to blockers, not every decorative object.
- Preserve the current delivery loop while changing positions.
