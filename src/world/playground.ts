import * as THREE from 'three';
import { canLoadGltfAssets, loadModelInstance } from '../game/assets';
import type { WorldObjectDefinition } from './types';
import {
  deliveryBoardObject,
  getWorldObject,
  getWorldObjectsByKind,
  playerSpawnPosition,
} from './villageDefinition';

const villageWidth = 18;
const villageDepth = 14;
const fenceHeight = 1;
const fenceRailThickness = 0.12;
const fencePostThickness = 0.18;

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x38473d, roughness: 0.9 }),
  path: new THREE.MeshStandardMaterial({ color: 0xb59668, roughness: 0.95 }),
  sidePath: new THREE.MeshStandardMaterial({ color: 0x6f958e, roughness: 0.95 }),
  pathEdge: new THREE.MeshStandardMaterial({ color: 0xe7d3a1, roughness: 0.9 }),
  fence: new THREE.MeshStandardMaterial({ color: 0x8d7657, roughness: 0.75 }),
  crate: new THREE.MeshStandardMaterial({ color: 0x9a6435, roughness: 0.85 }),
  crateStrap: new THREE.MeshStandardMaterial({ color: 0x5a3826, roughness: 0.8 }),
  barrel: new THREE.MeshStandardMaterial({ color: 0x7c4f34, roughness: 0.82 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x68716d, roughness: 0.9 }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: 0x5d3c25, roughness: 0.86 }),
  treeCanopy: new THREE.MeshStandardMaterial({ color: 0x2f6f48, roughness: 0.9 }),
  bush: new THREE.MeshStandardMaterial({ color: 0x4f8a4f, roughness: 0.92 }),
  houseWall: new THREE.MeshStandardMaterial({ color: 0xb9a178, roughness: 0.85 }),
  houseWallBlue: new THREE.MeshStandardMaterial({ color: 0x4f88b8, roughness: 0.82 }),
  houseWallRed: new THREE.MeshStandardMaterial({ color: 0xb35d52, roughness: 0.82 }),
  houseWallGreen: new THREE.MeshStandardMaterial({ color: 0x7b9b68, roughness: 0.84 }),
  houseRoof: new THREE.MeshStandardMaterial({ color: 0x6d3d35, roughness: 0.8 }),
  houseRoofBlue: new THREE.MeshStandardMaterial({ color: 0x2b4f6d, roughness: 0.8 }),
  houseRoofRed: new THREE.MeshStandardMaterial({ color: 0x6f2f2b, roughness: 0.8 }),
  houseRoofGreen: new THREE.MeshStandardMaterial({ color: 0x3f5b3e, roughness: 0.82 }),
  houseDoor: new THREE.MeshStandardMaterial({ color: 0x4f3428, roughness: 0.75 }),
  houseWindow: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.45 }),
  wellStone: new THREE.MeshStandardMaterial({ color: 0x7a827d, roughness: 0.9 }),
  wellWater: new THREE.MeshStandardMaterial({ color: 0x347da3, roughness: 0.45 }),
  mailbox: new THREE.MeshStandardMaterial({ color: 0x1f8eea, roughness: 0.5 }),
  mailboxDoor: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.45 }),
  mailboxFlag: new THREE.MeshStandardMaterial({ color: 0xe85c42, roughness: 0.45 }),
  board: new THREE.MeshStandardMaterial({ color: 0x164338, roughness: 0.65 }),
  boardFrame: new THREE.MeshStandardMaterial({ color: 0xf0ca72, roughness: 0.65 }),
  boardPaper: new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: 0.75 }),
  boardPin: new THREE.MeshStandardMaterial({ color: 0xef5d45, roughness: 0.5 }),
  interactablePad: new THREE.MeshStandardMaterial({ color: 0x3baea3, roughness: 0.8 }),
  spawnPad: new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.75 }),
  signPost: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.78 }),
  signPanel: new THREE.MeshStandardMaterial({ color: 0xf0ca72, roughness: 0.72 }),
  signFallback: new THREE.MeshBasicMaterial({ color: 0xf8f2dc }),
};

interface HouseMaterialSet {
  wall: THREE.Material;
  roof: THREE.Material;
}

const getHouseMaterials = (id: string): HouseMaterialSet => {
  if (id === 'cottage-west') {
    return { wall: materials.houseWallBlue, roof: materials.houseRoofBlue };
  }

  if (id === 'cottage-east') {
    return { wall: materials.houseWallRed, roof: materials.houseRoofRed };
  }

  return { wall: materials.houseWallGreen, roof: materials.houseRoofGreen };
};

const createLabelMaterial = (text: string, accentColor: string): THREE.Material => {
  if (typeof document === 'undefined') {
    return materials.signFallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');

  if (!context) {
    return materials.signFallback;
  }

  context.fillStyle = '#f8f2dc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accentColor;
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = '#17201f';
  context.font = '700 46px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 12, canvas.width - 44);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
};

const nameObject = <T extends THREE.Object3D>(object: T, name: string): T => {
  object.name = name;
  object.userData.label = name;
  return object;
};

const getDimensions = (object: WorldObjectDefinition): THREE.Vector3Tuple => {
  if (!object.dimensions) {
    throw new Error(`Missing dimensions for world object: ${object.id}`);
  }

  return object.dimensions;
};

const getAssetId = (object: WorldObjectDefinition): string | null => (
  object.render?.mode === 'asset' ? object.render.assetId : null
);

const disposeGeometryOnly = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
  });
};

const fitAssetInstanceToObject = (
  asset: THREE.Object3D,
  object: WorldObjectDefinition,
): THREE.Object3D => {
  const dimensions = new THREE.Vector3(...getDimensions(object));
  const targetCenter = new THREE.Vector3(...object.position);
  const sourceBox = new THREE.Box3().setFromObject(asset);
  const sourceSize = new THREE.Vector3();
  sourceBox.getSize(sourceSize);

  if (sourceSize.x > 0 && sourceSize.y > 0 && sourceSize.z > 0) {
    const scale = Math.min(
      dimensions.x / sourceSize.x,
      dimensions.y / sourceSize.y,
      dimensions.z / sourceSize.z,
    );
    asset.scale.multiplyScalar(scale);
  }

  const fittedBox = new THREE.Box3().setFromObject(asset);
  const fittedCenter = new THREE.Vector3();
  fittedBox.getCenter(fittedCenter);
  asset.position.add(targetCenter.sub(fittedCenter));
  asset.name = `village:${object.id}:asset`;
  asset.userData.label = asset.name;

  return asset;
};

const tryApplyAssetRender = (
  group: THREE.Group,
  object: WorldObjectDefinition,
  fallbackObjects: readonly THREE.Object3D[],
): void => {
  const assetId = getAssetId(object);

  if (!assetId || !canLoadGltfAssets()) {
    return;
  }

  loadModelInstance(assetId)
    .then((asset) => {
      fallbackObjects.forEach((fallbackObject) => {
        group.remove(fallbackObject);
        disposeGeometryOnly(fallbackObject);
      });
      group.add(fitAssetInstanceToObject(asset, object));
    })
    .catch(() => undefined);
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

const addCone = (
  group: THREE.Group,
  name: string,
  radius: number,
  height: number,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 10), material);
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
  material: THREE.Material,
): void => {
  const delta = new THREE.Vector2().subVectors(end, start);
  const length = delta.length();
  const center = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
  const rotationY = -Math.atan2(delta.y, delta.x);
  const edgeOffset = new THREE.Vector2(-delta.y, delta.x).normalize().multiplyScalar(width / 2 + 0.05);

  addSurface(
    group,
    name,
    [length, 0.04, width],
    [center.x, 0.025, center.y],
    material,
    rotationY,
  );

  addSurface(
    group,
    `${name}:edge-left`,
    [length, 0.045, 0.08],
    [center.x + edgeOffset.x, 0.035, center.y + edgeOffset.y],
    materials.pathEdge,
    rotationY,
  );
  addSurface(
    group,
    `${name}:edge-right`,
    [length, 0.045, 0.08],
    [center.x - edgeOffset.x, 0.035, center.y - edgeOffset.y],
    materials.pathEdge,
    rotationY,
  );
};

const addPaths = (group: THREE.Group): void => {
  const mailbox = getWorldObject('mailbox');
  const mailboxPathPoint = mailbox.interactable?.position ?? mailbox.position;
  const boardPathPoint = deliveryBoardObject.interactable?.position ?? deliveryBoardObject.position;
  const well = getWorldObjectsByKind('well')[0];

  addPathSegment(
    group,
    'village:main-path-delivery-route',
    new THREE.Vector2(mailboxPathPoint[0], mailboxPathPoint[2]),
    new THREE.Vector2(boardPathPoint[0], boardPathPoint[2]),
    1.35,
    materials.path,
  );
  addPathSegment(
    group,
    'village:side-path-spawn-connector',
    new THREE.Vector2(playerSpawnPosition[0], playerSpawnPosition[2]),
    new THREE.Vector2(well.position[0], well.position[2]),
    1.05,
    materials.sidePath,
  );
};

const addHouse = (
  group: THREE.Group,
  name: string,
  position: THREE.Vector2,
  size: THREE.Vector3Tuple,
  materialSet: HouseMaterialSet,
): void => {
  const [width, height, depth] = size;

  addBox(
    group,
    `${name}:body`,
    size,
    [position.x, height / 2, position.y],
    materialSet.wall,
  );

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 0.78, 4),
    materialSet.roof,
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
  getWorldObjectsByKind('cottage').forEach((cottage) => {
    addHouse(
      group,
      `village:${cottage.id}`,
      new THREE.Vector2(cottage.position[0], cottage.position[2]),
      getDimensions(cottage),
      getHouseMaterials(cottage.id),
    );
  });
};

const addLabelSign = (
  group: THREE.Group,
  name: string,
  text: string,
  position: THREE.Vector3Tuple,
  accentColor: string,
  rotationY = 0,
): void => {
  const sign = nameObject(new THREE.Group(), name);
  sign.position.set(...position);
  sign.rotation.y = rotationY;

  addBox(sign, `${name}:post`, [0.12, 1, 0.12], [0, 0.5, 0], materials.signPost);
  addBox(sign, `${name}:panel`, [1.55, 0.52, 0.08], [0, 1.24, 0], materials.signPanel);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.42),
    createLabelMaterial(text, accentColor),
  );
  label.name = `${name}:text`;
  label.userData.label = label.name;
  label.position.set(0, 1.24, 0.052);
  sign.add(label);

  group.add(sign);
};

const addVillageLabels = (group: THREE.Group): void => {
  addLabelSign(group, 'village:label-post-office', 'Post Office', [4.55, 0, -4.25], '#3baea3');
  addLabelSign(group, 'village:label-blue-house', 'Blue House', [-4.95, 0, 2.25], '#4f88b8', Math.PI * 0.08);
  addLabelSign(group, 'village:label-red-house', 'Red House', [5.6, 0, 1], '#b35d52', -Math.PI * 0.12);
  addLabelSign(group, 'village:label-side-path', 'Side Path', [0.9, 0, -1.05], '#6f958e', -Math.PI * 0.35);
};

const addPostOffice = (group: THREE.Group): void => {
  const postOffice = getWorldObjectsByKind('post-office')[0];
  const [x, , z] = postOffice.position;
  const [width, height, depth] = getDimensions(postOffice);

  addBox(
    group,
    'village:post-office:body',
    [width, height, depth],
    [x, height / 2, z],
    materials.houseWall,
  );

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 0.82, 4),
    materials.houseRoof,
  );
  roof.name = 'village:post-office:roof';
  roof.userData.label = roof.name;
  roof.position.set(x, height + 0.4, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  addBox(group, 'village:post-office:door', [0.5, 0.8, 0.06], [x - 0.55, 0.4, z + depth / 2 + 0.04], materials.houseDoor);
  addBox(group, 'village:post-office:window', [0.5, 0.38, 0.06], [x + 0.45, height * 0.66, z + depth / 2 + 0.05], materials.houseWindow);
  addBox(group, 'village:post-office:sign', [1.15, 0.28, 0.08], [x, height + 0.05, z + depth / 2 + 0.08], materials.boardFrame);
  addBox(group, 'village:post-office:mail-slot', [0.42, 0.1, 0.08], [x - 0.55, 0.78, z + depth / 2 + 0.09], materials.board);
};

const addCrates = (group: THREE.Group): void => {
  getWorldObjectsByKind('crate').forEach((crate) => {
    const [width, height, depth] = getDimensions(crate);
    const [x, y, z] = crate.position;
    const fallbackObjects: THREE.Object3D[] = [];

    fallbackObjects.push(
      addBox(group, `village:${crate.id}`, [width, height, depth], [x, y, z], materials.crate),
      addBox(
        group,
        `village:${crate.id}:strap`,
        [width + 0.04, Math.max(0.06, height * 0.08), depth + 0.04],
        [x, y + height * 0.28, z],
        materials.crateStrap,
      ),
    );

    tryApplyAssetRender(group, crate, fallbackObjects);
  });
};

const addTreeFallback = (
  group: THREE.Group,
  tree: WorldObjectDefinition,
): readonly THREE.Object3D[] => {
  const [width, height, depth] = getDimensions(tree);
  const [x, y, z] = tree.position;
  const baseY = y - height / 2;
  const trunkHeight = height * 0.45;
  const canopyHeight = height * 0.68;
  const trunkRadius = Math.min(width, depth) * 0.14;
  const canopyRadius = Math.max(width, depth) * 0.54;

  const trunk = addCylinder(
    group,
    `village:${tree.id}:trunk`,
    trunkRadius,
    trunkHeight,
    [x, baseY + trunkHeight / 2, z],
    materials.treeTrunk,
  );
  const canopy = addCone(
    group,
    `village:${tree.id}:canopy`,
    canopyRadius,
    canopyHeight,
    [x, baseY + trunkHeight + canopyHeight / 2 - height * 0.08, z],
    materials.treeCanopy,
  );

  return [trunk, canopy];
};

const addBushFallback = (
  group: THREE.Group,
  bush: WorldObjectDefinition,
): readonly THREE.Object3D[] => {
  const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), materials.bush);
  shrub.name = `village:${bush.id}`;
  shrub.userData.label = shrub.name;
  shrub.position.set(...bush.position);
  shrub.scale.set(...getDimensions(bush));
  shrub.castShadow = true;
  shrub.receiveShadow = true;
  group.add(shrub);
  return [shrub];
};

const addVillageProps = (group: THREE.Group): void => {
  getWorldObjectsByKind('barrel').forEach((barrel) => {
    const [diameter, height] = getDimensions(barrel);
    addCylinder(group, `village:${barrel.id}`, diameter / 2, height, barrel.position, materials.barrel);
  });

  getWorldObjectsByKind('rock').forEach((rock) => {
    const fallbackObjects = [
      addRock(group, `village:${rock.id}`, rock.position, getDimensions(rock)),
    ];
    tryApplyAssetRender(group, rock, fallbackObjects);
  });
};

const addNatureProps = (group: THREE.Group): void => {
  getWorldObjectsByKind('tree').forEach((tree) => {
    tryApplyAssetRender(group, tree, addTreeFallback(group, tree));
  });

  getWorldObjectsByKind('bush').forEach((bush) => {
    tryApplyAssetRender(group, bush, addBushFallback(group, bush));
  });
};

const addWell = (group: THREE.Group): void => {
  const well = getWorldObjectsByKind('well')[0];
  const [x, , z] = well.position;
  const [diameter, height] = getDimensions(well);

  addCylinder(group, 'village:well-stone-ring', diameter / 2, height, [x, height / 2, z], materials.wellStone);
  addCylinder(group, 'village:well-water', diameter * 0.36, 0.06, [x, height + 0.04, z], materials.wellWater);
  addBox(group, 'village:well-left-post', [0.12, 1.25, 0.12], [x - diameter * 0.45, height + 0.48, z], materials.fence);
  addBox(group, 'village:well-right-post', [0.12, 1.25, 0.12], [x + diameter * 0.45, height + 0.48, z], materials.fence);
  addBox(group, 'village:well-roof', [diameter * 1.2, 0.16, diameter * 0.95], [x, height + 1.12, z], materials.houseRoof);
};

const addMailbox = (group: THREE.Group, mailbox: WorldObjectDefinition): void => {
  const [x, , z] = mailbox.position;

  if (mailbox.interactable) {
    const interactionPosition = mailbox.interactable.position;
    addGroundRing(
      group,
      `village:${mailbox.id}:interaction-ring`,
      0.72,
      0.025,
      [interactionPosition[0], 0.035, interactionPosition[2]],
      materials.interactablePad,
    );
  }

  addBox(group, `village:${mailbox.id}:post`, [0.16, 0.9, 0.16], [x, 0.45, z], materials.fence);
  addBox(group, `village:${mailbox.id}:box`, [0.85, 0.42, 0.5], [x, 1.03, z], materials.mailbox);
  addBox(group, `village:${mailbox.id}:door-highlight`, [0.08, 0.28, 0.36], [x - 0.44, 1.03, z], materials.mailboxDoor);
  addBox(group, `village:${mailbox.id}:flag`, [0.08, 0.38, 0.46], [x + 0.46, 1.19, z], materials.mailboxFlag);
};

const addMailboxes = (group: THREE.Group): void => {
  getWorldObjectsByKind('mailbox').forEach((mailbox) => addMailbox(group, mailbox));
};

const addDeliveryBoard = (group: THREE.Group): void => {
  const [x, , z] = deliveryBoardObject.position;
  const interactionPosition = deliveryBoardObject.interactable?.position ?? deliveryBoardObject.position;

  addGroundRing(
    group,
    'playground:delivery-board-interaction-ring',
    0.85,
    0.025,
    [interactionPosition[0], 0.035, interactionPosition[2]],
    materials.interactablePad,
  );
  addBox(group, 'playground:delivery-board-left-post', [0.16, 1.8, 0.16], [x - 0.6, 0.9, z], materials.boardFrame);
  addBox(group, 'playground:delivery-board-right-post', [0.16, 1.8, 0.16], [x + 0.6, 0.9, z], materials.boardFrame);
  addBox(group, 'playground:delivery-board-panel', [1.55, 1, 0.12], [x, 1.3, z], materials.board);
  addBox(
    group,
    'playground:delivery-board-header-placeholder',
    [1.25, 0.12, 0.14],
    [x, 1.62, z + 0.08],
    materials.boardFrame,
  );
  addBox(
    group,
    'playground:delivery-board-note-large',
    [0.55, 0.34, 0.14],
    [x - 0.27, 1.26, z + 0.08],
    materials.boardPaper,
  );
  addBox(
    group,
    'playground:delivery-board-note-small',
    [0.42, 0.24, 0.14],
    [x + 0.27, 1.19, z + 0.08],
    materials.boardPaper,
  );
  addBox(
    group,
    'playground:delivery-board-note-pin',
    [0.12, 0.12, 0.16],
    [x - 0.27, 1.44, z + 0.1],
    materials.boardPin,
  );
};

const addSpawnMarker = (group: THREE.Group): void => {
  const [x, , z] = playerSpawnPosition;
  addGroundRing(group, 'playground:player-spawn-ring', 0.58, 0.025, [x, 0.035, z], materials.spawnPad);
  addBox(group, 'playground:player-spawn-forward-arrow', [0.18, 0.04, 0.52], [x + 0.34, 0.045, z - 0.34], materials.spawnPad);
};

export const createPlayground = (): THREE.Group => {
  const playground = nameObject(new THREE.Group(), 'village:square-blockout');

  addGround(playground);
  addPaths(playground);
  addFence(playground);
  addSpawnMarker(playground);
  addPostOffice(playground);
  addHouses(playground);
  addWell(playground);
  addCrates(playground);
  addVillageProps(playground);
  addNatureProps(playground);
  addMailboxes(playground);
  addDeliveryBoard(playground);
  addVillageLabels(playground);

  return playground;
};
