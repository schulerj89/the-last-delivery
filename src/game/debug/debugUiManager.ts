import type { ThirdPersonCameraState } from '../camera/types';
import type { DeliveryState } from '../delivery/types';
import type { PerformanceSnapshot } from '../performance';
import type { PlayerState } from '../player/types';

export const debugDetailLevels = ['hidden', 'compact', 'expanded'] as const;
export type DebugDetailLevel = (typeof debugDetailLevels)[number];

export const debugUiConfig = {
  helpKey: 'F1',
  layoutKey: 'F2',
  toggleKey: 'F3',
  detailKey: 'F4',
  performanceKey: 'F5',
  hiddenClassName: 'debug-ui-hidden',
  initialVisible: true,
  initialDetailLevel: 'compact' as DebugDetailLevel,
  initialPerformanceDetailsVisible: false,
  gameplayUiSelectors: [
    '.delivery-guidance',
    '.interaction-prompt',
    '.interaction-message',
    '.delivery-board-overlay',
  ],
} as const;

export interface DebugUiState {
  visible: boolean;
  detailLevel: DebugDetailLevel;
  performanceDetailsVisible: boolean;
  helpVisible: boolean;
}

export interface DebugUiUpdate {
  player: PlayerState;
  camera: ThirdPersonCameraState;
  delivery: DeliveryState;
  performance: PerformanceSnapshot;
  layoutModeActive: boolean;
  layoutObjectCountsByKind: Readonly<Record<string, number>>;
  selectedEditorObjectId: string | null;
  environmentPresetName: string;
}

export interface DebugUiKeyOptions {
  allowHelpToggle?: boolean;
}

export interface DevDebugPanelManager {
  update(update: DebugUiUpdate): void;
  handleKeyDown(event: KeyboardEvent, options?: DebugUiKeyOptions): boolean;
  toggleVisible(): boolean;
  cycleDetailLevel(): DebugDetailLevel;
  togglePerformanceDetails(): boolean;
  getState(): DebugUiState;
  dispose(): void;
}

const formatNumber = (value: number, fractionDigits = 1): string => value.toFixed(fractionDigits);
const formatWhole = (value: number): string => Math.round(value).toString();
const formatRadiansAsDegrees = (value: number): string => formatNumber(value * (180 / Math.PI), 1);

const formatVector = (vector: { x: number; y: number; z: number }): string => (
  `${formatNumber(vector.x, 2)}, ${formatNumber(vector.y, 2)}, ${formatNumber(vector.z, 2)}`
);

const formatTuple = (values: readonly number[]): string => values.map((value) => formatNumber(value, 2)).join(', ');

const formatCounts = (counts: Readonly<Record<string, number>>): string => {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.length > 0
    ? entries.map(([kind, count]) => `${kind}:${count}`).join(' ')
    : 'none';
};

const formatActiveDelivery = (delivery: DeliveryState): string => (
  delivery.activeDelivery?.title ?? 'None'
);

const formatActiveTarget = (delivery: DeliveryState): string => (
  delivery.activeDelivery?.destinationName ?? delivery.activeTargetWorldObjectId ?? 'None'
);

const formatAssetCounts = (snapshot: PerformanceSnapshot): string => {
  const counts = Object.entries(snapshot.sceneInstanceCountsByAssetId)
    .filter(([, count]) => count > 0)
    .map(([assetId, count]) => `${assetId}:${count}`);

  return counts.length > 0 ? counts.join(' ') : 'none';
};

export const isDebugDetailLevel = (value: string): value is DebugDetailLevel => (
  debugDetailLevels.includes(value as DebugDetailLevel)
);

export const createDebugUiState = (
  overrides: Partial<DebugUiState> = {},
): DebugUiState => ({
  visible: overrides.visible ?? debugUiConfig.initialVisible,
  detailLevel: overrides.detailLevel ?? debugUiConfig.initialDetailLevel,
  performanceDetailsVisible: overrides.performanceDetailsVisible
    ?? debugUiConfig.initialPerformanceDetailsVisible,
  helpVisible: overrides.helpVisible ?? false,
});

export const getEffectiveDebugDetailLevel = (state: DebugUiState): DebugDetailLevel => {
  if (!state.visible) {
    return 'hidden';
  }

  return state.detailLevel;
};

export const cycleDebugDetailLevel = (state: DebugUiState): DebugDetailLevel => {
  const current = getEffectiveDebugDetailLevel(state);
  const currentIndex = debugDetailLevels.indexOf(current);
  const nextLevel = debugDetailLevels[(currentIndex + 1) % debugDetailLevels.length] ?? 'compact';

  state.detailLevel = nextLevel === 'hidden' ? 'compact' : nextLevel;
  state.visible = nextLevel !== 'hidden';
  state.helpVisible = nextLevel !== 'hidden' && state.helpVisible;

  return nextLevel;
};

export const isGameplayUiSelectorIndependentOfDebug = (selector: string): boolean => (
  debugUiConfig.gameplayUiSelectors.includes(
    selector as (typeof debugUiConfig.gameplayUiSelectors)[number],
  )
);

const createCompactLines = (update: DebugUiUpdate): string[] => [
  `FPS ${formatWhole(update.performance.currentFps)}  Calls ${update.performance.renderCalls}`,
  `Delivery ${formatActiveDelivery(update.delivery)}`,
  `Player ${formatVector(update.player.position)}`,
  ...(update.layoutModeActive ? [`Selected ${update.selectedEditorObjectId ?? 'none'}`] : []),
];

const createExpandedLines = (update: DebugUiUpdate, state: DebugUiState): string[] => {
  const visual = update.player.visualStatus;
  const lines = [
    'Performance',
    `FPS ${formatWhole(update.performance.currentFps)} avg ${formatWhole(update.performance.averageFps)}`,
    `Frame ${formatNumber(update.performance.frameTimeMs)}ms avg ${formatNumber(update.performance.averageFrameTimeMs)}ms`,
    `Calls ${update.performance.renderCalls}  Triangles ${update.performance.triangles}`,
  ];

  if (state.performanceDetailsVisible) {
    lines.push(
      `Worst ${formatNumber(update.performance.worstFrameTimeMs)}ms`,
      `Memory G:${update.performance.geometries} T:${update.performance.textures}`,
      `Assets ${update.performance.loadedAssetIds.length} loaded ${update.performance.totalSceneInstances} inst`,
      `Asset inst ${formatAssetCounts(update.performance)}`,
    );
  } else {
    lines.push('Performance details hidden (F5)');
  }

  lines.push(
    '',
    'Player',
    `Position ${formatVector(update.player.position)}`,
    `Speed ${formatNumber(update.player.speed, 2)}  Grounded ${update.player.grounded ? 'yes' : 'no'}`,
    `Collision ${update.player.hitBounds ? 'bounds' : update.player.collisionHits.join(', ') || 'none'}`,
    `Visual ${visual.mode}  Meshes ${visual.visibleMeshCount}/${visual.totalMeshCount}`,
    `Asset ${visual.assetId}`,
    `Fallback ${visual.fallbackVisible ? 'yes' : 'no'}`,
    `Char pos ${formatTuple(visual.characterRootPosition)}`,
    `Char scale ${formatTuple(visual.characterRootScale)}`,
    `Char rot ${formatTuple(visual.characterRootRotation)}`,
    ...(visual.errorMessage ? [`Visual error ${visual.errorMessage}`] : []),
    '',
    'Camera',
    `Yaw ${formatRadiansAsDegrees(update.camera.yaw)}  Pitch ${formatRadiansAsDegrees(update.camera.pitch)}`,
    `Distance ${formatNumber(update.camera.distance, 2)}`,
    '',
    'Delivery',
    `Status ${update.delivery.status}`,
    `Active ${formatActiveDelivery(update.delivery)}`,
    `Target ${formatActiveTarget(update.delivery)}`,
    `Completed ${update.delivery.completedCount}`,
    '',
    'Environment',
    `Preset ${update.environmentPresetName}`,
    '',
    'Layout',
    `Mode ${update.layoutModeActive ? 'active' : 'inactive'}`,
    `Objects ${formatCounts(update.layoutObjectCountsByKind)}`,
    `Selected ${update.layoutModeActive ? update.selectedEditorObjectId ?? 'none' : 'layout off'}`,
  );

  return lines;
};

export const createDevDebugPanelManager = (
  root: HTMLElement,
  state = createDebugUiState(),
): DevDebugPanelManager => {
  const panel = document.createElement('section');
  const title = document.createElement('div');
  const body = document.createElement('pre');
  const hint = document.createElement('div');
  const help = document.createElement('pre');

  panel.className = 'dev-debug-panel';
  panel.dataset.debugPanel = 'main';
  title.className = 'dev-debug-panel__title';
  body.className = 'dev-debug-panel__body';
  hint.className = 'dev-debug-panel__hint';
  help.className = 'dev-debug-panel__help';
  hint.textContent = `${debugUiConfig.helpKey} help  ${debugUiConfig.layoutKey} layout  ${debugUiConfig.toggleKey} debug`;
  help.textContent = [
    'Debug Controls',
    `${debugUiConfig.helpKey}: toggle this help`,
    `${debugUiConfig.layoutKey}: toggle layout mode`,
    `${debugUiConfig.toggleKey}: show/hide developer UI panels`,
    `${debugUiConfig.detailKey}: cycle hidden / compact / expanded`,
    `${debugUiConfig.performanceKey}: toggle expanded performance details`,
    'Layout mode keeps gameplay state unchanged.',
  ].join('\n');
  panel.append(title, body, help, hint);
  root.append(panel);

  let lastUpdate: DebugUiUpdate | null = null;

  const applyState = (): void => {
    const detailLevel = getEffectiveDebugDetailLevel(state);
    const hidden = detailLevel === 'hidden';

    root.classList.toggle(debugUiConfig.hiddenClassName, hidden);
    root.dataset.debugUi = detailLevel;
    root.dataset.debugPerformance = state.performanceDetailsVisible ? 'expanded' : 'compact';
    panel.dataset.detail = detailLevel;
    panel.hidden = hidden;
    help.hidden = hidden || !state.helpVisible;

    if (hidden) {
      return;
    }

    title.textContent = `Debug ${detailLevel}${state.performanceDetailsVisible ? ' + perf' : ''}`;

    if (lastUpdate) {
      body.textContent = detailLevel === 'expanded'
        ? createExpandedLines(lastUpdate, state).join('\n')
        : createCompactLines(lastUpdate).join('\n');
    }
  };

  applyState();

  return {
    update(update) {
      lastUpdate = update;
      applyState();
    },
    handleKeyDown(event, options = {}) {
      if (event.repeat) {
        return false;
      }

      if (event.key === debugUiConfig.helpKey) {
        if (options.allowHelpToggle === false || getEffectiveDebugDetailLevel(state) === 'hidden') {
          return false;
        }

        state.helpVisible = !state.helpVisible;
        applyState();
        event.preventDefault();
        return true;
      }

      if (event.key === debugUiConfig.toggleKey) {
        this.toggleVisible();
        event.preventDefault();
        return true;
      }

      if (event.key === debugUiConfig.detailKey) {
        this.cycleDetailLevel();
        event.preventDefault();
        return true;
      }

      if (event.key === debugUiConfig.performanceKey) {
        this.togglePerformanceDetails();
        event.preventDefault();
        return true;
      }

      return false;
    },
    toggleVisible() {
      state.visible = !state.visible;

      if (state.visible && state.detailLevel === 'hidden') {
        state.detailLevel = 'compact';
      }

      state.helpVisible = state.visible && state.helpVisible;
      applyState();
      return state.visible;
    },
    cycleDetailLevel() {
      const nextLevel = cycleDebugDetailLevel(state);
      applyState();
      return nextLevel;
    },
    togglePerformanceDetails() {
      state.performanceDetailsVisible = !state.performanceDetailsVisible;
      applyState();
      return state.performanceDetailsVisible;
    },
    getState() {
      return { ...state };
    },
    dispose() {
      root.classList.remove(debugUiConfig.hiddenClassName);
      delete root.dataset.debugUi;
      delete root.dataset.debugPerformance;
      panel.remove();
    },
  };
};
