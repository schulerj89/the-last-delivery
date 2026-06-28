import * as THREE from 'three';
import './style.css';
import { createCameraDebugOverlay, createThirdPersonCameraController } from './game/camera';
import { createInteractionController } from './game/interaction';
import { createPlayerController, createPlayerDebugOverlay } from './game/player';
import { createPlayground } from './world/playground';
import { playgroundCollisionWorld } from './world/playgroundCollision';
import { createPlaygroundCollisionDebugView } from './world/playgroundCollisionDebug';
import { playgroundInteractables } from './world/playgroundInteractables';

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

const player = createPlayerController({ collisionWorld: playgroundCollisionWorld });
scene.add(player.object);

const playerDebugOverlay = createPlayerDebugOverlay(app);
const followCamera = createThirdPersonCameraController({
  camera,
  target: player.object,
  domElement: renderer.domElement,
});
const cameraDebugOverlay = createCameraDebugOverlay(app);
const interaction = createInteractionController({
  player: player.object,
  interactables: playgroundInteractables,
  parent: app,
});

const ambientLight = new THREE.HemisphereLight(0xe8f1ff, 0x253329, 1.8);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', (event) => {
  if (!event.repeat && event.key.toLowerCase() === 'c') {
    collisionDebugView.toggle();
  }
});

const clock = new THREE.Clock();

const animate = () => {
  const deltaSeconds = clock.getDelta();

  player.update(deltaSeconds);
  interaction.update(deltaSeconds);
  followCamera.update(deltaSeconds);
  playerDebugOverlay.update(player.getState());
  cameraDebugOverlay.update(followCamera.getState());
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
