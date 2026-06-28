# Model Test Assets

Place small optional GLB props in this folder.

Current registry entry:

- `crate-box-001.glb` - optional crate prop for `crate-large`.
- `nature/nature-tree01.glb` - decorative forest-edge tree prop.
- `nature/nature-rock.glb` - decorative path and boundary rock prop.
- `nature/nature-simple-bush.glb` - decorative bush/plant prop.

The game always creates primitive placeholders first. If a GLB is missing, too large, or fails to load, the primitive placeholder remains and gameplay continues with the existing collider and interactions.

Keep test props small and focused. Do not place full asset packs, character models, animation sets, or compressed models that require DRACO, KTX2, or meshopt here yet.
