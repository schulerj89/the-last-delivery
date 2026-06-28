import * as THREE from 'three';
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

interface AssetMaterialOverridePalette {
  primaryColor: number;
  secondaryColor?: number;
  accentColor?: number;
  roughness: number;
  metalness: number;
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

const overrideKindSet = new Set<WorldObjectKind>(assetMaterialOverrideKinds);

const lowerIncludesAny = (value: string, needles: readonly string[]): boolean => (
  needles.some((needle) => value.includes(needle))
);

const hasColor = (material: THREE.Material): material is ColorMaterial => (
  'color' in material && material.color instanceof THREE.Color
);

export const isAssetMaterialOverrideKind = (
  kind: WorldObjectKind,
): kind is AssetMaterialOverrideKind => overrideKindSet.has(kind);

export const isValidMaterialOverrideColor = (color: number): boolean => (
  Number.isInteger(color) && color >= 0x000000 && color <= 0xffffff
);

const getMaterialLabel = (mesh: THREE.Mesh, material: THREE.Material): string => (
  `${mesh.name} ${material.name}`.toLowerCase()
);

const getMeshCenterY = (mesh: THREE.Mesh): number => (
  new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).y
);

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

const applyMaterialTone = (
  material: THREE.Material,
  color: number,
  palette: AssetMaterialOverridePalette,
): void => {
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
): (() => void) => {
  if (!isAssetMaterialOverrideKind(worldObject.kind)) {
    return () => undefined;
  }

  const kind = worldObject.kind;
  const palette = assetMaterialOverrideConfig[kind];
  const clonedMaterials = new Set<THREE.Material>();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const nextMaterials = sourceMaterials.map((sourceMaterial) => {
      const clonedMaterial = sourceMaterial.clone();
      const color = pickMaterialColor(object, child, clonedMaterial, kind, palette);

      applyMaterialTone(clonedMaterial, color, palette);
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
      // cached GLB source and are intentionally not disposed here.
      material.dispose();
    });
    clonedMaterials.clear();
  };
};
