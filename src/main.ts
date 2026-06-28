import * as THREE from 'three';
import './style.css';
import { disposeAssetCache, getAssetRuntimeStats } from './game/assets';
import {
  createThirdPersonCameraController,
  thirdPersonCameraSettings,
  type ThirdPersonCameraController,
} from './game/camera';
import { createDevDebugPanelManager } from './game/debug/debugUiManager';
import {
  createDeliveryBoardOverlay,
  createDeliveryController,
  createDeliveryGuidanceOverlay,
} from './game/delivery';
import { createInteractionController } from './game/interaction';
import {
  clampFrameDelta,
  createPerformanceMonitor,
  getCappedPixelRatio,
} from './game/performance';
import {
  createPlayerController,
  resolveMovementBasisFromCameraYaw,
} from './game/player';
import { createResourceTracker } from './game/resources';
import {
  createVillageLayoutDebugView,
  getLayoutObjectCountsByKind,
  layoutDebugConfig,
} from './world/layoutDebug';
import { createWorldEnvironment } from './world/environment';
import { createPlacementEditor } from './world/placementEditor';
import { createPlayground } from './world/playground';
import { playgroundCollisionWorld } from './world/playgroundCollision';
import { createPlaygroundCollisionDebugView } from './world/playgroundCollisionDebug';
import { createPlaygroundInteractables } from './world/playgroundInteractables';
import {
  createDeliveryBoardObjectiveMarker,
  createDeliveryTargetObjectiveMarker,
  setObjectiveMarkerTarget,
  updateObjectiveMarker,
} from './world/playgroundObjectiveMarker';
import { createPlaygroundVisualBoundsDebugView } from './world/playgroundVisualBoundsDebug';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing app container.');
}

const scene = new THREE.Scene();
const appResources = createResourceTracker();
const environment = createWorldEnvironment(scene);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.append(renderer.domElement);

const visualBoundsDebugView = createPlaygroundVisualBoundsDebugView();
const playground = appResources.trackObject3D(createPlayground({ visualBoundsDebugView }));
scene.add(playground);
scene.add(visualBoundsDebugView.object);

const collisionDebugView = createPlaygroundCollisionDebugView(playgroundCollisionWorld);
appResources.trackObject3D(collisionDebugView.object);
scene.add(collisionDebugView.object);

const layoutDebugView = createVillageLayoutDebugView(window.innerWidth, window.innerHeight);
scene.add(layoutDebugView.object);
const placementEditor = createPlacementEditor({
  sceneRoot: playground,
  camera: layoutDebugView.camera,
  domElement: renderer.domElement,
  parent: app,
  isLayoutModeActive: layoutDebugView.isActive,
  draftPersistenceEnabled: import.meta.env.DEV,
});
scene.add(placementEditor.object);

const deliveryBoardObjectiveMarker = appResources.trackObject3D(createDeliveryBoardObjectiveMarker());
scene.add(deliveryBoardObjectiveMarker);

const deliveryTargetObjectiveMarker = appResources.trackObject3D(createDeliveryTargetObjectiveMarker());
scene.add(deliveryTargetObjectiveMarker);

let followCamera: ThirdPersonCameraController | null = null;
const player = createPlayerController({
  collisionWorld: playgroundCollisionWorld,
  movementBasisProvider: (forward, right) => {
    resolveMovementBasisFromCameraYaw(
      followCamera?.getState().yaw ?? thirdPersonCameraSettings.initialYaw,
      forward,
      right,
    );
  },
});
const playerRootHelper = new THREE.AxesHelper(0.8);
playerRootHelper.name = 'debug:player-root-axis';
playerRootHelper.visible = false;
player.object.add(playerRootHelper);
appResources.trackObject3D(player.object);
scene.add(player.object);

const delivery = createDeliveryController();
followCamera = createThirdPersonCameraController({
  camera,
  target: player.object,
  domElement: renderer.domElement,
});
const deliveryGuidanceOverlay = createDeliveryGuidanceOverlay(app);
const debugUi = createDevDebugPanelManager(app);
const layoutObjectCountsByKind = getLayoutObjectCountsByKind();
const performanceMonitor = createPerformanceMonitor({
  config: {
    debugWarningsEnabled: import.meta.env.DEV,
  },
});
const deliveryBoardOverlay = createDeliveryBoardOverlay({
  delivery,
  parent: app,
});
const interaction = createInteractionController({
  player: player.object,
  interactables: createPlaygroundInteractables(delivery, {
    openDeliveryBoard: deliveryBoardOverlay.open,
  }),
  parent: app,
});

let animationFrameId: number | null = null;
let isDisposed = false;
let preLayoutDebugState: { collision: boolean; visualBounds: boolean } | null = null;

const handleResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  layoutDebugView.resize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const setLayoutModeActive = (active: boolean): void => {
  if (layoutDebugView.isActive() === active) {
    return;
  }

  if (active) {
    preLayoutDebugState = {
      collision: collisionDebugView.isVisible(),
      visualBounds: visualBoundsDebugView.isVisible(),
    };
    layoutDebugView.setActive(true);
    placementEditor.setActive(true);
    collisionDebugView.setVisible(true);
    visualBoundsDebugView.setVisible(true);
    playerRootHelper.visible = true;
    return;
  }

  placementEditor.setActive(false);
  layoutDebugView.setActive(false);
  playerRootHelper.visible = false;

  if (preLayoutDebugState) {
    collisionDebugView.setVisible(preLayoutDebugState.collision);
    visualBoundsDebugView.setVisible(preLayoutDebugState.visualBounds);
    preLayoutDebugState = null;
  }
};

const handleDebugKeyDown = (event: KeyboardEvent): void => {
  if (event.repeat) {
    return;
  }

  if (event.key === layoutDebugConfig.toggleKey) {
    event.preventDefault();
    setLayoutModeActive(!layoutDebugView.isActive());
    return;
  }

  if (debugUi.handleKeyDown(event, { allowHelpToggle: !layoutDebugView.isActive() })) {
    return;
  }

  if (layoutDebugView.isActive() && placementEditor.handleKeyDown(event)) {
    return;
  }

  if (layoutDebugView.isActive()) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'c') {
    collisionDebugView.toggle();
    return;
  }

  if (key === 'b') {
    const visible = !visualBoundsDebugView.isVisible();
    collisionDebugView.setVisible(visible);
    visualBoundsDebugView.setVisible(visible);
  }
};

const handleDebugKeyUp = (event: KeyboardEvent): void => {
  if (layoutDebugView.isActive()) {
    placementEditor.handleKeyUp(event);
  }
};

const dispose = (): void => {
  if (isDisposed) {
    return;
  }

  isDisposed = true;

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleDebugKeyDown);
  window.removeEventListener('keyup', handleDebugKeyUp);
  playerRootHelper.parent?.remove(playerRootHelper);
  playerRootHelper.geometry.dispose();
  if (Array.isArray(playerRootHelper.material)) {
    playerRootHelper.material.forEach((material) => material.dispose());
  } else {
    playerRootHelper.material.dispose();
  }
  player.dispose();
  followCamera?.dispose();
  interaction.dispose();
  deliveryBoardOverlay.dispose();
  deliveryGuidanceOverlay.dispose();
  debugUi.dispose();
  performanceMonitor.dispose();
  environment.dispose();
  placementEditor.dispose();
  layoutDebugView.dispose();
  visualBoundsDebugView.dispose();
  appResources.dispose();
  disposeAssetCache();
  renderer.dispose();
  renderer.domElement.remove();
};

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleDebugKeyDown);
window.addEventListener('keyup', handleDebugKeyUp);

const clock = new THREE.Clock();

const animate = (): void => {
  if (isDisposed) {
    return;
  }

  const rawDeltaSeconds = clock.getDelta();
  const deltaSeconds = clampFrameDelta(rawDeltaSeconds);
  const elapsedSeconds = clock.elapsedTime;

  player.update(deltaSeconds);
  interaction.update(deltaSeconds);
  placementEditor.update(deltaSeconds);
  const deliveryState = delivery.getState();
  deliveryBoardObjectiveMarker.visible = deliveryState.status !== 'delivery-accepted';
  deliveryTargetObjectiveMarker.visible = deliveryState.status === 'delivery-accepted'
    && setObjectiveMarkerTarget(deliveryTargetObjectiveMarker, deliveryState.activeTargetWorldObjectId);
  updateObjectiveMarker(deliveryBoardObjectiveMarker, elapsedSeconds);
  updateObjectiveMarker(deliveryTargetObjectiveMarker, elapsedSeconds);
  followCamera?.update(deltaSeconds);
  deliveryGuidanceOverlay.update(deliveryState);
  deliveryBoardOverlay.update(deliveryState);
  renderer.render(scene, layoutDebugView.isActive() ? layoutDebugView.camera : camera);
  const performanceSnapshot = performanceMonitor.update(rawDeltaSeconds, renderer, getAssetRuntimeStats());
  debugUi.update({
    player: player.getState(),
    camera: followCamera?.getState() ?? {
      yaw: thirdPersonCameraSettings.initialYaw,
      pitch: thirdPersonCameraSettings.initialPitch,
      distance: thirdPersonCameraSettings.distance,
    },
    delivery: deliveryState,
    performance: performanceSnapshot,
    layoutModeActive: layoutDebugView.isActive(),
    layoutObjectCountsByKind,
    selectedEditorObjectId: placementEditor.getSelectedObjectId(),
    environmentPresetName: environment.presetName,
  });
  animationFrameId = window.requestAnimationFrame(animate);
};

animate();

import.meta.hot?.dispose(dispose);
