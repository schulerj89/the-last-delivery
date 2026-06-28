import * as THREE from 'three';
import './style.css';
import { createPlayground } from './world/playground';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing app container.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16191f);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(7, 6, 9);
camera.lookAt(0, 0.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.append(renderer.domElement);

scene.add(createPlayground());

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

const animate = () => {
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
