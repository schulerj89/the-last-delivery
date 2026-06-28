import * as THREE from 'three';
import type { WorldObjectDefinition } from './types';
import { deliveryBoardObject, getWorldObject } from './villageDefinition';

export const objectiveMarkerSettings = {
  bobAmplitude: 0.12,
  bobSpeed: 2.6,
  rotationSpeed: 1.25,
};

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
  halo.renderOrder = 20;
  marker.add(halo);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.62, 8),
    material,
  );
  stem.name = `${name}:stem`;
  stem.userData.label = stem.name;
  stem.position.y = -0.56;
  stem.renderOrder = 20;
  marker.add(stem);

  return marker;
};

const getObjectiveAnchorPosition = (object: WorldObjectDefinition): THREE.Vector3Tuple => {
  if (!object.objectiveAnchor) {
    throw new Error(`Missing objective anchor for world object: ${object.id}`);
  }

  return object.objectiveAnchor.position;
};

export const resolveObjectiveAnchorForWorldObject = (worldObjectId: string): THREE.Vector3Tuple => (
  getObjectiveAnchorPosition(getWorldObject(worldObjectId))
);

export const setObjectiveMarkerTarget = (
  marker: THREE.Object3D,
  worldObjectId: string | null,
): boolean => {
  if (!worldObjectId) {
    marker.userData.targetWorldObjectId = null;
    return false;
  }

  if (marker.userData.targetWorldObjectId === worldObjectId) {
    return true;
  }

  const position = resolveObjectiveAnchorForWorldObject(worldObjectId);
  marker.position.set(...position);
  marker.userData.baseY = position[1];
  marker.userData.targetWorldObjectId = worldObjectId;
  return true;
};

export const createDeliveryBoardObjectiveMarker = (): THREE.Group => (
  createObjectiveMarker('objective:delivery-board', getObjectiveAnchorPosition(deliveryBoardObject), 0x7cf2cf)
);

export const createDeliveryTargetObjectiveMarker = (): THREE.Group => (
  createObjectiveMarker('objective:delivery-target', [0, 2, 0], 0xffe45c)
);

export const updateObjectiveMarker = (marker: THREE.Object3D, elapsedSeconds: number): void => {
  const baseY = typeof marker.userData.baseY === 'number' ? marker.userData.baseY : marker.position.y;
  marker.position.y = baseY + Math.sin(elapsedSeconds * objectiveMarkerSettings.bobSpeed) * objectiveMarkerSettings.bobAmplitude;
  marker.rotation.y = elapsedSeconds * objectiveMarkerSettings.rotationSpeed;
};
