import * as THREE from 'three';

const yardWidth = 12;
const yardDepth = 10;
const fenceHeight = 1;
const fenceRailThickness = 0.12;
const fencePostThickness = 0.18;

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x38473d, roughness: 0.9 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x8d7657, roughness: 0.75 }),
  ramp: new THREE.MeshStandardMaterial({ color: 0x6f7f88, roughness: 0.65 }),
  crate: new THREE.MeshStandardMaterial({ color: 0xb27a42, roughness: 0.8 }),
  mailbox: new THREE.MeshStandardMaterial({ color: 0x426f9c, roughness: 0.55 }),
  mailboxFlag: new THREE.MeshStandardMaterial({ color: 0xd95b43, roughness: 0.5 }),
  board: new THREE.MeshStandardMaterial({ color: 0x25364a, roughness: 0.7 }),
  boardFrame: new THREE.MeshStandardMaterial({ color: 0xd7c28d, roughness: 0.7 }),
};

const nameObject = <T extends THREE.Object3D>(object: T, name: string): T => {
  object.name = name;
  object.userData.label = name;
  return object;
};

const createBox = (
  name: string,
  size: THREE.Vector3Tuple,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return nameObject(mesh, name);
};

const addBox = (
  group: THREE.Group,
  name: string,
  size: THREE.Vector3Tuple,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const mesh = createBox(name, size, position, material);
  group.add(mesh);
  return mesh;
};

const addGround = (group: THREE.Group): void => {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(yardWidth, yardDepth),
    materials.ground,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(nameObject(ground, 'playground:ground'));
};

const addFence = (group: THREE.Group): void => {
  const halfWidth = yardWidth / 2;
  const halfDepth = yardDepth / 2;
  const postY = fenceHeight / 2;
  const postSpacing = 2;

  for (let x = -halfWidth; x <= halfWidth; x += postSpacing) {
    const postIndex = Math.round((x + halfWidth) / postSpacing);
    addBox(
      group,
      `playground:fence-post-north-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, -halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `playground:fence-post-south-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, halfDepth],
      materials.fence,
    );
  }

  for (let z = -halfDepth + postSpacing; z <= halfDepth - postSpacing; z += postSpacing) {
    const postIndex = Math.round((z + halfDepth) / postSpacing);
    addBox(
      group,
      `playground:fence-post-west-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [-halfWidth, postY, z],
      materials.fence,
    );
    addBox(
      group,
      `playground:fence-post-east-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [halfWidth, postY, z],
      materials.fence,
    );
  }

  const railYPositions = [0.35, 0.75];
  railYPositions.forEach((y, index) => {
    const railName = index === 0 ? 'low' : 'high';
    addBox(
      group,
      `playground:fence-rail-north-${railName}`,
      [yardWidth, fenceRailThickness, fenceRailThickness],
      [0, y, -halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `playground:fence-rail-south-${railName}`,
      [yardWidth, fenceRailThickness, fenceRailThickness],
      [0, y, halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `playground:fence-rail-west-${railName}`,
      [fenceRailThickness, fenceRailThickness, yardDepth],
      [-halfWidth, y, 0],
      materials.fence,
    );
    addBox(
      group,
      `playground:fence-rail-east-${railName}`,
      [fenceRailThickness, fenceRailThickness, yardDepth],
      [halfWidth, y, 0],
      materials.fence,
    );
  });
};

const addRamp = (group: THREE.Group): void => {
  const ramp = addBox(
    group,
    'playground:ramp',
    [2.8, 0.25, 2.4],
    [-1.6, 0.18, -0.8],
    materials.ramp,
  );
  ramp.rotation.x = THREE.MathUtils.degToRad(-15);
};

const addCrates = (group: THREE.Group): void => {
  addBox(group, 'playground:crate-large', [1, 1, 1], [2.35, 0.5, 1.65], materials.crate);
  addBox(group, 'playground:crate-small-a', [0.7, 0.7, 0.7], [3.15, 0.35, 0.8], materials.crate);
  addBox(group, 'playground:crate-small-b', [0.7, 0.7, 0.7], [2.75, 1.05, 1.55], materials.crate);
};

const addMailbox = (group: THREE.Group): void => {
  addBox(group, 'playground:mailbox-post', [0.16, 0.9, 0.16], [-4.2, 0.45, 2.8], materials.fence);
  addBox(group, 'playground:mailbox-box', [0.85, 0.42, 0.5], [-4.2, 1.03, 2.8], materials.mailbox);
  addBox(group, 'playground:mailbox-flag', [0.08, 0.32, 0.42], [-3.74, 1.14, 2.8], materials.mailboxFlag);
};

const addDeliveryBoard = (group: THREE.Group): void => {
  addBox(group, 'playground:delivery-board-left-post', [0.16, 1.8, 0.16], [4.25, 0.9, -3.2], materials.boardFrame);
  addBox(group, 'playground:delivery-board-right-post', [0.16, 1.8, 0.16], [5.45, 0.9, -3.2], materials.boardFrame);
  addBox(group, 'playground:delivery-board-panel', [1.55, 1, 0.12], [4.85, 1.3, -3.2], materials.board);
  addBox(
    group,
    'playground:delivery-board-header-placeholder',
    [1.25, 0.12, 0.14],
    [4.85, 1.62, -3.12],
    materials.boardFrame,
  );
  addBox(
    group,
    'playground:delivery-board-note-placeholder',
    [0.9, 0.1, 0.14],
    [4.85, 1.25, -3.12],
    materials.boardFrame,
  );
};

export const createPlayground = (): THREE.Group => {
  const playground = nameObject(new THREE.Group(), 'playground:movement-blockout');

  addGround(playground);
  addFence(playground);
  addRamp(playground);
  addCrates(playground);
  addMailbox(playground);
  addDeliveryBoard(playground);

  return playground;
};
