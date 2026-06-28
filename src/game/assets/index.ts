export {
  assetRegistry,
  getAssetDefinition,
  getSelectedCharacterAssets,
  getSelectedFantasyAssets,
  getSelectedNatureAssets,
  isKnownAssetId,
  selectedCharacterAssetIds,
  selectedFantasyAssetIds,
  selectedNatureAssetIds,
} from './assetRegistry';
export {
  canLoadGltfAssets,
  createAssetCache,
  createGltfAssetInstance,
  createModelInstance,
  disposeAssetCache,
  disposeAssetInstance,
  disposeCachedAsset,
  getAssetInstanceCount,
  getAssetRuntimeStats,
  loadGltfAsset,
  loadGltfAssetEntry,
  loadGltfAssetInstance,
  loadModel,
  loadModelInstance,
} from './gltfLoader';
export type {
  AssetDefinition,
  GltfAssetDefinition,
} from './assetRegistry';
export type {
  AssetCache,
  AssetCacheOptions,
  AssetInstanceHandle,
  AssetRuntimeStats,
  CachedGltfAsset,
} from './gltfLoader';
