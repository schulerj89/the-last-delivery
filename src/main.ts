import * as THREE from 'three';
import './style.css';
import { disposeAssetCache, getAssetRuntimeStats } from './game/assets';
import { createCameraDebugOverlay, createThirdPersonCameraController } from './game/camera';
import {
  createDeliveryBoardOverlay,
  createDeliveryController,
  createDeliveryDebugOverlay,
  createDeliveryGuidanceOverlay,
} from './game/delivery';
import { createInteractionController } from './game/interaction';
import {
  clampFrameDelta,
  createPerformanceDebugOverlay,
  createPerformanceMonitor,
  getCappedPixelRatio,
} from './game/performance';
import { createPlayerController, createPlayerDebugOverlay } from './game/player';
import { createResourceTracker } from './game/resources';
import {
  createVillageLayoutDebugHud,
  createVillageLayoutDebugView,
  layoutDebugConfig,
} from './world/layoutDebug';
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
scene.background = new THREE.Color(0x16191f);
const appResources = createResourceTracker();

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
const layoutDebugHud = createVillageLayoutDebugHud(app);
const placementEditor = createPlacementEditor({
  sceneRoot: playground,
  camera: layoutDebugView.camera,
  domElement: renderer.domElement,
  parent: app,
  isLayoutModeActive: layoutDebugView.isActive,
});
scene.add(placementEditor.object);

const deliveryBoardObjectiveMarker = appResources.trackObject3D(createDeliveryBoardObjectiveMarker());
scene.add(deliveryBoardObjectiveMarker);

const deliveryTargetObjectiveMarker = appResources.trackObject3D(createDeliveryTargetObjectiveMarker());
scene.add(deliveryTargetObjectiveMarker);

const player = createPlayerController({ collisionWorld: playgroundCollisionWorld });
appResources.trackObject3D(player.object);
scene.add(player.object);

const delivery = createDeliveryController();
const playerDebugOverlay = createPlayerDebugOverlay(app);
const followCamera = createThirdPersonCameraController({
  camera,
  target: player.object,
  domElement: renderer.domElement,
});
const cameraDebugOverlay = createCameraDebugOverlay(app);
const deliveryDebugOverlay = createDeliveryDebugOverlay(app);
const deliveryGuidanceOverlay = createDeliveryGuidanceOverlay(app);
const performanceMonitor = createPerformanceMonitor({
  config: {
    debugWarningsEnabled: import.meta.env.DEV,
  },
});
const performanceDebugOverlay = createPerformanceDebugOverlay(app);
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

const ambientLight = new THREE.HemisphereLight(0xe8f1ff, 0x253329, 1.8);
appResources.trackObject3D(ambientLight);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
appResources.trackObject3D(keyLight);
scene.add(keyLight);

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
    return;
  }

  placementEditor.setActive(false);
  layoutDebugView.setActive(false);

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
  player.dispose();
  followCamera.dispose();
  interaction.dispose();
  deliveryBoardOverlay.dispose();
  playerDebugOverlay.dispose();
  cameraDebugOverlay.dispose();
  deliveryDebugOverlay.dispose();
  deliveryGuidanceOverlay.dispose();
  performanceMonitor.dispose();
  performanceDebugOverlay.dispose();
  placementEditor.dispose();
  layoutDebugHud.dispose();
  layoutDebugView.dispose();
  visualBoundsDebugView.dispose();
  appResources.dispose();
  disposeAssetCache();
  renderer.dispose();
  renderer.domElement.remove();
};

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleDebugKeyDown);

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
  const deliveryState = delivery.getState();
  deliveryBoardObjectiveMarker.visible = deliveryState.status !== 'delivery-accepted';
  deliveryTargetObjectiveMarker.visible = deliveryState.status === 'delivery-accepted'
    && setObjectiveMarkerTarget(deliveryTargetObjectiveMarker, deliveryState.activeTargetWorldObjectId);
  updateObjectiveMarker(deliveryBoardObjectiveMarker, elapsedSeconds);
  updateObjectiveMarker(deliveryTargetObjectiveMarker, elapsedSeconds);
  followCamera.update(deltaSeconds);
  playerDebugOverlay.update(player.getState());
  cameraDebugOverlay.update(followCamera.getState());
  deliveryDebugOverlay.update(deliveryState);
  deliveryGuidanceOverlay.update(deliveryState);
  deliveryBoardOverlay.update(deliveryState);
  renderer.render(scene, layoutDebugView.isActive() ? layoutDebugView.camera : camera);
  const performanceSnapshot = performanceMonitor.update(rawDeltaSeconds, renderer, getAssetRuntimeStats());
  performanceDebugOverlay.update(performanceSnapshot);
  layoutDebugHud.update(layoutDebugView.isActive(), performanceSnapshot);
  animationFrameId = window.requestAnimationFrame(animate);
};

animate();

import.meta.hot?.dispose(dispose);
