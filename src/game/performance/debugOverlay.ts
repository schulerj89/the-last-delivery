import type { PerformanceSnapshot } from './performanceMonitor';

export interface PerformanceDebugOverlay {
  update(snapshot: PerformanceSnapshot): void;
  dispose(): void;
}

const formatWhole = (value: number): string => Math.round(value).toString();
const formatDecimal = (value: number): string => value.toFixed(1);

export const createPerformanceDebugOverlay = (parent: HTMLElement): PerformanceDebugOverlay => {
  const overlay = document.createElement('div');
  overlay.className = 'debug-overlay debug-overlay--performance';
  overlay.dataset.debugOverlay = 'performance';
  parent.append(overlay);

  return {
    update(snapshot) {
      overlay.textContent = [
        'Performance',
        `FPS ${formatWhole(snapshot.currentFps)} avg ${formatWhole(snapshot.averageFps)}`,
        `Frame ${formatDecimal(snapshot.frameTimeMs)}ms avg ${formatDecimal(snapshot.averageFrameTimeMs)}ms`,
        `Worst ${formatDecimal(snapshot.worstFrameTimeMs)}ms`,
        `Calls ${snapshot.renderCalls}`,
        `Triangles ${snapshot.triangles}`,
        `Memory G:${snapshot.geometries} T:${snapshot.textures}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
