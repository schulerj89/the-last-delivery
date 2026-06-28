import * as THREE from 'three';
import type { DeliveryController } from '../game/delivery';
import type { Interactable } from '../game/interaction';
import type { WorldObjectDefinition } from './types';
import { deliveryBoardObject, getWorldObjectsByInteractionAction } from './villageDefinition';
import { playgroundCompositionConfig } from './playgroundComposition';
import { getWorldObjectGameplay } from './worldObjectGameplay';

export const playgroundInteractionReach = {
  deliveryBoardMinimumRadius: 2.2,
  mailboxMinimumRadius: 2.35,
} as const;

interface PlaygroundInteractableOptions {
  openDeliveryBoard?: () => string;
  enableAuthoredInteractables?: boolean;
}

const createInteractablePosition = (object: WorldObjectDefinition): THREE.Vector3 => {
  if (!object.interactable) {
    throw new Error(`Missing interactable data for world object: ${object.id}`);
  }

  if (getWorldObjectGameplay(object).role === 'mailbox') {
    return new THREE.Vector3(object.position[0], object.interactable.position[1], object.position[2]);
  }

  return new THREE.Vector3(...object.interactable.position);
};

const getInteractableRadius = (object: WorldObjectDefinition): number => {
  if (!object.interactable) {
    throw new Error(`Missing interactable data for world object: ${object.id}`);
  }

  const gameplay = getWorldObjectGameplay(object);

  if (gameplay.role === 'delivery-board') {
    return Math.max(object.interactable.radius, playgroundInteractionReach.deliveryBoardMinimumRadius);
  }

  if (gameplay.role === 'mailbox') {
    return Math.max(object.interactable.radius, playgroundInteractionReach.mailboxMinimumRadius);
  }

  return object.interactable.radius;
};

export const createPlaygroundInteractables = (
  delivery: DeliveryController,
  {
    openDeliveryBoard,
    enableAuthoredInteractables = playgroundCompositionConfig.enableAuthoredInteractables,
  }: PlaygroundInteractableOptions = {},
): readonly Interactable[] => {
  if (!enableAuthoredInteractables) {
    return [];
  }

  const deliveryBoardInteractables: Interactable[] = deliveryBoardObject?.interactable
    ? [
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
    ]
    : [];

  return [
    ...getWorldObjectsByInteractionAction('complete-delivery')
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
    ...deliveryBoardInteractables,
  ];
};
