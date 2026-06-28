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
    id: 'nature-branch01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/branch01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX branch prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-bush-berries-blue',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/bush_berries_blue.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX blue-berry bush prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-bush-berries-empty',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/bush_berries_empty.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX empty berry bush prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-bush-berries-red',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/bush_berries_red.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX red-berry bush prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-dead-tree',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/dead_tree.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX dead tree prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-fence',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/fence.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX fence prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-flower-orange',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/flower02_orange.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX orange flower prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-flower-pink',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/flower02_pink.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX pink flower prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-flower-yellow',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/flower02_yellow.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX yellow flower prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-grass-array',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/grass_array01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX grass patch prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-grass01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/grass01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX grass clump prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-grass03',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/grass03.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX small grass clump prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-hat-mushroom-brown',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/hat_mushroom_brown.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX brown cap mushroom prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-hat-mushroom-red',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/hat_mushroom_red.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX red cap mushroom prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-hills01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/hills01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX low hill prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-hills02',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/hills02.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX low hill variant from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-log',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/log.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX log prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-mountain01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/mountain01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX mountain backdrop prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-mushroom-brown',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/mushrooom01_brown.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX brown mushroom prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-mushroom-red',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/mushrooom01_red.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX red mushroom prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-pine01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/pine01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX pine tree prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-plant02',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/plant02.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX leafy plant prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-rock-fbx',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/rock.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX rock prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-rock-big01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/rock_big01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX large rock prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-simple-bush-fbx',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/simple_bush.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX simple bush prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-stone01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/stone01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX stone prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-tent-blue',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/tent_blue.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX blue tent prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-tent-red',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/tent_red.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX red tent prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-tile-flat',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/tile_flat.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX flat ground tile prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-tree-dead01',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/tree_dead01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX dead tree variant from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
  },
  {
    id: 'nature-tree01-fbx',
    kind: 'fbx',
    url: '/assets/models/nature/source-fbx/tree01.fbx',
    sourcePack: 'low-poly-nature-pack-lite',
    defaultScale: 1,
    notes: 'Source FBX tree prop from the complete lightweight nature runtime set.',
    maxRecommendedBytes: 150_000,
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
