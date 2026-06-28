import * as THREE from 'three';
import type { DeliveryController } from '../game/delivery';
import type { Interactable } from '../game/interaction';
import type { WorldObjectDefinition } from './types';
import { activeDeliveryTargetObject, deliveryBoardObject } from './villageDefinition';

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
    id: activeDeliveryTargetObject.id,
    position: createInteractablePosition(activeDeliveryTargetObject),
    radius: getInteractableRadius(activeDeliveryTargetObject),
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
