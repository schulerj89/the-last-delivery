export interface PerformanceBudgetConfig {
  targetFps: number;
  warningFps: number;
  badFps: number;
  targetFrameMs: number;
  warningDrawCalls: number;
  warningTriangles: number;
  maxPixelRatio: number;
  maxDeltaSeconds: number;
  sampleCount: number;
  warningCooldownSeconds: number;
  debugWarningsEnabled: boolean;
}

export interface RendererInfoProvider {
  info: {
    render: {
      calls: number;
      triangles: number;
    };
    memory: {
      geometries: number;
      textures: number;
    };
  };
}

export interface PerformanceSnapshot {
  currentFps: number;
  averageFps: number;
  frameTimeMs: number;
  averageFrameTimeMs: number;
  worstFrameTimeMs: number;
  renderCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

export interface PerformanceMonitorOptions {
  config?: Partial<PerformanceBudgetConfig>;
}

export interface PerformanceMonitor {
  update(deltaSeconds: number, renderer: RendererInfoProvider): PerformanceSnapshot;
  getSnapshot(): PerformanceSnapshot;
  dispose(): void;
}

export const performanceBudgetConfig: PerformanceBudgetConfig = {
  targetFps: 60,
  warningFps: 50,
  badFps: 30,
  targetFrameMs: 16.67,
  warningDrawCalls: 200,
  warningTriangles: 250_000,
  maxPixelRatio: 1.5,
  maxDeltaSeconds: 0.1,
  sampleCount: 90,
  warningCooldownSeconds: 5,
  debugWarningsEnabled: false,
};

const emptySnapshot: PerformanceSnapshot = {
  currentFps: 0,
  averageFps: 0,
  frameTimeMs: 0,
  averageFrameTimeMs: 0,
  worstFrameTimeMs: 0,
  renderCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
};

const sanitizePositiveNumber = (value: number, fallback: number): number => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

export const resolvePerformanceConfig = (
  overrides: Partial<PerformanceBudgetConfig> = {},
): PerformanceBudgetConfig => ({
  ...performanceBudgetConfig,
  ...overrides,
  targetFps: sanitizePositiveNumber(overrides.targetFps ?? performanceBudgetConfig.targetFps, performanceBudgetConfig.targetFps),
  warningFps: sanitizePositiveNumber(overrides.warningFps ?? performanceBudgetConfig.warningFps, performanceBudgetConfig.warningFps),
  badFps: sanitizePositiveNumber(overrides.badFps ?? performanceBudgetConfig.badFps, performanceBudgetConfig.badFps),
  targetFrameMs: sanitizePositiveNumber(overrides.targetFrameMs ?? performanceBudgetConfig.targetFrameMs, performanceBudgetConfig.targetFrameMs),
  warningDrawCalls: sanitizePositiveNumber(overrides.warningDrawCalls ?? performanceBudgetConfig.warningDrawCalls, performanceBudgetConfig.warningDrawCalls),
  warningTriangles: sanitizePositiveNumber(overrides.warningTriangles ?? performanceBudgetConfig.warningTriangles, performanceBudgetConfig.warningTriangles),
  maxPixelRatio: sanitizePositiveNumber(overrides.maxPixelRatio ?? performanceBudgetConfig.maxPixelRatio, performanceBudgetConfig.maxPixelRatio),
  maxDeltaSeconds: sanitizePositiveNumber(overrides.maxDeltaSeconds ?? performanceBudgetConfig.maxDeltaSeconds, performanceBudgetConfig.maxDeltaSeconds),
  sampleCount: Math.max(1, Math.round(sanitizePositiveNumber(overrides.sampleCount ?? performanceBudgetConfig.sampleCount, performanceBudgetConfig.sampleCount))),
  warningCooldownSeconds: sanitizePositiveNumber(
    overrides.warningCooldownSeconds ?? performanceBudgetConfig.warningCooldownSeconds,
    performanceBudgetConfig.warningCooldownSeconds,
  ),
});

export const getCappedPixelRatio = (
  devicePixelRatio: number,
  config: PerformanceBudgetConfig = performanceBudgetConfig,
): number => Math.min(
  sanitizePositiveNumber(devicePixelRatio, 1),
  sanitizePositiveNumber(config.maxPixelRatio, performanceBudgetConfig.maxPixelRatio),
);

export const clampFrameDelta = (
  deltaSeconds: number,
  config: PerformanceBudgetConfig = performanceBudgetConfig,
): number => Math.min(
  Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0),
  sanitizePositiveNumber(config.maxDeltaSeconds, performanceBudgetConfig.maxDeltaSeconds),
);

export const createPerformanceSnapshot = (
  frameTimeMs = 0,
  renderer?: RendererInfoProvider,
  averageFrameTimeMs = frameTimeMs,
  worstFrameTimeMs = frameTimeMs,
): PerformanceSnapshot => {
  const safeFrameTimeMs = Math.max(0, Number.isFinite(frameTimeMs) ? frameTimeMs : 0);
  const safeAverageFrameTimeMs = Math.max(0, Number.isFinite(averageFrameTimeMs) ? averageFrameTimeMs : safeFrameTimeMs);
  const safeWorstFrameTimeMs = Math.max(safeFrameTimeMs, Number.isFinite(worstFrameTimeMs) ? worstFrameTimeMs : safeFrameTimeMs);

  return {
    currentFps: safeFrameTimeMs > 0 ? 1_000 / safeFrameTimeMs : 0,
    averageFps: safeAverageFrameTimeMs > 0 ? 1_000 / safeAverageFrameTimeMs : 0,
    frameTimeMs: safeFrameTimeMs,
    averageFrameTimeMs: safeAverageFrameTimeMs,
    worstFrameTimeMs: safeWorstFrameTimeMs,
    renderCalls: renderer?.info.render.calls ?? 0,
    triangles: renderer?.info.render.triangles ?? 0,
    geometries: renderer?.info.memory.geometries ?? 0,
    textures: renderer?.info.memory.textures ?? 0,
  };
};

const getWorstFrameTime = (samples: readonly number[], sampleCount: number): number => {
  let worstFrameTimeMs = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    worstFrameTimeMs = Math.max(worstFrameTimeMs, samples[index] ?? 0);
  }

  return worstFrameTimeMs;
};

const getBudgetWarnings = (
  snapshot: PerformanceSnapshot,
  config: PerformanceBudgetConfig,
): string[] => {
  const warnings: string[] = [];

  if (snapshot.averageFps > 0 && snapshot.averageFps < config.warningFps) {
    warnings.push(`average FPS ${snapshot.averageFps.toFixed(1)} below ${config.warningFps}`);
  }

  if (snapshot.averageFps > 0 && snapshot.averageFps < config.badFps) {
    warnings.push(`average FPS below bad threshold ${config.badFps}`);
  }

  if (snapshot.averageFrameTimeMs > config.targetFrameMs) {
    warnings.push(`average frame ${snapshot.averageFrameTimeMs.toFixed(1)}ms above ${config.targetFrameMs}ms`);
  }

  if (snapshot.renderCalls > config.warningDrawCalls) {
    warnings.push(`draw calls ${snapshot.renderCalls} above ${config.warningDrawCalls}`);
  }

  if (snapshot.triangles > config.warningTriangles) {
    warnings.push(`triangles ${snapshot.triangles} above ${config.warningTriangles}`);
  }

  return warnings;
};

export const createPerformanceMonitor = ({
  config: configOverrides,
}: PerformanceMonitorOptions = {}): PerformanceMonitor => {
  const config = resolvePerformanceConfig(configOverrides);
  const frameSamples = new Array<number>(config.sampleCount).fill(0);
  let sampleIndex = 0;
  let sampleCount = 0;
  let frameTimeTotalMs = 0;
  let warningCooldownSeconds = 0;
  let snapshot = { ...emptySnapshot };

  return {
    update(deltaSeconds, renderer) {
      const safeDeltaSeconds = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
      const frameTimeMs = safeDeltaSeconds * 1_000;
      const previousFrameTimeMs = frameSamples[sampleIndex] ?? 0;

      if (sampleCount < config.sampleCount) {
        sampleCount += 1;
      } else {
        frameTimeTotalMs -= previousFrameTimeMs;
      }

      frameSamples[sampleIndex] = frameTimeMs;
      frameTimeTotalMs += frameTimeMs;
      sampleIndex = (sampleIndex + 1) % config.sampleCount;

      snapshot = createPerformanceSnapshot(
        frameTimeMs,
        renderer,
        frameTimeTotalMs / sampleCount,
        getWorstFrameTime(frameSamples, sampleCount),
      );

      if (config.debugWarningsEnabled) {
        warningCooldownSeconds = Math.max(0, warningCooldownSeconds - safeDeltaSeconds);

        if (warningCooldownSeconds === 0) {
          const warnings = getBudgetWarnings(snapshot, config);

          if (warnings.length > 0) {
            console.warn(`[performance] ${warnings.join('; ')}`);
            warningCooldownSeconds = config.warningCooldownSeconds;
          }
        }
      }

      return snapshot;
    },
    getSnapshot() {
      return snapshot;
    },
    dispose() {
      frameSamples.fill(0);
      sampleCount = 0;
      frameTimeTotalMs = 0;
      snapshot = { ...emptySnapshot };
    },
  };
};
