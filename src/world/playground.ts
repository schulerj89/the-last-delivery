import * as THREE from 'three';

const villageWidth = 18;
const villageDepth = 14;
const fenceHeight = 1;
const fenceRailThickness = 0.12;
const fencePostThickness = 0.18;

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x38473d, roughness: 0.9 }),
  path: new THREE.MeshStandardMaterial({ color: 0x8a7861, roughness: 0.95 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x8d7657, roughness: 0.75 }),
  ramp: new THREE.MeshStandardMaterial({ color: 0x6f7f88, roughness: 0.65 }),
  crate: new THREE.MeshStandardMaterial({ color: 0x9a6435, roughness: 0.85 }),
  crateStrap: new THREE.MeshStandardMaterial({ color: 0x5a3826, roughness: 0.8 }),
  barrel: new THREE.MeshStandardMaterial({ color: 0x7c4f34, roughness: 0.82 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x68716d, roughness: 0.9 }),
  houseWall: new THREE.MeshStandardMaterial({ color: 0xb9a178, roughness: 0.85 }),
  houseRoof: new THREE.MeshStandardMaterial({ color: 0x6d3d35, roughness: 0.8 }),
  houseDoor: new THREE.MeshStandardMaterial({ color: 0x4f3428, roughness: 0.75 }),
  houseWindow: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.45 }),
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

const addSurface = (
  group: THREE.Group,
  name: string,
  size: THREE.Vector3Tuple,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
  rotationY = 0,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.userData.label = name;
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.receiveShadow = true;
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

const addCylinder = (
  group: THREE.Group,
  name: string,
  radius: number,
  height: number,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
  mesh.name = name;
  mesh.userData.label = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

const addRock = (
  group: THREE.Group,
  name: string,
  position: THREE.Vector3Tuple,
  scale: THREE.Vector3Tuple,
): THREE.Mesh => {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), materials.rock);
  rock.name = name;
  rock.userData.label = name;
  rock.position.set(...position);
  rock.scale.set(...scale);
  rock.rotation.set(0.18, 0.45, -0.1);
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);
  return rock;
};

const addGround = (group: THREE.Group): void => {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(villageWidth, villageDepth),
    materials.ground,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(nameObject(ground, 'village:ground'));
};

const addFence = (group: THREE.Group): void => {
  const halfWidth = villageWidth / 2;
  const halfDepth = villageDepth / 2;
  const postY = fenceHeight / 2;
  const postSpacing = 2;

  for (let x = -halfWidth; x <= halfWidth; x += postSpacing) {
    const postIndex = Math.round((x + halfWidth) / postSpacing);
    addBox(
      group,
      `village:boundary-post-north-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, -halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-post-south-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, halfDepth],
      materials.fence,
    );
  }

  for (let z = -halfDepth + postSpacing; z <= halfDepth - postSpacing; z += postSpacing) {
    const postIndex = Math.round((z + halfDepth) / postSpacing);
    addBox(
      group,
      `village:boundary-post-west-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [-halfWidth, postY, z],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-post-east-${postIndex}`,
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
      `village:boundary-rail-north-${railName}`,
      [villageWidth, fenceRailThickness, fenceRailThickness],
      [0, y, -halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-south-${railName}`,
      [villageWidth, fenceRailThickness, fenceRailThickness],
      [0, y, halfDepth],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-west-${railName}`,
      [fenceRailThickness, fenceRailThickness, villageDepth],
      [-halfWidth, y, 0],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-east-${railName}`,
      [fenceRailThickness, fenceRailThickness, villageDepth],
      [halfWidth, y, 0],
      materials.fence,
    );
  });
};

const addPathSegment = (
  group: THREE.Group,
  name: string,
  start: THREE.Vector2,
  end: THREE.Vector2,
  width: number,
): void => {
  const delta = new THREE.Vector2().subVectors(end, start);
  const length = delta.length();
  const center = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
  const rotationY = -Math.atan2(delta.y, delta.x);

  addSurface(
    group,
    name,
    [length, 0.04, width],
    [center.x, 0.025, center.y],
    materials.path,
    rotationY,
  );
};

const addPaths = (group: THREE.Group): void => {
  addPathSegment(
    group,
    'village:main-path-delivery-route',
    new THREE.Vector2(-3.3, 2.8),
    new THREE.Vector2(3.6, -3.2),
    1.35,
  );
  addPathSegment(
    group,
    'village:side-path-spawn-connector',
    new THREE.Vector2(0, 2.5),
    new THREE.Vector2(-1.65, 1.35),
    1.05,
  );
};

const addHouse = (
  group: THREE.Group,
  name: string,
  position: THREE.Vector2,
  size: THREE.Vector3Tuple,
): void => {
  const [width, height, depth] = size;

  addBox(
    group,
    `${name}:body`,
    size,
    [position.x, height / 2, position.y],
    materials.houseWall,
  );

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 0.78, 4),
    materials.houseRoof,
  );
  roof.name = `${name}:roof`;
  roof.userData.label = roof.name;
  roof.position.set(position.x, height + 0.38, position.y);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  addBox(
    group,
    `${name}:door`,
    [0.38, 0.72, 0.06],
    [position.x, 0.36, position.y + depth / 2 + 0.04],
    materials.houseDoor,
  );
  addBox(
    group,
    `${name}:window-left`,
    [0.38, 0.34, 0.06],
    [position.x - width * 0.28, height * 0.66, position.y + depth / 2 + 0.05],
    materials.houseWindow,
  );
  addBox(
    group,
    `${name}:window-right`,
    [0.38, 0.34, 0.06],
    [position.x + width * 0.28, height * 0.66, position.y + depth / 2 + 0.05],
    materials.houseWindow,
  );
};

const addHouses = (group: THREE.Group): void => {
  addHouse(group, 'village:house-mail-lane', new THREE.Vector2(-6.4, 3.9), [2.3, 1.6, 2.1]);
  addHouse(group, 'village:house-north-square', new THREE.Vector2(-1.3, -5.1), [2.8, 1.6, 1.9]);
  addHouse(group, 'village:house-east-corner', new THREE.Vector2(6.6, 2.8), [2.2, 1.6, 2.4]);
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

const addVillageProps = (group: THREE.Group): void => {
  addCylinder(group, 'village:barrel-north-a', 0.26, 0.64, [1.6, 0.32, -4.4], materials.barrel);
  addCylinder(group, 'village:barrel-north-b', 0.24, 0.58, [2.12, 0.29, -4.15], materials.barrel);
  addRock(group, 'village:rock-west-boundary', [-7.2, 0.24, -0.9], [1.25, 0.72, 0.9]);
  addRock(group, 'village:rock-east-boundary', [7.4, 0.2, -4.7], [0.9, 0.62, 1.1]);
  addRock(group, 'village:rock-south-corner', [5.8, 0.18, 5.35], [0.82, 0.56, 0.78]);
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
  const playground = nameObject(new THREE.Group(), 'village:square-blockout');

  addGround(playground);
  addPaths(playground);
  addFence(playground);
  addSpawnMarker(playground);
  addHouses(playground);
  addRamp(playground);
  addCrates(playground);
  addVillageProps(playground);
  addMailbox(playground);
  addDeliveryBoard(playground);

  return playground;
};
