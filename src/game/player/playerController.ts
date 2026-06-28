import * as THREE from 'three';
import { resolvePlayerCollision } from '../collision';
import type { PlayerController, PlayerControllerOptions, PlayerMovementSettings, PlayerState } from './types';
import { playerSpawnPosition } from '../../world/villageDefinition';

const spawnPosition = new THREE.Vector3(...playerSpawnPosition);
const groundedY = 0;

export const playerMovementSettings: PlayerMovementSettings = {
  radius: 0.38,
  maxSpeed: 3.5,
  acceleration: 9,
  deceleration: 11,
  rotationSnapSpeed: 14,
  maxDeltaSeconds: 0.05,
};

const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.55 });
const facingMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5f8f, roughness: 0.55 });

const movementKeys = new Set(['w', 'a', 's', 'd']);

const createPlayerMesh = (): THREE.Group => {
  const player = new THREE.Group();
  player.name = 'player:placeholder';
  player.userData.label = 'player:placeholder';

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.9, 12),
    playerMaterial,
  );
  body.name = 'player:placeholder-body';
  body.userData.label = body.name;
  body.position.y = 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);

  const facingMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.5),
    facingMaterial,
  );
  facingMarker.name = 'player:facing-marker';
  facingMarker.userData.label = facingMarker.name;
  facingMarker.position.set(0, 0.55, -0.38);
  facingMarker.castShadow = true;
  player.add(facingMarker);

  return player;
};

const applyDeceleration = (velocity: THREE.Vector3, deltaSeconds: number): void => {
  const speed = velocity.length();

  if (speed === 0) {
    return;
  }

  const nextSpeed = Math.max(0, speed - playerMovementSettings.deceleration * deltaSeconds);
  velocity.multiplyScalar(nextSpeed / speed);
};

const getInputDirection = (pressedKeys: Set<string>, target: THREE.Vector3): THREE.Vector3 => {
  target.set(0, 0, 0);

  if (pressedKeys.has('w')) {
    target.z -= 1;
  }

  if (pressedKeys.has('s')) {
    target.z += 1;
  }

  if (pressedKeys.has('a')) {
    target.x -= 1;
  }

  if (pressedKeys.has('d')) {
    target.x += 1;
  }

  if (target.lengthSq() > 0) {
    target.normalize();
  }

  return target;
};

const getYawForDirection = (direction: THREE.Vector3): number => Math.atan2(direction.x, -direction.z);

const rotateToward = (object: THREE.Object3D, targetYaw: number, deltaSeconds: number): void => {
  const currentYaw = object.rotation.y;
  const deltaYaw = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  object.rotation.y = currentYaw + deltaYaw * Math.min(1, playerMovementSettings.rotationSnapSpeed * deltaSeconds);
};

export const createPlayerController = ({ collisionWorld }: PlayerControllerOptions = {}): PlayerController => {
  const object = createPlayerMesh();
  const pressedKeys = new Set<string>();
  const velocity = new THREE.Vector3();
  const inputDirection = new THREE.Vector3();
  let lastCollisionHits: string[] = [];
  let hitBoundsLastFrame = false;

  const resetToSpawn = (): void => {
    object.position.copy(spawnPosition);
    object.rotation.set(0, 0, 0);
    velocity.set(0, 0, 0);
    lastCollisionHits = [];
    hitBoundsLastFrame = false;
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (movementKeys.has(key)) {
      pressedKeys.add(key);
    }

    if (key === 'r') {
      resetToSpawn();
    }
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.key.toLowerCase());
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  resetToSpawn();

  return {
    object,
    update(deltaSeconds) {
      const stepSeconds = Math.min(deltaSeconds, playerMovementSettings.maxDeltaSeconds);
      getInputDirection(pressedKeys, inputDirection);

      if (inputDirection.lengthSq() > 0) {
        velocity.addScaledVector(inputDirection, playerMovementSettings.acceleration * stepSeconds);

        if (velocity.length() > playerMovementSettings.maxSpeed) {
          velocity.setLength(playerMovementSettings.maxSpeed);
        }
      } else {
        applyDeceleration(velocity, stepSeconds);
      }

      object.position.addScaledVector(velocity, stepSeconds);
      object.position.y = groundedY;

      if (collisionWorld) {
        const resolution = resolvePlayerCollision(
          object.position,
          collisionWorld,
          playerMovementSettings.radius,
        );

        object.position.copy(resolution.position);
        lastCollisionHits = resolution.hitIds;
        hitBoundsLastFrame = resolution.hitBounds;

        if (Math.abs(resolution.correction.x) > 0) {
          velocity.x = 0;
        }

        if (Math.abs(resolution.correction.z) > 0) {
          velocity.z = 0;
        }
      }

      if (velocity.lengthSq() > 0.001) {
        rotateToward(object, getYawForDirection(velocity), stepSeconds);
      }
    },
    resetToSpawn,
    getState(): PlayerState {
      return {
        position: object.position.clone(),
        speed: velocity.length(),
        grounded: object.position.y === groundedY,
        hitBounds: hitBoundsLastFrame,
        collisionHits: [...lastCollisionHits],
      };
    },
    dispose() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
  };
};
