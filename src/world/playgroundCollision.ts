import * as THREE from 'three';
import type { CollisionWorld } from '../game/collision';
import type { WorldObjectDefinition } from './types';
import { collidableWorldObjects } from './villageDefinition';

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

export const playgroundCollisionWorld: CollisionWorld = {
  bounds: {
    minX: -8.55,
    maxX: 8.55,
    minZ: -6.55,
    maxZ: 6.55,
  },
  boxes: collidableWorldObjects.map(createWorldObjectCollisionBox),
};
