import type * as THREE from 'three';

export interface ThirdPersonCameraSettings {
  distance: number;
  minPitch: number;
  maxPitch: number;
  initialYaw: number;
  initialPitch: number;
  orbitSensitivity: number;
  positionSmoothness: number;
  targetSmoothness: number;
  targetOffset: THREE.Vector3;
}

export interface ThirdPersonCameraOptions {
  camera: THREE.PerspectiveCamera;
  target: THREE.Object3D;
  domElement: HTMLElement;
  settings?: ThirdPersonCameraSettings;
}

export interface ThirdPersonCameraState {
  yaw: number;
  pitch: number;
  distance: number;
}

export interface ThirdPersonCameraController {
  camera: THREE.PerspectiveCamera;
  update(deltaSeconds: number): void;
  getState(): ThirdPersonCameraState;
  dispose(): void;
}
