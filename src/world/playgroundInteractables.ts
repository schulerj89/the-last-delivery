import * as THREE from 'three';
import type { Interactable } from '../game/interaction';

export const playgroundInteractables: readonly Interactable[] = [
  {
    id: 'mailbox',
    position: new THREE.Vector3(-3.3, 0, 2.8),
    radius: 1.15,
    prompt: 'Check mailbox',
    message: 'Mailbox checked.',
  },
  {
    id: 'delivery-board',
    position: new THREE.Vector3(3.6, 0, -3.2),
    radius: 1.25,
    prompt: 'Read delivery board',
    message: 'Delivery board reviewed.',
  },
];
