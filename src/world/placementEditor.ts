import * as THREE from 'three';
import type { WorldObjectDefinition } from './types';
import { villageWorldObjects } from './villageDefinition';

export const placementEditorConfig = {
  snapValues: [0.1, 0.25, 1] as const,
  defaultSnapIndex: 1,
  rotationStepRadians: THREE.MathUtils.degToRad(15),
  scaleStep: 0.05,
  selectionRadiusPadding: 0.8,
} as const;

export interface EditablePlacementObject {
  id: string;
  kind: WorldObjectDefinition['kind'];
  worldObject: WorldObjectDefinition;
}

export interface PlacementTransformDraft {
  id: string;
  position: THREE.Vector3Tuple;
  rotationY: number;
  scaleMultiplier: number;
  yOffset: number;
}

export interface PlacementEditor {
  object: THREE.Group;
  isActive(): boolean;
  setActive(active: boolean): void;
  handleKeyDown(event: KeyboardEvent): boolean;
  getSelectedObjectId(): string | null;
  dispose(): void;
}

interface PlacementEditorOptions {
  sceneRoot: THREE.Object3D;
  camera: THREE.Camera;
  domElement: HTMLElement;
  parent: HTMLElement;
  isLayoutModeActive: () => boolean;
}

interface SceneObjectBaseline {
  object: THREE.Object3D;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

const formatNumber = (value: number): string => (
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
);

const formatTuple = (values: readonly number[]): string => (
  `[${values.map(formatNumber).join(', ')}]`
);

const getAssetRenderSettings = (object: WorldObjectDefinition): Extract<WorldObjectDefinition['render'], { mode: 'asset' }> | undefined => (
  object.render?.mode === 'asset' ? object.render : undefined
);

export const getPlacementEditorSnapValues = (): readonly number[] => placementEditorConfig.snapValues;

export const createEditablePlacementObjects = (
  worldObjects: readonly WorldObjectDefinition[] = villageWorldObjects,
): readonly EditablePlacementObject[] => (
  worldObjects
    .filter((object) => object.dimensions)
    .map((object) => ({
      id: object.id,
      kind: object.kind,
      worldObject: object,
    }))
);

export const getEditablePlacementObjectById = (
  objectId: string,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): EditablePlacementObject | null => (
  editableObjects.find((object) => object.id === objectId) ?? null
);

export const createPlacementTransformDraft = (
  object: WorldObjectDefinition,
): PlacementTransformDraft => {
  const assetRenderSettings = getAssetRenderSettings(object);

  return {
    id: object.id,
    position: [...object.position],
    rotationY: assetRenderSettings?.rotation?.[1] ?? object.rotation?.[1] ?? 0,
    scaleMultiplier: assetRenderSettings?.scaleMultiplier ?? 1,
    yOffset: assetRenderSettings?.yOffset ?? 0,
  };
};

export const serializePlacementTransform = (
  object: WorldObjectDefinition,
  draft: PlacementTransformDraft,
): string => {
  const assetRenderSettings = getAssetRenderSettings(object);
  const lines = [
    `{`,
    `  id: '${object.id}',`,
    `  position: ${formatTuple(draft.position)},`,
    `  rotation: ${formatTuple([0, draft.rotationY, 0])},`,
  ];

  if (assetRenderSettings) {
    lines.push(
      `  render: {`,
      `    mode: 'asset',`,
      `    assetId: '${assetRenderSettings.assetId}',`,
      `    scaleMultiplier: ${formatNumber(draft.scaleMultiplier)},`,
      `    yOffset: ${formatNumber(draft.yOffset)},`,
      `    rotation: ${formatTuple([0, draft.rotationY, 0])},`,
      `  },`,
    );
  } else if (draft.scaleMultiplier !== 1 || draft.yOffset !== 0) {
    lines.push(`  // scaleMultiplier ${formatNumber(draft.scaleMultiplier)} and yOffset ${formatNumber(draft.yOffset)} are temporary for primitive render.`);
  }

  lines.push(`}`);
  return lines.join('\n');
};

export const serializePlacementTransforms = (
  draftsByObjectId: ReadonlyMap<string, PlacementTransformDraft>,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): string => {
  const serializedTransforms = editableObjects
    .map((object) => {
      const draft = draftsByObjectId.get(object.id);
      return draft && isChangedDraft(object.worldObject, draft)
        ? serializePlacementTransform(object.worldObject, draft)
        : null;
    })
    .filter((value): value is string => value !== null);

  return serializedTransforms.length > 0
    ? `[\n${serializedTransforms.map((value) => value.split('\n').map((line) => `  ${line}`).join('\n')).join(',\n')}\n]`
    : '[]';
};

const getSceneObjectNamePrefixes = (objectId: string): readonly string[] => {
  if (objectId === 'delivery-board') {
    return ['playground:delivery-board'];
  }

  if (objectId === 'town-well') {
    return ['village:well'];
  }

  return [`village:${objectId}`];
};

const matchesSceneObject = (object: THREE.Object3D, objectId: string): boolean => (
  getSceneObjectNamePrefixes(objectId).some((prefix) => (
    object.name === prefix || object.name.startsWith(`${prefix}:`) || object.name.startsWith(`${prefix}-`)
  ))
);

const hasMatchingAncestor = (
  object: THREE.Object3D,
  root: THREE.Object3D,
  objectId: string,
): boolean => {
  let parent = object.parent;

  while (parent && parent !== root) {
    if (matchesSceneObject(parent, objectId)) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
};

const findEditableSceneObjects = (
  root: THREE.Object3D,
  objectId: string,
): THREE.Object3D[] => {
  const objects: THREE.Object3D[] = [];

  root.traverse((object) => {
    if (object === root || !matchesSceneObject(object, objectId) || hasMatchingAncestor(object, root, objectId)) {
      return;
    }

    objects.push(object);
  });

  return objects;
};

const createSelectionMarker = (): THREE.Group => {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    depthWrite: false,
  });
  const points = [
    new THREE.Vector3(-0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, -0.5),
    new THREE.Vector3(0.5, 0, 0.5),
    new THREE.Vector3(-0.5, 0, 0.5),
  ];
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);

  group.name = 'placement-editor:selection';
  group.visible = false;
  outline.name = 'placement-editor:selection-outline';
  outline.renderOrder = 50;
  group.add(outline);
  return group;
};

const disposeObjectResources = (object: THREE.Object3D): void => {
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

const getDraftKey = (event: KeyboardEvent): string => {
  if (event.key === '[' || event.key === ']') {
    return event.key;
  }

  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
};

const copyText = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard) {
    console.info('[placement-editor] Clipboard unavailable. Transform output:', text);
    return false;
  }

  await navigator.clipboard.writeText(text);
  return true;
};

const isChangedDraft = (
  object: WorldObjectDefinition,
  draft: PlacementTransformDraft,
): boolean => {
  const initial = createPlacementTransformDraft(object);

  return draft.position.some((value, index) => value !== initial.position[index])
    || draft.rotationY !== initial.rotationY
    || draft.scaleMultiplier !== initial.scaleMultiplier
    || draft.yOffset !== initial.yOffset;
};

export const createPlacementEditor = ({
  sceneRoot,
  camera,
  domElement,
  parent,
  isLayoutModeActive,
}: PlacementEditorOptions): PlacementEditor => {
  const editableObjects = createEditablePlacementObjects();
  const draftsByObjectId = new Map<string, PlacementTransformDraft>();
  const baselinesByObjectUuid = new Map<string, SceneObjectBaseline>();
  const marker = createSelectionMarker();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const overlay = document.createElement('div');
  let selectedIndex = -1;
  let active = false;
  let snapIndex = placementEditorConfig.defaultSnapIndex;
  let status = 'Tab selects editable objects. Edits are temporary until copied into source.';

  overlay.className = 'placement-editor-hud';
  overlay.hidden = true;
  parent.append(overlay);

  const getSelectedObject = (): EditablePlacementObject | null => (
    selectedIndex >= 0 ? editableObjects[selectedIndex] ?? null : null
  );

  const getSelectedDraft = (): PlacementTransformDraft | null => {
    const selectedObject = getSelectedObject();

    if (!selectedObject) {
      return null;
    }

    let draft = draftsByObjectId.get(selectedObject.id);

    if (!draft) {
      draft = createPlacementTransformDraft(selectedObject.worldObject);
      draftsByObjectId.set(selectedObject.id, draft);
    }

    return draft;
  };

  const captureBaseline = (object: THREE.Object3D): SceneObjectBaseline => {
    let baseline = baselinesByObjectUuid.get(object.uuid);

    if (!baseline) {
      baseline = {
        object,
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone(),
      };
      baselinesByObjectUuid.set(object.uuid, baseline);
    }

    return baseline;
  };

  const resetSceneObjects = (): void => {
    baselinesByObjectUuid.forEach((baseline) => {
      baseline.object.position.copy(baseline.position);
      baseline.object.rotation.copy(baseline.rotation);
      baseline.object.scale.copy(baseline.scale);
    });
  };

  const updateMarker = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!active || !selectedObject || !draft) {
      marker.visible = false;
      return;
    }

    const dimensions = selectedObject.worldObject.dimensions ?? [1, 1, 1];
    marker.visible = true;
    marker.position.set(draft.position[0], 0.18 + draft.yOffset, draft.position[2]);
    marker.rotation.y = draft.rotationY;
    marker.scale.set(
      Math.max(dimensions[0] * draft.scaleMultiplier, 0.4),
      1,
      Math.max(dimensions[2] * draft.scaleMultiplier, 0.4),
    );
  };

  const applyDraftToScene = (selectedObject: EditablePlacementObject): void => {
    const draft = draftsByObjectId.get(selectedObject.id);

    if (!active || !draft) {
      return;
    }

    const initialDraft = createPlacementTransformDraft(selectedObject.worldObject);
    const sceneObjects = findEditableSceneObjects(sceneRoot, selectedObject.id);
    const pivot = new THREE.Vector3(...selectedObject.worldObject.position);
    const editedPosition = new THREE.Vector3(...draft.position);
    const rotationDelta = draft.rotationY - initialDraft.rotationY;
    const scaleRatio = draft.scaleMultiplier / Math.max(initialDraft.scaleMultiplier, 0.0001);
    const yOffsetDelta = draft.yOffset - initialDraft.yOffset;

    sceneObjects.forEach((sceneObject) => {
      const baseline = captureBaseline(sceneObject);
      const localOffset = baseline.position.clone().sub(pivot);
      localOffset.x *= scaleRatio;
      localOffset.z *= scaleRatio;
      localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationDelta);

      sceneObject.position.copy(editedPosition).add(localOffset);
      sceneObject.position.y = baseline.position.y + yOffsetDelta;
      sceneObject.rotation.copy(baseline.rotation);
      sceneObject.rotation.y = baseline.rotation.y + rotationDelta;
      sceneObject.scale.copy(baseline.scale).multiplyScalar(scaleRatio);
    });

    updateMarker();
  };

  const applyAllDraftsToScene = (): void => {
    editableObjects.forEach((object) => {
      if (draftsByObjectId.has(object.id)) {
        applyDraftToScene(object);
      }
    });
  };

  const updateHud = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();
    const snap = placementEditorConfig.snapValues[snapIndex] ?? placementEditorConfig.snapValues[0];

    overlay.hidden = !active;

    if (!active) {
      return;
    }

    if (!selectedObject || !draft) {
      overlay.textContent = [
        'Placement Editor',
        'Warning: temporary edits only. Copy output into source.',
        `Snap ${snap}`,
        'Selected: none',
        status,
      ].join('\n');
      return;
    }

    const renderSettings = getAssetRenderSettings(selectedObject.worldObject);
    overlay.textContent = [
      'Placement Editor',
      'Warning: temporary edits only. Copy output into source.',
      `Selected ${selectedObject.id} (${selectedObject.kind})`,
      `Position ${formatTuple(draft.position)}`,
      `RotationY ${formatNumber(THREE.MathUtils.radToDeg(draft.rotationY))}deg`,
      `Scale ${formatNumber(draft.scaleMultiplier)}  Y offset ${formatNumber(draft.yOffset)}`,
      `Render ${renderSettings ? renderSettings.assetId : selectedObject.worldObject.render?.mode ?? 'primitive'}`,
      `Snap ${snap}  Edited ${isChangedDraft(selectedObject.worldObject, draft) ? 'yes' : 'no'}`,
      status,
    ].join('\n');
  };

  const selectIndex = (nextIndex: number): void => {
    if (editableObjects.length === 0) {
      selectedIndex = -1;
      status = 'No editable village objects found.';
      updateMarker();
      updateHud();
      return;
    }

    selectedIndex = (nextIndex + editableObjects.length) % editableObjects.length;
    const selectedObject = getSelectedObject();

    if (selectedObject) {
      draftsByObjectId.set(
        selectedObject.id,
        draftsByObjectId.get(selectedObject.id) ?? createPlacementTransformDraft(selectedObject.worldObject),
      );
      status = `Selected ${selectedObject.id}.`;
      applyDraftToScene(selectedObject);
    }

    updateMarker();
    updateHud();
  };

  const selectNearestObject = (point: THREE.Vector3): void => {
    let nearestIndex = -1;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;

    editableObjects.forEach((object, index) => {
      const draft = draftsByObjectId.get(object.id) ?? createPlacementTransformDraft(object.worldObject);
      const dimensions = object.worldObject.dimensions ?? [1, 1, 1];
      const radius = Math.max(dimensions[0], dimensions[2], 1) / 2 + placementEditorConfig.selectionRadiusPadding;
      const distanceSq = (draft.position[0] - point.x) ** 2 + (draft.position[2] - point.z) ** 2;

      if (distanceSq <= radius ** 2 && distanceSq < nearestDistanceSq) {
        nearestIndex = index;
        nearestDistanceSq = distanceSq;
      }
    });

    if (nearestIndex >= 0) {
      selectIndex(nearestIndex);
    }
  };

  const nudgeSelected = (dx: number, dz: number): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    draft.position = [draft.position[0] + dx, draft.position[1], draft.position[2] + dz];
    status = `Moved ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const rotateSelected = (delta: number): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    draft.rotationY += delta;
    status = `Rotated ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const scaleSelected = (delta: number): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    draft.scaleMultiplier = Math.max(0.05, draft.scaleMultiplier + delta);
    status = `Scaled ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const offsetSelected = (delta: number): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    draft.yOffset += delta;
    status = `Adjusted Y offset for ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const copySelected = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object to copy.';
      updateHud();
      return;
    }

    void copyText(serializePlacementTransform(selectedObject.worldObject, draft))
      .then((copied) => {
        status = copied ? `Copied ${selectedObject.id} transform.` : 'Clipboard unavailable; transform logged to console.';
        updateHud();
      })
      .catch(() => {
        status = 'Clipboard copy failed.';
        updateHud();
      });
  };

  const copyAll = (): void => {
    void copyText(serializePlacementTransforms(draftsByObjectId, editableObjects))
      .then((copied) => {
        status = copied ? 'Copied all edited transforms.' : 'Clipboard unavailable; transforms logged to console.';
        updateHud();
      })
      .catch(() => {
        status = 'Clipboard copy failed.';
        updateHud();
      });
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!active || !isLayoutModeActive() || event.button !== 0) {
      return;
    }

    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      selectNearestObject(hitPoint);
      event.preventDefault();
    }
  };

  domElement.addEventListener('pointerdown', handlePointerDown);
  updateHud();

  return {
    object: marker,
    isActive() {
      return active;
    },
    setActive(nextActive) {
      if (active === nextActive) {
        return;
      }

      active = nextActive;
      marker.visible = active && selectedIndex >= 0;

      if (active) {
        applyAllDraftsToScene();
      } else {
        resetSceneObjects();
      }

      updateMarker();
      updateHud();
    },
    handleKeyDown(event) {
      if (!active || !isLayoutModeActive()) {
        return false;
      }

      const key = getDraftKey(event);
      const snap = placementEditorConfig.snapValues[snapIndex] ?? placementEditorConfig.snapValues[0];

      if (key === 'Tab') {
        selectIndex(selectedIndex + (event.shiftKey ? -1 : 1));
        event.preventDefault();
        return true;
      }

      if (key === 'Escape') {
        selectedIndex = -1;
        status = 'Selection cleared.';
        updateMarker();
        updateHud();
        event.preventDefault();
        return true;
      }

      if (key === '1' || key === '2' || key === '3') {
        snapIndex = Number(key) - 1;
        status = `Snap set to ${placementEditorConfig.snapValues[snapIndex]}.`;
        updateHud();
        event.preventDefault();
        return true;
      }

      if (key === 'c') {
        if (event.shiftKey) {
          copyAll();
        } else {
          copySelected();
        }
        event.preventDefault();
        return true;
      }

      if (key === 'ArrowUp' || key === 'w') {
        nudgeSelected(0, -snap);
      } else if (key === 'ArrowDown' || key === 's') {
        nudgeSelected(0, snap);
      } else if (key === 'ArrowLeft' || key === 'a') {
        nudgeSelected(-snap, 0);
      } else if (key === 'ArrowRight' || key === 'd') {
        nudgeSelected(snap, 0);
      } else if (key === 'q') {
        rotateSelected(-placementEditorConfig.rotationStepRadians);
      } else if (key === 'e') {
        rotateSelected(placementEditorConfig.rotationStepRadians);
      } else if (key === 'z') {
        scaleSelected(-placementEditorConfig.scaleStep);
      } else if (key === 'x') {
        scaleSelected(placementEditorConfig.scaleStep);
      } else if (key === '[') {
        offsetSelected(-snap);
      } else if (key === ']') {
        offsetSelected(snap);
      } else {
        return false;
      }

      event.preventDefault();
      return true;
    },
    getSelectedObjectId() {
      return getSelectedObject()?.id ?? null;
    },
    dispose() {
      resetSceneObjects();
      domElement.removeEventListener('pointerdown', handlePointerDown);
      overlay.remove();
      marker.parent?.remove(marker);
      disposeObjectResources(marker);
    },
  };
};
