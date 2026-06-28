# World Layout

This document defines the intended first-town plan for The Last Delivery. The current playable content can remain small while the layout contract expands toward a larger handcrafted town with districts, broad paths, and room for 45 to 90 minutes of future delivery gameplay.

Keep this document and `src/world/villageLayoutConfig.ts` aligned.

## Coordinate System

- `X` is left/right across town.
- `Y` is height.
- `Z` is forward/back through town.

## Bounds

- Playable town bounds: `x -45` to `45`, `z -45` to `45`.
- Scenic outer bounds: `x -65` to `65`, `z -65` to `65`.

The playable bounds are the authored movement and collision planning area. The scenic bounds are for background framing, orchards, forest edges, hills, and other non-critical visual composition later.

## Districts

- South entry / spawn: suggested center `[0, 0, 38]`.
  Arrival road with enough space to see the town shape before the first task.
- Post office plaza: suggested center `[-10, 0, 24]`.
  First hub with the post office and delivery board; it should be readable from the spawn route.
- Delivery board: suggested center `[-4, 0, 26]`.
  Keep clear access in front of the board and avoid props between spawn and the prompt.
- Market lane: suggested center `[14, 0, 20]`.
  Future shop/stall corridor with clustered dressing, not scattered props.
- Central green / well: suggested center `[0, 0, 4]`.
  Large landmark green with the well and open circulation around it.
- West homes: suggested center `[-28, 0, -4]`.
  Perimeter homes with mailboxes facing paths, not hidden behind houses.
- East river row: suggested center `[28, 0, 0]`.
  Future river-facing residential row with clear long sightlines.
- North hill / old trail gate: suggested center `[0, 0, -36]`.
  Future progression edge and north-route destination.
- Forest/orchard boundary:
  Scenic boundary around the playable town. Trees frame districts and paths without blocking the camera.

## Route Plan

- South Road: broad south entry route from spawn toward the central green.
- Post Office Walk: early branch from South Road to the post office plaza and delivery board.
- Market Lane: side corridor toward market dressing and future vendors.
- Green Loop: circulation route around the central green and well.
- West Home Path: residential side path toward west-home delivery targets.
- River Row: east-side route for future river homes and mailbox targets.
- North Hill Road: main northern route toward the old trail gate.

## Path Rules

- Main paths should be `4` to `6` units wide.
- Side paths should be `3` to `4` units wide.
- The central green should keep at least a `10` unit open radius.
- Every interactable should have at least `2.5` units of clear access.
- Houses belong on district edges, not in path centers.
- Trees frame districts and boundaries; they should not block primary camera views or walking lanes.
- Decorative props should be grouped into intentional clusters instead of scattered.

## Density Rules

- Keep at least `60%` of the playable town as open movement/path space.
- Use no more than `8` to `10` houses in the first town for now.
- Use no more than `5` to `6` active mailbox targets for now.
- Use no more than `3` decorative clusters per district.
- Use no more than `4` small props per cluster.

If a prop does not improve navigation, destination identity, boundary readability, or a district silhouette, move it into a cluster or remove it.

## Top-Down Plan

Approximate top-down map, with north at the top and `Z` increasing downward in this diagram.

```text
                         SCENIC OUTER BOUNDS x -65..65 / z -65..65

        x -45                 x -28            x 0             x 28                 x 45
z -45  +--------------------------------------------------------------------------------+
       | Forest / orchard edge             North Hill Road                Forest edge   |
       |                                      Old Trail Gate                             |
       |                                           N                                    |
z -36  |                                  North Hill / Old Trail Gate                   |
       |                                                                                |
       |                       West Home Path        |        River Row                  |
       |                                                                                |
z  -4  |      West Homes district            Central Green / Well        East River Row  |
       |       houses on edge                  Green Loop                 homes on edge  |
       |                                           O                                    |
z   4  |                         <--------- open 10 unit green --------->               |
       |                                                                                |
       |                           Post Office Walk        Market Lane                   |
z  20  |        Post Office Plaza / Board             Market stalls later               |
       |             PO + BOARD                         clustered props                 |
z  26  |                                                                                |
       |                                  South Road                                    |
z  38  |                              South Entry / Spawn                               |
       +--------------------------------------------------------------------------------+

Legend:
PO = post office
BOARD = delivery board
O = well / central green landmark
N = north hill / old trail gate
```

## Next Implementation Checklist

- Move world objects in district-sized passes, not all at once.
- Expand path guide rendering before adding more delivery targets.
- Keep collision proxies simple and independent from visual meshes.
- Preserve the current delivery loop while moving the first board and mailbox targets.
- Use screenshot QA after the first large-town object placement pass.
