import * as THREE from 'three';

export interface PlaygroundVisualBoundsDebugView {
  object: THREE.Group;
  setObjectBounds(objectId: string, box: THREE.Box3): void;
  clearObjectBounds(objectId: string): void;
  isVisible(): boolean;
  setVisible(visible: boolean): void;
  toggle(): boolean;
  dispose(): void;
}

const visualBoundsColor = 0xff5ad1;

const disposeDebugObject = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    const maybeGeometry = (child as unknown as { geometry?: THREE.BufferGeometry }).geometry;
    const maybeMaterial = (child as unknown as { material?: THREE.Material | THREE.Material[] }).material;

    maybeGeometry?.dispose();

    if (Array.isArray(maybeMaterial)) {
      maybeMaterial.forEach((material) => material.dispose());
      return;
    }

    maybeMaterial?.dispose();
  });
};

const configureHelperMaterial = (helper: THREE.Box3Helper): void => {
  const materials = Array.isArray(helper.material) ? helper.material : [helper.material];

  materials.forEach((material) => {
    material.depthTest = false;
    material.transparent = true;
    material.opacity = 0.9;
  });
};

export const createPlaygroundVisualBoundsDebugView = (): PlaygroundVisualBoundsDebugView => {
  const group = new THREE.Group();
  const helpersByObjectId = new Map<string, THREE.Box3Helper>();
  let disposed = false;

  group.name = 'debug:playground-visual-asset-bounds';
  group.visible = false;

  const clearObjectBounds = (objectId: string): void => {
    const helper = helpersByObjectId.get(objectId);

    if (!helper) {
      return;
    }

    helpersByObjectId.delete(objectId);
    helper.parent?.remove(helper);
    disposeDebugObject(helper);
  };

  return {
    object: group,
    setObjectBounds(objectId, box) {
      if (disposed) {
        return;
      }

      clearObjectBounds(objectId);

      const helper = new THREE.Box3Helper(box.clone(), visualBoundsColor);
      helper.name = `debug:visual-asset-bounds:${objectId}`;
      helper.userData.label = helper.name;
      helper.renderOrder = 11;
      configureHelperMaterial(helper);
      helpersByObjectId.set(objectId, helper);
      group.add(helper);
    },
    clearObjectBounds,
    isVisible() {
      return group.visible;
    },
    setVisible(visible) {
      group.visible = visible;
    },
    toggle() {
      group.visible = !group.visible;
      return group.visible;
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      [...helpersByObjectId.keys()].forEach(clearObjectBounds);
      group.parent?.remove(group);
    },
  };
};
