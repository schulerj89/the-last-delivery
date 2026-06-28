import * as THREE from 'three';
import type { CollisionWorld } from '../game/collision';
import type { WorldObjectDefinition, WorldObjectKind } from './types';
import { villageLayoutConfig } from './villageLayoutConfig';
import { collidableWorldObjects } from './villageDefinition';
import { playgroundCompositionConfig } from './playgroundComposition';

export const playgroundCollisionFootprintScale: Partial<Record<WorldObjectKind, number>> = {
  cottage: 0.72,
  'post-office': 0.78,
};

const getCollisionFootprintScale = (object: WorldObjectDefinition): number => (
  playgroundCollisionFootprintScale[object.kind] ?? 1
);

const createWorldObjectCollisionBox = (object: WorldObjectDefinition) => {
  if (!object.collider) {
    throw new Error(`Missing collider for world object: ${object.id}`);
  }

  const footprintScale = getCollisionFootprintScale(object);

  return {
    id: object.id,
    center: new THREE.Vector3(...object.collider.position),
    size: new THREE.Vector3(
      object.collider.size[0] * footprintScale,
      object.collider.size[1],
      object.collider.size[2] * footprintScale,
    ),
  };
};

export const createPlaygroundCollisionWorld = (
  includeAuthoredColliders: boolean = playgroundCompositionConfig.enableAuthoredCollision,
): CollisionWorld => ({
  bounds: {
    minX: villageLayoutConfig.bounds.minX,
    maxX: villageLayoutConfig.bounds.maxX,
    minZ: villageLayoutConfig.bounds.minZ,
    maxZ: villageLayoutConfig.bounds.maxZ,
  },
  boxes: includeAuthoredColliders ? collidableWorldObjects.map(createWorldObjectCollisionBox) : [],
});

export const playgroundCollisionWorld: CollisionWorld = createPlaygroundCollisionWorld();
