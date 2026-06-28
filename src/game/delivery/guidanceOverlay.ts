import type { DeliveryState } from './types';

export interface DeliveryGuidanceOverlay {
  update(state: DeliveryState): void;
  dispose(): void;
}

interface DeliveryGuidanceOverlayOptions {
  enabled?: boolean;
}

const getGuidanceText = (state: DeliveryState): string => {
  if (state.status === 'delivery-accepted' && state.activeDelivery) {
    return `Active destination: ${state.activeDelivery.destinationName}`;
  }

  return 'Objective: choose a delivery at the board';
};

export const createDeliveryGuidanceOverlay = (
  parent: HTMLElement,
  { enabled = true }: DeliveryGuidanceOverlayOptions = {},
): DeliveryGuidanceOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'delivery-guidance';
  overlay.dataset.deliveryGuidance = 'true';
  overlay.hidden = !enabled;
  parent.append(overlay);

  return {
    update(state) {
      if (!enabled) {
        return;
      }

      const nextText = getGuidanceText(state);
      if (overlay.textContent !== nextText) {
        overlay.textContent = nextText;
      }
    },
    dispose() {
      overlay.remove();
    },
  };
};
