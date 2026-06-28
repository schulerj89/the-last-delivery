import type * as THREE from 'three';

export interface PlayerState {
  position: THREE.Vector3;
  speed: number;
  grounded: boolean;
}

export interface PlayerController {
  object: THREE.Group;
  update(deltaSeconds: number): void;
  resetToSpawn(): void;
  getState(): PlayerState;
  dispose(): void;
}
