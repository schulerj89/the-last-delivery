import type { ThirdPersonCameraState } from './types';

export interface CameraDebugOverlay {
  update(state: ThirdPersonCameraState): void;
  dispose(): void;
}

const radiansToDegrees = (value: number): number => value * (180 / Math.PI);
const formatNumber = (value: number): string => value.toFixed(2);

export const createCameraDebugOverlay = (parent: HTMLElement): CameraDebugOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay debug-overlay--camera';
  overlay.dataset.debugOverlay = 'camera';
  parent.append(overlay);

  return {
    update(state) {
      overlay.textContent = [
        'Camera',
        `Yaw ${formatNumber(radiansToDegrees(state.yaw))}`,
        `Pitch ${formatNumber(radiansToDegrees(state.pitch))}`,
        `Distance ${formatNumber(state.distance)}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
