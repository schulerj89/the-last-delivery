import * as THREE from 'three';
import type { DeliveryController } from '../game/delivery';
import type { Interactable } from '../game/interaction';

export const createPlaygroundInteractables = (delivery: DeliveryController): readonly Interactable[] => [
  {
    id: 'mailbox',
    position: new THREE.Vector3(-3.3, 0, 2.8),
    radius: 1.15,
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
    id: 'delivery-board',
    position: new THREE.Vector3(3.6, 0, -3.2),
    radius: 1.25,
    prompt: () => (
      delivery.getState().status === 'delivery-accepted'
        ? 'Delivery in progress'
        : 'Accept delivery'
    ),
    interact: () => delivery.acceptDelivery(),
  },
];
