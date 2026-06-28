import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getAssetDefinition } from './assetRegistry';

const loader = new GLTFLoader();
const loadedScenes = new Map<string, Promise<THREE.Group>>();
const failedAssets = new Set<string>();

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

export const canLoadGltfAssets = (): boolean => typeof window !== 'undefined';

const configureAssetScene = (assetId: string, scene: THREE.Group): THREE.Group => {
  const root = scene;
  root.name = `asset:${assetId}`;
  root.userData.assetId = assetId;
  root.traverse((object) => {
    object.userData.assetId = assetId;

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

  const cachedScene = loadedScenes.get(assetId);
  if (cachedScene) {
    return cachedScene;
  }

  console.info(`[assets] Loading ${asset.id} from ${asset.url}.`);

  const scenePromise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      asset.url,
      (gltf) => {
        console.info(`[assets] Loaded ${asset.id}.`);
        resolve(configureAssetScene(asset.id, gltf.scene));
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

  loadedScenes.set(assetId, scenePromise);
  return scenePromise;
};

export const loadGltfAssetInstance = async (assetId: string): Promise<THREE.Object3D> => {
  const scene = await loadGltfAsset(assetId);
  const instance = scene.clone(true);
  instance.name = `asset-instance:${assetId}`;
  instance.userData.assetId = assetId;
  return instance;
};
