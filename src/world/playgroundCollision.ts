import * as THREE from 'three';
import type { CollisionWorld } from '../game/collision';

export const playgroundCollisionWorld: CollisionWorld = {
  bounds: {
    minX: -8.55,
    maxX: 8.55,
    minZ: -6.55,
    maxZ: 6.55,
  },
  boxes: [
    {
      id: 'house-mail-lane',
      center: new THREE.Vector3(-6.4, 0.8, 3.9),
      size: new THREE.Vector3(2.3, 1.6, 2.1),
    },
    {
      id: 'house-north-square',
      center: new THREE.Vector3(-1.3, 0.8, -5.1),
      size: new THREE.Vector3(2.8, 1.6, 1.9),
    },
    {
      id: 'house-east-corner',
      center: new THREE.Vector3(6.6, 0.8, 2.8),
      size: new THREE.Vector3(2.2, 1.6, 2.4),
    },
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
      id: 'barrel-north-a',
      center: new THREE.Vector3(1.6, 0.32, -4.4),
      size: new THREE.Vector3(0.55, 0.64, 0.55),
    },
    {
      id: 'barrel-north-b',
      center: new THREE.Vector3(2.12, 0.29, -4.15),
      size: new THREE.Vector3(0.52, 0.58, 0.52),
    },
    {
      id: 'rock-west-boundary',
      center: new THREE.Vector3(-7.2, 0.24, -0.9),
      size: new THREE.Vector3(0.95, 0.48, 0.75),
    },
    {
      id: 'rock-east-boundary',
      center: new THREE.Vector3(7.4, 0.2, -4.7),
      size: new THREE.Vector3(0.7, 0.4, 0.85),
    },
    {
      id: 'rock-south-corner',
      center: new THREE.Vector3(5.8, 0.18, 5.35),
      size: new THREE.Vector3(0.65, 0.36, 0.6),
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
