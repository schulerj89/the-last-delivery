import * as THREE from 'three';
import {
  assetRegistry,
  createModelInstance,
  fitAssetObjectToBounds,
  type AssetInstanceHandle,
} from '../game/assets';
import {
  createWorldObjectFromLayoutOverride,
  layoutOverrideDocumentVersion,
  parseLayoutOverrideJson,
  serializeLayoutOverrideDocument,
  type LayoutOverrideDocument,
  type LayoutTransformOverride,
} from './layoutOverrides';
import type {
  MailboxVariant,
  WorldGameplayRole,
  WorldInteractionAction,
  WorldObjectKind,
  WorldObjectDefinition,
} from './types';
import { applyAssetMaterialOverrides } from './assetMaterialOverrides';
import { createPavementTileMesh } from './props/createPavementTile';
import {
  authoredVillageWorldObjects,
  baseVillageWorldObjects,
} from './villageDefinition';
import { generatedVillageLayoutOverrides } from './villageOverrides.generated';
import {
  getDefaultActionForRole,
  getWorldObjectGameplay,
  getWorldObjectMailbox,
  mailboxVariants,
  worldGameplayRoles,
  worldInteractionActions,
} from './worldObjectGameplay';

export const placementEditorConfig = {
  draftStorageKey: 'the-last-delivery:village-layout-draft',
  activeStorageKey: 'the-last-delivery:town-editor-active-json',
  snapValues: [0.1, 0.25, 1] as const,
  defaultSnapIndex: 1,
  rotationStepRadians: THREE.MathUtils.degToRad(15),
  scaleStep: 0.05,
  selectionRadiusPadding: 0.8,
  continuousMoveBaseSpeed: 2.25,
  duplicateMinOffset: 0.5,
  snapSpeedReference: 0.25,
  minSnapSpeedMultiplier: 0.35,
  maxSnapSpeedMultiplier: 2.5,
  fastMoveMultiplier: 3,
  fineMoveMultiplier: 0.25,
  dragSnapEnabled: true,
  dragSelectThresholdPx: 8,
  massSelectKind: 'pavement',
  undoHistoryLimit: 30,
} as const;

export const placementEditorHudVariants = ['full', 'builder'] as const;

export type PlacementEditorHudVariant = (typeof placementEditorHudVariants)[number];

export const isPlacementEditorHudVariant = (value: string): value is PlacementEditorHudVariant => (
  placementEditorHudVariants.includes(value as PlacementEditorHudVariant)
);

export interface EditablePlacementObject {
  id: string;
  kind: WorldObjectDefinition['kind'];
  worldObject: WorldObjectDefinition;
  templateId?: string;
  isCreated?: boolean;
}

export interface PlacementTransformDraft {
  id: string;
  active: boolean;
  position: THREE.Vector3Tuple;
  rotationY: number;
  scaleMultiplier: number;
  yOffset: number;
  assetId: string | null;
  gameplayRole: WorldGameplayRole;
  interactionAction: WorldInteractionAction;
  destinationName: string;
  mailboxVariant: MailboxVariant;
}

export interface PlacementEditor {
  object: THREE.Group;
  isActive(): boolean;
  setActive(active: boolean): void;
  update(deltaSeconds: number): void;
  handleKeyDown(event: KeyboardEvent): boolean;
  handleKeyUp(event: KeyboardEvent): boolean;
  placeObjectAt(
    objectId: string,
    groundPosition: THREE.Vector3Tuple,
    options?: { assetId?: string | null; select?: boolean },
  ): boolean;
  createObjectFromTemplate(
    templateId: string,
    objectId: string,
    groundPosition: THREE.Vector3Tuple,
    options?: { assetId?: string | null; select?: boolean },
  ): boolean;
  getEditableObjects(): readonly EditablePlacementObject[];
  getSelectedObjectId(): string | null;
  dispose(): void;
}

type PlacementEditorCameraProvider = THREE.Camera | (() => THREE.Camera);

interface PlacementEditorOptions {
  sceneRoot: THREE.Object3D;
  camera: PlacementEditorCameraProvider;
  domElement: HTMLElement;
  parent: HTMLElement;
  isLayoutModeActive: () => boolean;
  draftPersistenceEnabled?: boolean;
  hudVariant?: PlacementEditorHudVariant;
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

export interface PlacementSelectionBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type PlacementDraftSnapshot = Array<[string, PlacementTransformDraft]>;

interface EditorAssetPreview {
  assetId: string;
  instance: AssetInstanceHandle;
  disposeMaterialOverrides: () => void;
  requestId: number;
}

export const primitivePlacementPreviewKinds = [
  'delivery-board',
  'mailbox',
  'pavement',
  'post-office',
  'spawn-point',
] as const satisfies readonly WorldObjectKind[];

export const isPrimitivePlacementPreviewKind = (kind: WorldObjectKind): boolean => (
  primitivePlacementPreviewKinds.includes(kind as (typeof primitivePlacementPreviewKinds)[number])
);

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

const baseVillageWorldObjectIds = new Set(baseVillageWorldObjects.map((object) => object.id));
const generatedLayoutOverridesById = new Map(
  generatedVillageLayoutOverrides.overrides.map((override) => [override.id, override]),
);

const sanitizePlacementObjectIdPart = (value: string): string => (
  value
    .trim()
    .toLowerCase()
    .replace(/^editor-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'object'
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
  worldObjects: readonly WorldObjectDefinition[] = authoredVillageWorldObjects,
): readonly EditablePlacementObject[] => (
  worldObjects
    .filter((object) => object.dimensions)
    .map((object) => {
      const generatedOverride = generatedLayoutOverridesById.get(object.id);
      const isCreated = !baseVillageWorldObjectIds.has(object.id);

      return {
        id: object.id,
        kind: object.kind,
        worldObject: object,
        templateId: generatedOverride?.templateId,
        isCreated,
      };
    })
);

export const getEditablePlacementObjectById = (
  objectId: string,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): EditablePlacementObject | null => (
  editableObjects.find((object) => object.id === objectId) ?? null
);

const cloneTuple = (value: THREE.Vector3Tuple): THREE.Vector3Tuple => [value[0], value[1], value[2]];

export const createPlacementObjectOverrideFromTemplate = (
  templateObject: WorldObjectDefinition,
  objectId: string,
  groundPosition: THREE.Vector3Tuple,
  options: { assetId?: string | null } = {},
): LayoutTransformOverride => {
  const templateAssetId = getObjectAssetId(templateObject);
  const nextAssetId = options.assetId === undefined ? templateAssetId : options.assetId;
  const position: THREE.Vector3Tuple = [
    groundPosition[0],
    templateObject.position[1],
    groundPosition[2],
  ];
  const override: LayoutTransformOverride = {
    id: objectId,
    kind: templateObject.kind,
    templateId: templateObject.id,
    active: true,
    position,
    rotation: templateObject.rotation ? cloneTuple(templateObject.rotation) : undefined,
    dimensions: templateObject.dimensions ? cloneTuple(templateObject.dimensions) : undefined,
    renderMode: nextAssetId ? 'asset' : templateObject.render?.mode ?? 'primitive',
    assetId: nextAssetId ?? undefined,
    scaleMultiplier: templateObject.render?.mode === 'asset'
      ? templateObject.render.scaleMultiplier
      : templateObject.layoutTransform?.scaleMultiplier,
    yOffset: templateObject.render?.mode === 'asset'
      ? templateObject.render.yOffset
      : templateObject.layoutTransform?.yOffset,
    fitMode: templateObject.render?.mode === 'asset' ? templateObject.render.fitMode : undefined,
  };

  return override;
};

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

export const createPlacementSelectionBounds = (
  start: Pick<THREE.Vector3, 'x' | 'z'>,
  end: Pick<THREE.Vector3, 'x' | 'z'>,
): PlacementSelectionBounds => ({
  minX: Math.min(start.x, end.x),
  maxX: Math.max(start.x, end.x),
  minZ: Math.min(start.z, end.z),
  maxZ: Math.max(start.z, end.z),
});

export const isMassSelectablePlacementObject = (object: EditablePlacementObject): boolean => (
  object.kind === placementEditorConfig.massSelectKind
);

export const isPlacementDraftInsideSelectionBounds = (
  draft: PlacementTransformDraft,
  bounds: PlacementSelectionBounds,
): boolean => (
  draft.active
  && draft.position[0] >= bounds.minX
  && draft.position[0] <= bounds.maxX
  && draft.position[2] >= bounds.minZ
  && draft.position[2] <= bounds.maxZ
);

export const getMassSelectablePlacementObjectIdsInBounds = (
  editableObjects: readonly EditablePlacementObject[],
  draftProvider: (object: EditablePlacementObject) => PlacementTransformDraft,
  bounds: PlacementSelectionBounds,
): string[] => (
  editableObjects
    .filter(isMassSelectablePlacementObject)
    .filter((object) => isPlacementDraftInsideSelectionBounds(draftProvider(object), bounds))
    .map((object) => object.id)
);

export const createDuplicatePlacementObjectId = (
  sourceObjectId: string,
  existingObjectIds: Iterable<string>,
): string => {
  const existingObjectIdSet = new Set(existingObjectIds);
  const baseId = sanitizePlacementObjectIdPart(sourceObjectId);
  let index = 1;
  let candidateId = `editor-${baseId}-copy-${index}`;

  while (existingObjectIdSet.has(candidateId)) {
    index += 1;
    candidateId = `editor-${baseId}-copy-${index}`;
  }

  return candidateId;
};

export const createDuplicatePlacementPosition = (
  object: WorldObjectDefinition,
  draft: PlacementTransformDraft,
  snapSize: number,
): THREE.Vector3Tuple => {
  const dimensions = object.dimensions ?? [1, 1, 1];
  const duplicateOffset = Math.max(
    dimensions[0] * Math.max(draft.scaleMultiplier, 0.001),
    snapSize,
    placementEditorConfig.duplicateMinOffset,
  );

  return [
    snapPlacementCoordinate(draft.position[0] + duplicateOffset, snapSize),
    draft.position[1],
    snapPlacementCoordinate(draft.position[2], snapSize),
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
  gameplayRole: draft.gameplayRole,
  interactionAction: draft.interactionAction,
  destinationName: draft.destinationName,
  mailboxVariant: draft.mailboxVariant,
});

export const markPlacementDraftDeleted = (draft: PlacementTransformDraft): PlacementTransformDraft => {
  draft.active = false;
  draft.assetId = null;
  return draft;
};

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
  const gameplay = getWorldObjectGameplay(object);
  const mailbox = getWorldObjectMailbox(object);

  return {
    id: object.id,
    active: object.active !== false,
    position: [...object.position],
    rotationY: assetRenderSettings?.rotation?.[1] ?? object.rotation?.[1] ?? 0,
    scaleMultiplier: assetRenderSettings?.scaleMultiplier ?? object.layoutTransform?.scaleMultiplier ?? 1,
    yOffset: assetRenderSettings?.yOffset ?? object.layoutTransform?.yOffset ?? 0,
    assetId: assetRenderSettings?.assetId ?? null,
    gameplayRole: gameplay.role,
    interactionAction: gameplay.action ?? getDefaultActionForRole(gameplay.role),
    destinationName: gameplay.destinationName ?? mailbox?.destinationName ?? '',
    mailboxVariant: gameplay.mailboxVariant ?? mailbox?.variant ?? 'blue',
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

  lines.push(
    `  gameplay: { role: '${draft.gameplayRole}', action: '${draft.interactionAction}' },`,
  );

  if (draft.gameplayRole === 'mailbox') {
    lines.push(
      `  mailbox: { variant: '${draft.mailboxVariant}', destinationName: '${draft.destinationName || 'Mailbox'}' },`,
    );
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
  if (objectId === 'player-spawn') {
    return ['playground:player-spawn'];
  }

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

const createPrimitivePreviewMaterial = (object: WorldObjectDefinition): THREE.Material => {
  if (object.kind === 'spawn-point') {
    return new THREE.MeshStandardMaterial({
      color: 0xf0ca72,
      roughness: 0.76,
      metalness: 0,
    });
  }

  if (object.kind === 'delivery-board') {
    return new THREE.MeshStandardMaterial({
      color: 0x164338,
      roughness: 0.7,
      metalness: 0,
    });
  }

  if (object.kind === 'mailbox') {
    return new THREE.MeshStandardMaterial({
      color: 0x3baea3,
      roughness: 0.72,
      metalness: 0,
    });
  }

  if (object.kind === 'post-office') {
    return new THREE.MeshStandardMaterial({
      color: 0xb9a178,
      roughness: 0.82,
      metalness: 0,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: 0x8a8f85,
    roughness: 0.9,
    metalness: 0,
  });
};

export const createPrimitivePlacementPreviewObject = (
  object: WorldObjectDefinition,
): THREE.Object3D | null => {
  if (!object.dimensions || !isPrimitivePlacementPreviewKind(object.kind)) {
    return null;
  }

  if (object.kind === 'pavement') {
    return createPavementTileMesh({
      name: `placement-editor:primitive-preview:${object.id}`,
      seed: object.id,
      dimensions: object.dimensions,
      position: object.position,
      rotationY: object.rotation?.[1] ?? 0,
    });
  }

  const preview = new THREE.Mesh(
    new THREE.BoxGeometry(...object.dimensions),
    createPrimitivePreviewMaterial(object),
  );

  preview.name = `placement-editor:primitive-preview:${object.id}`;
  preview.userData.label = preview.name;
  preview.receiveShadow = true;
  preview.position.set(...object.position);
  return preview;
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
    || draft.yOffset !== initial.yOffset
    || draft.gameplayRole !== initial.gameplayRole
    || draft.interactionAction !== initial.interactionAction
    || draft.destinationName !== initial.destinationName
    || draft.mailboxVariant !== initial.mailboxVariant;
};

export const resolveEditablePlacementTemplateId = (
  editableObject: EditablePlacementObject,
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): string => {
  const editableObjectsById = new Map(editableObjects.map((object) => [object.id, object]));
  let templateId = editableObject.templateId ?? editableObject.id;
  const seenObjectIds = new Set([editableObject.id]);

  while (templateId) {
    if (baseVillageWorldObjectIds.has(templateId)) {
      return templateId;
    }

    if (seenObjectIds.has(templateId)) {
      break;
    }

    seenObjectIds.add(templateId);
    const templateObject = editableObjectsById.get(templateId);

    if (!templateObject?.templateId) {
      return templateId;
    }

    templateId = templateObject.templateId;
  }

  return editableObject.templateId ?? editableObject.id;
};

const createOverrideFromDraft = (
  editableObject: EditablePlacementObject,
  draft: PlacementTransformDraft,
  updatedAt: string,
  editableObjects: readonly EditablePlacementObject[],
): LayoutTransformOverride | null => {
  const object = editableObject.worldObject;
  const initial = createPlacementTransformDraft(object);
  const override: LayoutTransformOverride = {
    id: object.id,
    updatedAt,
  };
  const forceFullRecord = editableObject.isCreated === true;

  if (forceFullRecord) {
    override.kind = object.kind;
    override.templateId = resolveEditablePlacementTemplateId(editableObject, editableObjects);

    if (object.dimensions) {
      override.dimensions = [...object.dimensions];
    }

    if (object.render?.mode === 'asset' && object.render.fitMode) {
      override.fitMode = object.render.fitMode;
    }
  }

  if (forceFullRecord || draft.position.some((value, index) => value !== initial.position[index])) {
    override.position = [...draft.position];
  }

  if (forceFullRecord || draft.active !== initial.active) {
    override.active = draft.active;
  }

  if (forceFullRecord || draft.rotationY !== initial.rotationY) {
    override.rotation = [0, draft.rotationY, 0];
  }

  if (forceFullRecord || draft.scaleMultiplier !== initial.scaleMultiplier) {
    override.scaleMultiplier = draft.scaleMultiplier;
  }

  if (forceFullRecord || draft.yOffset !== initial.yOffset) {
    override.yOffset = draft.yOffset;
  }

  if (forceFullRecord || draft.assetId !== initial.assetId) {
    if (draft.assetId) {
      override.renderMode = 'asset';
      override.assetId = draft.assetId;
    } else {
      override.renderMode = 'primitive';
    }
  }

  if (
    forceFullRecord
    || draft.gameplayRole !== initial.gameplayRole
    || draft.interactionAction !== initial.interactionAction
    || draft.destinationName !== initial.destinationName
    || draft.mailboxVariant !== initial.mailboxVariant
  ) {
    override.mailbox = draft.gameplayRole === 'mailbox'
      ? {
        variant: draft.mailboxVariant,
        destinationName: draft.destinationName || 'Mailbox',
      }
      : null;
    override.gameplay = {
      role: draft.gameplayRole,
      action: draft.interactionAction,
      destinationName: draft.gameplayRole === 'mailbox' ? draft.destinationName : undefined,
      mailboxVariant: draft.gameplayRole === 'mailbox' ? draft.mailboxVariant : undefined,
    };
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
      return draft ? createOverrideFromDraft(object, draft, updatedAt, editableObjects) : null;
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
  hudVariant = 'full',
}: PlacementEditorOptions): PlacementEditor => {
  const useBuilderHud = hudVariant === 'builder';
  const editableObjects: EditablePlacementObject[] = [...createEditablePlacementObjects()];
  const editableObjectsById = new Map(editableObjects.map((object) => [object.id, object]));
  const getEditableObjectIds = (): readonly string[] => editableObjects.map((object) => object.id);
  const draftsByObjectId = new Map<string, PlacementTransformDraft>();
  const baselinesByObjectUuid = new Map<string, SceneObjectBaseline>();
  const assetPreviewsByObjectId = new Map<string, EditorAssetPreview>();
  const primitivePreviewsByObjectId = new Map<string, THREE.Object3D>();
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
  const gameplayPanel = document.createElement('div');
  const gameplayRoleSelect = document.createElement('select');
  const interactionActionSelect = document.createElement('select');
  const mailboxVariantSelect = document.createElement('select');
  const destinationNameInput = document.createElement('input');
  const gameplayProperties = document.createElement('pre');
  const instructionsPanel = document.createElement('div');
  const instructionsText = document.createElement('pre');
  const toggleActiveButton = document.createElement('button');
  const applyAssetButton = document.createElement('button');
  const clearAssetButton = document.createElement('button');
  const markDecorativeButton = document.createElement('button');
  const markSpawnButton = document.createElement('button');
  const markPostOfficeButton = document.createElement('button');
  const markDeliveryBoardButton = document.createElement('button');
  const markMailboxButton = document.createElement('button');
  const deleteSelectedButton = document.createElement('button');
  const duplicateSelectedButton = document.createElement('button');
  const saveDraftButton = document.createElement('button');
  const saveActiveButton = document.createElement('button');
  const loadDraftButton = document.createElement('button');
  const loadActiveButton = document.createElement('button');
  const clearDraftButton = document.createElement('button');
  const copyJsonButton = document.createElement('button');
  const openJsonFileButton = document.createElement('button');
  const saveJsonFileButton = document.createElement('button');
  const importJsonButton = document.createElement('button');
  const toggleHelpButton = document.createElement('button');
  const importTextArea = document.createElement('textarea');
  const helpOverlay = document.createElement('div');
  const dragSelectOverlay = document.createElement('div');
  const saveFeedback = document.createElement('div');
  const heldKeys = new Set<string>();
  const selectedObjectIds = new Set<string>();
  const undoStack: PlacementDraftSnapshot[] = [];
  const redoStack: PlacementDraftSnapshot[] = [];
  let dragState: {
    pointerId: number;
    objectIds: string[];
    startPoint: THREE.Vector3;
    initialPositionsByObjectId: Map<string, THREE.Vector3Tuple>;
  } | null = null;
  let boxSelectState: {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    startPoint: THREE.Vector3;
    toggleObjectId: string | null;
  } | null = null;
  let selectedIndex = -1;
  let active = false;
  let helpVisible = false;
  let continuousMoveHistoryPushed = false;
  let assetPreviewRequestId = 0;
  let saveFeedbackTimeoutId: number | null = null;
  let snapIndex = placementEditorConfig.defaultSnapIndex;
  let status = draftPersistenceEnabled
    ? 'Tab selects editable objects. Drafts can be saved locally or copied as JSON.'
    : 'Tab selects editable objects. Copy JSON output into source workflow.';

  const getEditorCamera = (): THREE.Camera => (
    typeof camera === 'function' ? camera() : camera
  );

  overlay.className = useBuilderHud
    ? 'placement-editor-hud placement-editor-hud--builder'
    : 'placement-editor-hud';
  overlay.hidden = true;
  summary.className = 'placement-editor-hud__summary';
  controls.className = 'placement-editor-hud__controls';
  objectPanel.className = 'placement-editor-hud__panel';
  assetPanel.className = 'placement-editor-hud__panel';
  gameplayPanel.className = 'placement-editor-hud__panel';
  instructionsPanel.className = 'placement-editor-hud__panel';
  objectSelect.className = 'placement-editor-hud__select';
  assetSelect.className = 'placement-editor-hud__select';
  gameplayRoleSelect.className = 'placement-editor-hud__select';
  interactionActionSelect.className = 'placement-editor-hud__select';
  mailboxVariantSelect.className = 'placement-editor-hud__select';
  destinationNameInput.className = 'placement-editor-hud__input';
  objectProperties.className = 'placement-editor-hud__properties';
  assetProperties.className = 'placement-editor-hud__properties';
  gameplayProperties.className = 'placement-editor-hud__properties';
  instructionsText.className = 'placement-editor-hud__properties';
  toggleActiveButton.type = 'button';
  toggleActiveButton.textContent = 'Toggle Active';
  applyAssetButton.type = 'button';
  applyAssetButton.textContent = 'Preview Asset';
  clearAssetButton.type = 'button';
  clearAssetButton.textContent = 'Use Primitive';
  markDecorativeButton.type = 'button';
  markDecorativeButton.textContent = 'Decorative';
  markSpawnButton.type = 'button';
  markSpawnButton.textContent = 'Set Spawn';
  markPostOfficeButton.type = 'button';
  markPostOfficeButton.textContent = 'Post Office';
  markDeliveryBoardButton.type = 'button';
  markDeliveryBoardButton.textContent = 'Delivery Board';
  markMailboxButton.type = 'button';
  markMailboxButton.textContent = 'Mailbox Target';
  deleteSelectedButton.type = 'button';
  deleteSelectedButton.textContent = 'Delete Selected';
  duplicateSelectedButton.type = 'button';
  duplicateSelectedButton.textContent = 'Duplicate Selected';
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
  toggleHelpButton.type = 'button';
  toggleHelpButton.textContent = 'Help / Controls';
  importTextArea.className = 'placement-editor-hud__import';
  importTextArea.placeholder = 'Paste active town editor JSON or layout override JSON here.';
  importTextArea.spellcheck = false;
  destinationNameInput.type = 'text';
  destinationNameInput.placeholder = 'Destination name, e.g. Blue House Mailbox';

  if (useBuilderHud) {
    saveActiveButton.textContent = 'Save Layout';
    loadActiveButton.textContent = 'Load Layout';
    clearDraftButton.textContent = 'Clear Saved Layout';
    copyJsonButton.textContent = 'Copy JSON';
    openJsonFileButton.textContent = 'Open JSON';
    saveJsonFileButton.textContent = 'Save JSON File';
    importJsonButton.textContent = 'Import Pasted JSON';
    importTextArea.placeholder = 'Paste layout JSON here when loading a saved layout.';
  }

  instructionsText.textContent = [
    'Button Instructions',
    'Drag palette tiles into the world to create new editable objects.',
    'Preview Asset: put selected model on selected object.',
    'Use Primitive: clear selected model preview.',
    'Toggle Active: show/hide selected object in editor JSON.',
    'Set Spawn / Post Office / Delivery Board / Mailbox Target: assign gameplay role/action to selected asset.',
    'Generated pavement: select a pavement object, Toggle Active, then drag/scale it.',
    'Save Active JSON: save working town layout locally.',
    'Copy JSON / Save JSON File: export layout for layout:apply.',
    'Duplicate Selected or Ctrl+D: create another editable copy next to the selected object.',
    'Empty left-drag: draw a box around active pavement tiles to select many at once.',
    'Ctrl-click: add/remove an object from the current selection.',
    'Ctrl-drag: start a pavement selection box even when the pointer begins on an object.',
    'Move, rotate, scale, Y offset, duplicate, and delete affect every selected object.',
    'Delete Selected: remove selected object(s) from active editor JSON.',
  ].join('\n');
  const createObjectSelectOption = (object: EditablePlacementObject, index: number): HTMLOptionElement => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${object.id} (${object.kind}${object.isCreated ? ', new' : ''})`;
    return option;
  };

  objectSelect.append(...editableObjects.map(createObjectSelectOption));
  assetSelect.append(...assetRegistry.map((asset) => {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = `${asset.id} (${asset.sourcePack})`;
    return option;
  }));
  gameplayRoleSelect.append(...worldGameplayRoles.map((role) => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    return option;
  }));
  interactionActionSelect.append(...worldInteractionActions.map((action) => {
    const option = document.createElement('option');
    option.value = action;
    option.textContent = action;
    return option;
  }));
  mailboxVariantSelect.append(...mailboxVariants.map((variant) => {
    const option = document.createElement('option');
    option.value = variant;
    option.textContent = variant;
    return option;
  }));
  helpOverlay.className = 'placement-editor-help';
  helpOverlay.hidden = true;
  dragSelectOverlay.className = 'placement-editor-drag-select';
  dragSelectOverlay.hidden = true;
  saveFeedback.className = 'placement-editor-hud__save-feedback';
  saveFeedback.hidden = true;
  saveFeedback.setAttribute('role', 'status');
  saveFeedback.setAttribute('aria-live', 'polite');
  helpOverlay.textContent = [
    'Placement Editor Help',
    'F2 layout mode  F1 help',
    'V overview / close view  Wheel zoom',
    'Close view: right-drag orbit  middle-drag pan',
    'Tab / Shift+Tab select  Click selects  Drag moves on ground',
    'Empty left-drag box-selects active pavement tiles',
    'Ctrl-click toggles objects in the current selection',
    'Ctrl-drag starts tile box selection from anywhere',
    'WASD / arrows hold to move  Shift faster  Alt finer',
    'Q / E rotate  Z / X scale  [ / ] Y offset',
    '1 / 2 / 3 snap size',
    'Ctrl+D duplicate selected object',
    'Delete removes selected object(s) from active editor JSON',
    'Ctrl+Z undo  Ctrl+Shift+Z or Ctrl+Y redo',
    'Ctrl+S save active JSON  Ctrl+O reload active JSON  Ctrl+Shift+Delete clear',
    'C copy selected TS  Shift+C copy active JSON',
    'Object panel toggles active state. Asset panel previews registered runtime models.',
    'Gameplay panel assigns spawn, board, post office, mailbox, or decorative roles.',
    'Delete removes selected object(s) from the active editor layout; source files are unchanged.',
  ].join('\n');
  objectPanel.append(objectSelect, objectProperties);
  assetPanel.append(assetSelect, assetProperties);
  gameplayPanel.append(
    gameplayRoleSelect,
    interactionActionSelect,
    mailboxVariantSelect,
    destinationNameInput,
    gameplayProperties,
  );
  instructionsPanel.append(instructionsText);
  if (useBuilderHud) {
    controls.append(
      saveActiveButton,
      loadActiveButton,
      copyJsonButton,
      openJsonFileButton,
      saveJsonFileButton,
      importJsonButton,
      clearDraftButton,
      toggleHelpButton,
      duplicateSelectedButton,
      deleteSelectedButton,
    );
    overlay.append(summary, saveFeedback, controls, importTextArea);
  } else {
    controls.append(
      toggleActiveButton,
      applyAssetButton,
      clearAssetButton,
      duplicateSelectedButton,
      deleteSelectedButton,
      markDecorativeButton,
      markSpawnButton,
      markPostOfficeButton,
      markDeliveryBoardButton,
      markMailboxButton,
      saveActiveButton,
      loadActiveButton,
      saveDraftButton,
      loadDraftButton,
      clearDraftButton,
      copyJsonButton,
      openJsonFileButton,
      saveJsonFileButton,
      importJsonButton,
      toggleHelpButton,
    );
    overlay.append(summary, saveFeedback, instructionsPanel, objectPanel, assetPanel, gameplayPanel, controls, importTextArea);
  }
  parent.append(overlay);
  parent.append(helpOverlay);
  parent.append(dragSelectOverlay);

  const getSaveFeedbackTime = (): string => new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const showSaveFeedback = (
    label: string,
    button?: HTMLButtonElement,
  ): void => {
    if (saveFeedbackTimeoutId !== null) {
      window.clearTimeout(saveFeedbackTimeoutId);
      saveFeedbackTimeoutId = null;
    }

    saveFeedback.hidden = false;
    saveFeedback.textContent = `${label} at ${getSaveFeedbackTime()}`;
    saveFeedback.classList.remove('placement-editor-hud__save-feedback--flash');
    void saveFeedback.offsetWidth;
    saveFeedback.classList.add('placement-editor-hud__save-feedback--flash');
    button?.classList.add('placement-editor-hud__button--saved');

    saveFeedbackTimeoutId = window.setTimeout(() => {
      saveFeedback.classList.remove('placement-editor-hud__save-feedback--flash');
      button?.classList.remove('placement-editor-hud__button--saved');
      saveFeedbackTimeoutId = null;
    }, 1800);
  };

  const getSelectedObject = (): EditablePlacementObject | null => (
    selectedIndex >= 0 ? editableObjects[selectedIndex] ?? null : null
  );

  const ensureDraftForObject = (selectedObject: EditablePlacementObject): PlacementTransformDraft => {
    let draft = draftsByObjectId.get(selectedObject.id);

    if (!draft) {
      draft = createPlacementTransformDraft(selectedObject.worldObject);
      draftsByObjectId.set(selectedObject.id, draft);
    }

    return draft;
  };

  const getSelectedDraft = (): PlacementTransformDraft | null => {
    const selectedObject = getSelectedObject();

    return selectedObject ? ensureDraftForObject(selectedObject) : null;
  };

  const getSelectedObjects = (): EditablePlacementObject[] => (
    [...selectedObjectIds]
      .map((objectId) => editableObjectsById.get(objectId))
      .filter((object): object is EditablePlacementObject => object !== undefined)
  );

  const getSelectedObjectCount = (): number => selectedObjectIds.size;

  const getSelectedLabel = (): string => (
    getSelectedObjectCount() === 1
      ? getSelectedObjects()[0]?.id ?? 'selection'
      : `${getSelectedObjectCount()} objects`
  );

  const registerEditableObject = (editableObject: EditablePlacementObject): boolean => {
    if (editableObjectsById.has(editableObject.id)) {
      return false;
    }

    editableObjects.push(editableObject);
    editableObjectsById.set(editableObject.id, editableObject);
    objectSelect.append(createObjectSelectOption(editableObject, editableObjects.length - 1));
    return true;
  };

  const ensureEditableObjectFromOverride = (
    override: LayoutTransformOverride,
  ): EditablePlacementObject | null => {
    const existingObject = editableObjectsById.get(override.id);

    if (existingObject) {
      return existingObject;
    }

    const createdWorldObject = createWorldObjectFromLayoutOverride(
      override,
      editableObjects.map((object) => object.worldObject),
    );

    if (!createdWorldObject) {
      return null;
    }

    const editableObject: EditablePlacementObject = {
      id: createdWorldObject.id,
      kind: createdWorldObject.kind,
      worldObject: createdWorldObject,
      templateId: override.templateId,
      isCreated: true,
    };

    registerEditableObject(editableObject);
    return editableObject;
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
    primitivePreviewsByObjectId.forEach((preview) => {
      preview.parent?.remove(preview);
      disposeObjectResources(preview);
    });
    primitivePreviewsByObjectId.clear();
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

  const disposePrimitivePreview = (objectId: string): void => {
    const preview = primitivePreviewsByObjectId.get(objectId);

    if (!preview) {
      return;
    }

    preview.parent?.remove(preview);
    disposeObjectResources(preview);
    primitivePreviewsByObjectId.delete(objectId);
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

  const updatePrimitivePreviewTransform = (
    previewObject: THREE.Object3D,
    editableObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
  ): void => {
    const dimensions = editableObject.worldObject.dimensions ?? [1, 0.05, 1];
    const height = Math.max(dimensions[1], 0.01);
    const groundY = Math.max(0, draft.position[1] - height / 2 + draft.yOffset);
    const scale = Math.max(draft.scaleMultiplier, 0.001);

    previewObject.position.set(draft.position[0], groundY + height / 2, draft.position[2]);
    previewObject.rotation.set(0, draft.rotationY, 0);
    previewObject.scale.set(scale, 1, scale);
    previewObject.updateMatrixWorld(true);
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
        const disposeMaterialOverrides = applyAssetMaterialOverrides(
          instance.object,
          editableObject.worldObject,
          { assetId },
        );
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

  const loadPrimitivePreview = (
    editableObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
  ): boolean => {
    if (!active || !draft.active || !isPrimitivePlacementPreviewKind(editableObject.kind)) {
      disposePrimitivePreview(editableObject.id);
      return false;
    }

    let preview = primitivePreviewsByObjectId.get(editableObject.id);

    if (!preview) {
      preview = createPrimitivePlacementPreviewObject(editableObject.worldObject) ?? undefined;

      if (!preview) {
        return false;
      }

      primitivePreviewsByObjectId.set(editableObject.id, preview);
      sceneRoot.add(preview);
    }

    updatePrimitivePreviewTransform(preview, editableObject, draft);
    preview.visible = true;
    setSceneObjectsVisible(editableObject.id, false);
    status = `Previewing generated ${editableObject.kind} for ${editableObject.id}.`;
    return true;
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
    const selectedObjects = getSelectedObjects();

    if (!active || selectedObjects.length === 0) {
      marker.visible = false;
      return;
    }

    if (selectedObjects.length === 1 && selectedObject) {
      const draft = getSelectedDraft();

      if (!draft) {
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
      return;
    }

    const selectionBounds = selectedObjects.reduce<PlacementSelectionBounds | null>((bounds, object) => {
      const draft = ensureDraftForObject(object);
      const dimensions = object.worldObject.dimensions ?? [1, 1, 1];
      const halfWidth = Math.max(dimensions[0] * draft.scaleMultiplier, 0.4) / 2;
      const halfDepth = Math.max(dimensions[2] * draft.scaleMultiplier, 0.4) / 2;
      const objectBounds = {
        minX: draft.position[0] - halfWidth,
        maxX: draft.position[0] + halfWidth,
        minZ: draft.position[2] - halfDepth,
        maxZ: draft.position[2] + halfDepth,
      };

      if (!bounds) {
        return objectBounds;
      }

      return {
        minX: Math.min(bounds.minX, objectBounds.minX),
        maxX: Math.max(bounds.maxX, objectBounds.maxX),
        minZ: Math.min(bounds.minZ, objectBounds.minZ),
        maxZ: Math.max(bounds.maxZ, objectBounds.maxZ),
      };
    }, null);

    if (!selectionBounds) {
      marker.visible = false;
      return;
    }

    marker.visible = true;
    marker.position.set(
      (selectionBounds.minX + selectionBounds.maxX) / 2,
      0.2,
      (selectionBounds.minZ + selectionBounds.maxZ) / 2,
    );
    marker.rotation.y = 0;
    marker.scale.set(
      Math.max(selectionBounds.maxX - selectionBounds.minX, 0.4),
      1,
      Math.max(selectionBounds.maxZ - selectionBounds.minZ, 0.4),
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
      disposePrimitivePreview(selectedObject.id);
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
      disposePrimitivePreview(selectedObject.id);
      loadAssetPreview(selectedObject, draft);
    } else {
      disposeAssetPreview(selectedObject.id);

      if (!loadPrimitivePreview(selectedObject, draft)) {
        setSceneObjectsVisible(selectedObject.id, true);
      }
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
      const editableObject = editableObjectsById.get(override.id) ?? ensureEditableObjectFromOverride(override);

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

      if (override.gameplay !== undefined) {
        if (override.gameplay === null) {
          const initialGameplay = createPlacementTransformDraft(editableObject.worldObject);
          draft.gameplayRole = initialGameplay.gameplayRole;
          draft.interactionAction = initialGameplay.interactionAction;
          draft.destinationName = initialGameplay.destinationName;
          draft.mailboxVariant = initialGameplay.mailboxVariant;
        } else {
          draft.gameplayRole = override.gameplay.role;
          draft.interactionAction = override.gameplay.action ?? getDefaultActionForRole(override.gameplay.role);
          draft.destinationName = override.gameplay.destinationName ?? draft.destinationName;
          draft.mailboxVariant = override.gameplay.mailboxVariant ?? draft.mailboxVariant;
        }
      }

      if (override.mailbox !== undefined) {
        if (override.mailbox === null) {
          if (draft.gameplayRole !== 'mailbox') {
            draft.destinationName = '';
          }
        } else {
          draft.destinationName = override.mailbox.destinationName;
          draft.mailboxVariant = override.mailbox.variant;
        }
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
    const result = parseLayoutOverrideJson(json, getEditableObjectIds());

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
    showSaveFeedback('Saved layout', saveActiveButton);
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
    showSaveFeedback('Saved draft', saveDraftButton);
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
    selectedObjectIds.clear();
    setPrimarySelection(null);
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
      showSaveFeedback('Saved JSON file', saveJsonFileButton);
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

    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
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

    selectedObjects.forEach((object) => {
      const draft = ensureDraftForObject(object);
      draft.position = [
        draft.position[0] + heldMoveVector.x * distance,
        draft.position[1],
        draft.position[2] + heldMoveVector.y * distance,
      ];
      applyDraftToScene(object);
    });
    status = `Moving ${getSelectedLabel()}.`;
    updateMarker();
    updateHud();
  };

  const updateObjectPropertiesPanel = (
    selectedObject: EditablePlacementObject | null,
    draft: PlacementTransformDraft | null,
  ): void => {
    objectSelect.value = selectedIndex >= 0 ? String(selectedIndex) : '';

    if (getSelectedObjectCount() > 1) {
      const selectedObjects = getSelectedObjects();
      const pavementCount = selectedObjects.filter((object) => object.kind === 'pavement').length;

      objectProperties.textContent = [
        'Object Properties',
        `Multi-selection: ${selectedObjects.length} objects`,
        `pavement tiles: ${pavementCount}`,
        selectedObject ? `primary: ${selectedObject.id}` : 'primary: none',
        'WASD/arrows, drag, rotate, scale, Y offset, duplicate, and delete affect the full selection.',
      ].join('\n');
      return;
    }

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
      `gameplay: ${draft.gameplayRole} / ${draft.interactionAction}`,
      `mailbox: ${draft.gameplayRole === 'mailbox' ? `${draft.destinationName || 'Mailbox'} (${draft.mailboxVariant})` : 'none'}`,
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

  const updateGameplayPanel = (
    selectedObject: EditablePlacementObject | null,
    draft: PlacementTransformDraft | null,
  ): void => {
    const hasSelection = selectedObject !== null && draft !== null;

    gameplayRoleSelect.disabled = !hasSelection;
    interactionActionSelect.disabled = !hasSelection;
    mailboxVariantSelect.disabled = !hasSelection;
    destinationNameInput.disabled = !hasSelection;

    if (!hasSelection || !draft) {
      gameplayProperties.textContent = [
        'Gameplay Actions',
        'No object selected.',
        'Pick an object, then assign a role/action.',
      ].join('\n');
      return;
    }

    gameplayRoleSelect.value = draft.gameplayRole;
    interactionActionSelect.value = draft.interactionAction;
    mailboxVariantSelect.value = draft.mailboxVariant;
    destinationNameInput.value = draft.destinationName;
    mailboxVariantSelect.hidden = draft.gameplayRole !== 'mailbox';
    destinationNameInput.hidden = draft.gameplayRole !== 'mailbox';

    gameplayProperties.textContent = [
      'Gameplay Actions',
      `role: ${draft.gameplayRole}`,
      `action: ${draft.interactionAction}`,
      draft.gameplayRole === 'mailbox'
        ? `destination: ${draft.destinationName || 'Mailbox'} (${draft.mailboxVariant})`
        : 'destination: n/a',
      'These values export into active JSON and can be promoted with layout:apply.',
    ].join('\n');
  };

  const updateHud = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();
    const snap = getCurrentSnap();

    overlay.hidden = !active;
    updateObjectPropertiesPanel(selectedObject, draft);
    updateAssetPropertiesPanel(selectedObject, draft);
    updateGameplayPanel(selectedObject, draft);

    if (!active) {
      return;
    }

    if (useBuilderHud) {
      const lines = [
        'Town Builder Save Panel',
        'Save Layout stores the active layout in this browser.',
        'Copy JSON or Save JSON File exports it for layout:apply.',
        `Snap ${snap}`,
      ];

      if (selectedObject && draft) {
        const selectionCount = getSelectedObjectCount();
        lines.push(
          selectionCount > 1
            ? `Selected ${selectionCount} objects (primary ${selectedObject.id})`
            : `Selected ${selectedObject.id} (${selectedObject.kind})`,
          `Active ${draft.active ? 'yes' : 'no'}`,
          `Position ${formatTuple(draft.position)}`,
          `RotationY ${formatNumber(THREE.MathUtils.radToDeg(draft.rotationY))}deg`,
          `Scale ${formatNumber(draft.scaleMultiplier)}  Y offset ${formatNumber(draft.yOffset)}`,
          `Render ${draft.assetId ?? getObjectAssetId(selectedObject.worldObject) ?? selectedObject.worldObject.render?.mode ?? 'primitive'}`,
          selectionCount > 1 ? 'Group edit: move / scale / rotate / duplicate / delete applies to all selected.' : '',
          'Help / Controls or F1 shows editor instructions.',
          'Ctrl+D or Duplicate Selected creates another copy.',
          'Delete key or Delete Selected removes this object from active JSON.',
        );
      } else {
        lines.push(
          'Selected: none',
          'Drag an asset tile into the world or click a placed object.',
          'Empty left-drag draws a box to select pavement tiles.',
          'Help / Controls or F1 shows editor instructions.',
        );
      }

      lines.push(status);
      summary.textContent = lines.join('\n');
      return;
    }

    if (!selectedObject || !draft) {
      summary.textContent = [
        'Placement Editor',
        'Active JSON drives live editor previews; source changes still require layout:apply.',
        'Ctrl+S save active JSON  Ctrl+O reload  Ctrl+Shift+Delete clear',
        `Snap ${snap}`,
        'Selected: none',
        'Empty left-drag draws a box to select pavement tiles.',
        status,
      ].join('\n');
      return;
    }

    const renderSettings = getAssetRenderSettings(selectedObject.worldObject);
    summary.textContent = [
      'Placement Editor',
      'Active JSON drives live editor previews; source changes still require layout:apply.',
      getSelectedObjectCount() > 1
        ? `Selected ${getSelectedObjectCount()} objects (primary ${selectedObject.id})`
        : `Selected ${selectedObject.id} (${selectedObject.kind})`,
      `Active ${draft.active ? 'yes' : 'no'}`,
      `Position ${formatTuple(draft.position)}`,
      `RotationY ${formatNumber(THREE.MathUtils.radToDeg(draft.rotationY))}deg`,
      `Scale ${formatNumber(draft.scaleMultiplier)}  Y offset ${formatNumber(draft.yOffset)}`,
      `Render ${draft.assetId ?? renderSettings?.assetId ?? selectedObject.worldObject.render?.mode ?? 'primitive'}`,
      `Snap ${snap}  Edited ${isChangedDraft(selectedObject.worldObject, draft) ? 'yes' : 'no'}`,
      getSelectedObjectCount() > 1 ? 'Group edit: move / scale / rotate / duplicate / delete applies to all selected.' : '',
      'Ctrl+D duplicate  Ctrl+S save active  Ctrl+O reload active  Shift+C copy JSON',
      'Help / Controls or F1 toggles instructions.',
      status,
    ].join('\n');
  };

  const toggleHelp = (): void => {
    helpVisible = !helpVisible;
    helpOverlay.hidden = !(active && helpVisible);
    status = helpVisible ? 'Editor help shown.' : 'Editor help hidden.';
    updateHud();
  };

  const setPrimarySelection = (objectId: string | null): void => {
    if (!objectId) {
      selectedIndex = -1;
      objectSelect.value = '';
      return;
    }

    selectedIndex = editableObjects.findIndex((object) => object.id === objectId);
    objectSelect.value = selectedIndex >= 0 ? String(selectedIndex) : '';
  };

  const selectObjectIds = (
    objectIds: readonly string[],
    nextStatus?: string,
  ): void => {
    selectedObjectIds.clear();

    objectIds.forEach((objectId) => {
      if (editableObjectsById.has(objectId)) {
        selectedObjectIds.add(objectId);
      }
    });

    const firstObjectId = selectedObjectIds.values().next().value as string | undefined;
    setPrimarySelection(firstObjectId ?? null);
    getSelectedObjects().forEach((object) => {
      ensureDraftForObject(object);
      applyDraftToScene(object);
    });

    status = nextStatus ?? (
      selectedObjectIds.size === 1
        ? `Selected ${firstObjectId}.`
        : `Selected ${selectedObjectIds.size} objects.`
    );
    updateMarker();
    updateHud();
  };

  const clearSelection = (nextStatus = 'Selection cleared.'): void => {
    selectedObjectIds.clear();
    setPrimarySelection(null);
    dragState = null;
    boxSelectState = null;
    dragSelectOverlay.hidden = true;
    status = nextStatus;
    updateMarker();
    updateHud();
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
      selectedObjectIds.clear();
      selectedObjectIds.add(selectedObject.id);
      ensureDraftForObject(selectedObject);
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

  const placeObjectAt = (
    objectId: string,
    groundPosition: THREE.Vector3Tuple,
    options: { assetId?: string | null; select?: boolean } = {},
  ): boolean => {
    const editableObject = editableObjectsById.get(objectId);

    if (!editableObject) {
      status = `No editable object found for ${objectId}.`;
      updateHud();
      return false;
    }

    const nextIndex = editableObjects.findIndex((object) => object.id === objectId);

    if (nextIndex >= 0 && options.select !== false) {
      selectedIndex = nextIndex;
      objectSelect.value = String(nextIndex);
      selectedObjectIds.clear();
      selectedObjectIds.add(objectId);
    }

    pushUndoSnapshot();
    const draft = draftsByObjectId.get(objectId) ?? createPlacementTransformDraft(editableObject.worldObject);
    draft.active = true;
    draft.position = [groundPosition[0], draft.position[1], groundPosition[2]];

    if (options.assetId !== undefined) {
      draft.assetId = options.assetId;
    }

    draftsByObjectId.set(objectId, draft);
    status = `Placed ${objectId}${options.assetId ? ` with ${options.assetId}` : ''}.`;
    applyDraftToScene(editableObject);
    updateMarker();
    updateHud();
    return true;
  };

  const createObjectFromTemplate = (
    templateId: string,
    objectId: string,
    groundPosition: THREE.Vector3Tuple,
    options: { assetId?: string | null; select?: boolean } = {},
  ): boolean => {
    const templateObject = editableObjectsById.get(templateId);

    if (!templateObject) {
      status = `No editable template found for ${templateId}.`;
      updateHud();
      return false;
    }

    if (editableObjectsById.has(objectId)) {
      status = `Object id already exists: ${objectId}.`;
      updateHud();
      return false;
    }

    const override = createPlacementObjectOverrideFromTemplate(
      templateObject.worldObject,
      objectId,
      groundPosition,
      { assetId: options.assetId },
    );
    const worldObject = createWorldObjectFromLayoutOverride(override, [templateObject.worldObject]);

    if (!worldObject) {
      status = `Could not create ${objectId} from ${templateId}.`;
      updateHud();
      return false;
    }

    const editableObject: EditablePlacementObject = {
      id: worldObject.id,
      kind: worldObject.kind,
      worldObject,
      templateId,
      isCreated: true,
    };

    pushUndoSnapshot();
    registerEditableObject(editableObject);

    const nextIndex = editableObjects.findIndex((object) => object.id === objectId);
    const draft = createPlacementTransformDraft(worldObject);
    draft.active = true;

    if (options.assetId !== undefined) {
      draft.assetId = options.assetId;
    }

    draftsByObjectId.set(objectId, draft);

    if (nextIndex >= 0 && options.select !== false) {
      selectedIndex = nextIndex;
      objectSelect.value = String(nextIndex);
      selectedObjectIds.clear();
      selectedObjectIds.add(objectId);
    }

    status = `Created ${objectId}${draft.assetId ? ` with ${draft.assetId}` : ''}.`;
    applyDraftToScene(editableObject);
    updateMarker();
    updateHud();
    return true;
  };

  const duplicatePlacementObject = (
    selectedObject: EditablePlacementObject,
    draft: PlacementTransformDraft,
    existingObjectIds: Set<string>,
  ): EditablePlacementObject | null => {
    const objectId = createDuplicatePlacementObjectId(
      selectedObject.id,
      existingObjectIds,
    );
    existingObjectIds.add(objectId);
    const duplicatePosition = createDuplicatePlacementPosition(
      selectedObject.worldObject,
      draft,
      getCurrentSnap(),
    );
    const templateId = resolveEditablePlacementTemplateId(selectedObject, editableObjects);
    const override: LayoutTransformOverride = {
      id: objectId,
      kind: selectedObject.kind,
      templateId,
      active: true,
      position: duplicatePosition,
      rotation: [0, draft.rotationY, 0],
      dimensions: selectedObject.worldObject.dimensions
        ? [...selectedObject.worldObject.dimensions]
        : undefined,
      renderMode: draft.assetId ? 'asset' : selectedObject.worldObject.render?.mode ?? 'primitive',
      assetId: draft.assetId ?? undefined,
      scaleMultiplier: draft.scaleMultiplier,
      yOffset: draft.yOffset,
      fitMode: selectedObject.worldObject.render?.mode === 'asset'
        ? selectedObject.worldObject.render.fitMode
        : undefined,
      mailbox: draft.gameplayRole === 'mailbox'
        ? {
          variant: draft.mailboxVariant,
          destinationName: draft.destinationName || 'Mailbox',
        }
        : null,
      gameplay: {
        role: draft.gameplayRole,
        action: draft.interactionAction,
        destinationName: draft.gameplayRole === 'mailbox' ? draft.destinationName : undefined,
        mailboxVariant: draft.gameplayRole === 'mailbox' ? draft.mailboxVariant : undefined,
      },
    };
    const worldObject = createWorldObjectFromLayoutOverride(
      override,
      editableObjects.map((object) => object.worldObject),
    );

    if (!worldObject) {
      return null;
    }

    const editableObject: EditablePlacementObject = {
      id: worldObject.id,
      kind: worldObject.kind,
      worldObject,
      templateId,
      isCreated: true,
    };

    registerEditableObject(editableObject);

    const duplicateDraft = createPlacementTransformDraft(worldObject);
    duplicateDraft.active = true;
    duplicateDraft.position = duplicatePosition;
    duplicateDraft.rotationY = draft.rotationY;
    duplicateDraft.scaleMultiplier = draft.scaleMultiplier;
    duplicateDraft.yOffset = draft.yOffset;
    duplicateDraft.assetId = draft.assetId;
    duplicateDraft.gameplayRole = draft.gameplayRole;
    duplicateDraft.interactionAction = draft.interactionAction;
    duplicateDraft.destinationName = draft.destinationName;
    duplicateDraft.mailboxVariant = draft.mailboxVariant;
    draftsByObjectId.set(objectId, duplicateDraft);
    return editableObject;
  };

  const duplicateSelectedObject = (): boolean => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object to duplicate.';
      updateHud();
      return false;
    }

    pushUndoSnapshot();
    const existingObjectIds = new Set(editableObjects.map((object) => object.id));
    const duplicatedObjects: EditablePlacementObject[] = [];

    selectedObjects.forEach((selectedObject) => {
      const duplicate = duplicatePlacementObject(
        selectedObject,
        ensureDraftForObject(selectedObject),
        existingObjectIds,
      );

      if (duplicate) {
        duplicatedObjects.push(duplicate);
      }
    });

    if (duplicatedObjects.length === 0) {
      status = `Could not duplicate ${getSelectedLabel()}.`;
      updateHud();
      return false;
    }

    selectObjectIds(
      duplicatedObjects.map((object) => object.id),
      duplicatedObjects.length === 1
        ? `Duplicated ${selectedObjects[0]?.id ?? 'object'} as ${duplicatedObjects[0].id}.`
        : `Duplicated ${duplicatedObjects.length} selected objects.`,
    );
    return true;
  };

  const nudgeSelected = (dx: number, dz: number, recordHistory = true): void => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    if (recordHistory) {
      pushUndoSnapshot();
    }

    selectedObjects.forEach((object) => {
      const draft = ensureDraftForObject(object);
      draft.position = [draft.position[0] + dx, draft.position[1], draft.position[2] + dz];
      applyDraftToScene(object);
    });
    status = `Moved ${getSelectedLabel()}.`;
    updateMarker();
    updateHud();
  };

  const rotateSelected = (delta: number): void => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    selectedObjects.forEach((object) => {
      const draft = ensureDraftForObject(object);
      draft.rotationY += delta;
      applyDraftToScene(object);
    });
    status = `Rotated ${getSelectedLabel()}.`;
    updateMarker();
    updateHud();
  };

  const scaleSelected = (delta: number): void => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    selectedObjects.forEach((object) => {
      const draft = ensureDraftForObject(object);
      draft.scaleMultiplier = Math.max(0.05, draft.scaleMultiplier + delta);
      applyDraftToScene(object);
    });
    status = `Scaled ${getSelectedLabel()}.`;
    updateMarker();
    updateHud();
  };

  const offsetSelected = (delta: number): void => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    selectedObjects.forEach((object) => {
      const draft = ensureDraftForObject(object);
      draft.yOffset += delta;
      applyDraftToScene(object);
    });
    status = `Adjusted Y offset for ${getSelectedLabel()}.`;
    updateMarker();
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
    raycaster.setFromCamera(pointer, getEditorCamera());

    return raycaster.ray.intersectPlane(groundPlane, hitPoint) !== null;
  };

  const updateDragSelectOverlay = (): void => {
    if (!boxSelectState) {
      dragSelectOverlay.hidden = true;
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const left = Math.min(boxSelectState.startClientX, boxSelectState.currentClientX) - parentRect.left;
    const top = Math.min(boxSelectState.startClientY, boxSelectState.currentClientY) - parentRect.top;
    const width = Math.abs(boxSelectState.currentClientX - boxSelectState.startClientX);
    const height = Math.abs(boxSelectState.currentClientY - boxSelectState.startClientY);

    dragSelectOverlay.hidden = false;
    dragSelectOverlay.style.left = `${left}px`;
    dragSelectOverlay.style.top = `${top}px`;
    dragSelectOverlay.style.width = `${width}px`;
    dragSelectOverlay.style.height = `${height}px`;
  };

  const startBoxSelect = (
    event: PointerEvent,
    toggleObjectId: string | null = null,
  ): void => {
    boxSelectState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      startPoint: hitPoint.clone(),
      toggleObjectId,
    };
    updateDragSelectOverlay();
    status = 'Drag a box over pavement tiles to select them.';
    updateHud();

    if (typeof domElement.setPointerCapture === 'function') {
      domElement.setPointerCapture(event.pointerId);
    }
  };

  const isBoxSelectClick = (): boolean => {
    if (!boxSelectState) {
      return false;
    }

    const dx = boxSelectState.currentClientX - boxSelectState.startClientX;
    const dy = boxSelectState.currentClientY - boxSelectState.startClientY;
    return Math.hypot(dx, dy) < placementEditorConfig.dragSelectThresholdPx;
  };

  const updateBoxSelectFromPointer = (event: PointerEvent): void => {
    if (!boxSelectState || event.pointerId !== boxSelectState.pointerId) {
      return;
    }

    boxSelectState.currentClientX = event.clientX;
    boxSelectState.currentClientY = event.clientY;
    updateDragSelectOverlay();
    event.preventDefault();
  };

  const finishBoxSelect = (event: PointerEvent): void => {
    if (!boxSelectState || event.pointerId !== boxSelectState.pointerId) {
      return;
    }

    boxSelectState.currentClientX = event.clientX;
    boxSelectState.currentClientY = event.clientY;
    updateDragSelectOverlay();

    const wasClick = isBoxSelectClick();
    const state = boxSelectState;
    boxSelectState = null;
    dragSelectOverlay.hidden = true;

    if (typeof domElement.releasePointerCapture === 'function') {
      try {
        domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    }

    if (wasClick) {
      if (state.toggleObjectId) {
        const nextSelection = new Set(selectedObjectIds);

        if (nextSelection.has(state.toggleObjectId)) {
          nextSelection.delete(state.toggleObjectId);
        } else {
          nextSelection.add(state.toggleObjectId);
        }

        selectObjectIds([...nextSelection], `Selected ${nextSelection.size} object(s).`);
      } else {
        clearSelection();
      }

      event.preventDefault();
      return;
    }

    if (!updateHitPointFromPointer(event)) {
      clearSelection();
      event.preventDefault();
      return;
    }

    const bounds = createPlacementSelectionBounds(state.startPoint, hitPoint);
    const selectedIds = getMassSelectablePlacementObjectIdsInBounds(
      editableObjects,
      ensureDraftForObject,
      bounds,
    );

    if (selectedIds.length === 0) {
      clearSelection('No pavement tiles inside selection box.');
      event.preventDefault();
      return;
    }

    selectObjectIds(selectedIds, `Selected ${selectedIds.length} pavement tile(s).`);
    event.preventDefault();
  };

  const updateDragFromPointer = (event: PointerEvent): void => {
    if (boxSelectState) {
      updateBoxSelectFromPointer(event);
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId || !updateHitPointFromPointer(event)) {
      return;
    }

    const selectedObjects = dragState.objectIds
      .map((objectId) => editableObjectsById.get(objectId))
      .filter((object): object is EditablePlacementObject => object !== undefined);

    if (selectedObjects.length === 0) {
      status = 'Drag ignored: missing selected object.';
      updateHud();
      return;
    }

    const dx = hitPoint.x - dragState.startPoint.x;
    const dz = hitPoint.z - dragState.startPoint.z;
    const snap = getCurrentSnap();

    selectedObjects.forEach((editableObject) => {
      const initialPosition = dragState?.initialPositionsByObjectId.get(editableObject.id);

      if (!initialPosition) {
        return;
      }

      const draft = ensureDraftForObject(editableObject);
      draft.position = [
        placementEditorConfig.dragSnapEnabled ? snapPlacementCoordinate(initialPosition[0] + dx, snap) : initialPosition[0] + dx,
        initialPosition[1],
        placementEditorConfig.dragSnapEnabled ? snapPlacementCoordinate(initialPosition[2] + dz, snap) : initialPosition[2] + dz,
      ];
      applyDraftToScene(editableObject);
    });
    status = `Dragging ${dragState.objectIds.length === 1 ? dragState.objectIds[0] : `${dragState.objectIds.length} objects`}.`;
    updateMarker();
    updateHud();
    event.preventDefault();
  };

  const stopDragging = (event: PointerEvent): void => {
    if (boxSelectState) {
      finishBoxSelect(event);
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const objectCount = dragState.objectIds.length;
    dragState = null;
    continuousMoveHistoryPushed = false;

    if (typeof domElement.releasePointerCapture === 'function') {
      try {
        domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    }

    status = `Dropped ${objectCount === 1 ? getSelectedLabel() : `${objectCount} objects`}.`;
    updateHud();
    event.preventDefault();
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!active || !isLayoutModeActive() || event.button !== 0 || !updateHitPointFromPointer(event)) {
      return;
    }

    const nearestIndex = getNearestObjectIndex(hitPoint);

    if (nearestIndex < 0) {
      startBoxSelect(event);
      event.preventDefault();
      return;
    }

    const nearestObject = editableObjects[nearestIndex];

    if (!nearestObject) {
      clearSelection();
      event.preventDefault();
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      startBoxSelect(event, nearestObject.id);
      event.preventDefault();
      return;
    }

    if (!selectedObjectIds.has(nearestObject.id)) {
      selectIndex(nearestIndex);
    } else {
      setPrimarySelection(nearestObject.id);
      updateMarker();
      updateHud();
    }

    const selectedObject = getSelectedObject();
    const selectedObjects = getSelectedObjects();

    if (selectedObject && selectedObjects.length > 0) {
      pushUndoSnapshot();
      const initialPositionsByObjectId = new Map<string, THREE.Vector3Tuple>();

      selectedObjects.forEach((object) => {
        initialPositionsByObjectId.set(object.id, [...ensureDraftForObject(object).position]);
      });

      dragState = {
        pointerId: event.pointerId,
        objectIds: selectedObjects.map((object) => object.id),
        startPoint: hitPoint.clone(),
        initialPositionsByObjectId,
      };
      status = `Dragging ${selectedObjects.length === 1 ? selectedObject.id : `${selectedObjects.length} objects`}.`;
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

  const updateSelectedGameplay = (
    role: WorldGameplayRole,
    options: {
      action?: WorldInteractionAction;
      destinationName?: string;
      mailboxVariant?: MailboxVariant;
    } = {},
  ): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      status = 'No selected object for gameplay role.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    draft.gameplayRole = role;
    draft.interactionAction = options.action ?? getDefaultActionForRole(role);
    draft.destinationName = role === 'mailbox'
      ? (options.destinationName ?? draft.destinationName) || `${selectedObject.id} Mailbox`
      : '';
    draft.mailboxVariant = options.mailboxVariant ?? draft.mailboxVariant;
    draft.active = true;
    status = `${selectedObject.id} role set to ${role}.`;
    applyDraftToScene(selectedObject);
    updateHud();
  };

  const updateSelectedGameplayFromControls = (): void => {
    const selectedObject = getSelectedObject();
    const draft = getSelectedDraft();

    if (!selectedObject || !draft) {
      return;
    }

    pushUndoSnapshot();
    const role = gameplayRoleSelect.value as WorldGameplayRole;
    draft.gameplayRole = role;
    draft.interactionAction = interactionActionSelect.value as WorldInteractionAction;
    draft.destinationName = role === 'mailbox' ? destinationNameInput.value : '';
    draft.mailboxVariant = mailboxVariantSelect.value as MailboxVariant;
    status = `${selectedObject.id} gameplay updated.`;
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

  const deleteSelectedObject = (): void => {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 0) {
      status = 'No selected object to delete.';
      updateHud();
      return;
    }

    pushUndoSnapshot();
    selectedObjects.forEach((object) => {
      markPlacementDraftDeleted(ensureDraftForObject(object));
      applyDraftToScene(object);
    });
    clearSelection(`Deleted ${selectedObjects.length} selected object(s) from the active editor layout. Save JSON to keep this change.`);
  };

  const handleOpenJsonFileClick = (): void => {
    void openJsonFile();
  };

  const handleSaveJsonFileClick = (): void => {
    void saveJsonFile();
  };

  const handleMarkDecorativeClick = (): void => updateSelectedGameplay('decorative');
  const handleMarkSpawnClick = (): void => updateSelectedGameplay('player-spawn');
  const handleMarkPostOfficeClick = (): void => updateSelectedGameplay('post-office');
  const handleMarkDeliveryBoardClick = (): void => updateSelectedGameplay('delivery-board');
  const handleMarkMailboxClick = (): void => updateSelectedGameplay('mailbox');

  objectSelect.addEventListener('change', handleObjectSelectChange);
  assetSelect.addEventListener('change', updateHud);
  gameplayRoleSelect.addEventListener('change', updateSelectedGameplayFromControls);
  interactionActionSelect.addEventListener('change', updateSelectedGameplayFromControls);
  mailboxVariantSelect.addEventListener('change', updateSelectedGameplayFromControls);
  destinationNameInput.addEventListener('change', updateSelectedGameplayFromControls);
  toggleActiveButton.addEventListener('click', toggleSelectedActive);
  applyAssetButton.addEventListener('click', applySelectedAsset);
  clearAssetButton.addEventListener('click', clearSelectedAsset);
  deleteSelectedButton.addEventListener('click', deleteSelectedObject);
  duplicateSelectedButton.addEventListener('click', duplicateSelectedObject);
  markDecorativeButton.addEventListener('click', handleMarkDecorativeClick);
  markSpawnButton.addEventListener('click', handleMarkSpawnClick);
  markPostOfficeButton.addEventListener('click', handleMarkPostOfficeClick);
  markDeliveryBoardButton.addEventListener('click', handleMarkDeliveryBoardClick);
  markMailboxButton.addEventListener('click', handleMarkMailboxClick);
  saveActiveButton.addEventListener('click', saveActiveJsonToStorage);
  loadActiveButton.addEventListener('click', handleLoadActiveButtonClick);
  saveDraftButton.addEventListener('click', saveDraftToStorage);
  loadDraftButton.addEventListener('click', handleLoadDraftButtonClick);
  clearDraftButton.addEventListener('click', clearDraftStorage);
  copyJsonButton.addEventListener('click', copyAll);
  openJsonFileButton.addEventListener('click', handleOpenJsonFileClick);
  saveJsonFileButton.addEventListener('click', handleSaveJsonFileClick);
  importJsonButton.addEventListener('click', importDraftFromPanel);
  toggleHelpButton.addEventListener('click', toggleHelp);
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
      marker.visible = active && selectedObjectIds.size > 0;
      heldKeys.clear();
      dragState = null;
      boxSelectState = null;
      dragSelectOverlay.hidden = true;
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

      if (!isTextInputTarget && event.ctrlKey && key === 'd') {
        duplicateSelectedObject();
        event.preventDefault();
        return true;
      }

      if (isTextInputTarget) {
        return false;
      }

      heldKeys.add(key);

      const snap = placementEditorConfig.snapValues[snapIndex] ?? placementEditorConfig.snapValues[0];

      if (key === 'F1') {
        toggleHelp();
        event.preventDefault();
        return true;
      }

      if (key === 'Tab') {
        selectIndex(selectedIndex + (event.shiftKey ? -1 : 1));
        event.preventDefault();
        return true;
      }

      if (key === 'Escape') {
        clearSelection();
        event.preventDefault();
        return true;
      }

      if (key === 'Delete') {
        deleteSelectedObject();
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
    placeObjectAt,
    createObjectFromTemplate,
    getEditableObjects() {
      return editableObjects;
    },
    getSelectedObjectId() {
      return getSelectedObject()?.id ?? null;
    },
    dispose() {
      if (saveFeedbackTimeoutId !== null) {
        window.clearTimeout(saveFeedbackTimeoutId);
        saveFeedbackTimeoutId = null;
      }

      resetSceneObjects();
      objectSelect.removeEventListener('change', handleObjectSelectChange);
      assetSelect.removeEventListener('change', updateHud);
      gameplayRoleSelect.removeEventListener('change', updateSelectedGameplayFromControls);
      interactionActionSelect.removeEventListener('change', updateSelectedGameplayFromControls);
      mailboxVariantSelect.removeEventListener('change', updateSelectedGameplayFromControls);
      destinationNameInput.removeEventListener('change', updateSelectedGameplayFromControls);
      toggleActiveButton.removeEventListener('click', toggleSelectedActive);
      applyAssetButton.removeEventListener('click', applySelectedAsset);
      clearAssetButton.removeEventListener('click', clearSelectedAsset);
      deleteSelectedButton.removeEventListener('click', deleteSelectedObject);
      duplicateSelectedButton.removeEventListener('click', duplicateSelectedObject);
      markDecorativeButton.removeEventListener('click', handleMarkDecorativeClick);
      markSpawnButton.removeEventListener('click', handleMarkSpawnClick);
      markPostOfficeButton.removeEventListener('click', handleMarkPostOfficeClick);
      markDeliveryBoardButton.removeEventListener('click', handleMarkDeliveryBoardClick);
      markMailboxButton.removeEventListener('click', handleMarkMailboxClick);
      saveActiveButton.removeEventListener('click', saveActiveJsonToStorage);
      loadActiveButton.removeEventListener('click', handleLoadActiveButtonClick);
      saveDraftButton.removeEventListener('click', saveDraftToStorage);
      loadDraftButton.removeEventListener('click', handleLoadDraftButtonClick);
      clearDraftButton.removeEventListener('click', clearDraftStorage);
      copyJsonButton.removeEventListener('click', copyAll);
      openJsonFileButton.removeEventListener('click', handleOpenJsonFileClick);
      saveJsonFileButton.removeEventListener('click', handleSaveJsonFileClick);
      importJsonButton.removeEventListener('click', importDraftFromPanel);
      toggleHelpButton.removeEventListener('click', toggleHelp);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', updateDragFromPointer);
      domElement.removeEventListener('pointerup', stopDragging);
      domElement.removeEventListener('pointercancel', stopDragging);
      overlay.remove();
      helpOverlay.remove();
      dragSelectOverlay.remove();
      marker.parent?.remove(marker);
      disposeObjectResources(marker);
    },
  };
};
