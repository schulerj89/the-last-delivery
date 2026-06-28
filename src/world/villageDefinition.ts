import type { WorldObjectDefinition } from './types';

export const deliveryTargetObjectId = 'mailbox';

export const villageWorldObjects: readonly WorldObjectDefinition[] = [
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
    id: 'delivery-board',
    kind: 'delivery-board',
    position: [4.85, 0, -3.2],
    dimensions: [1.8, 1.8, 0.45],
    collider: {
      position: [4.85, 0.9, -3.2],
      size: [1.8, 1.8, 0.45],
    },
    interactable: {
      position: [3.6, 0, -3.2],
      radius: 1.25,
    },
    objectiveAnchor: {
      position: [4.85, 2.35, -3.2],
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

export const mailboxObject = getWorldObject('mailbox');
export const deliveryBoardObject = getWorldObject('delivery-board');
