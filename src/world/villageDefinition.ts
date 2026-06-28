import type * as THREE from 'three';
import type { WorldObjectDefinition, WorldObjectKind } from './types';

export const playerSpawnPosition: THREE.Vector3Tuple = [0, 0, 10];

export const villageWorldObjects: readonly WorldObjectDefinition[] = [
  {
    id: 'post-office',
    kind: 'post-office',
    position: [-6.5, 0.93, 6.5],
    dimensions: [3, 1.85, 2.3],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-001',
    },
    collider: {
      position: [-6.5, 0.93, 6.5],
      size: [3, 1.85, 2.3],
    },
  },
  {
    id: 'delivery-board',
    kind: 'delivery-board',
    position: [-3.5, 0, 7.5],
    dimensions: [1.8, 1.8, 0.45],
    collider: {
      position: [-3.5, 0.9, 7.5],
      size: [1.8, 1.8, 0.45],
    },
    interactable: {
      position: [-2.2, 0, 7.5],
      radius: 1.25,
    },
    objectiveAnchor: {
      position: [-3.5, 2.35, 7.5],
    },
  },
  {
    id: 'cottage-west',
    kind: 'cottage',
    position: [-8.5, 0.9, -2.5],
    dimensions: [2.8, 1.8, 2.4],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-002',
    },
    collider: {
      position: [-8.5, 0.9, -2.5],
      size: [2.8, 1.8, 2.4],
    },
  },
  {
    id: 'cottage-north',
    kind: 'cottage',
    position: [0, 0.9, -8.5],
    dimensions: [3, 1.8, 2.3],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-003',
    },
    collider: {
      position: [0, 0.9, -8.5],
      size: [3, 1.8, 2.3],
    },
  },
  {
    id: 'cottage-east',
    kind: 'cottage',
    position: [8.5, 0.9, -1.5],
    dimensions: [2.8, 1.8, 2.4],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-001',
    },
    collider: {
      position: [8.5, 0.9, -1.5],
      size: [2.8, 1.8, 2.4],
    },
  },
  {
    id: 'mailbox',
    kind: 'mailbox',
    position: [-5.8, 0, -1.2],
    dimensions: [0.85, 1.24, 0.5],
    mailbox: {
      variant: 'blue',
      destinationName: 'Blue House Mailbox',
    },
    collider: {
      position: [-5.8, 0.65, -1.2],
      size: [1, 1.3, 0.75],
    },
    interactable: {
      position: [-4.55, 0, -1],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [-5.8, 2.15, -1.2],
    },
  },
  {
    id: 'mailbox-east',
    kind: 'mailbox',
    position: [5.8, 0, -0.4],
    dimensions: [0.75, 1.18, 0.46],
    mailbox: {
      variant: 'red',
      destinationName: 'Hill Path Mailbox',
    },
    collider: {
      position: [5.8, 0.62, -0.4],
      size: [0.9, 1.2, 0.7],
    },
    interactable: {
      position: [4.55, 0, -0.25],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [5.8, 2.08, -0.4],
    },
  },
  {
    id: 'mailbox-post-office-return',
    kind: 'mailbox',
    position: [1.8, 0, -5.8],
    dimensions: [0.85, 1.34, 0.5],
    mailbox: {
      variant: 'green',
      destinationName: 'Post Office Return Box',
    },
    collider: {
      position: [1.8, 0.65, -5.8],
      size: [1, 1.3, 0.75],
    },
    interactable: {
      position: [1.8, 0, -4.5],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [1.8, 2.18, -5.8],
    },
  },
  {
    id: 'town-well',
    kind: 'well',
    position: [0, 0, 0],
    dimensions: [1.35, 0.9, 1.35],
    collider: {
      position: [0, 0.45, 0],
      size: [1.5, 0.9, 1.5],
    },
  },
  {
    id: 'tree-northwest',
    kind: 'tree',
    position: [-12.4, 1.35, -10.2],
    dimensions: [1.35, 2.7, 1.35],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-north',
    kind: 'tree',
    position: [-5.8, 1.3, -11.2],
    dimensions: [1.25, 2.6, 1.25],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-northeast',
    kind: 'tree',
    position: [7.8, 1.45, -10.4],
    dimensions: [1.45, 2.9, 1.45],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-east',
    kind: 'tree',
    position: [12.4, 1.3, 1.8],
    dimensions: [1.25, 2.6, 1.25],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-southeast',
    kind: 'tree',
    position: [10.5, 1.4, 10.8],
    dimensions: [1.35, 2.8, 1.35],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-south',
    kind: 'tree',
    position: [-4.5, 1.35, 12],
    dimensions: [1.3, 2.7, 1.3],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-west',
    kind: 'tree',
    position: [-12.2, 1.35, 2.5],
    dimensions: [1.3, 2.7, 1.3],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'bush-side-path-a',
    kind: 'bush',
    position: [-2.8, 0.32, 8.8],
    dimensions: [0.75, 0.64, 0.75],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-side-path-b',
    kind: 'bush',
    position: [2.8, 0.3, 8.9],
    dimensions: [0.7, 0.6, 0.7],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-blue-house',
    kind: 'bush',
    position: [-10.4, 0.34, -0.4],
    dimensions: [0.78, 0.68, 0.78],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-red-house',
    kind: 'bush',
    position: [10.5, 0.32, 0.4],
    dimensions: [0.76, 0.64, 0.76],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'crate-large',
    kind: 'crate',
    position: [-7.7, 0.5, 8.5],
    dimensions: [1, 1, 1],
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
    collider: {
      position: [-7.7, 0.5, 8.5],
      size: [1, 1, 1],
    },
  },
  {
    id: 'crate-small-a',
    kind: 'crate',
    position: [-6.95, 0.35, 8.85],
    dimensions: [0.7, 0.7, 0.7],
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
    collider: {
      position: [-6.95, 0.35, 8.85],
      size: [0.7, 0.7, 0.7],
    },
  },
  {
    id: 'crate-small-b',
    kind: 'crate',
    position: [8.4, 0.35, 9.45],
    dimensions: [0.7, 0.7, 0.7],
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
    collider: {
      position: [8.4, 0.35, 9.45],
      size: [0.7, 0.7, 0.7],
    },
  },
  {
    id: 'barrel-north-a',
    kind: 'barrel',
    position: [-8.45, 0.32, 8.55],
    dimensions: [0.52, 0.64, 0.52],
    render: {
      mode: 'asset',
      assetId: 'fantasy-barrel-001',
    },
    collider: {
      position: [-8.45, 0.32, 8.55],
      size: [0.55, 0.64, 0.55],
    },
  },
  {
    id: 'barrel-north-b',
    kind: 'barrel',
    position: [10.7, 0.29, 8.8],
    dimensions: [0.48, 0.58, 0.48],
    render: {
      mode: 'asset',
      assetId: 'fantasy-barrel-001',
    },
    collider: {
      position: [10.7, 0.29, 8.8],
      size: [0.52, 0.58, 0.52],
    },
  },
  {
    id: 'rock-west-boundary',
    kind: 'rock',
    position: [-13, 0.24, -3.5],
    dimensions: [1.25, 0.72, 0.9],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'nature-rock-path-a',
    kind: 'rock',
    position: [-3.5, 0.22, -3.2],
    dimensions: [0.75, 0.44, 0.75],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'nature-rock-board-edge',
    kind: 'rock',
    position: [-10.5, 0.18, 5.2],
    dimensions: [0.62, 0.36, 0.62],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'nature-rock-north-edge',
    kind: 'rock',
    position: [3.6, 0.22, -10.2],
    dimensions: [0.72, 0.44, 0.72],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'rock-east-boundary',
    kind: 'rock',
    position: [13, 0.2, -3.2],
    dimensions: [0.9, 0.62, 1.1],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'signpost-post-office',
    kind: 'signpost',
    position: [-4.3, 0.7, 7],
    dimensions: [0.85, 1.4, 0.85],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-blue-house',
    kind: 'signpost',
    position: [-6.5, 0.65, -1.6],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-red-house',
    kind: 'signpost',
    position: [6.5, 0.65, -0.8],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-side-path',
    kind: 'signpost',
    position: [2.3, 0.65, 2.2],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'cart-south-path',
    kind: 'cart',
    position: [9.8, 0.45, 9.5],
    dimensions: [1.7, 0.9, 1.05],
    render: {
      mode: 'asset',
      assetId: 'fantasy-cart-001',
    },
    collider: {
      position: [9.8, 0.45, 9.5],
      size: [1.4, 0.75, 0.85],
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
