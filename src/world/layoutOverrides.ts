import type * as THREE from 'three';
import type { AssetFitMode } from '../game/assets';
import { isAssetFitMode, isKnownAssetId } from '../game/assets';
import type {
  WorldColliderDefinition,
  WorldGameplayDefinition,
  WorldInteractableDefinition,
  WorldMailboxDefinition,
  WorldObjectDefinition,
  WorldObjectiveAnchorDefinition,
} from './types';
import {
  isMailboxVariant,
  isWorldGameplayRole,
  isWorldInteractionAction,
} from './worldObjectGameplay';

export const layoutOverrideDocumentVersion = 1;

export interface LayoutTransformOverride {
  id: string;
  active?: boolean;
  position?: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  scaleMultiplier?: number;
  yOffset?: number;
  fitMode?: AssetFitMode;
  dimensions?: THREE.Vector3Tuple;
  renderMode?: 'primitive' | 'asset';
  assetId?: string;
  collider?: WorldColliderDefinition | null;
  interactable?: WorldInteractableDefinition | null;
  objectiveAnchor?: WorldObjectiveAnchorDefinition | null;
  mailbox?: WorldMailboxDefinition | null;
  gameplay?: WorldGameplayDefinition | null;
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

const cloneCollider = (
  collider: WorldColliderDefinition,
): WorldColliderDefinition => ({
  position: cloneTuple(collider.position),
  size: cloneTuple(collider.size),
});

const cloneInteractable = (
  interactable: WorldInteractableDefinition,
): WorldInteractableDefinition => ({
  position: cloneTuple(interactable.position),
  radius: interactable.radius,
});

const cloneObjectiveAnchor = (
  objectiveAnchor: WorldObjectiveAnchorDefinition,
): WorldObjectiveAnchorDefinition => ({
  position: cloneTuple(objectiveAnchor.position),
});

const cloneMailbox = (
  mailbox: WorldMailboxDefinition,
): WorldMailboxDefinition => ({
  variant: mailbox.variant,
  destinationName: mailbox.destinationName,
});

const cloneGameplay = (
  gameplay: WorldGameplayDefinition,
): WorldGameplayDefinition => ({
  ...gameplay,
});

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

      if (entry.active !== undefined) {
        if (typeof entry.active === 'boolean') {
          override.active = entry.active;
        } else {
          errors.push(`Override ${id} active must be a boolean.`);
        }
      }

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

      if (entry.dimensions !== undefined) {
        if (isFiniteVector3Tuple(entry.dimensions) && entry.dimensions.every((component) => component > 0)) {
          override.dimensions = cloneTuple(entry.dimensions);
        } else {
          errors.push(`Override ${id} dimensions must be a positive [x, y, z] tuple.`);
        }
      }

      if (entry.renderMode !== undefined) {
        if (entry.renderMode === 'primitive' || entry.renderMode === 'asset') {
          override.renderMode = entry.renderMode;
        } else {
          errors.push(`Override ${id} renderMode must be primitive or asset.`);
        }
      }

      if (entry.assetId !== undefined) {
        if (typeof entry.assetId === 'string' && isKnownAssetId(entry.assetId)) {
          override.assetId = entry.assetId;
        } else {
          errors.push(`Override ${id} assetId must reference a known asset.`);
        }
      }

      if (entry.renderMode === 'asset' && typeof entry.assetId !== 'string') {
        errors.push(`Override ${id} renderMode asset requires assetId.`);
      }

      if (entry.collider !== undefined) {
        if (entry.collider === null) {
          override.collider = null;
        } else if (
          isRecord(entry.collider)
          && isFiniteVector3Tuple(entry.collider.position)
          && isFiniteVector3Tuple(entry.collider.size)
          && entry.collider.size.every((component) => component > 0)
        ) {
          override.collider = {
            position: cloneTuple(entry.collider.position),
            size: cloneTuple(entry.collider.size),
          };
        } else {
          errors.push(`Override ${id} collider must be null or include position and positive size tuples.`);
        }
      }

      if (entry.interactable !== undefined) {
        if (entry.interactable === null) {
          override.interactable = null;
        } else if (
          isRecord(entry.interactable)
          && isFiniteVector3Tuple(entry.interactable.position)
          && typeof entry.interactable.radius === 'number'
          && Number.isFinite(entry.interactable.radius)
          && entry.interactable.radius > 0
        ) {
          override.interactable = {
            position: cloneTuple(entry.interactable.position),
            radius: entry.interactable.radius,
          };
        } else {
          errors.push(`Override ${id} interactable must be null or include position and positive radius.`);
        }
      }

      if (entry.objectiveAnchor !== undefined) {
        if (entry.objectiveAnchor === null) {
          override.objectiveAnchor = null;
        } else if (
          isRecord(entry.objectiveAnchor)
          && isFiniteVector3Tuple(entry.objectiveAnchor.position)
        ) {
          override.objectiveAnchor = {
            position: cloneTuple(entry.objectiveAnchor.position),
          };
        } else {
          errors.push(`Override ${id} objectiveAnchor must be null or include a position tuple.`);
        }
      }

      if (entry.mailbox !== undefined) {
        if (entry.mailbox === null) {
          override.mailbox = null;
        } else if (
          isRecord(entry.mailbox)
          && isMailboxVariant(entry.mailbox.variant)
          && typeof entry.mailbox.destinationName === 'string'
          && entry.mailbox.destinationName.trim().length > 0
        ) {
          override.mailbox = {
            variant: entry.mailbox.variant,
            destinationName: entry.mailbox.destinationName,
          };
        } else {
          errors.push(`Override ${id} mailbox must be null or include variant and destinationName.`);
        }
      }

      if (entry.gameplay !== undefined) {
        if (entry.gameplay === null) {
          override.gameplay = null;
        } else if (isRecord(entry.gameplay) && isWorldGameplayRole(entry.gameplay.role)) {
          const gameplay: WorldGameplayDefinition = {
            role: entry.gameplay.role,
          };

          if (entry.gameplay.action !== undefined) {
            if (isWorldInteractionAction(entry.gameplay.action)) {
              gameplay.action = entry.gameplay.action;
            } else {
              errors.push(`Override ${id} gameplay action must be a valid interaction action.`);
            }
          }

          if (entry.gameplay.destinationName !== undefined) {
            if (typeof entry.gameplay.destinationName === 'string') {
              gameplay.destinationName = entry.gameplay.destinationName;
            } else {
              errors.push(`Override ${id} gameplay destinationName must be a string.`);
            }
          }

          if (entry.gameplay.mailboxVariant !== undefined) {
            if (isMailboxVariant(entry.gameplay.mailboxVariant)) {
              gameplay.mailboxVariant = entry.gameplay.mailboxVariant;
            } else {
              errors.push(`Override ${id} gameplay mailboxVariant must be blue, red, or green.`);
            }
          }

          override.gameplay = gameplay;
        } else {
          errors.push(`Override ${id} gameplay must be null or include a valid role.`);
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
  gameplay: object.gameplay ? { ...object.gameplay } : undefined,
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

    if (override.active !== undefined) {
      nextObject.active = override.active;
    }

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

    if (override.dimensions) {
      nextObject.dimensions = cloneTuple(override.dimensions);
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

    if (override.renderMode === 'primitive') {
      nextObject.render = { mode: 'primitive' };
    } else if (override.assetId !== undefined || override.renderMode === 'asset') {
      const currentAssetRender = nextObject.render?.mode === 'asset' ? nextObject.render : undefined;
      const assetId = override.assetId ?? currentAssetRender?.assetId;

      if (assetId) {
        nextObject.render = {
          mode: 'asset',
          assetId,
          scaleMultiplier: currentAssetRender?.scaleMultiplier,
          yOffset: currentAssetRender?.yOffset,
          rotation: currentAssetRender?.rotation,
          fitMode: currentAssetRender?.fitMode,
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

    if (override.collider !== undefined) {
      nextObject.collider = override.collider === null ? undefined : cloneCollider(override.collider);
    }

    if (override.interactable !== undefined) {
      nextObject.interactable = override.interactable === null ? undefined : cloneInteractable(override.interactable);
    }

    if (override.objectiveAnchor !== undefined) {
      nextObject.objectiveAnchor = override.objectiveAnchor === null ? undefined : cloneObjectiveAnchor(override.objectiveAnchor);
    }

    if (override.mailbox !== undefined) {
      nextObject.mailbox = override.mailbox === null ? undefined : cloneMailbox(override.mailbox);
    }

    if (override.gameplay !== undefined) {
      nextObject.gameplay = override.gameplay === null ? undefined : cloneGameplay(override.gameplay);
    }

    return nextObject;
  });
};
