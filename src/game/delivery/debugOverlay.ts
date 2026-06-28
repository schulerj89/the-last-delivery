import type { DeliveryState } from './types';

export interface DeliveryDebugOverlay {
  update(state: DeliveryState): void;
  dispose(): void;
}

const formatStatus = (state: DeliveryState): string => state.status.replace('-', ' ');

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
        `Completed ${state.completedCount}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
