import type * as THREE from 'three';
import type { WorldObjectDefinition, WorldObjectKind } from './types';

export const playerSpawnPosition: THREE.Vector3Tuple = [2.25, 0, -1.8];

export const villageWorldObjects: readonly WorldObjectDefinition[] = [
  {
    id: 'post-office',
    kind: 'post-office',
    position: [5.75, 0.93, -5],
    dimensions: [2.8, 1.85, 2.2],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-001',
    },
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
    position: [-6.4, 0.8, 3.8],
    dimensions: [2.3, 1.6, 2.1],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-002',
    },
    collider: {
      position: [-6.4, 0.8, 3.8],
      size: [2.3, 1.6, 2.1],
    },
  },
  {
    id: 'cottage-north',
    kind: 'cottage',
    position: [-1.8, 0.8, -5.15],
    dimensions: [2.8, 1.6, 1.9],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-003',
    },
    collider: {
      position: [-1.8, 0.8, -5.15],
      size: [2.8, 1.6, 1.9],
    },
  },
  {
    id: 'cottage-east',
    kind: 'cottage',
    position: [6.65, 0.8, 2.75],
    dimensions: [2.2, 1.6, 2.4],
    render: {
      mode: 'asset',
      assetId: 'fantasy-house-001',
    },
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
    mailbox: {
      variant: 'blue',
      destinationName: 'Blue House Mailbox',
    },
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
    mailbox: {
      variant: 'red',
      destinationName: 'Hill Path Mailbox',
    },
    collider: {
      position: [5.25, 0.62, 1.65],
      size: [0.9, 1.2, 0.7],
    },
    interactable: {
      position: [4.35, 0, 1.65],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [5.25, 2.08, 1.65],
    },
  },
  {
    id: 'mailbox-post-office-return',
    kind: 'mailbox',
    position: [3.65, 0, -5.15],
    dimensions: [0.85, 1.34, 0.5],
    mailbox: {
      variant: 'green',
      destinationName: 'Post Office Return Box',
    },
    collider: {
      position: [3.65, 0.65, -5.15],
      size: [1, 1.3, 0.75],
    },
    interactable: {
      position: [3, 0, -5.15],
      radius: 1.15,
    },
    objectiveAnchor: {
      position: [3.65, 2.18, -5.15],
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
    id: 'tree-northwest',
    kind: 'tree',
    position: [-7.4, 1.35, -5.55],
    dimensions: [1.35, 2.7, 1.35],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-north',
    kind: 'tree',
    position: [-4.4, 1.3, -6],
    dimensions: [1.25, 2.6, 1.25],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-northeast',
    kind: 'tree',
    position: [3.2, 1.45, -6.05],
    dimensions: [1.45, 2.9, 1.45],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-east',
    kind: 'tree',
    position: [8, 1.3, -1.6],
    dimensions: [1.25, 2.6, 1.25],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-southeast',
    kind: 'tree',
    position: [7.35, 1.4, 5.15],
    dimensions: [1.35, 2.8, 1.35],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-south',
    kind: 'tree',
    position: [-1.6, 1.35, 6],
    dimensions: [1.3, 2.7, 1.3],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'tree-west',
    kind: 'tree',
    position: [-8, 1.35, 1.4],
    dimensions: [1.3, 2.7, 1.3],
    render: {
      mode: 'asset',
      assetId: 'nature-tree01',
    },
  },
  {
    id: 'bush-side-path-a',
    kind: 'bush',
    position: [1.15, 0.32, -1.9],
    dimensions: [0.75, 0.64, 0.75],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-side-path-b',
    kind: 'bush',
    position: [-0.95, 0.3, -1.35],
    dimensions: [0.7, 0.6, 0.7],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-blue-house',
    kind: 'bush',
    position: [-5.05, 0.34, 1.65],
    dimensions: [0.78, 0.68, 0.78],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-red-house',
    kind: 'bush',
    position: [6.4, 0.32, 0.9],
    dimensions: [0.76, 0.64, 0.76],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'bush-south-path',
    kind: 'bush',
    position: [0.85, 0.3, 4.95],
    dimensions: [0.72, 0.6, 0.72],
    render: {
      mode: 'asset',
      assetId: 'nature-simple-bush',
    },
  },
  {
    id: 'crate-large',
    kind: 'crate',
    position: [2.35, 0.5, 1.65],
    dimensions: [1, 1, 1],
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
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
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
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
    render: {
      mode: 'asset',
      assetId: 'fantasy-box-001',
    },
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
    render: {
      mode: 'asset',
      assetId: 'fantasy-barrel-001',
    },
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
    render: {
      mode: 'asset',
      assetId: 'fantasy-barrel-001',
    },
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
    id: 'nature-rock-path-a',
    kind: 'rock',
    position: [-2.15, 0.22, 1.05],
    dimensions: [0.75, 0.44, 0.75],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'nature-rock-board-edge',
    kind: 'rock',
    position: [2.6, 0.18, -2.15],
    dimensions: [0.62, 0.36, 0.62],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
    },
  },
  {
    id: 'nature-rock-north-edge',
    kind: 'rock',
    position: [0.1, 0.22, -5.8],
    dimensions: [0.72, 0.44, 0.72],
    render: {
      mode: 'asset',
      assetId: 'nature-rock',
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
  {
    id: 'signpost-post-office',
    kind: 'signpost',
    position: [4.55, 0.7, -4.25],
    dimensions: [0.85, 1.4, 0.85],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-blue-house',
    kind: 'signpost',
    position: [-4.95, 0.65, 2.25],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-red-house',
    kind: 'signpost',
    position: [5.6, 0.65, 1],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'signpost-side-path',
    kind: 'signpost',
    position: [0.9, 0.65, -1.05],
    dimensions: [0.8, 1.3, 0.8],
    render: {
      mode: 'asset',
      assetId: 'fantasy-pointer-001',
    },
  },
  {
    id: 'cart-south-path',
    kind: 'cart',
    position: [-2.75, 0.45, 4.95],
    dimensions: [1.7, 0.9, 1.05],
    render: {
      mode: 'asset',
      assetId: 'fantasy-cart-001',
    },
    collider: {
      position: [-2.75, 0.45, 4.95],
      size: [1.4, 0.75, 0.85],
    },
  },
  {
    id: 'sack-post-office-a',
    kind: 'sack',
    position: [3.8, 0.32, -4.75],
    dimensions: [0.55, 0.64, 0.55],
    render: {
      mode: 'asset',
      assetId: 'fantasy-bag-001',
    },
  },
  {
    id: 'sack-cart-a',
    kind: 'sack',
    position: [-3.5, 0.3, 4.35],
    dimensions: [0.52, 0.6, 0.52],
    render: {
      mode: 'asset',
      assetId: 'fantasy-bag-001',
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
