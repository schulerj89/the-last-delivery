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
  crate: new THREE.MeshStandardMaterial({ color: 0x9a6435, roughness: 0.85 }),
  crateStrap: new THREE.MeshStandardMaterial({ color: 0x5a3826, roughness: 0.8 }),
  mailbox: new THREE.MeshStandardMaterial({ color: 0x2d7bc0, roughness: 0.5 }),
  mailboxDoor: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.45 }),
  mailboxFlag: new THREE.MeshStandardMaterial({ color: 0xe85c42, roughness: 0.45 }),
  board: new THREE.MeshStandardMaterial({ color: 0x164338, roughness: 0.65 }),
  boardFrame: new THREE.MeshStandardMaterial({ color: 0xf0ca72, roughness: 0.65 }),
  boardPaper: new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: 0.75 }),
  boardPin: new THREE.MeshStandardMaterial({ color: 0xef5d45, roughness: 0.5 }),
  interactablePad: new THREE.MeshStandardMaterial({ color: 0x3baea3, roughness: 0.8 }),
  spawnPad: new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.75 }),
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

const addGroundRing = (
  group: THREE.Group,
  name: string,
  radius: number,
  tubeRadius: number,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tubeRadius, 8, 36), material);
  ring.name = name;
  ring.userData.label = name;
  ring.position.set(...position);
  ring.rotation.x = Math.PI / 2;
  ring.receiveShadow = true;
  group.add(ring);
  return ring;
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
  addBox(group, 'playground:crate-large-strap', [1.04, 0.08, 1.04], [2.35, 0.78, 1.65], materials.crateStrap);
  addBox(group, 'playground:crate-small-a', [0.7, 0.7, 0.7], [3.15, 0.35, 0.8], materials.crate);
  addBox(group, 'playground:crate-small-a-strap', [0.74, 0.06, 0.74], [3.15, 0.56, 0.8], materials.crateStrap);
  addBox(group, 'playground:crate-small-b', [0.7, 0.7, 0.7], [2.75, 1.05, 1.55], materials.crate);
  addBox(group, 'playground:crate-small-b-strap', [0.74, 0.06, 0.74], [2.75, 1.26, 1.55], materials.crateStrap);
};

const addMailbox = (group: THREE.Group): void => {
  addGroundRing(group, 'playground:mailbox-interaction-ring', 0.72, 0.025, [-3.3, 0.035, 2.8], materials.interactablePad);
  addBox(group, 'playground:mailbox-post', [0.16, 0.9, 0.16], [-4.2, 0.45, 2.8], materials.fence);
  addBox(group, 'playground:mailbox-box', [0.85, 0.42, 0.5], [-4.2, 1.03, 2.8], materials.mailbox);
  addBox(group, 'playground:mailbox-door-highlight', [0.08, 0.28, 0.36], [-4.64, 1.03, 2.8], materials.mailboxDoor);
  addBox(group, 'playground:mailbox-flag', [0.08, 0.38, 0.46], [-3.74, 1.19, 2.8], materials.mailboxFlag);
};

const addDeliveryBoard = (group: THREE.Group): void => {
  addGroundRing(group, 'playground:delivery-board-interaction-ring', 0.85, 0.025, [3.6, 0.035, -3.2], materials.interactablePad);
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
    'playground:delivery-board-note-large',
    [0.55, 0.34, 0.14],
    [4.58, 1.26, -3.12],
    materials.boardPaper,
  );
  addBox(
    group,
    'playground:delivery-board-note-small',
    [0.42, 0.24, 0.14],
    [5.12, 1.19, -3.12],
    materials.boardPaper,
  );
  addBox(
    group,
    'playground:delivery-board-note-pin',
    [0.12, 0.12, 0.16],
    [4.58, 1.44, -3.1],
    materials.boardPin,
  );
};

const addSpawnMarker = (group: THREE.Group): void => {
  addGroundRing(group, 'playground:player-spawn-ring', 0.58, 0.025, [0, 0.035, 2.5], materials.spawnPad);
  addBox(group, 'playground:player-spawn-forward-arrow', [0.18, 0.04, 0.52], [0, 0.045, 2.12], materials.spawnPad);
};

export const createPlayground = (): THREE.Group => {
  const playground = nameObject(new THREE.Group(), 'playground:movement-blockout');

  addGround(playground);
  addFence(playground);
  addSpawnMarker(playground);
  addRamp(playground);
  addCrates(playground);
  addMailbox(playground);
  addDeliveryBoard(playground);

  return playground;
};
