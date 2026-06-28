import * as THREE from 'three';
import { canLoadGltfAssets, createModelInstance, type AssetInstanceHandle } from '../assets';

export const playerCharacterAssetId = 'creative-courier-character';

export const playerCharacterVisualSettings = {
  assetId: playerCharacterAssetId,
  scale: 0.55,
  rotationY: Math.PI,
  offset: [0, 0, 0] as THREE.Vector3Tuple,
  visibleMeshNames: [
    'Body_010',
    'Male_emotion_usual_001',
    'Hairstyle_male_010',
    'Hat_049',
    'Outwear_036',
    'Pants_010',
    'Shoe_Sneakers_009',
    'Gloves_006',
  ],
} as const;

export interface PlayerVisual {
  object: THREE.Group;
  fallback: THREE.Group;
  dispose(): void;
}

const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.55 });
const facingMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5f8f, roughness: 0.55 });

export const createPlayerFallbackVisual = (): THREE.Group => {
  const player = new THREE.Group();
  player.name = 'player:placeholder';
  player.userData.label = 'player:placeholder';

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.9, 12),
    playerMaterial,
  );
  body.name = 'player:placeholder-body';
  body.userData.label = body.name;
  body.position.y = 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);

  const facingMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.5),
    facingMaterial,
  );
  facingMarker.name = 'player:facing-marker';
  facingMarker.userData.label = facingMarker.name;
  facingMarker.position.set(0, 0.55, -0.38);
  facingMarker.castShadow = true;
  player.add(facingMarker);

  return player;
};

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

const getAnimationNames = (model: THREE.Object3D): readonly string[] => (
  Array.isArray(model.userData.animationNames) ? model.userData.animationNames : []
);

const configureCharacterModel = (model: THREE.Object3D): void => {
  const visibleMeshes = new Set<string>(playerCharacterVisualSettings.visibleMeshNames);

  model.name = 'player:character-model';
  model.userData.label = model.name;
  model.position.set(...playerCharacterVisualSettings.offset);
  model.rotation.y = playerCharacterVisualSettings.rotationY;
  model.scale.multiplyScalar(playerCharacterVisualSettings.scale);

  model.traverse((child) => {
    child.userData.label = child.name || model.name;

    if (child instanceof THREE.Mesh) {
      child.visible = visibleMeshes.size === 0 || visibleMeshes.has(child.name);
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

export const createPlayerVisual = (log: Pick<Console, 'info' | 'warn'> = console): PlayerVisual => {
  const object = new THREE.Group();
  object.name = 'player';
  object.userData.label = 'player';

  const fallback = createPlayerFallbackVisual();
  object.add(fallback);

  let characterInstance: AssetInstanceHandle | null = null;
  let disposed = false;

  if (canLoadGltfAssets()) {
    void createModelInstance(playerCharacterVisualSettings.assetId)
      .then((instance) => {
        if (disposed) {
          instance.dispose();
          return;
        }

        characterInstance = instance;
        configureCharacterModel(instance.object);
        object.add(instance.object);
        fallback.visible = false;

        const animationNames = getAnimationNames(instance.object);
        if (animationNames.length > 0) {
          log.info(`[player] Character animations available: ${animationNames.join(', ')}.`);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          fallback.visible = true;
          log.warn(`[player] Character model unavailable; keeping primitive fallback. ${getErrorMessage(error)}`);
        }
      });
  }

  return {
    object,
    fallback,
    dispose() {
      disposed = true;
      characterInstance?.dispose();
      characterInstance = null;
    },
  };
};
