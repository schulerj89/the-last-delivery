import type { DeliveryState } from './types';

export interface DeliveryGuidanceOverlay {
  update(state: DeliveryState): void;
  dispose(): void;
}

const getGuidanceText = (state: DeliveryState): string => {
  if (state.status === 'delivery-accepted' && state.activeDelivery) {
    return `Destination: ${state.activeDelivery.destinationName}`;
  }

  return 'Destination: Delivery Board';
};

export const createDeliveryGuidanceOverlay = (parent: HTMLElement): DeliveryGuidanceOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'delivery-guidance';
  overlay.dataset.deliveryGuidance = 'true';
  parent.append(overlay);

  return {
    update(state) {
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
