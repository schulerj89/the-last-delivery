import * as THREE from 'three';
import type { DeliveryController } from '../game/delivery';
import type { Interactable } from '../game/interaction';
import type { WorldObjectDefinition } from './types';
import { deliveryBoardObject, mailboxObject } from './villageDefinition';

const createInteractablePosition = (object: WorldObjectDefinition): THREE.Vector3 => {
  if (!object.interactable) {
    throw new Error(`Missing interactable data for world object: ${object.id}`);
  }

  return new THREE.Vector3(...object.interactable.position);
};

const getInteractableRadius = (object: WorldObjectDefinition): number => {
  if (!object.interactable) {
    throw new Error(`Missing interactable data for world object: ${object.id}`);
  }

  return object.interactable.radius;
};

export const createPlaygroundInteractables = (delivery: DeliveryController): readonly Interactable[] => [
  {
    id: mailboxObject.id,
    position: createInteractablePosition(mailboxObject),
    radius: getInteractableRadius(mailboxObject),
    prompt: () => (
      delivery.getState().status === 'delivery-accepted'
        ? 'Complete delivery'
        : 'Start at delivery board'
    ),
    interact: () => (
      delivery.getState().status === 'delivery-accepted'
        ? delivery.completeDelivery()
        : 'Check the delivery board first.'
    ),
  },
  {
    id: deliveryBoardObject.id,
    position: createInteractablePosition(deliveryBoardObject),
    radius: getInteractableRadius(deliveryBoardObject),
    prompt: () => (
      delivery.getState().status === 'delivery-accepted'
        ? 'Delivery in progress'
        : 'Accept delivery'
    ),
    interact: () => delivery.acceptDelivery(),
  },
];
