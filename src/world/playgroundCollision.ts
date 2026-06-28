import * as THREE from 'three';
import type { CollisionWorld } from '../game/collision';

export const playgroundCollisionWorld: CollisionWorld = {
  bounds: {
    minX: -5.55,
    maxX: 5.55,
    minZ: -4.55,
    maxZ: 4.55,
  },
  boxes: [
    {
      id: 'crate-large',
      center: new THREE.Vector3(2.35, 0.5, 1.65),
      size: new THREE.Vector3(1, 1, 1),
    },
    {
      id: 'crate-small-a',
      center: new THREE.Vector3(3.15, 0.35, 0.8),
      size: new THREE.Vector3(0.7, 0.7, 0.7),
    },
    {
      id: 'crate-small-b',
      center: new THREE.Vector3(2.75, 1.05, 1.55),
      size: new THREE.Vector3(0.7, 0.7, 0.7),
    },
    {
      id: 'mailbox',
      center: new THREE.Vector3(-4.2, 0.65, 2.8),
      size: new THREE.Vector3(1, 1.3, 0.75),
    },
    {
      id: 'delivery-board',
      center: new THREE.Vector3(4.85, 0.9, -3.2),
      size: new THREE.Vector3(1.8, 1.8, 0.45),
    },
  ],
};
