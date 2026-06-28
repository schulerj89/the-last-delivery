import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getAssetDefinition, type AssetDefinition } from './assetRegistry';

const loader = new GLTFLoader();
const loadedModels = new Map<string, Promise<THREE.Group>>();
const failedAssets = new Set<string>();
const loadingAssets = new Set<string>();

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

export const canLoadGltfAssets = (): boolean => typeof window !== 'undefined';

const applyDefaultScale = (asset: AssetDefinition, scene: THREE.Group): void => {
  scene.scale.multiplyScalar(asset.defaultScale);
};

const configureAssetScene = (asset: AssetDefinition, scene: THREE.Group): THREE.Group => {
  const root = scene;
  applyDefaultScale(asset, root);
  root.name = `asset:${asset.id}`;
  root.userData.assetId = asset.id;
  root.traverse((object) => {
    object.userData.assetId = asset.id;

    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return root;
};

export const loadGltfAsset = (assetId: string): Promise<THREE.Group> => {
  const asset = getAssetDefinition(assetId);

  if (!asset) {
    return Promise.reject(new Error(`Unknown GLB asset id: ${assetId}`));
  }

  if (!canLoadGltfAssets()) {
    return Promise.reject(new Error(`GLB asset loading is only available in the browser: ${assetId}`));
  }

  const cachedModel = loadedModels.get(assetId);
  if (cachedModel) {
    return cachedModel;
  }

  if (!loadingAssets.has(asset.id)) {
    loadingAssets.add(asset.id);
    console.info(`[assets] Loading model ${asset.id} from ${asset.url}.`);
  }

  const modelPromise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      asset.url,
      (gltf) => {
        console.info(`[assets] Loaded model ${asset.id}.`);
        resolve(configureAssetScene(asset, gltf.scene));
      },
      undefined,
      (error) => {
        if (!failedAssets.has(asset.id)) {
          failedAssets.add(asset.id);
          console.warn(`[assets] Failed to load ${asset.id}; keeping primitive fallback. ${getErrorMessage(error)}`);
        }

        reject(error);
      },
    );
  });

  loadedModels.set(assetId, modelPromise);
  return modelPromise;
};

export const loadModel = (assetId: string): Promise<THREE.Group> => loadGltfAsset(assetId);

export const loadModelInstance = async (assetId: string): Promise<THREE.Object3D> => {
  const scene = await loadGltfAsset(assetId);
  const instance = scene.clone(true);
  instance.name = `asset-instance:${assetId}`;
  instance.userData.assetId = assetId;
  return instance;
};

export const loadGltfAssetInstance = loadModelInstance;
