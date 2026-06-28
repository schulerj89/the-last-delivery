import * as THREE from 'three';
import type { CollisionWorld } from '../game/collision';
import type { WorldObjectDefinition } from './types';
import { villageLayoutConfig } from './villageLayoutConfig';
import { collidableWorldObjects } from './villageDefinition';
import { playgroundCompositionConfig } from './playgroundComposition';

const createWorldObjectCollisionBox = (object: WorldObjectDefinition) => {
  if (!object.collider) {
    throw new Error(`Missing collider for world object: ${object.id}`);
  }

  return {
    id: object.id,
    center: new THREE.Vector3(...object.collider.position),
    size: new THREE.Vector3(...object.collider.size),
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
