import * as THREE from 'three';
import type {
  ThirdPersonCameraController,
  ThirdPersonCameraOptions,
  ThirdPersonCameraSettings,
  ThirdPersonCameraState,
} from './types';

export const thirdPersonCameraSettings: ThirdPersonCameraSettings = {
  distance: 7.25,
  minDistance: 2.75,
  maxDistance: 11.5,
  minPitch: THREE.MathUtils.degToRad(12),
  maxPitch: THREE.MathUtils.degToRad(62),
  initialYaw: THREE.MathUtils.degToRad(45),
  initialPitch: THREE.MathUtils.degToRad(34),
  orbitSensitivity: 0.006,
  zoomSensitivity: 0.003,
  positionSmoothness: 12,
  targetSmoothness: 16,
  zoomSmoothness: 18,
  targetOffset: new THREE.Vector3(0, 0.85, 0),
};

export const clampCameraDistance = (
  distance: number,
  settings = thirdPersonCameraSettings,
): number => THREE.MathUtils.clamp(distance, settings.minDistance, settings.maxDistance);

export const getZoomedCameraDistance = (
  currentDistance: number,
  wheelDeltaY: number,
  settings = thirdPersonCameraSettings,
): number => clampCameraDistance(
  currentDistance + wheelDeltaY * settings.zoomSensitivity,
  settings,
);

const getSmoothingAlpha = (smoothness: number, deltaSeconds: number): number => (
  1 - Math.exp(-smoothness * deltaSeconds)
);

const getCameraOffset = (
  yaw: number,
  pitch: number,
  distance: number,
  target: THREE.Vector3,
): THREE.Vector3 => {
  const horizontalDistance = Math.cos(pitch) * distance;
  target.set(
    Math.sin(yaw) * horizontalDistance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * horizontalDistance,
  );
  return target;
};

export const createThirdPersonCameraController = ({
  camera,
  target,
  domElement,
  settings = thirdPersonCameraSettings,
}: ThirdPersonCameraOptions): ThirdPersonCameraController => {
  let yaw = settings.initialYaw;
  let pitch = settings.initialPitch;
  let targetDistance = clampCameraDistance(settings.distance, settings);
  let currentDistance = targetDistance;
  let isOrbiting = false;
  let pointerId: number | null = null;

  const desiredTarget = new THREE.Vector3();
  const smoothedTarget = new THREE.Vector3();
  const desiredPosition = new THREE.Vector3();
  const offset = new THREE.Vector3();

  const snapToTarget = (): void => {
    desiredTarget.copy(target.position).add(settings.targetOffset);
    smoothedTarget.copy(desiredTarget);
    desiredPosition.copy(desiredTarget).add(getCameraOffset(yaw, pitch, currentDistance, offset));
    camera.position.copy(desiredPosition);
    camera.lookAt(smoothedTarget);
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }

    isOrbiting = true;
    pointerId = event.pointerId;
    domElement.setPointerCapture(pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isOrbiting || event.pointerId !== pointerId) {
      return;
    }

    yaw -= event.movementX * settings.orbitSensitivity;
    pitch = THREE.MathUtils.clamp(
      pitch - event.movementY * settings.orbitSensitivity,
      settings.minPitch,
      settings.maxPitch,
    );
  };

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    targetDistance = getZoomedCameraDistance(targetDistance, event.deltaY, settings);
  };

  const stopOrbiting = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) {
      return;
    }

    if (domElement.hasPointerCapture(pointerId)) {
      domElement.releasePointerCapture(pointerId);
    }

    isOrbiting = false;
    pointerId = null;
  };

  domElement.addEventListener('pointerdown', handlePointerDown);
  domElement.addEventListener('pointermove', handlePointerMove);
  domElement.addEventListener('pointerup', stopOrbiting);
  domElement.addEventListener('pointercancel', stopOrbiting);
  domElement.addEventListener('wheel', handleWheel, { passive: false });
  snapToTarget();

  return {
    camera,
    update(deltaSeconds) {
      currentDistance = THREE.MathUtils.lerp(
        currentDistance,
        targetDistance,
        getSmoothingAlpha(settings.zoomSmoothness, deltaSeconds),
      );
      desiredTarget.copy(target.position).add(settings.targetOffset);
      desiredPosition.copy(desiredTarget).add(getCameraOffset(yaw, pitch, currentDistance, offset));

      smoothedTarget.lerp(desiredTarget, getSmoothingAlpha(settings.targetSmoothness, deltaSeconds));
      camera.position.lerp(desiredPosition, getSmoothingAlpha(settings.positionSmoothness, deltaSeconds));
      camera.lookAt(smoothedTarget);
    },
    getState(): ThirdPersonCameraState {
      return {
        yaw,
        pitch,
        distance: currentDistance,
      };
    },
    dispose() {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', stopOrbiting);
      domElement.removeEventListener('pointercancel', stopOrbiting);
      domElement.removeEventListener('wheel', handleWheel);
    },
  };
};
