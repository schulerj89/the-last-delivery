import * as THREE from 'three';
import { resolveGroundHeightAtPosition, resolvePlayerCollision } from '../collision';
import type { PlayerController, PlayerControllerOptions, PlayerMovementSettings, PlayerState } from './types';
import { createPlayerVisual } from './playerVisual';
import { playerSpawnPosition } from '../../world/villageDefinition';

const spawnPosition = new THREE.Vector3(...playerSpawnPosition);

export const playerMovementSettings: PlayerMovementSettings = {
  radius: 0.38,
  maxSpeed: 3.5,
  acceleration: 9,
  deceleration: 11,
  rotationSnapSpeed: 14,
  maxDeltaSeconds: 0.05,
};

const movementKeys = new Set(['w', 'a', 's', 'd']);

export const resolveMovementBasis = (
  movementBasisProvider: PlayerControllerOptions['movementBasisProvider'] | undefined,
  forward: THREE.Vector3,
  right: THREE.Vector3,
): void => {
  if (movementBasisProvider) {
    movementBasisProvider(forward, right);
    forward.y = 0;
    right.y = 0;
  } else {
    forward.set(0, 0, -1);
    right.set(1, 0, 0);
  }

  if (forward.lengthSq() > 0.0001) {
    forward.normalize();
  } else {
    forward.set(0, 0, -1);
  }

  if (right.lengthSq() > 0.0001) {
    right.normalize();
  } else {
    right.set(-forward.z, 0, forward.x).normalize();
  }
};

export const resolveMovementBasisFromCameraYaw = (
  cameraYaw: number,
  forward: THREE.Vector3,
  right: THREE.Vector3,
): void => {
  if (!Number.isFinite(cameraYaw)) {
    forward.set(0, 0, -1);
    right.set(1, 0, 0);
    return;
  }

  forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
  right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)).normalize();
};

const applyDeceleration = (velocity: THREE.Vector3, deltaSeconds: number): void => {
  const speed = velocity.length();

  if (speed === 0) {
    return;
  }

  const nextSpeed = Math.max(0, speed - playerMovementSettings.deceleration * deltaSeconds);
  velocity.multiplyScalar(nextSpeed / speed);
};

export const resolvePlayerInputDirection = (
  pressedKeys: ReadonlySet<string>,
  target: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
): THREE.Vector3 => {
  target.set(0, 0, 0);

  if (pressedKeys.has('w')) {
    target.add(forward);
  }

  if (pressedKeys.has('s')) {
    target.sub(forward);
  }

  if (pressedKeys.has('a')) {
    target.sub(right);
  }

  if (pressedKeys.has('d')) {
    target.add(right);
  }

  if (target.lengthSq() > 0) {
    target.normalize();
  }

  return target;
};

export const getPlayerYawForDirection = (direction: THREE.Vector3): number => (
  Math.atan2(-direction.x, -direction.z)
);

const rotateToward = (object: THREE.Object3D, targetYaw: number, deltaSeconds: number): void => {
  const currentYaw = object.rotation.y;
  const deltaYaw = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  object.rotation.y = currentYaw + deltaYaw * Math.min(1, playerMovementSettings.rotationSnapSpeed * deltaSeconds);
};

export const createPlayerController = ({
  collisionWorld,
  movementBasisProvider,
}: PlayerControllerOptions = {}): PlayerController => {
  const visual = createPlayerVisual(console, {
    collisionRadius: playerMovementSettings.radius,
    debugEnabled: import.meta.env.DEV,
  });
  const object = visual.object;
  const pressedKeys = new Set<string>();
  const velocity = new THREE.Vector3();
  const inputDirection = new THREE.Vector3();
  const movementForward = new THREE.Vector3();
  const movementRight = new THREE.Vector3();
  let lastCollisionHits: string[] = [];
  let hitBoundsLastFrame = false;
  let currentGroundY = resolveGroundHeightAtPosition(spawnPosition, collisionWorld, playerMovementSettings.radius);

  const resolvePlayerGroundY = (): number => (
    resolveGroundHeightAtPosition(object.position, collisionWorld, playerMovementSettings.radius)
  );

  const snapToGround = (): void => {
    currentGroundY = resolvePlayerGroundY();
    object.position.y = currentGroundY;
  };

  const resetToSpawn = (): void => {
    object.position.copy(spawnPosition);
    snapToGround();
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

    if (!import.meta.env.DEV) {
      return;
    }

    if (event.key === 'F6') {
      visual.forceFallbackVisual();
      event.preventDefault();
    } else if (event.key === 'F7') {
      visual.forceCharacterVisual();
      event.preventDefault();
    } else if (event.key === 'F8') {
      visual.showAllCharacterMeshes();
      event.preventDefault();
    } else if (event.key === 'F9') {
      visual.showConfiguredCharacterMeshes();
      event.preventDefault();
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
      resolveMovementBasis(movementBasisProvider, movementForward, movementRight);
      resolvePlayerInputDirection(pressedKeys, inputDirection, movementForward, movementRight);

      if (inputDirection.lengthSq() > 0) {
        velocity.addScaledVector(inputDirection, playerMovementSettings.acceleration * stepSeconds);

        if (velocity.length() > playerMovementSettings.maxSpeed) {
          velocity.setLength(playerMovementSettings.maxSpeed);
        }
      } else {
        applyDeceleration(velocity, stepSeconds);
      }

      object.position.addScaledVector(velocity, stepSeconds);
      snapToGround();

      if (collisionWorld) {
        const resolution = resolvePlayerCollision(
          object.position,
          collisionWorld,
          playerMovementSettings.radius,
        );

        object.position.copy(resolution.position);
        snapToGround();
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
        rotateToward(object, getPlayerYawForDirection(velocity), stepSeconds);
      }

      visual.update(stepSeconds, velocity.length());
    },
    resetToSpawn,
    getState(): PlayerState {
      return {
        position: object.position.clone(),
        speed: velocity.length(),
        grounded: Math.abs(object.position.y - currentGroundY) < 0.001,
        hitBounds: hitBoundsLastFrame,
        collisionHits: [...lastCollisionHits],
        visualStatus: visual.getStatus(),
      };
    },
    getVisualStatus() {
      return visual.getStatus();
    },
    dispose() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      visual.dispose();
    },
  };
};
