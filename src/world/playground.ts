import * as THREE from 'three';
import { canLoadGltfAssets, createModelInstance, fitAssetObjectToBounds } from '../game/assets';
import { applyAssetMaterialOverrides } from './assetMaterialOverrides';
import { createMailboxProp } from './props/createMailbox';
import type { WorldObjectDefinition } from './types';
import { shouldRenderAuthoredPlaygroundObjects } from './playgroundComposition';
import {
  deliveryBoardObject,
  getWorldObjectsByKind,
  getWorldObjectsByGameplayRole,
  playerSpawnPosition,
  villageWorldObjects,
} from './villageDefinition';
import { villageLayoutConfig } from './villageLayoutConfig';
import { getVillagePathGuides } from './villagePaths';
import type { PlaygroundVisualBoundsDebugView } from './playgroundVisualBoundsDebug';
import { getWorldObjectMailbox } from './worldObjectGameplay';

const villageBounds = villageLayoutConfig.bounds;
const villageWidth = villageBounds.maxX - villageBounds.minX;
const villageDepth = villageBounds.maxZ - villageBounds.minZ;
const villageCenterX = villageBounds.minX + villageWidth / 2;
const villageCenterZ = villageBounds.minZ + villageDepth / 2;
const fenceHeight = 1;
const fenceRailThickness = 0.12;
const fencePostThickness = 0.18;

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x314237, roughness: 0.92 }),
  plaza: new THREE.MeshStandardMaterial({ color: 0xa8895e, roughness: 0.96 }),
  path: new THREE.MeshStandardMaterial({ color: 0xc8aa70, roughness: 0.95 }),
  sidePath: new THREE.MeshStandardMaterial({ color: 0x9b8c65, roughness: 0.95 }),
  pathEdge: new THREE.MeshStandardMaterial({ color: 0xf0d88f, roughness: 0.9 }),
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

export interface PlaygroundOptions {
  visualBoundsDebugView?: PlaygroundVisualBoundsDebugView;
  renderAuthoredWorldObjects?: boolean;
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

const getSceneObjectNamePrefixes = (objectId: string): readonly string[] => {
  if (objectId === 'player-spawn') {
    return ['playground:player-spawn'];
  }

  if (objectId === 'delivery-board') {
    return ['playground:delivery-board'];
  }

  if (objectId === 'town-well') {
    return ['village:well'];
  }

  return [`village:${objectId}`];
};

const matchesSceneObject = (object: THREE.Object3D, objectId: string): boolean => (
  getSceneObjectNamePrefixes(objectId).some((prefix) => (
    object.name === prefix || object.name.startsWith(`${prefix}:`) || object.name.startsWith(`${prefix}-`)
  ))
);

const hasMatchingAncestor = (
  object: THREE.Object3D,
  root: THREE.Object3D,
  objectId: string,
): boolean => {
  let parent = object.parent;

  while (parent && parent !== root) {
    if (matchesSceneObject(parent, objectId)) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
};

const findAuthoredSceneObjects = (
  root: THREE.Object3D,
  objectId: string,
): THREE.Object3D[] => {
  const objects: THREE.Object3D[] = [];

  root.traverse((object) => {
    if (object === root || !matchesSceneObject(object, objectId) || hasMatchingAncestor(object, root, objectId)) {
      return;
    }

    objects.push(object);
  });

  return objects;
};

const getAuthoredSceneTransform = (object: WorldObjectDefinition): {
  rotationY: number;
  scaleMultiplier: number;
  yOffset: number;
} => {
  const renderSettings = object.render?.mode === 'asset' ? object.render : undefined;

  return {
    rotationY: renderSettings?.rotation?.[1] ?? object.rotation?.[1] ?? 0,
    scaleMultiplier: renderSettings?.scaleMultiplier ?? object.layoutTransform?.scaleMultiplier ?? 1,
    yOffset: renderSettings?.yOffset ?? object.layoutTransform?.yOffset ?? 0,
  };
};

const disposeGeometryOnly = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
  });
};

const applyAuthoredSceneTransforms = (root: THREE.Object3D): void => {
  villageWorldObjects.forEach((object) => {
    const transform = getAuthoredSceneTransform(object);

    if (transform.rotationY === 0 && transform.scaleMultiplier === 1 && transform.yOffset === 0) {
      return;
    }

    const pivot = new THREE.Vector3(...object.position);

    findAuthoredSceneObjects(root, object.id).forEach((sceneObject) => {
      const localOffset = sceneObject.position.clone().sub(pivot);

      localOffset.x *= transform.scaleMultiplier;
      localOffset.z *= transform.scaleMultiplier;
      localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), transform.rotationY);
      sceneObject.position.copy(pivot).add(localOffset);
      sceneObject.position.y += transform.yOffset;
      sceneObject.rotation.y += transform.rotationY;
      sceneObject.scale.multiplyScalar(transform.scaleMultiplier);
    });
  });
};

const tryApplyAssetRender = (
  group: THREE.Group,
  object: WorldObjectDefinition,
  fallbackObjects: readonly THREE.Object3D[],
  options: PlaygroundOptions = {},
): void => {
  const assetId = getAssetId(object);

  if (!assetId || !canLoadGltfAssets()) {
    return;
  }

  createModelInstance(assetId)
    .then((assetInstance) => {
      if (!group.parent) {
        assetInstance.dispose();
        return;
      }

      fallbackObjects.forEach((fallbackObject) => {
        group.remove(fallbackObject);
        disposeGeometryOnly(fallbackObject);
      });

      const assetObject = assetInstance.object;
      const renderSettings = object.render?.mode === 'asset' ? object.render : undefined;
      const fitResult = fitAssetObjectToBounds(assetObject, {
        targetPosition: object.position,
        targetDimensions: object.dimensions,
        rotation: renderSettings?.rotation ?? object.rotation,
        scaleMultiplier: renderSettings?.scaleMultiplier,
        yOffset: renderSettings?.yOffset,
        fitMode: renderSettings?.fitMode,
      });

      assetObject.name = `village:${object.id}:asset`;
      assetObject.userData.label = assetObject.name;
      assetObject.userData.assetFitMode = fitResult.fitMode;
      assetObject.userData.visualBounds = fitResult.visualBox;

      const disposeMaterialOverrides = applyAssetMaterialOverrides(assetObject, object);
      const disposeAssetInstance = assetObject.userData.disposeAssetInstance;
      assetObject.userData.disposeAssetInstance = () => {
        disposeMaterialOverrides();

        if (typeof disposeAssetInstance === 'function') {
          disposeAssetInstance();
        }
      };

      options.visualBoundsDebugView?.setObjectBounds(object.id, fitResult.visualBox);
      group.add(assetObject);
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

const addGroundDisk = (
  group: THREE.Group,
  name: string,
  radius: number,
  position: THREE.Vector3Tuple,
  material: THREE.Material,
): THREE.Mesh => {
  const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), material);
  disk.name = name;
  disk.userData.label = name;
  disk.position.set(...position);
  disk.rotation.x = -Math.PI / 2;
  disk.receiveShadow = true;
  group.add(disk);
  return disk;
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
  ground.position.set(villageCenterX, 0, villageCenterZ);
  ground.receiveShadow = true;
  group.add(nameObject(ground, 'village:ground'));
};

const addFence = (group: THREE.Group): void => {
  const postY = fenceHeight / 2;
  const postSpacing = 2;

  for (let x = villageBounds.minX; x <= villageBounds.maxX; x += postSpacing) {
    const postIndex = Math.round((x - villageBounds.minX) / postSpacing);
    addBox(
      group,
      `village:boundary-post-north-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, villageBounds.minZ],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-post-south-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [x, postY, villageBounds.maxZ],
      materials.fence,
    );
  }

  for (let z = villageBounds.minZ + postSpacing; z <= villageBounds.maxZ - postSpacing; z += postSpacing) {
    const postIndex = Math.round((z - villageBounds.minZ) / postSpacing);
    addBox(
      group,
      `village:boundary-post-west-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [villageBounds.minX, postY, z],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-post-east-${postIndex}`,
      [fencePostThickness, fenceHeight, fencePostThickness],
      [villageBounds.maxX, postY, z],
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
      [villageCenterX, y, villageBounds.minZ],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-south-${railName}`,
      [villageWidth, fenceRailThickness, fenceRailThickness],
      [villageCenterX, y, villageBounds.maxZ],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-west-${railName}`,
      [fenceRailThickness, fenceRailThickness, villageDepth],
      [villageBounds.minX, y, villageCenterZ],
      materials.fence,
    );
    addBox(
      group,
      `village:boundary-rail-east-${railName}`,
      [fenceRailThickness, fenceRailThickness, villageDepth],
      [villageBounds.maxX, y, villageCenterZ],
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
  getVillagePathGuides().forEach((path) => {
    addPathSegment(
      group,
      path.id,
      new THREE.Vector2(path.start[0], path.start[2]),
      new THREE.Vector2(path.end[0], path.end[2]),
      path.width,
      path.kind === 'main' ? materials.path : materials.sidePath,
    );
  });
};

const addCentralPlazaSurface = (group: THREE.Group): void => {
  addGroundDisk(
    group,
    'village:central-plaza-surface',
    villageLayoutConfig.spacing.centralGreenOpenRadius - 0.45,
    [0, 0.018, 0],
    materials.plaza,
  );
};

const addHouse = (
  group: THREE.Group,
  name: string,
  position: THREE.Vector2,
  size: THREE.Vector3Tuple,
  materialSet: HouseMaterialSet,
): readonly THREE.Object3D[] => {
  const [width, height, depth] = size;
  const fallbackObjects: THREE.Object3D[] = [];

  fallbackObjects.push(
    addBox(
      group,
      `${name}:body`,
      size,
      [position.x, height / 2, position.y],
      materialSet.wall,
    ),
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
  fallbackObjects.push(roof);

  fallbackObjects.push(
    addBox(
      group,
      `${name}:door`,
      [0.38, 0.72, 0.06],
      [position.x, 0.36, position.y + depth / 2 + 0.04],
      materials.houseDoor,
    ),
    addBox(
      group,
      `${name}:window-left`,
      [0.38, 0.34, 0.06],
      [position.x - width * 0.28, height * 0.66, position.y + depth / 2 + 0.05],
      materials.houseWindow,
    ),
    addBox(
      group,
      `${name}:window-right`,
      [0.38, 0.34, 0.06],
      [position.x + width * 0.28, height * 0.66, position.y + depth / 2 + 0.05],
      materials.houseWindow,
    ),
  );

  return fallbackObjects;
};

const addHouses = (group: THREE.Group, options: PlaygroundOptions): void => {
  getWorldObjectsByKind('cottage').forEach((cottage) => {
    const fallbackObjects = addHouse(
      group,
      `village:${cottage.id}`,
      new THREE.Vector2(cottage.position[0], cottage.position[2]),
      getDimensions(cottage),
      getHouseMaterials(cottage.id),
    );
    tryApplyAssetRender(group, cottage, fallbackObjects, options);
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
  addLabelSign(group, 'village:label-post-office', 'Post Office', [-4.1, 0, 7.4], '#3baea3', Math.PI * 0.05);
  addLabelSign(group, 'village:label-blue-house', 'Blue House', [-6.25, 0, -2.05], '#4f88b8', Math.PI * 0.12);
  addLabelSign(group, 'village:label-red-house', 'Red House', [6.25, 0, -1.1], '#b35d52', -Math.PI * 0.14);
  addLabelSign(group, 'village:label-side-path', 'North Path', [2.25, 0, 2.25], '#6f958e', -Math.PI * 0.28);
};

const addPostOffice = (group: THREE.Group, options: PlaygroundOptions): void => {
  const postOffice = getWorldObjectsByGameplayRole('post-office')[0] ?? getWorldObjectsByKind('post-office')[0];
  const [x, , z] = postOffice.position;
  const [width, height, depth] = getDimensions(postOffice);
  const fallbackObjects: THREE.Object3D[] = [];

  fallbackObjects.push(
    addBox(
      group,
      'village:post-office:body',
      [width, height, depth],
      [x, height / 2, z],
      materials.houseWall,
    ),
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
  fallbackObjects.push(roof);

  fallbackObjects.push(
    addBox(group, 'village:post-office:door', [0.5, 0.8, 0.06], [x - 0.55, 0.4, z + depth / 2 + 0.04], materials.houseDoor),
    addBox(group, 'village:post-office:window', [0.5, 0.38, 0.06], [x + 0.45, height * 0.66, z + depth / 2 + 0.05], materials.houseWindow),
    addBox(group, 'village:post-office:sign', [1.15, 0.28, 0.08], [x, height + 0.05, z + depth / 2 + 0.08], materials.boardFrame),
    addBox(group, 'village:post-office:mail-slot', [0.42, 0.1, 0.08], [x - 0.55, 0.78, z + depth / 2 + 0.09], materials.board),
  );
  tryApplyAssetRender(group, postOffice, fallbackObjects, options);
};

const addCrates = (group: THREE.Group, options: PlaygroundOptions): void => {
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

    tryApplyAssetRender(group, crate, fallbackObjects, options);
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

const addVillageProps = (group: THREE.Group, options: PlaygroundOptions): void => {
  getWorldObjectsByKind('barrel').forEach((barrel) => {
    const [diameter, height] = getDimensions(barrel);
    const fallbackObjects = [
      addCylinder(group, `village:${barrel.id}`, diameter / 2, height, barrel.position, materials.barrel),
    ];
    tryApplyAssetRender(group, barrel, fallbackObjects, options);
  });

  getWorldObjectsByKind('rock').forEach((rock) => {
    const fallbackObjects = [
      addRock(group, `village:${rock.id}`, rock.position, getDimensions(rock)),
    ];
    tryApplyAssetRender(group, rock, fallbackObjects, options);
  });
};

const addSignpostFallback = (
  group: THREE.Group,
  signpost: WorldObjectDefinition,
): readonly THREE.Object3D[] => {
  const [width, height, depth] = getDimensions(signpost);
  const [x, y, z] = signpost.position;
  const baseY = y - height / 2;

  return [
    addBox(
      group,
      `village:${signpost.id}:post`,
      [Math.max(width * 0.12, 0.08), height * 0.78, Math.max(depth * 0.12, 0.08)],
      [x, baseY + height * 0.39, z],
      materials.signPost,
    ),
    addBox(
      group,
      `village:${signpost.id}:pointer`,
      [width, height * 0.24, Math.max(depth * 0.12, 0.08)],
      [x, baseY + height * 0.78, z],
      materials.signPanel,
    ),
  ];
};

const addCartFallback = (
  group: THREE.Group,
  cart: WorldObjectDefinition,
): readonly THREE.Object3D[] => {
  const [width, height, depth] = getDimensions(cart);
  const [x, y, z] = cart.position;
  const baseY = y - height / 2;
  const wheelSize: THREE.Vector3Tuple = [width * 0.18, height * 0.28, depth * 0.12];

  return [
    addBox(group, `village:${cart.id}:bed`, [width, height * 0.28, depth], [x, baseY + height * 0.48, z], materials.crate),
    addBox(group, `village:${cart.id}:handle`, [width * 0.5, height * 0.08, depth * 0.12], [x - width * 0.72, baseY + height * 0.55, z], materials.fence),
    addBox(group, `village:${cart.id}:wheel-left`, wheelSize, [x + width * 0.25, baseY + height * 0.22, z - depth * 0.48], materials.barrel),
    addBox(group, `village:${cart.id}:wheel-right`, wheelSize, [x + width * 0.25, baseY + height * 0.22, z + depth * 0.48], materials.barrel),
  ];
};

const addSackFallback = (
  group: THREE.Group,
  sack: WorldObjectDefinition,
): readonly THREE.Object3D[] => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), materials.crate);
  mesh.name = `village:${sack.id}`;
  mesh.userData.label = mesh.name;
  mesh.position.set(...sack.position);
  mesh.scale.set(...getDimensions(sack));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return [mesh];
};

const addFantasyDressing = (group: THREE.Group, options: PlaygroundOptions): void => {
  getWorldObjectsByKind('signpost').forEach((signpost) => {
    tryApplyAssetRender(group, signpost, addSignpostFallback(group, signpost), options);
  });

  getWorldObjectsByKind('cart').forEach((cart) => {
    tryApplyAssetRender(group, cart, addCartFallback(group, cart), options);
  });

  getWorldObjectsByKind('sack').forEach((sack) => {
    tryApplyAssetRender(group, sack, addSackFallback(group, sack), options);
  });
};

const addNatureProps = (group: THREE.Group, options: PlaygroundOptions): void => {
  getWorldObjectsByKind('tree').forEach((tree) => {
    tryApplyAssetRender(group, tree, addTreeFallback(group, tree), options);
  });

  getWorldObjectsByKind('bush').forEach((bush) => {
    tryApplyAssetRender(group, bush, addBushFallback(group, bush), options);
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

const addMailbox = (
  group: THREE.Group,
  mailbox: WorldObjectDefinition,
  options: PlaygroundOptions,
): void => {
  const fallbackObjects: THREE.Object3D[] = [];

  if (mailbox.interactable) {
    const interactionPosition = mailbox.interactable.position;
    fallbackObjects.push(addGroundRing(
      group,
      `village:${mailbox.id}:interaction-ring`,
      0.72,
      0.025,
      [interactionPosition[0], 0.035, interactionPosition[2]],
      materials.interactablePad,
    ));
  }

  const mailboxProp = createMailboxProp({
    id: mailbox.id,
    position: mailbox.position,
    variant: getWorldObjectMailbox(mailbox)?.variant,
  });
  group.add(mailboxProp);
  fallbackObjects.push(mailboxProp);
  tryApplyAssetRender(group, mailbox, fallbackObjects, options);
};

const addMailboxes = (group: THREE.Group, options: PlaygroundOptions): void => {
  getWorldObjectsByGameplayRole('mailbox')
    .filter((mailbox) => mailbox.kind === 'mailbox')
    .filter((mailbox) => getWorldObjectMailbox(mailbox))
    .forEach((mailbox) => addMailbox(group, mailbox, options));
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

export const createPlayground = (options: PlaygroundOptions = {}): THREE.Group => {
  const playground = nameObject(new THREE.Group(), 'village:square-blockout');

  addGround(playground);
  addFence(playground);

  if (!shouldRenderAuthoredPlaygroundObjects(options.renderAuthoredWorldObjects)) {
    return playground;
  }

  addCentralPlazaSurface(playground);
  addPaths(playground);
  addSpawnMarker(playground);
  addPostOffice(playground, options);
  addHouses(playground, options);
  addWell(playground);
  addCrates(playground, options);
  addVillageProps(playground, options);
  addFantasyDressing(playground, options);
  addNatureProps(playground, options);
  addMailboxes(playground, options);
  addDeliveryBoard(playground);
  addVillageLabels(playground);
  applyAuthoredSceneTransforms(playground);

  return playground;
};
