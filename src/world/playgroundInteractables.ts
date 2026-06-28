import * as THREE from 'three';
import type { DeliveryController } from '../game/delivery';
import type { Interactable } from '../game/interaction';
import type { WorldObjectDefinition } from './types';
import { deliveryBoardObject, getWorldObjectsByKind } from './villageDefinition';

interface PlaygroundInteractableOptions {
  openDeliveryBoard?: () => string;
}

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

export const createPlaygroundInteractables = (
  delivery: DeliveryController,
  { openDeliveryBoard }: PlaygroundInteractableOptions = {},
): readonly Interactable[] => [
  ...getWorldObjectsByKind('mailbox')
    .filter((mailbox) => mailbox.interactable)
    .map((mailbox): Interactable => ({
      id: mailbox.id,
      position: createInteractablePosition(mailbox),
      radius: getInteractableRadius(mailbox),
      prompt: () => {
        const state = delivery.getState();

        if (state.status !== 'delivery-accepted') {
          return 'Start at delivery board';
        }

        return state.activeTargetId === mailbox.id
          ? 'Complete delivery'
          : 'Wrong mailbox';
      },
      interact: () => (
        delivery.getState().status === 'delivery-accepted'
          ? delivery.completeDelivery(mailbox.id)
          : 'Check the delivery board first.'
      ),
    })),
  {
    id: deliveryBoardObject.id,
    position: createInteractablePosition(deliveryBoardObject),
    radius: getInteractableRadius(deliveryBoardObject),
    prompt: () => {
      const state = delivery.getState();

      return state.status === 'delivery-accepted'
        ? `${state.activeDelivery?.title ?? 'Delivery'} in progress`
        : 'Open delivery board';
    },
    interact: () => (openDeliveryBoard ? openDeliveryBoard() : delivery.acceptDelivery()),
  },
];
