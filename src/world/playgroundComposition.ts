export const playgroundCompositionConfig = {
  mode: 'clean-editor-canvas',
  renderGrass: true,
  renderFence: true,
  renderAuthoredWorldObjects: false,
  enableAuthoredCollision: false,
  enableAuthoredInteractables: false,
  showAuthoredObjectiveMarkers: false,
} as const;

export const shouldRenderAuthoredPlaygroundObjects = (
  override?: boolean,
): boolean => override ?? playgroundCompositionConfig.renderAuthoredWorldObjects;
