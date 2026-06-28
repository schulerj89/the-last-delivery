import * as THREE from 'three';
import type {
  Interactable,
  InteractionController,
  InteractionControllerOptions,
  InteractionSettings,
  InteractionState,
} from './types';

export const interactionSettings: InteractionSettings = {
  messageDurationSeconds: 2.25,
};

const horizontalDistanceSq = (a: THREE.Vector3, b: THREE.Vector3): number => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
};

const findNearestInteractable = (
  playerPosition: THREE.Vector3,
  interactables: readonly Interactable[],
): Interactable | null => {
  let nearest: Interactable | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  interactables.forEach((interactable) => {
    const distanceSq = horizontalDistanceSq(playerPosition, interactable.position);
    const radiusSq = interactable.radius * interactable.radius;

    if (distanceSq <= radiusSq && distanceSq < nearestDistanceSq) {
      nearest = interactable;
      nearestDistanceSq = distanceSq;
    }
  });

  return nearest;
};

export const createInteractionController = ({
  player,
  interactables,
  parent,
  inputTarget = window,
  settings = interactionSettings,
}: InteractionControllerOptions): InteractionController => {
  let currentInteractable: Interactable | null = null;
  let lastMessage = '';
  let messageSecondsRemaining = 0;

  const prompt = document.createElement('div');
  prompt.className = 'interaction-prompt';
  prompt.dataset.interactionPrompt = 'true';
  prompt.hidden = true;
  parent.append(prompt);

  const message = document.createElement('div');
  message.className = 'interaction-message';
  message.dataset.interactionMessage = 'true';
  message.hidden = true;
  parent.append(message);

  const triggerCurrent = (): void => {
    if (!currentInteractable) {
      return;
    }

    lastMessage = currentInteractable.message;
    messageSecondsRemaining = settings.messageDurationSeconds;
    message.textContent = lastMessage;
    message.hidden = false;
    console.info(lastMessage);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat && event.key.toLowerCase() === 'e') {
      triggerCurrent();
    }
  };

  inputTarget.addEventListener('keydown', handleKeyDown);

  return {
    update(deltaSeconds) {
      currentInteractable = findNearestInteractable(player.position, interactables);

      if (currentInteractable) {
        prompt.textContent = `Press E - ${currentInteractable.prompt}`;
        prompt.hidden = false;
      } else {
        prompt.hidden = true;
      }

      if (messageSecondsRemaining > 0) {
        messageSecondsRemaining = Math.max(0, messageSecondsRemaining - deltaSeconds);
        message.hidden = false;
      } else {
        message.hidden = true;
      }
    },
    getState(): InteractionState {
      return {
        currentInteractableId: currentInteractable?.id ?? null,
        lastMessage,
        promptVisible: !prompt.hidden,
        messageVisible: !message.hidden,
      };
    },
    dispose() {
      inputTarget.removeEventListener('keydown', handleKeyDown);
      prompt.remove();
      message.remove();
    },
  };
};
