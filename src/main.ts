import * as THREE from 'three';
import './style.css';
import { createCameraDebugOverlay, createThirdPersonCameraController } from './game/camera';
import {
  createDeliveryBoardOverlay,
  createDeliveryController,
  createDeliveryDebugOverlay,
  createDeliveryGuidanceOverlay,
} from './game/delivery';
import { createInteractionController } from './game/interaction';
import { createPlayerController, createPlayerDebugOverlay } from './game/player';
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

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing app container.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16191f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.append(renderer.domElement);

scene.add(createPlayground());

const collisionDebugView = createPlaygroundCollisionDebugView(playgroundCollisionWorld);
scene.add(collisionDebugView.object);

const deliveryBoardObjectiveMarker = createDeliveryBoardObjectiveMarker();
scene.add(deliveryBoardObjectiveMarker);

const deliveryTargetObjectiveMarker = createDeliveryTargetObjectiveMarker();
scene.add(deliveryTargetObjectiveMarker);

const player = createPlayerController({ collisionWorld: playgroundCollisionWorld });
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
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

let animationFrameId: number | null = null;
let isDisposed = false;

const handleResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const handleCollisionDebugKeyDown = (event: KeyboardEvent): void => {
  if (!event.repeat && event.key.toLowerCase() === 'c') {
    collisionDebugView.toggle();
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
  window.removeEventListener('keydown', handleCollisionDebugKeyDown);
  player.dispose();
  followCamera.dispose();
  interaction.dispose();
  deliveryBoardOverlay.dispose();
  playerDebugOverlay.dispose();
  cameraDebugOverlay.dispose();
  deliveryDebugOverlay.dispose();
  deliveryGuidanceOverlay.dispose();
  renderer.dispose();
  renderer.domElement.remove();
};

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleCollisionDebugKeyDown);

const clock = new THREE.Clock();

const animate = (): void => {
  if (isDisposed) {
    return;
  }

  const deltaSeconds = clock.getDelta();
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
  renderer.render(scene, camera);
  animationFrameId = window.requestAnimationFrame(animate);
};

animate();

import.meta.hot?.dispose(dispose);
