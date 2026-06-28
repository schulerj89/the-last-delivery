import type * as THREE from 'three';
import type { WorldObjectDefinition, WorldObjectKind } from './types';

export const playerSpawnPosition: THREE.Vector3Tuple = [2.25, 0, -1.8];
export const deliveryTargetObjectId = 'mailbox';

export const villageWorldObjects: readonly WorldObjectDefinition[] = [
  {
    id: 'post-office',
    kind: 'post-office',
    position: [5.75, 0, -5],
    dimensions: [2.8, 1.85, 2.2],
    collider: {
      position: [5.75, 0.93, -5],
      size: [2.8, 1.85, 2.2],
    },
  },
  {
    id: 'delivery-board',
    kind: 'delivery-board',
    position: [4.55, 0, -3.25],
    dimensions: [1.8, 1.8, 0.45],
    collider: {
      position: [4.55, 0.9, -3.25],
      size: [1.8, 1.8, 0.45],
    },
    interactable: {
      position: [3.35, 0, -3.25],
      radius: 1.25,
    },
    objectiveAnchor: {
      position: [4.55, 2.35, -3.25],
    },
  },
  {
    id: 'cottage-west',
    kind: 'cottage',
    position: [-6.4, 0, 3.8],
    dimensions: [2.3, 1.6, 2.1],
    collider: {
      position: [-6.4, 0.8, 3.8],
      size: [2.3, 1.6, 2.1],
    },
  },
  {
    id: 'cottage-north',
    kind: 'cottage',
    position: [-1.8, 0, -5.15],
    dimensions: [2.8, 1.6, 1.9],
    collider: {
      position: [-1.8, 0.8, -5.15],
      size: [2.8, 1.6, 1.9],
    },
  },
  {
    id: 'cottage-east',
    kind: 'cottage',
    position: [6.65, 0, 2.75],
    dimensions: [2.2, 1.6, 2.4],
    collider: {
      position: [6.65, 0.8, 2.75],
      size: [2.2, 1.6, 2.4],
    },
  },
  {
    id: 'mailbox',
    kind: 'mailbox',
    position: [-4.2, 0, 2.8],
    dimensions: [0.85, 1.24, 0.5],
    collider: {
      position: [-4.2, 0.65, 2.8],
      size: [1, 1.3, 0.75],
    },
    interactable: {
      position: [-3.3, 0, 2.8],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [-4.2, 2.15, 2.8],
    },
  },
  {
    id: 'mailbox-east',
    kind: 'mailbox',
    position: [5.25, 0, 1.65],
    dimensions: [0.75, 1.18, 0.46],
    collider: {
      position: [5.25, 0.62, 1.65],
      size: [0.9, 1.2, 0.7],
    },
  },
  {
    id: 'town-well',
    kind: 'well',
    position: [0.05, 0, -0.3],
    dimensions: [1.35, 0.9, 1.35],
    collider: {
      position: [0.05, 0.45, -0.3],
      size: [1.5, 0.9, 1.5],
    },
  },
  {
    id: 'crate-large',
    kind: 'crate',
    position: [2.35, 0.5, 1.65],
    dimensions: [1, 1, 1],
    collider: {
      position: [2.35, 0.5, 1.65],
      size: [1, 1, 1],
    },
  },
  {
    id: 'crate-small-a',
    kind: 'crate',
    position: [3.15, 0.35, 0.8],
    dimensions: [0.7, 0.7, 0.7],
    collider: {
      position: [3.15, 0.35, 0.8],
      size: [0.7, 0.7, 0.7],
    },
  },
  {
    id: 'crate-small-b',
    kind: 'crate',
    position: [2.75, 1.05, 1.55],
    dimensions: [0.7, 0.7, 0.7],
    collider: {
      position: [2.75, 1.05, 1.55],
      size: [0.7, 0.7, 0.7],
    },
  },
  {
    id: 'barrel-north-a',
    kind: 'barrel',
    position: [1.6, 0.32, -4.4],
    dimensions: [0.52, 0.64, 0.52],
    collider: {
      position: [1.6, 0.32, -4.4],
      size: [0.55, 0.64, 0.55],
    },
  },
  {
    id: 'barrel-north-b',
    kind: 'barrel',
    position: [2.12, 0.29, -4.15],
    dimensions: [0.48, 0.58, 0.48],
    collider: {
      position: [2.12, 0.29, -4.15],
      size: [0.52, 0.58, 0.52],
    },
  },
  {
    id: 'rock-west-boundary',
    kind: 'rock',
    position: [-7.2, 0.24, -0.9],
    dimensions: [1.25, 0.72, 0.9],
    collider: {
      position: [-7.2, 0.24, -0.9],
      size: [0.95, 0.48, 0.75],
    },
  },
  {
    id: 'rock-east-boundary',
    kind: 'rock',
    position: [7.4, 0.2, -4.7],
    dimensions: [0.9, 0.62, 1.1],
    collider: {
      position: [7.4, 0.2, -4.7],
      size: [0.7, 0.4, 0.85],
    },
  },
  {
    id: 'rock-south-corner',
    kind: 'rock',
    position: [5.8, 0.18, 5.35],
    dimensions: [0.82, 0.56, 0.78],
    collider: {
      position: [5.8, 0.18, 5.35],
      size: [0.65, 0.36, 0.6],
    },
  },
];

export const getWorldObject = (id: string): WorldObjectDefinition => {
  const object = villageWorldObjects.find((worldObject) => worldObject.id === id);

  if (!object) {
    throw new Error(`Missing world object definition: ${id}`);
  }

  return object;
};

export const getWorldObjectsByKind = (kind: WorldObjectKind): readonly WorldObjectDefinition[] => (
  villageWorldObjects.filter((worldObject) => worldObject.kind === kind)
);

export const collidableWorldObjects = villageWorldObjects.filter((worldObject) => worldObject.collider);
export const interactableWorldObjects = villageWorldObjects.filter((worldObject) => worldObject.interactable);

export const deliveryBoardObject = getWorldObject('delivery-board');
export const activeDeliveryTargetObject = getWorldObject(deliveryTargetObjectId);
