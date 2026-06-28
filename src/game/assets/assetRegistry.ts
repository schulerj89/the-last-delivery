export interface GltfAssetDefinition {
  id: string;
  kind: 'gltf';
  url: string;
  sourcePack: string;
  defaultScale: number;
  notes?: string;
  maxRecommendedBytes: number;
}

export type AssetDefinition = GltfAssetDefinition;

export const assetRegistry: readonly AssetDefinition[] = [
  {
    id: 'crate-box-001',
    kind: 'gltf',
    url: '/assets/models/crate-box-001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Optional low-poly crate prop used to test GLB replacement for one village crate.',
    maxRecommendedBytes: 1_000_000,
  },
  {
    id: 'nature-tree01',
    kind: 'gltf',
    url: '/assets/models/nature/nature-tree01.glb',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Converted from tree01.fbx for the village forest edge.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-rock',
    kind: 'gltf',
    url: '/assets/models/nature/nature-rock.glb',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Converted from rock.fbx for path and boundary framing.',
    maxRecommendedBytes: 50_000,
  },
  {
    id: 'nature-simple-bush',
    kind: 'gltf',
    url: '/assets/models/nature/nature-simple-bush.glb',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Converted from simple_bush.fbx for low-cost foliage clusters.',
    maxRecommendedBytes: 50_000,
  },
  {
    id: 'fantasy-house-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/house_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy house prop for the post office blockout.',
    maxRecommendedBytes: 1_200_000,
  },
  {
    id: 'fantasy-house-002',
    kind: 'gltf',
    url: '/assets/models/fantasy/house_002.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy house prop for a village cottage.',
    maxRecommendedBytes: 1_200_000,
  },
  {
    id: 'fantasy-house-003',
    kind: 'gltf',
    url: '/assets/models/fantasy/house_003.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy house prop for a village cottage.',
    maxRecommendedBytes: 1_200_000,
  },
  {
    id: 'fantasy-barrel-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/barrel_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy barrel prop for village dressing.',
    maxRecommendedBytes: 900_000,
  },
  {
    id: 'fantasy-box-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/box_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy box prop for crate blockers and dressing.',
    maxRecommendedBytes: 900_000,
  },
  {
    id: 'fantasy-pointer-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/pointer_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy pointer sign used near readable village labels.',
    maxRecommendedBytes: 900_000,
  },
  {
    id: 'fantasy-cart-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/cart_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy cart prop for one large village blocker.',
    maxRecommendedBytes: 900_000,
  },
  {
    id: 'fantasy-bag-001',
    kind: 'gltf',
    url: '/assets/models/fantasy/bag_001.glb',
    sourcePack: 'fantasy-free-low-poly',
    defaultScale: 1,
    notes: 'Selected low-poly fantasy bag prop for non-blocking dressing.',
    maxRecommendedBytes: 900_000,
  },
  {
    id: 'creative-courier-character',
    kind: 'gltf',
    url: '/assets/models/characters/courier-creative-character.glb',
    sourcePack: 'creative-characters-free',
    defaultScale: 1,
    notes: 'Selected assembled low-poly character visual for the player courier. Movement and collision still use the existing player controller.',
    maxRecommendedBytes: 2_500_000,
  },
];

export const selectedNatureAssetIds = [
  'nature-tree01',
  'nature-rock',
  'nature-simple-bush',
] as const;

export const selectedFantasyAssetIds = [
  'fantasy-house-001',
  'fantasy-house-002',
  'fantasy-house-003',
  'fantasy-barrel-001',
  'fantasy-box-001',
  'fantasy-pointer-001',
  'fantasy-cart-001',
  'fantasy-bag-001',
] as const;

export const selectedCharacterAssetIds = [
  'creative-courier-character',
] as const;

export const getAssetDefinition = (assetId: string): AssetDefinition | undefined => (
  assetRegistry.find((asset) => asset.id === assetId)
);

export const isKnownAssetId = (assetId: string): boolean => getAssetDefinition(assetId) !== undefined;

export const getSelectedNatureAssets = (): readonly AssetDefinition[] => (
  selectedNatureAssetIds.map((assetId) => {
    const asset = getAssetDefinition(assetId);

    if (!asset) {
      throw new Error(`Missing selected nature asset: ${assetId}`);
    }

    return asset;
  })
);

export const getSelectedFantasyAssets = (): readonly AssetDefinition[] => (
  selectedFantasyAssetIds.map((assetId) => {
    const asset = getAssetDefinition(assetId);

    if (!asset) {
      throw new Error(`Missing selected fantasy asset: ${assetId}`);
    }

    return asset;
  })
);

export const getSelectedCharacterAssets = (): readonly AssetDefinition[] => (
  selectedCharacterAssetIds.map((assetId) => {
    const asset = getAssetDefinition(assetId);

    if (!asset) {
      throw new Error(`Missing selected character asset: ${assetId}`);
    }

    return asset;
  })
);
