import * as THREE from 'three';

export interface TrackObjectOptions {
  disposeResources?: boolean;
  disposeTextures?: boolean;
}

export interface ResourceTracker {
  trackObject3D<T extends THREE.Object3D>(object: T, options?: TrackObjectOptions): T;
  trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T;
  trackMaterial<T extends THREE.Material | THREE.Material[]>(material: T, disposeTextures?: boolean): T;
  trackTexture<T extends THREE.Texture>(texture: T): T;
  addCleanup(cleanup: () => void): () => void;
  dispose(): void;
}

const texturePropertyNames = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'gradientMap',
  'lightMap',
  'map',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'specularColorMap',
  'specularIntensityMap',
  'specularMap',
  'thicknessMap',
  'transmissionMap',
];

const disposeTextureReferences = (
  material: THREE.Material,
  disposedTextures: Set<THREE.Texture>,
): void => {
  const materialRecord = material as unknown as Record<string, unknown>;

  texturePropertyNames.forEach((propertyName) => {
    const value = materialRecord[propertyName];

    if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  });
};

export const disposeMaterial = (
  material: THREE.Material | THREE.Material[],
  disposeTextures = true,
  disposedMaterials = new Set<THREE.Material>(),
  disposedTextures = new Set<THREE.Texture>(),
): void => {
  const materials = Array.isArray(material) ? material : [material];

  materials.forEach((currentMaterial) => {
    if (disposedMaterials.has(currentMaterial)) {
      return;
    }

    disposedMaterials.add(currentMaterial);

    if (disposeTextures) {
      disposeTextureReferences(currentMaterial, disposedTextures);
    }

    currentMaterial.dispose();
  });
};

const disposeObjectResources = (
  object: THREE.Object3D,
  disposeTextures = true,
): void => {
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

    disposeMaterial(child.material, disposeTextures, disposedMaterials, disposedTextures);
  });
};

const runObjectCleanupCallbacks = (object: THREE.Object3D): void => {
  const cleanupCallbacks: Array<() => void> = [];

  object.traverse((child) => {
    const cleanup = child.userData.disposeAssetInstance;

    if (typeof cleanup === 'function') {
      cleanupCallbacks.push(() => {
        cleanup();
        delete child.userData.disposeAssetInstance;
      });
    }
  });

  cleanupCallbacks.forEach((cleanup) => {
    cleanup();
  });
};

export const createResourceTracker = (): ResourceTracker => {
  const cleanupCallbacks = new Set<() => void>();
  let disposed = false;

  const addCleanup = (cleanup: () => void): (() => void) => {
    if (disposed) {
      cleanup();
      return () => undefined;
    }

    cleanupCallbacks.add(cleanup);
    return () => {
      cleanupCallbacks.delete(cleanup);
    };
  };

  return {
    trackObject3D(object, options = {}) {
      addCleanup(() => {
        runObjectCleanupCallbacks(object);
        object.parent?.remove(object);

        if (options.disposeResources) {
          disposeObjectResources(object, options.disposeTextures ?? true);
        }
      });
      return object;
    },
    trackGeometry(geometry) {
      addCleanup(() => {
        geometry.dispose();
      });
      return geometry;
    },
    trackMaterial(material, disposeTextures = true) {
      addCleanup(() => {
        disposeMaterial(material, disposeTextures);
      });
      return material;
    },
    trackTexture(texture) {
      addCleanup(() => {
        texture.dispose();
      });
      return texture;
    },
    addCleanup,
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;

      [...cleanupCallbacks].reverse().forEach((cleanup) => {
        cleanup();
      });
      cleanupCallbacks.clear();
    },
  };
};
