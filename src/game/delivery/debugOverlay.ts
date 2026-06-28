import type { DeliveryState } from './types';

export interface DeliveryDebugOverlay {
  update(state: DeliveryState): void;
  dispose(): void;
}

const formatStatus = (state: DeliveryState): string => state.status.replace('-', ' ');

const formatObjective = (state: DeliveryState): string => {
  if (state.status === 'delivery-accepted' && state.activeDelivery) {
    return `Deliver to ${state.activeDelivery.destinationName}`;
  }

  return 'Go to delivery board';
};

const formatActiveDelivery = (state: DeliveryState): string => state.activeDelivery?.title ?? 'None';

const formatActiveTarget = (state: DeliveryState): string => (
  state.activeDelivery?.destinationName ?? state.activeTargetWorldObjectId ?? 'None'
);

export const createDeliveryDebugOverlay = (parent: HTMLElement): DeliveryDebugOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay debug-overlay--delivery';
  overlay.dataset.debugOverlay = 'delivery';
  parent.append(overlay);

  return {
    update(state) {
      overlay.textContent = [
        'Delivery',
        `Status ${formatStatus(state)}`,
        `Active ${formatActiveDelivery(state)}`,
        `Target ${formatActiveTarget(state)}`,
        `Objective ${formatObjective(state)}`,
        `Completed ${state.completedCount}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
