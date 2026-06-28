import * as THREE from 'three';
import {
  assetRegistry,
  createModelInstance,
  fitAssetObjectToBounds,
  type AssetInstanceHandle,
} from '../game/assets';
import {
  layoutOverrideDocumentVersion,
  parseLayoutOverrideJson,
  serializeLayoutOverrideDocument,
  type LayoutOverrideDocument,
  type LayoutTransformOverride,
} from './layoutOverrides';
import type { WorldObjectDefinition } from './types';
import { applyAssetMaterialOverrides } from './assetMaterialOverrides';
import { villageWorldObjects } from './villageDefinition';

export const placementEditorConfig = {
  draftStorageKey: 'the-last-delivery:village-layout-draft',
  activeStorageKey: 'the-last-delivery:town-editor-active-json',
  snapValues: [0.1, 0.25, 1] as const,
  defaultSnapIndex: 1,
  rotationStepRadians: THREE.MathUtils.degToRad(15),
  scaleStep: 0.05,
  selectionRadiusPadding: 0.8,
  continuousMoveBaseSpeed: 2.25,
  snapSpeedReference: 0.25,
  minSnapSpeedMultiplier: 0.35,
  maxSnapSpeedMultiplier: 2.5,
  fastMoveMultiplier: 3,
  fineMoveMultiplier: 0.25,
  dragSnapEnabled: true,
  undoHistoryLimit: 30,
} as const;

export interface EditablePlacementObject {
  id: string;
  kind: WorldObjectDefinition['kind'];
  worldObject: WorldObjectDefinition;
}

export interface PlacementTransformDraft {
  id: string;
  active: boolean;
  position: THREE.Vector3Tuple;
  rotationY: number;
  scaleMultiplier: number;
  yOffset: number;
  assetId: string | null;
}

export interface PlacementEditor {
  object: THREE.Group;
  isActive(): boolean;
  setActive(active: boolean): void;
  update(deltaSeconds: number): void;
  handleKeyDown(event: KeyboardEvent): boolean;
  handleKeyUp(event: KeyboardEvent): boolean;
  getSelectedObjectId(): string | null;
  dispose(): void;
}

interface PlacementEditorOptions {
  sceneRoot: THREE.Object3D;
  camera: THREE.Camera;
  domElement: HTMLElement;
  parent: HTMLElement;
  isLayoutModeActive: () => boolean;
  draftPersistenceEnabled?: boolean;
}

interface SceneObjectBaseline {
  object: THREE.Object3D;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

interface MoveModifiers {
  shiftKey?: boolean;
  altKey?: boolean;
}

interface DragOffset {
  x: number;
  z: number;
}

type PlacementDraftSnapshot = Array<[string, PlacementTransformDraft]>;

interface EditorAssetPreview {
  assetId: string;
  instance: AssetInstanceHandle;
  disposeMaterialOverrides: () => void;
  requestId: number;
}

interface BrowserFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

type BrowserFilePickerWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<BrowserFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<BrowserFileHandle>;
};

const formatNumber = (value: number): string => (
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
);

const formatTuple = (values: readonly number[]): string => (
  `[${values.map(formatNumber).join(', ')}]`
);

const getAssetRenderSettings = (object: WorldObjectDefinition): Extract<WorldObjectDefinition['render'], { mode: 'asset' }> | undefined => (
  object.render?.mode === 'asset' ? object.render : undefined
);

const getObjectAssetId = (object: WorldObjectDefinition): string | null => (
  getAssetRenderSettings(object)?.assetId ?? null
);

export const canUseTownEditorFilePicker = (
  value: unknown = typeof window === 'undefined' ? undefined : window,
): boolean => {
  const maybeWindow = value as BrowserFilePickerWindow;
  return typeof maybeWindow.showOpenFilePicker === 'function'
    && typeof maybeWindow.showSaveFilePicker === 'function';
};

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

export const getPlacementEditorMoveSpeed = (
  snapSize: number,
  modifiers: MoveModifiers = {},
): number => {
  const safeSnapSize = Number.isFinite(snapSize) && snapSize > 0
    ? snapSize
    : placementEditorConfig.snapSpeedReference;
  const snapMultiplier = THREE.MathUtils.clamp(
    safeSnapSize / placementEditorConfig.snapSpeedReference,
    placementEditorConfig.minSnapSpeedMultiplier,
    placementEditorConfig.maxSnapSpeedMultiplier,
  );
  const modifierMultiplier = (modifiers.shiftKey ? placementEditorConfig.fastMoveMultiplier : 1)
    * (modifiers.altKey ? placementEditorConfig.fineMoveMultiplier : 1);

  return placementEditorConfig.continuousMoveBaseSpeed * snapMultiplier * modifierMultiplier;
};

export const snapPlacementCoordinate = (value: number, snapSize: number): number => {
  if (!Number.isFinite(snapSize) || snapSize <= 0) {
    return value;
  }

  return Math.round(value / snapSize) * snapSize;
};

export const createDraggedPlacementPosition = (
  draft: PlacementTransformDraft | null,
  groundPoint: THREE.Vector3,
  snapSize: number,
  dragOffset: DragOffset = { x: 0, z: 0 },
  snapEnabled = placementEditorConfig.dragSnapEnabled,
): THREE.Vector3Tuple | null => {
  if (!draft) {
    return null;
  }

  const x = groundPoint.x + dragOffset.x;
  const z = groundPoint.z + dragOffset.z;

  return [
    snapEnabled ? snapPlacementCoordinate(x, snapSize) : x,
    draft.position[1],
    snapEnabled ? snapPlacementCoordinate(z, snapSize) : z,
  ];
};

export const clonePlacementDraft = (draft: PlacementTransformDraft): PlacementTransformDraft => ({
  id: draft.id,
  active: draft.active,
  position: [...draft.position],
  rotationY: draft.rotationY,
  scaleMultiplier: draft.scaleMultiplier,
  yOffset: draft.yOffset,
  assetId: draft.assetId,
});

export const capPlacementHistoryLength = <T>(
  history: readonly T[],
  limit = placementEditorConfig.undoHistoryLimit,
): T[] => (
  history.slice(Math.max(0, history.length - Math.max(0, limit)))
);

export const createPlacementTransformDraft = (
  object: WorldObjectDefinition,
): PlacementTransformDraft => {
  const assetRenderSettings = getAssetRenderSettings(object);

  return {
    id: object.id,
    active: object.active !== false,
    position: [...object.position],
    rotationY: assetRenderSettings?.rotation?.[1] ?? object.rotation?.[1] ?? 0,
    scaleMultiplier: assetRenderSettings?.scaleMultiplier ?? object.layoutTransform?.scaleMultiplier ?? 1,
    yOffset: assetRenderSettings?.yOffset ?? object.layoutTransform?.yOffset ?? 0,
    assetId: assetRenderSettings?.assetId ?? null,
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
    `  active: ${draft.active},`,
    `  position: ${formatTuple(draft.position)},`,
    `  rotation: ${formatTuple([0, draft.rotationY, 0])},`,
  ];

  if (draft.assetId) {
    lines.push(
      `  render: {`,
      `    mode: 'asset',`,
      `    assetId: '${draft.assetId}',`,
      `    scaleMultiplier: ${formatNumber(draft.scaleMultiplier)},`,
      `    yOffset: ${formatNumber(draft.yOffset)},`,
      `    rotation: ${formatTuple([0, draft.rotationY, 0])},`,
      `  },`,
    );
  } else if (assetRenderSettings || draft.scaleMultiplier !== 1 || draft.yOffset !== 0) {
    lines.push(`  // scaleMultiplier ${formatNumber(draft.scaleMultiplier)} and yOffset ${formatNumber(draft.yOffset)} are temporary for primitive render.`);
  }

  lines.push(`}`);
  return lines.join('\n');
};

export const serializePlacementTransforms = (
  draftsByObjectId: ReadonlyMap<string, PlacementTransformDraft>,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): string => {
  return serializeLayoutOverrideDocument(
    createLayoutOverrideDocumentFromPlacementDrafts(draftsByObjectId, editableObjects),
  );
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

const movementKeys = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const isMovementKey = (key: string): boolean => movementKeys.has(key);

const getMovementKeyVector = (key: string): THREE.Vector2 => {
  if (key === 'w' || key === 'ArrowUp') {
    return new THREE.Vector2(0, -1);
  }

  if (key === 's' || key === 'ArrowDown') {
    return new THREE.Vector2(0, 1);
  }

  if (key === 'a' || key === 'ArrowLeft') {
    return new THREE.Vector2(-1, 0);
  }

  if (key === 'd' || key === 'ArrowRight') {
    return new THREE.Vector2(1, 0);
  }

  return new THREE.Vector2(0, 0);
};

const isChangedDraft = (
  object: WorldObjectDefinition,
  draft: PlacementTransformDraft,
): boolean => {
  const initial = createPlacementTransformDraft(object);

  return draft.active !== initial.active
    || draft.assetId !== initial.assetId
    || draft.position.some((value, index) => value !== initial.position[index])
    || draft.rotationY !== initial.rotationY
    || draft.scaleMultiplier !== initial.scaleMultiplier
    || draft.yOffset !== initial.yOffset;
};

const createOverrideFromDraft = (
  object: WorldObjectDefinition,
  draft: PlacementTransformDraft,
  updatedAt: string,
): LayoutTransformOverride | null => {
  const initial = createPlacementTransformDraft(object);
  const override: LayoutTransformOverride = {
    id: object.id,
    updatedAt,
  };

  if (draft.position.some((value, index) => value !== initial.position[index])) {
    override.position = [...draft.position];
  }

  if (draft.active !== initial.active) {
    override.active = draft.active;
  }

  if (draft.rotationY !== initial.rotationY) {
    override.rotation = [0, draft.rotationY, 0];
  }

  if (draft.scaleMultiplier !== initial.scaleMultiplier) {
    override.scaleMultiplier = draft.scaleMultiplier;
  }

  if (draft.yOffset !== initial.yOffset) {
    override.yOffset = draft.yOffset;
  }

  if (draft.assetId !== initial.assetId) {
    if (draft.assetId) {
      override.renderMode = 'asset';
      override.assetId = draft.assetId;
    } else {
      override.renderMode = 'primitive';
    }
  }

  return Object.keys(override).length > 2 ? override : null;
};

export const createLayoutOverrideDocumentFromPlacementDrafts = (
  draftsByObjectId: ReadonlyMap<string, PlacementTransformDraft>,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
  updatedAt = new Date().toISOString(),
): LayoutOverrideDocument => ({
  version: layoutOverrideDocumentVersion,
  updatedAt,
  overrides: editableObjects
    .map((object) => {
      const draft = draftsByObjectId.get(object.id);
      return draft ? createOverrideFromDraft(object.worldObject, draft, updatedAt) : null;
    })
    .filter((override): override is LayoutTransformOverride => override !== null),
});

export const createPlacementEditor = ({
  sceneRoot,
  camera,
  domElement,
  parent,
  isLayoutModeActive,
  draftPersistenceEnabled = false,
}: PlacementEditorOptions): PlacementEditor => {
  const editableObjects = createEditablePlacementObjects();
  const editableObjectsById = new Map(editableObjects.map((object) => [object.id, object]));
  const editableObjectIds = editableObjects.map((object) => object.id);
  const draftsByObjectId = new Map<string, PlacementTransformDraft>();
  const baselinesByObjectUuid = new Map<string, SceneObjectBaseline>();
  const assetPreviewsByObjectId = new Map<string, EditorAssetPreview>();
  const marker = createSelectionMarker();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const heldMoveVector = new THREE.Vector2();
  const overlay = document.createElement('div');
  const summary = document.createElement('pre');
  const controls = document.createElement('div');
  const objectPanel = document.createElement('div');
  const objectSelect = document.createElement('select');
  const objectProperties = document.createElement('pre');
  const assetPanel = document.createElement('div');
  const assetSelect = document.createElement('select');
  const assetProperties = document.createElement('pre');
  const toggleActiveButton = document.createElement('button');
  const applyAssetButton = document.createElement('button');
  const clearAssetButton = document.createElement('button');
  const saveDraftButton = document.createElement('button');
  const saveActiveButton = document.createElement('button');
  const loadDraftButton = document.createElement('button');
  const loadActiveButton = document.createElement('button');
  const clearDraftButton = document.createElement('button');
  const copyJsonButton = document.createElement('button');
  const openJsonFileButton = document.createElement('button');
  const saveJsonFileButton = document.createElement('button');
  const importJsonButton = document.createElement('button');
  const importTextArea = document.createElement('textarea');
  const helpOverlay = document.createElement('div');
  const heldKeys = new Set<string>();
  const undoStack: PlacementDraftSnapshot[] = [];
  const redoStack: PlacementDraftSnapshot[] = [];
  let dragState: {
    pointerId: number;
    objectId: string;
    offset: DragOffset;
  } | null = null;
  let selectedIndex = -1;
  let active = false;
  let helpVisible = false;
  let continuousMoveHistoryPushed = false;
  let assetPreviewRequestId = 0;
  let snapIndex = placementEditorConfig.defaultSnapIndex;
  let status = draftPersistenceEnabled
    ? 'Tab selects editable objects. Drafts can be saved locally or copied as JSON.'
    : 'Tab selects editable objects. Copy JSON output into source workflow.';

  overlay.className = 'placement-editor-hud';
  overlay.hidden = true;
  summary.className = 'placement-editor-hud__summary';
  controls.className = 'placement-editor-hud__controls';
  objectPanel.className = 'placement-editor-hud__panel';
  assetPanel.className = 'placement-editor-hud__panel';
  objectSelect.className = 'placement-editor-hud__select';
  assetSelect.className = 'placement-editor-hud__select';
  objectProperties.className = 'placement-editor-hud__properties';
  assetProperties.className = 'placement-editor-hud__properties';
  toggleActiveButton.type = 'button';
  toggleActiveButton.textContent = 'Toggle Active';
  applyAssetButton.type = 'button';
  applyAssetButton.textContent = 'Preview Asset';
  clearAssetButton.type = 'button';
  clearAssetButton.textContent = 'Use Primitive';
  saveDraftButton.type = 'button';
  saveDraftButton.textContent = 'Save Draft';
  saveActiveButton.type = 'button';
  saveActiveButton.textContent = 'Save Active JSON';
  loadDraftButton.type = 'button';
  loadDraftButton.textContent = 'Reload Draft';
  loadActiveButton.type = 'button';
  loadActiveButton.textContent = 'Load Active JSON';
  clearDraftButton.type = 'button';
  clearDraftButton.textContent = 'Clear Draft';
  copyJsonButton.type = 'button';
  copyJsonButton.textContent = 'Copy JSON';
  openJsonFileButton.type = 'button';
  openJsonFileButton.textContent = 'Open JSON File';
  saveJsonFileButton.type = 'button';
  saveJsonFileButton.textContent = 'Save JSON File';
  importJsonButton.type = 'button';
  importJsonButton.textContent = 'Import JSON';
  importTextArea.className = 'placement-editor-hud__import';
  importTextArea.placeholder = 'Paste active town editor JSON or layout override JSON here.';
  importTextArea.spellcheck = false;
  objectSelect.append(...editableObjects.map((object, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${object.id} (${object.kind})`;
    return option;
  }));
  assetSelect.append(...assetRegistry.map((asset) => {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = `${asset.id} (${asset.sourcePack})`;
    return option;
  }));
  helpOverlay.className = 'placement-editor-help';
  helpOverlay.hidden = true;
  helpOverlay.textContent = [
    'Placement Editor Help',
    'F2 layout mode  F1 help',
    'Tab / Shift+Tab select  Click selects  Drag moves on ground',
    'WASD / arrows hold to move  Shift faster  Alt finer',
    'Q / E rotate  Z / X scale  [ / ] Y offset',
    '1 / 2 / 3 snap size',
    'Ctrl+Z undo  Ctrl+Shift+Z or Ctrl+Y redo',
    'Ctrl+S save active JSON  Ctrl+O reload active JSON  Ctrl+Shift+Delete clear',
    'C copy selected TS  Shift+C copy active JSON',
    'Object panel toggles active state. Asset panel previews registered GLBs.',
  ].join('\n');
  objectPanel.append(objectSelect, objectProperties);
  assetPanel.append(assetSelect, assetProperties);
  controls.append(
    toggleActiveButton,
    applyAssetButton,
    clearAssetButton,
    saveActiveButton,
    loadActiveButton,
    saveDraftButton,
    loadDraftButton,
    clearDraftButton,
    copyJsonButton,
    openJsonFileButton,
    saveJsonFileButton,
    importJsonButton,
  );
  overlay.append(summary, objectPanel, assetPanel, controls, importTextArea);
  parent.append(overlay);
  parent.append(helpOverlay);

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
      baseline.object.visible = true;
    });
    assetPreviewsByObjectId.forEach((preview) => {
      preview.disposeMaterialOverrides();
      preview.instance.dispose();
    });
    assetPreviewsByObjectId.clear();
  };

  const disposeAssetPreview = (objectId: string): void => {
    const preview = assetPreviewsByObjectId.get(objectId);

    if (!preview) {
      return;
    }

    preview.disposeMaterialOverrides();
    preview.instance.dispose();
    assetPreviewsByObjectId.delete(objectId);
  };

  const setSceneObjectsVisible = (objectId: string, visible: boolean): void => {
    findEditableSceneObjects(sceneRoot, objectId).forEach((sceneObject) => {
      captureBaseline(sceneObject);
      sceneObject.visible = visible;
    });
  };

  const createPreviewRequestId = (): number => {
    assetPreviewRequestId += 1;
    return assetPreviewRequestId;
  };

  const fitAssetPreviewToDraft = (
    previewObject: THREE.Object3D,
    editableObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
  ): void => {
    fitAssetObjectToBounds(previewObject, {
      targetPosition: draft.position,
      targetDimensions: editableObject.worldObject.dimensions,
      rotation: [0, draft.rotationY, 0],
      scaleMultiplier: draft.scaleMultiplier,
      yOffset: draft.yOffset,
      fitMode: editableObject.worldObject.render?.mode === 'asset'
        ? editableObject.worldObject.render.fitMode
        : undefined,
    });
  };

  const updateAssetPreviewTransform = (
    editableObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
  ): void => {
    const preview = assetPreviewsByObjectId.get(editableObject.id);

    if (!preview) {
      return;
    }

    fitAssetPreviewToDraft(preview.instance.object, editableObject, draft);
  };

  const loadAssetPreview = (
    editableObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
  ): void => {
    const assetId = draft.assetId;

    if (!active || !draft.active || !assetId) {
      disposeAssetPreview(editableObject.id);
      setSceneObjectsVisible(editableObject.id, draft.active);
      return;
    }

    const currentPreview = assetPreviewsByObjectId.get(editableObject.id);

    if (currentPreview?.assetId === assetId) {
      updateAssetPreviewTransform(editableObject, draft);
      setSceneObjectsVisible(editableObject.id, false);
      currentPreview.instance.object.visible = true;
      return;
    }

    disposeAssetPreview(editableObject.id);
    setSceneObjectsVisible(editableObject.id, false);
    const requestId = createPreviewRequestId();
    status = `Loading ${assetId} preview for ${editableObject.id}.`;
    updateHud();

    void createModelInstance(assetId)
      .then((instance) => {
        const currentDraft = draftsByObjectId.get(editableObject.id);

        if (!active || !currentDraft || currentDraft.assetId !== assetId || !currentDraft.active) {
          instance.dispose();
          return;
        }

        const previousPreview = assetPreviewsByObjectId.get(editableObject.id);

        if (previousPreview && previousPreview.requestId > requestId) {
          instance.dispose();
          return;
        }

        instance.object.name = `placement-editor:asset-preview:${editableObject.id}`;
        instance.object.userData.label = instance.object.name;
        fitAssetPreviewToDraft(instance.object, editableObject, currentDraft);
        const disposeMaterialOverrides = applyAssetMaterialOverrides(instance.object, editableObject.worldObject);
        assetPreviewsByObjectId.set(editableObject.id, {
          assetId,
          instance,
          disposeMaterialOverrides,
          requestId,
        });
        sceneRoot.add(instance.object);
        setSceneObjectsVisible(editableObject.id, false);
        status = `Previewing ${assetId} on ${editableObject.id}.`;
        updateHud();
      })
      .catch((error: unknown) => {
        if (draftsByObjectId.get(editableObject.id)?.assetId === assetId) {
          setSceneObjectsVisible(editableObject.id, draft.active);
          status = `Asset preview failed: ${error instanceof Error ? error.message : String(error)}`;
          updateHud();
        }
      });
  };

  const createDraftSnapshot = (): PlacementDraftSnapshot => (
    [...draftsByObjectId.entries()].map(([objectId, draft]) => [objectId, clonePlacementDraft(draft)])
  );

  const getSnapshotKey = (snapshot: PlacementDraftSnapshot): string => JSON.stringify(snapshot);

  const pushUndoSnapshot = (): void => {
    const snapshot = createDraftSnapshot();
    const lastSnapshot = undoStack[undoStack.length - 1];

    if (lastSnapshot && getSnapshotKey(lastSnapshot) === getSnapshotKey(snapshot)) {
      redoStack.length = 0;
      return;
    }

    undoStack.push(snapshot);
    const cappedUndoStack = capPlacementHistoryLength(undoStack);
    undoStack.splice(0, undoStack.length, ...cappedUndoStack);
    redoStack.length = 0;
  };

  const restoreDraftSnapshot = (
    snapshot: PlacementDraftSnapshot,
    nextStatus: string,
  ): void => {
    draftsByObjectId.clear();
    snapshot.forEach(([objectId, draft]) => {
      draftsByObjectId.set(objectId, clonePlacementDraft(draft));
    });
    resetSceneObjects();

    if (active) {
      applyAllDraftsToScene();
    }

    status = nextStatus;
    updateMarker();
    updateHud();
  };

  const undoLastEdit = (): void => {
    const previousSnapshot = undoStack.pop();

    if (!previousSnapshot) {
      status = 'Nothing to undo.';
      updateHud();
      return;
    }

    redoStack.push(createDraftSnapshot());
    restoreDraftSnapshot(previousSnapshot, 'Undid placement edit.');
  };

  const redoLastEdit = (): void => {
    const nextSnapshot = redoStack.pop();

    if (!nextSnapshot) {
      status = 'Nothing to redo.';
      updateHud();
      return;
    }

    undoStack.push(createDraftSnapshot());
    const cappedUndoStack = capPlacementHistoryLength(undoStack);
    undoStack.splice(0, undoStack.length, ...cappedUndoStack);
    restoreDraftSnapshot(nextSnapshot, 'Redid placement edit.');
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

    if (!draft.active) {
      setSceneObjectsVisible(selectedObject.id, false);
      disposeAssetPreview(selectedObject.id);
      updateMarker();
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
      sceneObject.visible = draft.assetId ? false : true;
    });

    if (draft.assetId) {
      loadAssetPreview(selectedObject, draft);
    } else {
      disposeAssetPreview(selectedObject.id);
      setSceneObjectsVisible(selectedObject.id, true);
    }

    updateMarker();
  };

  const applyAllDraftsToScene = (): void => {
    editableObjects.forEach((object) => {
      if (draftsByObjectId.has(object.id)) {
        applyDraftToScene(object);
      }
    });
  };

  const createCurrentOverrideDocument = (): LayoutOverrideDocument => (
    createLayoutOverrideDocumentFromPlacementDrafts(draftsByObjectId, editableObjects)
  );

  const applyOverrideDocumentToDrafts = (
    document: LayoutOverrideDocument,
    nextStatus: string,
    recordHistory = true,
  ): void => {
    if (recordHistory) {
      pushUndoSnapshot();
    }

    draftsByObjectId.clear();
    resetSceneObjects();

    document.overrides.forEach((override) => {
      const editableObject = editableObjectsById.get(override.id);

      if (!editableObject) {
        return;
      }

      const draft = createPlacementTransformDraft(editableObject.worldObject);

      if (override.active !== undefined) {
        draft.active = override.active;
      }

      if (override.position) {
        draft.position = [...override.position];
      }

      if (override.rotation) {
        draft.rotationY = override.rotation[1];
      }

      if (override.scaleMultiplier !== undefined) {
        draft.scaleMultiplier = override.scaleMultiplier;
      }

      if (override.yOffset !== undefined) {
        draft.yOffset = override.yOffset;
      }

      if (override.renderMode === 'primitive') {
        draft.assetId = null;
      } else if (override.assetId !== undefined) {
        draft.assetId = override.assetId;
      }

      draftsByObjectId.set(override.id, draft);
    });

    status = nextStatus;

    if (active) {
      applyAllDraftsToScene();
    }

    updateMarker();
    updateHud();
  };

  const parseEditorJson = (json: string): LayoutOverrideDocument | null => {
    const result = parseLayoutOverrideJson(json, editableObjectIds);

    if (!result.ok || !result.document) {
      status = `Import rejected: ${result.errors.join(' ')}`;
      updateHud();
      return null;
    }

    return result.document;
  };

  const canUseDraftStorage = (): boolean => (
    draftPersistenceEnabled
    && typeof window !== 'undefined'
    && (() => {
      try {
        return window.localStorage !== undefined;
      } catch {
        return false;
      }
    })()
  );

  const hasStoredActiveJson = (): boolean => (
    canUseDraftStorage()
    && window.localStorage.getItem(placementEditorConfig.activeStorageKey) !== null
  );

  const getCurrentEditorJson = (): string => (
    serializeLayoutOverrideDocument(createCurrentOverrideDocument())
  );

  const saveActiveJsonToStorage = (): void => {
    if (!canUseDraftStorage()) {
      status = 'Active JSON storage is available only in dev mode.';
      updateHud();
      return;
    }

    window.localStorage.setItem(placementEditorConfig.activeStorageKey, getCurrentEditorJson());
    status = 'Saved active town editor JSON to localStorage.';
    updateHud();
  };

  const loadActiveJsonFromStorage = (silentMissing = false): void => {
    if (!canUseDraftStorage()) {
      status = 'Active JSON storage is available only in dev mode.';
      updateHud();
      return;
    }

    const storedDocument = window.localStorage.getItem(placementEditorConfig.activeStorageKey);

    if (!storedDocument) {
      if (!silentMissing) {
        status = 'No active town editor JSON found.';
        updateHud();
      }
      return;
    }

    const document = parseEditorJson(storedDocument);

    if (document) {
      applyOverrideDocumentToDrafts(
        document,
        `Loaded active town editor JSON with ${document.overrides.length} override(s).`,
        !silentMissing,
      );
    }
  };

  const saveDraftToStorage = (): void => {
    if (!canUseDraftStorage()) {
      status = 'Local draft storage is available only in dev mode.';
      updateHud();
      return;
    }

    window.localStorage.setItem(
      placementEditorConfig.draftStorageKey,
      getCurrentEditorJson(),
    );
    status = 'Saved layout draft to localStorage.';
    updateHud();
  };

  const loadDraftFromStorage = (silentMissing = false): void => {
    if (!canUseDraftStorage()) {
      status = 'Local draft storage is available only in dev mode.';
      updateHud();
      return;
    }

    const storedDraft = window.localStorage.getItem(placementEditorConfig.draftStorageKey);

    if (!storedDraft) {
      if (!silentMissing) {
        status = 'No saved layout draft found.';
        updateHud();
      }
      return;
    }

    const document = parseEditorJson(storedDraft);

    if (document) {
      applyOverrideDocumentToDrafts(
        document,
        `Loaded ${document.overrides.length} saved layout override(s).`,
        !silentMissing,
      );
    }
  };

  const clearDraftStorage = (): void => {
    if (canUseDraftStorage()) {
      window.localStorage.removeItem(placementEditorConfig.draftStorageKey);
      window.localStorage.removeItem(placementEditorConfig.activeStorageKey);
    }

    pushUndoSnapshot();
    draftsByObjectId.clear();
    resetSceneObjects();
    status = 'Cleared local layout draft and temporary edits.';
    updateMarker();
    updateHud();
  };

  const openJsonFile = async (): Promise<void> => {
    const maybeWindow = window as BrowserFilePickerWindow;

    if (!canUseTownEditorFilePicker(maybeWindow) || !maybeWindow.showOpenFilePicker) {
      status = 'JSON file picker is unavailable in this browser. Use paste/import instead.';
      updateHud();
      return;
    }

    try {
      const handles = await maybeWindow.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'The Last Delivery layout JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const handle = handles[0];

      if (!handle) {
        status = 'No JSON file selected.';
        updateHud();
        return;
      }

      const file = await handle.getFile();
      const document = parseEditorJson(await file.text());

      if (document) {
        applyOverrideDocumentToDrafts(document, `Loaded ${file.name} with ${document.overrides.length} override(s).`);
      }
    } catch (error) {
      status = `Open JSON cancelled or failed: ${error instanceof Error ? error.message : String(error)}`;
      updateHud();
    }
  };

  const saveJsonFile = async (): Promise<void> => {
    const maybeWindow = window as BrowserFilePickerWindow;

    if (!canUseTownEditorFilePicker(maybeWindow) || !maybeWindow.showSaveFilePicker) {
      status = 'JSON file save is unavailable in this browser. Use Copy JSON instead.';
      updateHud();
      return;
    }

    try {
      const handle = await maybeWindow.showSaveFilePicker({
        suggestedName: 'village-layout.json',
        types: [
          {
            description: 'The Last Delivery layout JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(getCurrentEditorJson());
      await writable.close();
      status = 'Saved active town editor JSON file.';
      updateHud();
    } catch (error) {
      status = `Save JSON cancelled or failed: ${error instanceof Error ? error.message : String(error)}`;
      updateHud();
    }
  };

  const importDraftFromPanel = (): void => {
    const json = importTextArea.value.trim();

    if (!json) {
      status = 'Paste layout override JSON before importing.';
      updateHud();
      return;
    }

    const document = parseEditorJson(json);

    if (document) {
      applyOverrideDocumentToDrafts(document, `Imported ${document.overrides.length} layout override(s).`);
    }
  };

  const getCurrentSnap = (): number => (
    placementEditorConfig.snapValues[snapIndex] ?? placementEditorConfig.snapValues[0]
  );

  const hasHeldMovementKeys = (): boolean => (
    [...heldKeys].some((key) => isMovementKey(key))
  );

  const updateContinuousMovement = (deltaSeconds: number): void => {
    if (!active || !isLayoutModeActive() || dragState) {
      continuousMoveHistoryPushed = false;
      return;
    }

    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      continuousMoveHistoryPushed = false;
      return;
    }

    heldMoveVector.set(0, 0);

    heldKeys.forEach((key) => {
      if (!isMovementKey(key)) {
        return;
      }

      heldMoveVector.add(getMovementKeyVector(key));
    });

    if (heldMoveVector.lengthSq() === 0) {
      continuousMoveHistoryPushed = false;
      return;
    }

    if (!continuousMoveHistoryPushed) {
      pushUndoSnapshot();
      continuousMoveHistoryPushed = true;
    }

    heldMoveVector.normalize();
    const snap = getCurrentSnap();
    const speed = getPlacementEditorMoveSpeed(snap, {
      shiftKey: heldKeys.has('Shift'),
      altKey: heldKeys.has('Alt'),
    });
    const distance = speed * Math.max(0, deltaSeconds);

    draft.position = [
      draft.position[0] + heldMoveVector.x * distance,
      draft.position[1],
      draft.position[2] + heldMoveVector.y * distance,
    ];
    status = `Moving ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const updateObjectPropertiesPanel = (
    selectedObject: EditablePlacementObject | null,
    draft: PlacementTransformDraft | null,
  ): void => {
    objectSelect.value = selectedIndex >= 0 ? String(selectedIndex) : '';

    if (!selectedObject || !draft) {
      objectProperties.textContent = [
        'Object Properties',
        'No object selected.',
        `${editableObjects.length} editable objects available.`,
      ].join('\n');
      return;
    }

    const object = selectedObject.worldObject;
    objectProperties.textContent = [
      'Object Properties',
      `id: ${object.id}`,
      `kind: ${object.kind}`,
      `active: ${draft.active ? 'yes' : 'no'}`,
      `position: ${formatTuple(draft.position)}`,
      `dimensions: ${object.dimensions ? formatTuple(object.dimensions) : 'none'}`,
      `collider: ${object.collider ? `pos ${formatTuple(object.collider.position)} size ${formatTuple(object.collider.size)}` : 'none'}`,
      `interactable: ${object.interactable ? `pos ${formatTuple(object.interactable.position)} radius ${formatNumber(object.interactable.radius)}` : 'none'}`,
      `objective: ${object.objectiveAnchor ? formatTuple(object.objectiveAnchor.position) : 'none'}`,
      `mailbox: ${object.mailbox?.destinationName ?? 'none'}`,
    ].join('\n');
  };

  const updateAssetPropertiesPanel = (
    selectedObject: EditablePlacementObject | null,
    draft: PlacementTransformDraft | null,
  ): void => {
    const selectedAssetId = draft?.assetId ?? (selectedObject ? getObjectAssetId(selectedObject.worldObject) : null);
    const selectedAsset = assetRegistry.find((asset) => asset.id === (assetSelect.value || selectedAssetId))
      ?? assetRegistry[0];

    if (selectedAsset) {
      assetSelect.value = selectedAsset.id;
    }

    assetProperties.textContent = selectedAsset
      ? [
        'Asset Catalog',
        `selected: ${selectedAsset.id}`,
        `current object asset: ${draft?.assetId ?? 'primitive'}`,
        `source: ${selectedAsset.sourcePack}`,
        `url: ${selectedAsset.url}`,
        `defaultScale: ${formatNumber(selectedAsset.defaultScale)}`,
        `budget: ${formatNumber(selectedAsset.maxRecommendedBytes / 1024)} KB`,
        selectedAsset.notes ? `notes: ${selectedAsset.notes}` : 'notes: none',
      ].join('\n')
      : [
        'Asset Catalog',
        'No registered assets found.',
      ].join('\n');
  };

  const updateHud = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();
    const snap = getCurrentSnap();

    overlay.hidden = !active;
    updateObjectPropertiesPanel(selectedObject, draft);
    updateAssetPropertiesPanel(selectedObject, draft);

    if (!active) {
      return;
    }

    if (!selectedObject || !draft) {
      summary.textContent = [
        'Placement Editor',
        'Active JSON drives live editor previews; source changes still require layout:apply.',
        'Ctrl+S save active JSON  Ctrl+O reload  Ctrl+Shift+Delete clear',
        `Snap ${snap}`,
        'Selected: none',
        status,
      ].join('\n');
      return;
    }

    const renderSettings = getAssetRenderSettings(selectedObject.worldObject);
    summary.textContent = [
      'Placement Editor',
      'Active JSON drives live editor previews; source changes still require layout:apply.',
      `Selected ${selectedObject.id} (${selectedObject.kind})`,
      `Active ${draft.active ? 'yes' : 'no'}`,
      `Position ${formatTuple(draft.position)}`,
      `RotationY ${formatNumber(THREE.MathUtils.radToDeg(draft.rotationY))}deg`,
      `Scale ${formatNumber(draft.scaleMultiplier)}  Y offset ${formatNumber(draft.yOffset)}`,
      `Render ${draft.assetId ?? renderSettings?.assetId ?? selectedObject.worldObject.render?.mode ?? 'primitive'}`,
      `Snap ${snap}  Edited ${isChangedDraft(selectedObject.worldObject, draft) ? 'yes' : 'no'}`,
      'Ctrl+S save active  Ctrl+O reload active  Shift+C copy JSON',
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

  const getNearestObjectIndex = (point: THREE.Vector3): number => {
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

    return nearestIndex;
  };

  const nudgeSelected = (dx: number, dz: number, recordHistory = true): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    if (recordHistory) {
      pushUndoSnapshot();
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

    pushUndoSnapshot();
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

    pushUndoSnapshot();
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

    pushUndoSnapshot();
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
    void copyText(getCurrentEditorJson())
      .then((copied) => {
        status = copied ? 'Copied active town editor JSON.' : 'Clipboard unavailable; active JSON logged to console.';
        updateHud();
      })
      .catch(() => {
        status = 'Clipboard copy failed.';
        updateHud();
      });
  };

  const updateHitPointFromPointer = (event: PointerEvent): boolean => {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    return raycaster.ray.intersectPlane(groundPlane, hitPoint) !== null;
  };

  const updateDragFromPointer = (event: PointerEvent): void => {
    if (!dragState || event.pointerId !== dragState.pointerId || !updateHitPointFromPointer(event)) {
      return;
    }

    const editableObject = editableObjectsById.get(dragState.objectId);
    const draft = draftsByObjectId.get(dragState.objectId);
    const nextPosition = createDraggedPlacementPosition(
      draft ?? null,
      hitPoint,
      getCurrentSnap(),
      dragState.offset,
    );

    if (!editableObject || !draft || !nextPosition) {
      status = 'Drag ignored: missing selected object.';
      updateHud();
      return;
    }

    draft.position = nextPosition;
    status = `Dragging ${editableObject.id}.`;
    applyDraftToScene(editableObject);
    updateHud();
    event.preventDefault();
  };

  const stopDragging = (event: PointerEvent): void => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const objectId = dragState.objectId;
    dragState = null;
    continuousMoveHistoryPushed = false;

    if (typeof domElement.releasePointerCapture === 'function') {
      try {
        domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    }

    status = `Dropped ${objectId}.`;
    updateHud();
    event.preventDefault();
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!active || !isLayoutModeActive() || event.button !== 0 || !updateHitPointFromPointer(event)) {
      return;
    }

    const nearestIndex = getNearestObjectIndex(hitPoint);

    if (nearestIndex < 0) {
      return;
    }

    selectIndex(nearestIndex);
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (selectedObject && draft) {
      pushUndoSnapshot();
      dragState = {
        pointerId: event.pointerId,
        objectId: selectedObject.id,
        offset: {
          x: draft.position[0] - hitPoint.x,
          z: draft.position[2] - hitPoint.z,
        },
      };
      status = `Dragging ${selectedObject.id}.`;
      updateHud();

      if (typeof domElement.setPointerCapture === 'function') {
        domElement.setPointerCapture(event.pointerId);
      }
    }

    event.preventDefault();
  };

  const handleLoadDraftButtonClick = (): void => {
    loadDraftFromStorage();
  };

  const handleLoadActiveButtonClick = (): void => {
    loadActiveJsonFromStorage();
  };

  const handleObjectSelectChange = (): void => {
    const nextIndex = Number(objectSelect.value);

    if (Number.isInteger(nextIndex)) {
      selectIndex(nextIndex);
    }
  };

  const toggleSelectedActive = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object to toggle.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    draft.active = !draft.active;
    status = `${selectedObject.id} active ${draft.active ? 'on' : 'off'}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const applySelectedAsset = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();
    const selectedAssetId = assetSelect.value;

    if (!selectedObject || !draft || !selectedAssetId) {
      status = 'Select an object and asset first.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    draft.assetId = selectedAssetId;
    draft.active = true;
    status = `Assigned ${selectedAssetId} to ${selectedObject.id}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const clearSelectedAsset = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object to switch to primitive.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    draft.assetId = null;
    status = `${selectedObject.id} will use its primitive renderer.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const handleOpenJsonFileClick = (): void => {
    void openJsonFile();
  };

  const handleSaveJsonFileClick = (): void => {
    void saveJsonFile();
  };

  objectSelect.addEventListener('change', handleObjectSelectChange);
  assetSelect.addEventListener('change', updateHud);
  toggleActiveButton.addEventListener('click', toggleSelectedActive);
  applyAssetButton.addEventListener('click', applySelectedAsset);
  clearAssetButton.addEventListener('click', clearSelectedAsset);
  saveActiveButton.addEventListener('click', saveActiveJsonToStorage);
  loadActiveButton.addEventListener('click', handleLoadActiveButtonClick);
  saveDraftButton.addEventListener('click', saveDraftToStorage);
  loadDraftButton.addEventListener('click', handleLoadDraftButtonClick);
  clearDraftButton.addEventListener('click', clearDraftStorage);
  copyJsonButton.addEventListener('click', copyAll);
  openJsonFileButton.addEventListener('click', handleOpenJsonFileClick);
  saveJsonFileButton.addEventListener('click', handleSaveJsonFileClick);
  importJsonButton.addEventListener('click', importDraftFromPanel);
  domElement.addEventListener('pointerdown', handlePointerDown);
  domElement.addEventListener('pointermove', updateDragFromPointer);
  domElement.addEventListener('pointerup', stopDragging);
  domElement.addEventListener('pointercancel', stopDragging);
  if (draftPersistenceEnabled) {
    if (hasStoredActiveJson()) {
      loadActiveJsonFromStorage(true);
    } else {
      loadDraftFromStorage(true);
    }
  }
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
      heldKeys.clear();
      dragState = null;
      continuousMoveHistoryPushed = false;
      helpOverlay.hidden = !(active && helpVisible);

      if (active) {
        applyAllDraftsToScene();
      } else {
        resetSceneObjects();
      }

      updateMarker();
      updateHud();
    },
    update(deltaSeconds) {
      updateContinuousMovement(deltaSeconds);
    },
    handleKeyDown(event) {
      if (!active || !isLayoutModeActive()) {
        return false;
      }

      const key = getDraftKey(event);
      const isTextInputTarget = event.target instanceof HTMLTextAreaElement
        || event.target instanceof HTMLInputElement;

      if (event.ctrlKey && key === 's') {
        saveActiveJsonToStorage();
        event.preventDefault();
        return true;
      }

      if (event.ctrlKey && key === 'o') {
        loadActiveJsonFromStorage();
        event.preventDefault();
        return true;
      }

      if (event.ctrlKey && event.shiftKey && key === 'Delete') {
        clearDraftStorage();
        event.preventDefault();
        return true;
      }

      if (isTextInputTarget && event.ctrlKey && (key === 'z' || key === 'y')) {
        return false;
      }

      if (event.ctrlKey && key === 'z') {
        if (event.shiftKey) {
          redoLastEdit();
        } else {
          undoLastEdit();
        }
        event.preventDefault();
        return true;
      }

      if (event.ctrlKey && key === 'y') {
        redoLastEdit();
        event.preventDefault();
        return true;
      }

      if (isTextInputTarget) {
        return false;
      }

      heldKeys.add(key);

      const snap = placementEditorConfig.snapValues[snapIndex] ?? placementEditorConfig.snapValues[0];

      if (key === 'F1') {
        helpVisible = !helpVisible;
        helpOverlay.hidden = !helpVisible;
        status = helpVisible ? 'Editor help shown.' : 'Editor help hidden.';
        updateHud();
        event.preventDefault();
        return true;
      }

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

      if (isMovementKey(key)) {
        if (!continuousMoveHistoryPushed) {
          pushUndoSnapshot();
          continuousMoveHistoryPushed = true;
        }

        const direction = getMovementKeyVector(key);
        nudgeSelected(direction.x * snap, direction.y * snap, false);
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

      if (key === 'q') {
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
    handleKeyUp(event) {
      if (!active || !isLayoutModeActive()) {
        return false;
      }

      const key = getDraftKey(event);
      heldKeys.delete(key);

      if (!hasHeldMovementKeys()) {
        continuousMoveHistoryPushed = false;
      }

      return isMovementKey(key) || key === 'Shift' || key === 'Alt';
    },
    getSelectedObjectId() {
      return getSelectedObject()?.id ?? null;
    },
    dispose() {
      resetSceneObjects();
      objectSelect.removeEventListener('change', handleObjectSelectChange);
      assetSelect.removeEventListener('change', updateHud);
      toggleActiveButton.removeEventListener('click', toggleSelectedActive);
      applyAssetButton.removeEventListener('click', applySelectedAsset);
      clearAssetButton.removeEventListener('click', clearSelectedAsset);
      saveActiveButton.removeEventListener('click', saveActiveJsonToStorage);
      loadActiveButton.removeEventListener('click', handleLoadActiveButtonClick);
      saveDraftButton.removeEventListener('click', saveDraftToStorage);
      loadDraftButton.removeEventListener('click', handleLoadDraftButtonClick);
      clearDraftButton.removeEventListener('click', clearDraftStorage);
      copyJsonButton.removeEventListener('click', copyAll);
      openJsonFileButton.removeEventListener('click', handleOpenJsonFileClick);
      saveJsonFileButton.removeEventListener('click', handleSaveJsonFileClick);
      importJsonButton.removeEventListener('click', importDraftFromPanel);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', updateDragFromPointer);
      domElement.removeEventListener('pointerup', stopDragging);
      domElement.removeEventListener('pointercancel', stopDragging);
      overlay.remove();
      helpOverlay.remove();
      marker.parent?.remove(marker);
      disposeObjectResources(marker);
    },
  };
};
