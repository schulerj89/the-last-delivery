import type * as THREE from 'three';
import type { AssetFitMode } from '../game/assets';
import { isAssetFitMode } from '../game/assets';
import type { WorldObjectDefinition } from './types';

export const layoutOverrideDocumentVersion = 1;

export interface LayoutTransformOverride {
  id: string;
  position?: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  scaleMultiplier?: number;
  yOffset?: number;
  fitMode?: AssetFitMode;
  updatedAt?: string;
}

export interface LayoutOverrideDocument {
  version: typeof layoutOverrideDocumentVersion;
  updatedAt: string;
  overrides: LayoutTransformOverride[];
}

export interface LayoutOverrideValidationResult {
  ok: boolean;
  errors: string[];
  document: LayoutOverrideDocument | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteVector3Tuple = (value: unknown): value is THREE.Vector3Tuple => (
  Array.isArray(value)
  && value.length === 3
  && value.every((component) => typeof component === 'number' && Number.isFinite(component))
);

const cloneTuple = (value: THREE.Vector3Tuple): THREE.Vector3Tuple => [value[0], value[1], value[2]];

const addDelta = (
  value: THREE.Vector3Tuple,
  delta: THREE.Vector3Tuple,
): THREE.Vector3Tuple => [
  value[0] + delta[0],
  value[1] + delta[1],
  value[2] + delta[2],
];

export const createEmptyLayoutOverrideDocument = (
  updatedAt = new Date().toISOString(),
): LayoutOverrideDocument => ({
  version: layoutOverrideDocumentVersion,
  updatedAt,
  overrides: [],
});

export const serializeLayoutOverrideDocument = (document: LayoutOverrideDocument): string => (
  `${JSON.stringify(document, null, 2)}\n`
);

export const validateLayoutOverrideDocument = (
  value: unknown,
  knownObjectIds: readonly string[] = [],
): LayoutOverrideValidationResult => {
  const errors: string[] = [];
  const knownObjectIdSet = new Set(knownObjectIds);
  const requireKnownIds = knownObjectIds.length > 0;

  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ['Layout override document must be an object.'],
      document: null,
    };
  }

  if (value.version !== layoutOverrideDocumentVersion) {
    errors.push(`Layout override document version must be ${layoutOverrideDocumentVersion}.`);
  }

  if (typeof value.updatedAt !== 'string' || value.updatedAt.trim().length === 0) {
    errors.push('Layout override document must include updatedAt metadata.');
  }

  if (!Array.isArray(value.overrides)) {
    errors.push('Layout override document must include an overrides array.');
  }

  const seenIds = new Set<string>();
  const overrides: LayoutTransformOverride[] = [];

  if (Array.isArray(value.overrides)) {
    value.overrides.forEach((entry, index) => {
      if (!isRecord(entry)) {
        errors.push(`Override at index ${index} must be an object.`);
        return;
      }

      const id = entry.id;

      if (typeof id !== 'string' || id.trim().length === 0) {
        errors.push(`Override at index ${index} must include a non-empty object id.`);
        return;
      }

      if (seenIds.has(id)) {
        errors.push(`Duplicate layout override id: ${id}.`);
      }

      seenIds.add(id);

      if (requireKnownIds && !knownObjectIdSet.has(id)) {
        errors.push(`Unknown layout override object id: ${id}.`);
      }

      const override: LayoutTransformOverride = { id };

      if (entry.position !== undefined) {
        if (isFiniteVector3Tuple(entry.position)) {
          override.position = cloneTuple(entry.position);
        } else {
          errors.push(`Override ${id} position must be a finite [x, y, z] tuple.`);
        }
      }

      if (entry.rotation !== undefined) {
        if (isFiniteVector3Tuple(entry.rotation)) {
          override.rotation = cloneTuple(entry.rotation);
        } else {
          errors.push(`Override ${id} rotation must be a finite [x, y, z] tuple.`);
        }
      }

      if (entry.scaleMultiplier !== undefined) {
        if (typeof entry.scaleMultiplier === 'number' && Number.isFinite(entry.scaleMultiplier) && entry.scaleMultiplier > 0) {
          override.scaleMultiplier = entry.scaleMultiplier;
        } else {
          errors.push(`Override ${id} scaleMultiplier must be a positive number.`);
        }
      }

      if (entry.yOffset !== undefined) {
        if (typeof entry.yOffset === 'number' && Number.isFinite(entry.yOffset)) {
          override.yOffset = entry.yOffset;
        } else {
          errors.push(`Override ${id} yOffset must be a finite number.`);
        }
      }

      if (entry.fitMode !== undefined) {
        if (typeof entry.fitMode === 'string' && isAssetFitMode(entry.fitMode)) {
          override.fitMode = entry.fitMode;
        } else {
          errors.push(`Override ${id} fitMode must be a valid asset fit mode.`);
        }
      }

      if (entry.updatedAt !== undefined) {
        if (typeof entry.updatedAt === 'string' && entry.updatedAt.trim().length > 0) {
          override.updatedAt = entry.updatedAt;
        } else {
          errors.push(`Override ${id} updatedAt must be a non-empty string when provided.`);
        }
      }

      overrides.push(override);
    });
  }

  const document = errors.length === 0
    ? {
      version: layoutOverrideDocumentVersion,
      updatedAt: value.updatedAt as string,
      overrides,
    } satisfies LayoutOverrideDocument
    : null;

  return {
    ok: errors.length === 0,
    errors,
    document,
  };
};

export const parseLayoutOverrideJson = (
  json: string,
  knownObjectIds: readonly string[] = [],
): LayoutOverrideValidationResult => {
  try {
    return validateLayoutOverrideDocument(JSON.parse(json) as unknown, knownObjectIds);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
      document: null,
    };
  }
};

const cloneWorldObject = (object: WorldObjectDefinition): WorldObjectDefinition => ({
  ...object,
  position: cloneTuple(object.position),
  rotation: object.rotation ? cloneTuple(object.rotation) : undefined,
  dimensions: object.dimensions ? cloneTuple(object.dimensions) : undefined,
  render: object.render ? { ...object.render } : undefined,
  collider: object.collider
    ? {
      position: cloneTuple(object.collider.position),
      size: cloneTuple(object.collider.size),
    }
    : undefined,
  interactable: object.interactable
    ? {
      position: cloneTuple(object.interactable.position),
      radius: object.interactable.radius,
    }
    : undefined,
  objectiveAnchor: object.objectiveAnchor
    ? {
      position: cloneTuple(object.objectiveAnchor.position),
    }
    : undefined,
  mailbox: object.mailbox ? { ...object.mailbox } : undefined,
  layoutTransform: object.layoutTransform ? { ...object.layoutTransform } : undefined,
});

export const mergeWorldObjectOverrides = (
  worldObjects: readonly WorldObjectDefinition[],
  document: LayoutOverrideDocument,
): readonly WorldObjectDefinition[] => {
  const overridesById = new Map(document.overrides.map((override) => [override.id, override]));

  return worldObjects.map((object) => {
    const override = overridesById.get(object.id);

    if (!override) {
      return cloneWorldObject(object);
    }

    const nextObject = cloneWorldObject(object);

    if (override.position) {
      const delta: THREE.Vector3Tuple = [
        override.position[0] - object.position[0],
        override.position[1] - object.position[1],
        override.position[2] - object.position[2],
      ];

      nextObject.position = cloneTuple(override.position);

      if (nextObject.collider) {
        nextObject.collider.position = addDelta(nextObject.collider.position, delta);
      }

      if (nextObject.interactable) {
        nextObject.interactable.position = addDelta(nextObject.interactable.position, delta);
      }

      if (nextObject.objectiveAnchor) {
        nextObject.objectiveAnchor.position = addDelta(nextObject.objectiveAnchor.position, delta);
      }
    }

    if (override.rotation) {
      nextObject.rotation = cloneTuple(override.rotation);

      if (nextObject.render?.mode === 'asset') {
        nextObject.render = {
          ...nextObject.render,
          rotation: cloneTuple(override.rotation),
        };
      }
    }

    if (override.scaleMultiplier !== undefined || override.yOffset !== undefined || override.fitMode !== undefined) {
      if (nextObject.render?.mode === 'asset') {
        nextObject.render = {
          ...nextObject.render,
          scaleMultiplier: override.scaleMultiplier ?? nextObject.render.scaleMultiplier,
          yOffset: override.yOffset ?? nextObject.render.yOffset,
          fitMode: override.fitMode ?? nextObject.render.fitMode,
        };
      } else {
        nextObject.layoutTransform = {
          ...nextObject.layoutTransform,
          scaleMultiplier: override.scaleMultiplier ?? nextObject.layoutTransform?.scaleMultiplier,
          yOffset: override.yOffset ?? nextObject.layoutTransform?.yOffset,
        };
      }
    }

    return nextObject;
  });
};
