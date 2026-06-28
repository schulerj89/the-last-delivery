export interface GltfAssetDefinition {
  id: string;
  kind: 'gltf' | 'fbx';
  url: string;
  sourcePack: string;
  defaultScale: number;
  notes?: string;
  maxRecommendedBytes: number;
}

export type AssetDefinition = GltfAssetDefinition;

const convertedNatureUrl = (sourceStem: string): string => `/assets/models/nature/converted-glb/${sourceStem}.glb`;

const createConvertedNatureAsset = (
  id: string,
  sourceStem: string,
  use: string,
  maxRecommendedBytes = 150_000,
): AssetDefinition => ({
  id,
  kind: 'gltf',
  url: convertedNatureUrl(sourceStem),
  sourcePack: 'low-poly-nature-pack-lite',
  defaultScale: 1,
  notes: `Converted GLB from Low Poly Nature Pack Lite ${sourceStem}.fbx for ${use}.`,
  maxRecommendedBytes,
});

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
  createConvertedNatureAsset('nature-tree01', 'tree01', 'the village forest edge'),
  createConvertedNatureAsset('nature-rock', 'rock', 'path and boundary framing', 50_000),
  createConvertedNatureAsset('nature-simple-bush', 'simple_bush', 'low-cost foliage clusters', 50_000),
  createConvertedNatureAsset('nature-branch01', 'branch01', 'branch dressing'),
  createConvertedNatureAsset('nature-bush-berries-blue', 'bush_berries_blue', 'blue-berry bush dressing'),
  createConvertedNatureAsset('nature-bush-berries-empty', 'bush_berries_empty', 'empty berry bush dressing', 50_000),
  createConvertedNatureAsset('nature-bush-berries-red', 'bush_berries_red', 'red-berry bush dressing'),
  createConvertedNatureAsset('nature-dead-tree', 'dead_tree', 'dead tree boundary dressing', 200_000),
  createConvertedNatureAsset('nature-fence', 'fence', 'editor-placeable nature fence dressing'),
  createConvertedNatureAsset('nature-flower-orange', 'flower02_orange', 'orange flower dressing'),
  createConvertedNatureAsset('nature-flower-pink', 'flower02_pink', 'pink flower dressing'),
  createConvertedNatureAsset('nature-flower-yellow', 'flower02_yellow', 'yellow flower dressing'),
  createConvertedNatureAsset('nature-grass-array', 'grass_array01', 'larger grass patch dressing', 220_000),
  createConvertedNatureAsset('nature-grass01', 'grass01', 'grass clump dressing', 50_000),
  createConvertedNatureAsset('nature-grass03', 'grass03', 'small grass clump dressing', 50_000),
  createConvertedNatureAsset('nature-hat-mushroom-brown', 'hat_mushroom_brown', 'brown cap mushroom dressing', 50_000),
  createConvertedNatureAsset('nature-hat-mushroom-red', 'hat_mushroom_red', 'red cap mushroom dressing', 50_000),
  createConvertedNatureAsset('nature-hills01', 'hills01', 'low hill backdrop dressing'),
  createConvertedNatureAsset('nature-hills02', 'hills02', 'low hill variant dressing'),
  createConvertedNatureAsset('nature-log', 'log', 'log dressing'),
  createConvertedNatureAsset('nature-mountain01', 'mountain01', 'mountain backdrop dressing', 220_000),
  createConvertedNatureAsset('nature-mushroom-brown', 'mushrooom01_brown', 'brown mushroom dressing', 50_000),
  createConvertedNatureAsset('nature-mushroom-red', 'mushrooom01_red', 'red mushroom dressing', 50_000),
  createConvertedNatureAsset('nature-pine01', 'pine01', 'pine tree dressing', 75_000),
  createConvertedNatureAsset('nature-plant02', 'plant02', 'leafy plant dressing', 240_000),
  createConvertedNatureAsset('nature-rock-fbx', 'rock', 'alternate rock palette access', 50_000),
  createConvertedNatureAsset('nature-rock-big01', 'rock_big01', 'large rock dressing', 75_000),
  createConvertedNatureAsset('nature-simple-bush-fbx', 'simple_bush', 'alternate simple bush palette access', 50_000),
  createConvertedNatureAsset('nature-stone01', 'stone01', 'stone dressing', 50_000),
  createConvertedNatureAsset('nature-tent-blue', 'tent_blue', 'blue tent dressing'),
  createConvertedNatureAsset('nature-tent-red', 'tent_red', 'red tent dressing'),
  createConvertedNatureAsset('nature-tile-flat', 'tile_flat', 'flat ground tile dressing', 25_000),
  createConvertedNatureAsset('nature-tree-dead01', 'tree_dead01', 'dead tree variant dressing', 75_000),
  createConvertedNatureAsset('nature-tree01-fbx', 'tree01', 'alternate tree palette access'),
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
    url: '/assets/models/characters/courier-creative-character_2.glb',
    sourcePack: 'creative-characters-free',
    defaultScale: 1,
    notes: 'Selected assembled low-poly character visual for the player courier. Movement and collision still use the existing player controller.',
    maxRecommendedBytes: 2_500_000,
  },
  {
    id: 'creative-courier-character-animations',
    kind: 'gltf',
    url: '/assets/models/characters/courier-creative-character.glb',
    sourcePack: 'creative-characters-free',
    defaultScale: 1,
    notes: 'Animation-only Creative Characters GLB used to drive the selected courier visual mesh.',
    maxRecommendedBytes: 2_500_000,
  },
];

export const selectedNatureAssetIds = [
  'nature-tree01',
  'nature-rock',
  'nature-simple-bush',
  'nature-branch01',
  'nature-bush-berries-blue',
  'nature-bush-berries-empty',
  'nature-bush-berries-red',
  'nature-dead-tree',
  'nature-fence',
  'nature-flower-orange',
  'nature-flower-pink',
  'nature-flower-yellow',
  'nature-grass-array',
  'nature-grass01',
  'nature-grass03',
  'nature-hat-mushroom-brown',
  'nature-hat-mushroom-red',
  'nature-hills01',
  'nature-hills02',
  'nature-log',
  'nature-mountain01',
  'nature-mushroom-brown',
  'nature-mushroom-red',
  'nature-pine01',
  'nature-plant02',
  'nature-rock-fbx',
  'nature-rock-big01',
  'nature-simple-bush-fbx',
  'nature-stone01',
  'nature-tent-blue',
  'nature-tent-red',
  'nature-tile-flat',
  'nature-tree-dead01',
  'nature-tree01-fbx',
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
  'creative-courier-character-animations',
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
