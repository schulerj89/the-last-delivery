import * as THREE from 'three';
import type { WorldObjectDefinition } from './types';
import { deliveryBoardObject, tryGetWorldObject } from './villageDefinition';

export const objectiveMarkerSettings = {
  bobAmplitude: 0.12,
  bobSpeed: 2.6,
  haloPulseAmplitude: 0.06,
  haloPulseSpeed: 2.2,
  rotationSpeed: 1.25,
  verticalClearance: 0.68,
};

const fullTurnRadians = Math.PI * 2;

const createObjectiveMarker = (
  name: string,
  position: THREE.Vector3Tuple,
  color: number,
): THREE.Group => {
  const marker = new THREE.Group();
  marker.name = name;
  marker.userData.label = marker.name;
  marker.userData.baseY = position[1];
  marker.position.set(...position);
  marker.visible = false;
  marker.renderOrder = 20;

  const material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
  });

  const haloMaterial = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.72,
  });

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42),
    material,
  );
  diamond.name = `${name}:diamond`;
  diamond.userData.label = diamond.name;
  diamond.renderOrder = 20;
  marker.add(diamond);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.035, 8, 28),
    haloMaterial,
  );
  halo.name = `${name}:halo`;
  halo.userData.label = halo.name;
  halo.rotation.x = Math.PI / 2;
  halo.renderOrder = 20;
  marker.add(halo);

  return marker;
};

const getObjectRenderTransform = (object: WorldObjectDefinition): {
  scaleMultiplier: number;
  yOffset: number;
} => {
  const renderSettings = object.render?.mode === 'asset' ? object.render : undefined;

  return {
    scaleMultiplier: Math.max(
      renderSettings?.scaleMultiplier ?? object.layoutTransform?.scaleMultiplier ?? 1,
      0.001,
    ),
    yOffset: renderSettings?.yOffset ?? object.layoutTransform?.yOffset ?? 0,
  };
};

const getObjectiveAnchorPosition = (object: WorldObjectDefinition): THREE.Vector3Tuple => (
  [
    object.position[0],
    Math.max(
      object.objectiveAnchor?.position[1] ?? Number.NEGATIVE_INFINITY,
      object.position[1]
        + getObjectRenderTransform(object).yOffset
        + (object.dimensions?.[1] ?? 1.6) * getObjectRenderTransform(object).scaleMultiplier
        + objectiveMarkerSettings.verticalClearance,
    ),
    object.position[2],
  ]
);

export const tryResolveObjectiveAnchorForWorldObject = (
  worldObjectId: string,
): THREE.Vector3Tuple | null => {
  const object = tryGetWorldObject(worldObjectId);

  return object ? getObjectiveAnchorPosition(object) : null;
};

export const resolveObjectiveAnchorForWorldObject = (worldObjectId: string): THREE.Vector3Tuple => (
  tryResolveObjectiveAnchorForWorldObject(worldObjectId) ?? [0, 2, 0]
);

export const setObjectiveMarkerTarget = (
  marker: THREE.Object3D,
  worldObjectId: string | null,
): boolean => {
  if (!worldObjectId) {
    marker.userData.targetWorldObjectId = null;
    return false;
  }

  const position = tryResolveObjectiveAnchorForWorldObject(worldObjectId);

  if (!position) {
    marker.userData.targetWorldObjectId = null;
    return false;
  }

  marker.position.set(...position);
  marker.userData.baseY = position[1];
  marker.userData.targetWorldObjectId = worldObjectId;
  return true;
};

export const createDeliveryBoardObjectiveMarker = (): THREE.Group => {
  const marker = createObjectiveMarker(
    'objective:delivery-board',
    deliveryBoardObject ? getObjectiveAnchorPosition(deliveryBoardObject) : [0, 2, 0],
    0x7cf2cf,
  );
  marker.userData.targetWorldObjectId = deliveryBoardObject?.id ?? null;
  return marker;
};

export const createDeliveryTargetObjectiveMarker = (): THREE.Group => (
  createObjectiveMarker('objective:delivery-target', [0, 2, 0], 0xffe45c)
);

export const updateObjectiveMarker = (marker: THREE.Object3D, elapsedSeconds: number): void => {
  const baseY = typeof marker.userData.baseY === 'number' ? marker.userData.baseY : marker.position.y;
  marker.position.y = baseY + Math.sin(elapsedSeconds * objectiveMarkerSettings.bobSpeed) * objectiveMarkerSettings.bobAmplitude;

  const spinRadians = (elapsedSeconds * objectiveMarkerSettings.rotationSpeed) % fullTurnRadians;
  const haloScale = 1
    + Math.sin(elapsedSeconds * objectiveMarkerSettings.haloPulseSpeed) * objectiveMarkerSettings.haloPulseAmplitude;
  const diamond = marker.getObjectByName(`${marker.name}:diamond`);
  const halo = marker.getObjectByName(`${marker.name}:halo`);

  marker.rotation.set(0, 0, 0);

  if (diamond) {
    diamond.rotation.y = spinRadians;
  }

  if (halo) {
    halo.rotation.set(Math.PI / 2, 0, -spinRadians * 0.5);
    halo.scale.setScalar(haloScale);
  }
};
