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
];

export const getAssetDefinition = (assetId: string): AssetDefinition | undefined => (
  assetRegistry.find((asset) => asset.id === assetId)
);

export const isKnownAssetId = (assetId: string): boolean => getAssetDefinition(assetId) !== undefined;
