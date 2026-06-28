import * as THREE from 'three';

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

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28),
    new THREE.MeshBasicMaterial({ color }),
  );
  diamond.name = `${name}:diamond`;
  diamond.userData.label = diamond.name;
  marker.add(diamond);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  stem.name = `${name}:stem`;
  stem.userData.label = stem.name;
  stem.position.y = -0.42;
  marker.add(stem);

  return marker;
};

export const createDeliveryBoardObjectiveMarker = (): THREE.Group => (
  createObjectiveMarker('objective:delivery-board', [4.85, 2.35, -3.2], 0x7cf2cf)
);

export const createMailboxObjectiveMarker = (): THREE.Group => (
  createObjectiveMarker('objective:mailbox', [-4.2, 2.15, 2.8], 0xffe45c)
);

export const updateObjectiveMarker = (marker: THREE.Object3D, elapsedSeconds: number): void => {
  const baseY = typeof marker.userData.baseY === 'number' ? marker.userData.baseY : marker.position.y;
  marker.position.y = baseY + Math.sin(elapsedSeconds * 3) * 0.08;
  marker.rotation.y = elapsedSeconds * 1.6;
};
