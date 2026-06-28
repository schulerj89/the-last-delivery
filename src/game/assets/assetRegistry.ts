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
];

export const selectedNatureAssetIds = [
  'nature-tree01',
  'nature-rock',
  'nature-simple-bush',
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
