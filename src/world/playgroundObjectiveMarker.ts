import * as THREE from 'three';

export const createMailboxObjectiveMarker = (): THREE.Group => {
  const marker = new THREE.Group();
  marker.name = 'objective:mailbox';
  marker.userData.label = marker.name;
  marker.position.set(-4.2, 2.15, 2.8);
  marker.visible = false;

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28),
    new THREE.MeshBasicMaterial({ color: 0xffe45c }),
  );
  diamond.name = 'objective:mailbox-diamond';
  diamond.userData.label = diamond.name;
  marker.add(diamond);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe45c }),
  );
  stem.name = 'objective:mailbox-stem';
  stem.userData.label = stem.name;
  stem.position.y = -0.42;
  marker.add(stem);

  return marker;
};
