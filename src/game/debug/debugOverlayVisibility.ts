export const debugOverlayVisibilityConfig = {
  toggleKey: 'F3',
  collapsedClassName: 'debug-overlays-collapsed',
  initialCollapsed: true,
  hiddenPanelSelector: '.debug-overlay',
  gameplayUiSelectors: [
    '.delivery-guidance',
    '.interaction-prompt',
    '.interaction-message',
    '.delivery-board-overlay',
  ],
} as const;

export interface DebugOverlayVisibilityState {
  collapsed: boolean;
}

export interface DebugOverlayVisibilityController {
  isCollapsed(): boolean;
  setCollapsed(collapsed: boolean): void;
  toggle(): boolean;
  dispose(): void;
}

export const createDebugOverlayVisibilityState = (
  initialCollapsed = debugOverlayVisibilityConfig.initialCollapsed,
): DebugOverlayVisibilityState => ({
  collapsed: initialCollapsed,
});

export const isGameplayUiSelectorVisibleWhenDebugCollapsed = (selector: string): boolean => (
  debugOverlayVisibilityConfig.gameplayUiSelectors.includes(
    selector as (typeof debugOverlayVisibilityConfig.gameplayUiSelectors)[number],
  )
);

export const createDebugOverlayVisibilityController = (
  root: HTMLElement,
  state = createDebugOverlayVisibilityState(),
): DebugOverlayVisibilityController => {
  const applyState = (): void => {
    root.classList.toggle(debugOverlayVisibilityConfig.collapsedClassName, state.collapsed);
    root.dataset.debugPanels = state.collapsed ? 'collapsed' : 'expanded';
  };

  applyState();

  return {
    isCollapsed() {
      return state.collapsed;
    },
    setCollapsed(collapsed) {
      state.collapsed = collapsed;
      applyState();
    },
    toggle() {
      state.collapsed = !state.collapsed;
      applyState();
      return state.collapsed;
    },
    dispose() {
      root.classList.remove(debugOverlayVisibilityConfig.collapsedClassName);
      delete root.dataset.debugPanels;
    },
  };
};
