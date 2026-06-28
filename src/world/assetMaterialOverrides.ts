import * as THREE from 'three';
import { selectedNatureAssetIds } from '../game/assets';
import type { WorldObjectDefinition, WorldObjectKind } from './types';

export type AssetMaterialOverrideKind = Extract<
  WorldObjectKind,
  | 'barrel'
  | 'bush'
  | 'cart'
  | 'cottage'
  | 'crate'
  | 'post-office'
  | 'rock'
  | 'signpost'
  | 'tree'
>;

export type AssetMaterialOverrideAssetId = typeof selectedNatureAssetIds[number];

interface AssetMaterialOverridePalette {
  primaryColor: number;
  secondaryColor?: number;
  accentColor?: number;
  roughness: number;
  metalness: number;
}

interface AssetMaterialOverrideOptions {
  assetId?: string | null;
}

interface MaterialToneOptions {
  forceSolidColor?: boolean;
}

type ColorMaterial = THREE.Material & {
  color: THREE.Color;
  emissive?: THREE.Color;
  metalness?: number;
  roughness?: number;
};

export const assetMaterialOverrideKinds = [
  'barrel',
  'bush',
  'cart',
  'cottage',
  'crate',
  'post-office',
  'rock',
  'signpost',
  'tree',
] as const satisfies readonly AssetMaterialOverrideKind[];

export const assetMaterialOverrideConfig: Record<AssetMaterialOverrideKind, AssetMaterialOverridePalette> = {
  barrel: {
    primaryColor: 0x7b5237,
    secondaryColor: 0x4f3528,
    roughness: 0.86,
    metalness: 0.02,
  },
  bush: {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    roughness: 0.94,
    metalness: 0,
  },
  cart: {
    primaryColor: 0x7b5637,
    secondaryColor: 0x4f3528,
    roughness: 0.88,
    metalness: 0.02,
  },
  cottage: {
    primaryColor: 0xb9a178,
    secondaryColor: 0x6d3d35,
    accentColor: 0x4f3428,
    roughness: 0.86,
    metalness: 0.02,
  },
  crate: {
    primaryColor: 0x9a6435,
    secondaryColor: 0x5a3826,
    roughness: 0.88,
    metalness: 0.02,
  },
  'post-office': {
    primaryColor: 0xc0a46f,
    secondaryColor: 0x6d3d35,
    accentColor: 0x164338,
    roughness: 0.86,
    metalness: 0.02,
  },
  rock: {
    primaryColor: 0x6f7772,
    secondaryColor: 0x59615d,
    roughness: 0.95,
    metalness: 0,
  },
  signpost: {
    primaryColor: 0xf0ca72,
    secondaryColor: 0x6b4a2f,
    roughness: 0.78,
    metalness: 0.02,
  },
  tree: {
    primaryColor: 0x2f6f48,
    secondaryColor: 0x5d3c25,
    roughness: 0.92,
    metalness: 0,
  },
};

export const assetMaterialOverrideAssetIds = selectedNatureAssetIds;

export const natureAssetMaterialOverrideConfig = {
  'nature-tree01': {
    primaryColor: 0x2f6f48,
    secondaryColor: 0x5d3c25,
    roughness: 0.92,
    metalness: 0,
  },
  'nature-rock': {
    primaryColor: 0x727a75,
    secondaryColor: 0x565d59,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-simple-bush': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-branch01': {
    primaryColor: 0x6a4328,
    secondaryColor: 0x3f281b,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-bush-berries-blue': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    accentColor: 0x3d66b8,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-bush-berries-empty': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    accentColor: 0xd8c08a,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-bush-berries-red': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    accentColor: 0xb8423d,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-dead-tree': {
    primaryColor: 0x6f5a43,
    secondaryColor: 0x3f3226,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-fence': {
    primaryColor: 0xc7995c,
    secondaryColor: 0x6b4a2f,
    roughness: 0.84,
    metalness: 0.01,
  },
  'nature-flower-orange': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x356f3d,
    accentColor: 0xf08a2f,
    roughness: 0.92,
    metalness: 0,
  },
  'nature-flower-pink': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x356f3d,
    accentColor: 0xe27bb0,
    roughness: 0.92,
    metalness: 0,
  },
  'nature-flower-yellow': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x356f3d,
    accentColor: 0xf0d052,
    roughness: 0.92,
    metalness: 0,
  },
  'nature-grass-array': {
    primaryColor: 0x5d9a4c,
    secondaryColor: 0x3f7a3e,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-grass01': {
    primaryColor: 0x5d9a4c,
    secondaryColor: 0x3f7a3e,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-grass03': {
    primaryColor: 0x6aa354,
    secondaryColor: 0x487f42,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-hat-mushroom-brown': {
    primaryColor: 0x8d5f3a,
    secondaryColor: 0xe6d4b7,
    accentColor: 0x5b3927,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-hat-mushroom-red': {
    primaryColor: 0xbe4a3e,
    secondaryColor: 0xe6d4b7,
    accentColor: 0xf4ead5,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-hills01': {
    primaryColor: 0x728f54,
    secondaryColor: 0x5a6a48,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-hills02': {
    primaryColor: 0x78965a,
    secondaryColor: 0x5e704d,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-log': {
    primaryColor: 0x7a4c2c,
    secondaryColor: 0x3f281b,
    accentColor: 0xd2b178,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-mountain01': {
    primaryColor: 0x7a817d,
    secondaryColor: 0x58615d,
    accentColor: 0xb8c2b4,
    roughness: 0.97,
    metalness: 0,
  },
  'nature-mushroom-brown': {
    primaryColor: 0x8d5f3a,
    secondaryColor: 0xe6d4b7,
    accentColor: 0x5b3927,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-mushroom-red': {
    primaryColor: 0xbe4a3e,
    secondaryColor: 0xe6d4b7,
    accentColor: 0xf4ead5,
    roughness: 0.9,
    metalness: 0,
  },
  'nature-pine01': {
    primaryColor: 0x275f47,
    secondaryColor: 0x5a3a25,
    roughness: 0.93,
    metalness: 0,
  },
  'nature-plant02': {
    primaryColor: 0x4d8a55,
    secondaryColor: 0x356f3d,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-rock-fbx': {
    primaryColor: 0x727a75,
    secondaryColor: 0x565d59,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-rock-big01': {
    primaryColor: 0x6e7773,
    secondaryColor: 0x505955,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-simple-bush-fbx': {
    primaryColor: 0x4f8a4f,
    secondaryColor: 0x366b3a,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-stone01': {
    primaryColor: 0x747b78,
    secondaryColor: 0x585f5c,
    roughness: 0.96,
    metalness: 0,
  },
  'nature-tent-blue': {
    primaryColor: 0x456fb3,
    secondaryColor: 0xd6c09a,
    accentColor: 0x6b4a2f,
    roughness: 0.88,
    metalness: 0.01,
  },
  'nature-tent-red': {
    primaryColor: 0xa84a3d,
    secondaryColor: 0xd6c09a,
    accentColor: 0x6b4a2f,
    roughness: 0.88,
    metalness: 0.01,
  },
  'nature-tile-flat': {
    primaryColor: 0x8b7958,
    secondaryColor: 0x5f7148,
    roughness: 0.98,
    metalness: 0,
  },
  'nature-tree-dead01': {
    primaryColor: 0x6f5a43,
    secondaryColor: 0x3f3226,
    roughness: 0.94,
    metalness: 0,
  },
  'nature-tree01-fbx': {
    primaryColor: 0x2f6f48,
    secondaryColor: 0x5d3c25,
    roughness: 0.92,
    metalness: 0,
  },
} as const satisfies Record<AssetMaterialOverrideAssetId, AssetMaterialOverridePalette>;

const overrideKindSet = new Set<WorldObjectKind>(assetMaterialOverrideKinds);
const overrideAssetIdSet = new Set<string>(assetMaterialOverrideAssetIds);

const lowerIncludesAny = (value: string, needles: readonly string[]): boolean => (
  needles.some((needle) => value.includes(needle))
);

const hasColor = (material: THREE.Material): material is ColorMaterial => (
  'color' in material && material.color instanceof THREE.Color
);

export const isAssetMaterialOverrideKind = (
  kind: WorldObjectKind,
): kind is AssetMaterialOverrideKind => overrideKindSet.has(kind);

export const isAssetMaterialOverrideAssetId = (
  assetId: string,
): assetId is AssetMaterialOverrideAssetId => overrideAssetIdSet.has(assetId);

export const isValidMaterialOverrideColor = (color: number): boolean => (
  Number.isInteger(color) && color >= 0x000000 && color <= 0xffffff
);

const getMaterialLabel = (mesh: THREE.Mesh, material: THREE.Material): string => (
  `${mesh.name} ${material.name}`.toLowerCase()
);

const getMeshCenterY = (mesh: THREE.Mesh): number => (
  new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).y
);

const getWorldObjectAssetId = (worldObject: WorldObjectDefinition): string | null => (
  worldObject.render?.mode === 'asset' ? worldObject.render.assetId : null
);

const countMeshes = (object: THREE.Object3D): number => {
  let meshCount = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshCount += 1;
    }
  });

  return meshCount;
};

const getRootHeightData = (
  object: THREE.Object3D,
  mesh: THREE.Mesh,
): { normalizedHeight: number; rootBox: THREE.Box3 } => {
  const rootBox = new THREE.Box3().setFromObject(object);
  const rootHeight = Math.max(rootBox.max.y - rootBox.min.y, 0.001);
  const normalizedHeight = (getMeshCenterY(mesh) - rootBox.min.y) / rootHeight;

  return { normalizedHeight, rootBox };
};

const isWoodNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => (
  assetId.includes('branch')
  || assetId.includes('dead-tree')
  || assetId.includes('fence')
  || assetId.includes('log')
  || assetId.includes('tree-dead')
);

const isRockNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => (
  assetId.includes('hill')
  || assetId.includes('mountain')
  || assetId.includes('rock')
  || assetId.includes('stone')
);

const isFlowerNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => assetId.includes('flower');
const isGrassNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => assetId.includes('grass');
const isMushroomNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => assetId.includes('mushroom');
const isTentNatureAsset = (assetId: AssetMaterialOverrideAssetId): boolean => assetId.includes('tent');

const pickMaterialColor = (
  object: THREE.Object3D,
  mesh: THREE.Mesh,
  material: THREE.Material,
  kind: AssetMaterialOverrideKind,
  palette: AssetMaterialOverridePalette,
): number => {
  const label = getMaterialLabel(mesh, material);
  const rootBox = new THREE.Box3().setFromObject(object);
  const rootHeight = Math.max(rootBox.max.y - rootBox.min.y, 0.001);
  const normalizedHeight = (getMeshCenterY(mesh) - rootBox.min.y) / rootHeight;

  if (kind === 'tree') {
    return lowerIncludesAny(label, ['trunk', 'bark', 'wood', 'stem']) || normalizedHeight < 0.42
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (kind === 'cottage' || kind === 'post-office') {
    if (lowerIncludesAny(label, ['roof', 'top', 'thatch'])) {
      return palette.secondaryColor ?? palette.primaryColor;
    }

    if (lowerIncludesAny(label, ['door', 'frame', 'trim'])) {
      return palette.accentColor ?? palette.secondaryColor ?? palette.primaryColor;
    }

    return normalizedHeight > 0.64
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (kind === 'signpost') {
    return lowerIncludesAny(label, ['post', 'wood', 'pole'])
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (kind === 'crate' || kind === 'barrel' || kind === 'cart') {
    return lowerIncludesAny(label, ['strap', 'band', 'wheel', 'handle'])
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  return palette.primaryColor;
};

const pickNatureAssetMaterialColor = (
  object: THREE.Object3D,
  mesh: THREE.Mesh,
  material: THREE.Material,
  assetId: AssetMaterialOverrideAssetId,
  palette: AssetMaterialOverridePalette,
): number => {
  const label = getMaterialLabel(mesh, material);
  const { normalizedHeight } = getRootHeightData(object, mesh);

  if (assetId.includes('tree01') || assetId.includes('pine')) {
    return lowerIncludesAny(label, ['trunk', 'bark', 'wood', 'stem']) || normalizedHeight < 0.4
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (isWoodNatureAsset(assetId)) {
    return lowerIncludesAny(label, ['cut', 'ring', 'end'])
      ? palette.accentColor ?? palette.primaryColor
      : palette.secondaryColor ?? palette.primaryColor;
  }

  if (isRockNatureAsset(assetId)) {
    if (countMeshes(object) <= 1) {
      return palette.primaryColor;
    }

    return lowerIncludesAny(label, ['top', 'snow', 'cap'])
      ? palette.accentColor ?? palette.primaryColor
      : normalizedHeight > 0.62
        ? palette.primaryColor
        : palette.secondaryColor ?? palette.primaryColor;
  }

  if (assetId.includes('berries')) {
    return lowerIncludesAny(label, ['berry', 'fruit']) || normalizedHeight > 0.68
      ? palette.accentColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (isFlowerNatureAsset(assetId)) {
    return lowerIncludesAny(label, ['flower', 'petal', 'blossom']) || normalizedHeight > 0.55
      ? palette.accentColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (isMushroomNatureAsset(assetId)) {
    if (lowerIncludesAny(label, ['spot', 'dot'])) {
      return palette.accentColor ?? palette.primaryColor;
    }

    return lowerIncludesAny(label, ['stem']) || normalizedHeight < 0.48
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (isTentNatureAsset(assetId)) {
    if (lowerIncludesAny(label, ['pole', 'wood', 'peg'])) {
      return palette.accentColor ?? palette.primaryColor;
    }

    return lowerIncludesAny(label, ['trim', 'rope', 'flap'])
      ? palette.secondaryColor ?? palette.primaryColor
      : palette.primaryColor;
  }

  if (assetId === 'nature-tile-flat') {
    return normalizedHeight > 0.58 ? palette.secondaryColor ?? palette.primaryColor : palette.primaryColor;
  }

  if (isGrassNatureAsset(assetId) || assetId.includes('bush') || assetId.includes('plant')) {
    return normalizedHeight < 0.24 ? palette.secondaryColor ?? palette.primaryColor : palette.primaryColor;
  }

  return palette.primaryColor;
};

const clearMaterialTextureSlots = (material: THREE.Material): void => {
  const materialWithTextures = material as unknown as Record<string, unknown>;

  [
    'map',
    'alphaMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'lightMap',
    'metalnessMap',
    'normalMap',
    'roughnessMap',
    'specularMap',
  ].forEach((key) => {
    if (materialWithTextures[key] instanceof THREE.Texture) {
      materialWithTextures[key] = null;
    }
  });

  const maybeVertexColors = (material as { vertexColors?: unknown }).vertexColors;
  if (typeof maybeVertexColors === 'boolean') {
    (material as unknown as { vertexColors: boolean }).vertexColors = false;
  }
};

const applyMaterialTone = (
  material: THREE.Material,
  color: number,
  palette: AssetMaterialOverridePalette,
  options: MaterialToneOptions = {},
): void => {
  if (options.forceSolidColor) {
    clearMaterialTextureSlots(material);
  }

  if (hasColor(material)) {
    material.color.setHex(color);
  }

  const maybeEmissive = (material as { emissive?: unknown }).emissive;
  const maybeRoughness = (material as { roughness?: unknown }).roughness;
  const maybeMetalness = (material as { metalness?: unknown }).metalness;

  if (maybeEmissive instanceof THREE.Color) {
    maybeEmissive.setHex(0x000000);
  }

  if (typeof maybeRoughness === 'number') {
    (material as unknown as { roughness: number }).roughness = palette.roughness;
  }

  if (typeof maybeMetalness === 'number') {
    (material as unknown as { metalness: number }).metalness = palette.metalness;
  }

  material.needsUpdate = true;
};

export const applyAssetMaterialOverrides = (
  object: THREE.Object3D,
  worldObject: WorldObjectDefinition,
  options: AssetMaterialOverrideOptions = {},
): (() => void) => {
  const assetId = options.assetId ?? getWorldObjectAssetId(worldObject);
  const natureAssetId = assetId && isAssetMaterialOverrideAssetId(assetId) ? assetId : null;
  const kind = isAssetMaterialOverrideKind(worldObject.kind) ? worldObject.kind : null;

  if (!natureAssetId && !kind) {
    return () => undefined;
  }

  const palette = natureAssetId
    ? natureAssetMaterialOverrideConfig[natureAssetId]
    : assetMaterialOverrideConfig[kind as AssetMaterialOverrideKind];
  const clonedMaterials = new Set<THREE.Material>();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const nextMaterials = sourceMaterials.map((sourceMaterial) => {
      const clonedMaterial = sourceMaterial.clone();
      const color = natureAssetId
        ? pickNatureAssetMaterialColor(object, child, clonedMaterial, natureAssetId, palette)
        : pickMaterialColor(object, child, clonedMaterial, kind as AssetMaterialOverrideKind, palette);

      applyMaterialTone(clonedMaterial, color, palette, { forceSolidColor: natureAssetId !== null });
      clonedMaterials.add(clonedMaterial);
      return clonedMaterial;
    });
    const nextMaterial = nextMaterials[0];

    if (nextMaterial) {
      child.material = Array.isArray(child.material) ? nextMaterials : nextMaterial;
    }
  });

  return () => {
    clonedMaterials.forEach((material) => {
      // These are per-instance material clones. Textures remain shared with the
      // cached model source and are intentionally not disposed here.
      material.dispose();
    });
    clonedMaterials.clear();
  };
};
