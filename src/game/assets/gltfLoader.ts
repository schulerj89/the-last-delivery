import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeMaterial } from '../resources';
import { getAssetDefinition, type AssetDefinition } from './assetRegistry';

export interface CachedGltfAsset {
  asset: AssetDefinition;
  source: THREE.Group;
  animationNames: readonly string[];
}

export interface AssetRuntimeStats {
  loadedAssetIds: string[];
  sceneInstanceCountsByAssetId: Record<string, number>;
  totalSceneInstances: number;
}

export interface AssetInstanceHandle {
  assetId: string;
  object: THREE.Object3D;
  isDisposed(): boolean;
  dispose(): void;
}

export interface AssetCacheOptions {
  canLoad?: () => boolean;
  loadSource?: (asset: AssetDefinition) => Promise<THREE.Group>;
  log?: Pick<Console, 'info' | 'warn'>;
}

export interface AssetCache {
  canLoad(): boolean;
  loadAssetEntry(assetId: string): Promise<CachedGltfAsset>;
  loadSource(assetId: string): Promise<THREE.Group>;
  createInstance(assetId: string): Promise<AssetInstanceHandle>;
  disposeInstance(instance: AssetInstanceHandle): void;
  disposeCachedAsset(assetId: string): boolean;
  disposeCache(): string[];
  getRuntimeStats(): AssetRuntimeStats;
  getInstanceCount(assetId: string): number;
}

const loader = new GLTFLoader();

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

const defaultCanLoad = (): boolean => typeof window !== 'undefined';

export const canLoadGltfAssets = (): boolean => runtimeAssetCache.canLoad();

const applyDefaultScale = (asset: AssetDefinition, scene: THREE.Group): void => {
  scene.scale.multiplyScalar(asset.defaultScale);
};

const getAnimationNames = (animations: readonly THREE.AnimationClip[]): readonly string[] => (
  animations.map((animation, index) => animation.name || `animation-${index + 1}`)
);

const getSceneAnimationNames = (scene: THREE.Object3D): readonly string[] => (
  Array.isArray(scene.userData.animationNames) ? scene.userData.animationNames : []
);

const configureAssetScene = (
  asset: AssetDefinition,
  scene: THREE.Group,
  animationNames: readonly string[] = [],
): THREE.Group => {
  const root = scene;
  applyDefaultScale(asset, root);
  root.name = `asset:${asset.id}:source`;
  root.userData.assetId = asset.id;
  root.userData.animationNames = [...animationNames];
  root.traverse((object) => {
    object.userData.assetId = asset.id;

    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return root;
};

const loadGltfSource = (asset: AssetDefinition): Promise<THREE.Group> => (
  new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      asset.url,
      (gltf) => {
        resolve(configureAssetScene(asset, gltf.scene, getAnimationNames(gltf.animations)));
      },
      undefined,
      reject,
    );
  })
);

const disposeObjectResources = (object: THREE.Object3D): void => {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (!disposedGeometries.has(child.geometry)) {
      disposedGeometries.add(child.geometry);
      child.geometry.dispose();
    }

    disposeMaterial(child.material, true, disposedMaterials, disposedTextures);
  });
};

const incrementInstanceCount = (
  instanceCounts: Map<string, number>,
  assetId: string,
): void => {
  instanceCounts.set(assetId, (instanceCounts.get(assetId) ?? 0) + 1);
};

const decrementInstanceCount = (
  instanceCounts: Map<string, number>,
  assetId: string,
): void => {
  const nextCount = Math.max(0, (instanceCounts.get(assetId) ?? 0) - 1);
  instanceCounts.set(assetId, nextCount);
};

const createStats = (
  loadedEntries: Map<string, CachedGltfAsset>,
  instanceCounts: Map<string, number>,
): AssetRuntimeStats => {
  const loadedAssetIds = [...loadedEntries.keys()].sort();
  const sceneInstanceCountsByAssetId: Record<string, number> = {};

  loadedAssetIds.forEach((assetId) => {
    sceneInstanceCountsByAssetId[assetId] = instanceCounts.get(assetId) ?? 0;
  });

  instanceCounts.forEach((count, assetId) => {
    if (count > 0 && sceneInstanceCountsByAssetId[assetId] === undefined) {
      sceneInstanceCountsByAssetId[assetId] = count;
    }
  });

  return {
    loadedAssetIds,
    sceneInstanceCountsByAssetId,
    totalSceneInstances: Object.values(sceneInstanceCountsByAssetId).reduce((sum, count) => sum + count, 0),
  };
};

export const createAssetCache = ({
  canLoad = defaultCanLoad,
  loadSource = loadGltfSource,
  log = console,
}: AssetCacheOptions = {}): AssetCache => {
  const cachedEntryPromises = new Map<string, Promise<CachedGltfAsset>>();
  const loadedEntries = new Map<string, CachedGltfAsset>();
  const failedAssets = new Set<string>();
  const loadingAssets = new Set<string>();
  const instanceCounts = new Map<string, number>();
  let cacheDisposed = false;

  const loadAssetEntry = (assetId: string): Promise<CachedGltfAsset> => {
    const asset = getAssetDefinition(assetId);

    if (!asset) {
      return Promise.reject(new Error(`Unknown GLB asset id: ${assetId}`));
    }

    if (cacheDisposed) {
      return Promise.reject(new Error(`GLB asset cache has been disposed: ${assetId}`));
    }

    if (!canLoad()) {
      return Promise.reject(new Error(`GLB asset loading is only available in the browser: ${assetId}`));
    }

    const cachedEntryPromise = cachedEntryPromises.get(assetId);
    if (cachedEntryPromise) {
      return cachedEntryPromise;
    }

    if (!loadingAssets.has(asset.id)) {
      loadingAssets.add(asset.id);
      log.info(`[assets] Loading model ${asset.id} from ${asset.url}.`);
    }

    const entryPromise = loadSource(asset)
      .then((source) => {
        if (cacheDisposed) {
          disposeObjectResources(source);
          throw new Error(`GLB asset cache was disposed before ${asset.id} finished loading.`);
        }

        const animationNames = getSceneAnimationNames(source);
        const entry = { asset, source, animationNames };
        loadedEntries.set(asset.id, entry);
        failedAssets.delete(asset.id);
        log.info(`[assets] Loaded model ${asset.id}.`);
        if (animationNames.length > 0) {
          log.info(`[assets] ${asset.id} animations: ${animationNames.join(', ')}.`);
        }
        return entry;
      })
      .catch((error: unknown) => {
        if (!failedAssets.has(asset.id)) {
          failedAssets.add(asset.id);
          log.warn(`[assets] Failed to load ${asset.id}; keeping primitive fallback. ${getErrorMessage(error)}`);
        }

        throw error;
      });

    cachedEntryPromises.set(assetId, entryPromise);
    return entryPromise;
  };

  const createInstance = async (assetId: string): Promise<AssetInstanceHandle> => {
    const entry = await loadAssetEntry(assetId);
    const object = entry.source.clone(true);
    let disposed = false;

    incrementInstanceCount(instanceCounts, assetId);
    object.name = `asset-instance:${assetId}`;
    object.userData.assetId = assetId;

    const handle: AssetInstanceHandle = {
      assetId,
      object,
      isDisposed() {
        return disposed;
      },
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;
        object.parent?.remove(object);
        decrementInstanceCount(instanceCounts, assetId);
      },
    };

    // A world instance is just a clone of the cached source asset. Disposing it
    // removes that clone and releases its usage count; it must not dispose the
    // shared GLB geometry, materials, or textures still owned by the cache.
    object.userData.disposeAssetInstance = handle.dispose;
    return handle;
  };

  const disposeCachedAsset = (assetId: string): boolean => {
    if ((instanceCounts.get(assetId) ?? 0) > 0) {
      return false;
    }

    const entry = loadedEntries.get(assetId);
    if (!entry) {
      return false;
    }

    // A cached source asset owns the parsed GLB resources. It is only safe to
    // dispose after every world instance has been disposed, because clones
    // share the source geometry, materials, and textures.
    disposeObjectResources(entry.source);
    loadedEntries.delete(assetId);
    cachedEntryPromises.delete(assetId);
    failedAssets.delete(assetId);
    loadingAssets.delete(assetId);
    instanceCounts.delete(assetId);
    return true;
  };

  return {
    canLoad,
    loadAssetEntry,
    loadSource(assetId) {
      return loadAssetEntry(assetId).then((entry) => entry.source);
    },
    createInstance,
    disposeInstance(instance) {
      instance.dispose();
    },
    disposeCachedAsset,
    disposeCache() {
      cacheDisposed = true;
      return [...loadedEntries.keys()].filter((assetId) => disposeCachedAsset(assetId));
    },
    getRuntimeStats() {
      return createStats(loadedEntries, instanceCounts);
    },
    getInstanceCount(assetId) {
      return instanceCounts.get(assetId) ?? 0;
    },
  };
};

const runtimeAssetCache = createAssetCache();

export const loadGltfAssetEntry = (assetId: string): Promise<CachedGltfAsset> => (
  runtimeAssetCache.loadAssetEntry(assetId)
);

export const loadGltfAsset = (assetId: string): Promise<THREE.Group> => (
  runtimeAssetCache.loadSource(assetId)
);

export const loadModel = (assetId: string): Promise<THREE.Group> => loadGltfAsset(assetId);

export const createModelInstance = (assetId: string): Promise<AssetInstanceHandle> => (
  runtimeAssetCache.createInstance(assetId)
);

export const createGltfAssetInstance = createModelInstance;

export const loadModelInstance = async (assetId: string): Promise<THREE.Object3D> => {
  const instance = await createModelInstance(assetId);
  return instance.object;
};

export const loadGltfAssetInstance = loadModelInstance;

export const disposeAssetInstance = (instance: AssetInstanceHandle): void => {
  runtimeAssetCache.disposeInstance(instance);
};

export const disposeCachedAsset = (assetId: string): boolean => (
  runtimeAssetCache.disposeCachedAsset(assetId)
);

export const disposeAssetCache = (): string[] => runtimeAssetCache.disposeCache();

export const getAssetRuntimeStats = (): AssetRuntimeStats => runtimeAssetCache.getRuntimeStats();

export const getAssetInstanceCount = (assetId: string): number => (
  runtimeAssetCache.getInstanceCount(assetId)
);
