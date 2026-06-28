import type { PlayerState } from './types';

export interface PlayerDebugOverlay {
  update(state: PlayerState): void;
  dispose(): void;
}

const formatNumber = (value: number): string => value.toFixed(2);
const formatTuple = (values: readonly number[]): string => values.map(formatNumber).join(', ');

export const createPlayerDebugOverlay = (parent: HTMLElement): PlayerDebugOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay';
  overlay.dataset.debugOverlay = 'player';
  parent.append(overlay);

  return {
    update(state) {
      const visual = state.visualStatus;
      overlay.textContent = [
        'Player',
        `Position ${formatNumber(state.position.x)}, ${formatNumber(state.position.y)}, ${formatNumber(state.position.z)}`,
        `Speed ${formatNumber(state.speed)}`,
        `Grounded ${state.grounded ? 'yes' : 'no'}`,
        `Collision ${state.hitBounds ? 'bounds' : state.collisionHits.join(', ') || 'none'}`,
        `Visual ${visual.mode}`,
        `Asset ${visual.assetId}`,
        `Meshes ${visual.visibleMeshCount}/${visual.totalMeshCount}`,
        `Fallback ${visual.fallbackVisible ? 'yes' : 'no'}`,
        `Char pos ${formatTuple(visual.characterRootPosition)}`,
        `Char scale ${formatTuple(visual.characterRootScale)}`,
        `Char rot ${formatTuple(visual.characterRootRotation)}`,
        ...(visual.errorMessage ? [`Visual error ${visual.errorMessage}`] : []),
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
