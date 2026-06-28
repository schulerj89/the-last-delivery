import type { PlayerState } from './types';

export interface PlayerDebugOverlay {
  update(state: PlayerState): void;
  dispose(): void;
}

const formatNumber = (value: number): string => value.toFixed(2);

export const createPlayerDebugOverlay = (parent: HTMLElement): PlayerDebugOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay';
  overlay.dataset.debugOverlay = 'player';
  parent.append(overlay);

  return {
    update(state) {
      overlay.textContent = [
        'Player',
        `Position ${formatNumber(state.position.x)}, ${formatNumber(state.position.y)}, ${formatNumber(state.position.z)}`,
        `Speed ${formatNumber(state.speed)}`,
        `Grounded ${state.grounded ? 'yes' : 'no'}`,
        `Collision ${state.hitBounds ? 'bounds' : state.collisionHits.join(', ') || 'none'}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
