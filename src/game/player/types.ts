import type * as THREE from 'three';
import type { CollisionWorld } from '../collision';
import type { PlayerVisualStatus } from './playerVisual';

export interface PlayerState {
  position: THREE.Vector3;
  speed: number;
  grounded: boolean;
  hitBounds: boolean;
  collisionHits: string[];
  visualStatus: PlayerVisualStatus;
}

export interface PlayerMovementSettings {
  radius: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  rotationSnapSpeed: number;
  maxDeltaSeconds: number;
}

export interface PlayerControllerOptions {
  collisionWorld?: CollisionWorld;
  movementBasisProvider?: (forward: THREE.Vector3, right: THREE.Vector3) => void;
}

export interface PlayerController {
  object: THREE.Group;
  update(deltaSeconds: number): void;
  resetToSpawn(): void;
  getState(): PlayerState;
  getVisualStatus(): PlayerVisualStatus;
  dispose(): void;
}
