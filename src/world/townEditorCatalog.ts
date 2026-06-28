import { assetRegistry, type AssetDefinition } from '../game/assets';
import {
  createEditablePlacementObjects,
  type EditablePlacementObject,
} from './placementEditor';
import { getWorldObjectGameplay, getWorldObjectMailbox } from './worldObjectGameplay';

export type TownEditorPaletteItemType = 'asset' | 'generated' | 'marker';

export interface TownEditorPaletteItem {
  type: TownEditorPaletteItemType;
  id: string;
  label: string;
  detail: string;
  source: string;
  candidateObjectIds: readonly string[];
  placeable: boolean;
}

const worldAssetKindRules: Readonly<Record<string, readonly string[]>> = {
  'nature-tree01': ['tree'],
  'nature-rock': ['rock'],
  'nature-simple-bush': ['bush'],
  'fantasy-house-001': ['post-office', 'cottage'],
  'fantasy-house-002': ['cottage'],
  'fantasy-house-003': ['cottage'],
  'fantasy-barrel-001': ['barrel'],
  'fantasy-box-001': ['crate'],
  'fantasy-pointer-001': ['signpost'],
  'fantasy-cart-001': ['cart'],
  'fantasy-bag-001': ['sack'],
};

const formatAssetLabel = (assetId: string): string => (
  assetId
    .replace(/^fantasy-/, '')
    .replace(/^nature-/, '')
    .replaceAll('-', ' ')
);

const markerObjectIds = [
  'player-spawn',
  'post-office',
  'delivery-board',
  'mailbox',
  'mailbox-east',
  'mailbox-post-office-return',
] as const;

const formatMarkerLabel = (object: EditablePlacementObject): string => {
  const mailbox = getWorldObjectMailbox(object.worldObject);

  if (mailbox) {
    return mailbox.destinationName;
  }

  if (getWorldObjectGameplay(object.worldObject).role === 'player-spawn') {
    return 'Player Spawn';
  }

  if (object.id === 'delivery-board') {
    return 'Delivery Board';
  }

  if (object.id === 'post-office') {
    return 'Post Office';
  }

  return object.id.replaceAll('-', ' ');
};

const getAssetCandidateObjectIds = (
  asset: AssetDefinition,
  editableObjects: readonly EditablePlacementObject[],
): readonly string[] => {
  const exactMatches = editableObjects
    .filter((object) => object.worldObject.render?.mode === 'asset' && object.worldObject.render.assetId === asset.id)
    .map((object) => object.id);

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const candidateKinds = worldAssetKindRules[asset.id] ?? [];

  return editableObjects
    .filter((object) => candidateKinds.includes(object.kind))
    .map((object) => object.id);
};

export const getTownEditorAssetPaletteItems = (
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
  assets: readonly AssetDefinition[] = assetRegistry,
): readonly TownEditorPaletteItem[] => (
  assets
    .filter((asset) => asset.sourcePack !== 'creative-characters-free')
    .map((asset) => {
      const candidateObjectIds = getAssetCandidateObjectIds(asset, editableObjects);

      return {
        type: 'asset',
        id: asset.id,
        label: formatAssetLabel(asset.id),
        detail: `${candidateObjectIds.length} slot${candidateObjectIds.length === 1 ? '' : 's'}`,
        source: asset.sourcePack,
        candidateObjectIds,
        placeable: candidateObjectIds.length > 0,
      };
    })
);

export const getTownEditorGeneratedPaletteItems = (
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): readonly TownEditorPaletteItem[] => (
  editableObjects
    .filter((object) => object.kind === 'pavement')
    .map((object) => ({
      type: 'generated',
      id: object.id,
      label: object.id.replaceAll('-', ' '),
      detail: 'generated ground',
      source: 'primitive',
      candidateObjectIds: [object.id],
      placeable: true,
    }))
);

export const getTownEditorMarkerPaletteItems = (
  editableObjects: readonly EditablePlacementObject[] = createEditablePlacementObjects(),
): readonly TownEditorPaletteItem[] => (
  markerObjectIds
    .map((objectId) => editableObjects.find((object) => object.id === objectId))
    .filter((object): object is EditablePlacementObject => object !== undefined)
    .map((object) => ({
      type: 'marker',
      id: object.id,
      label: formatMarkerLabel(object),
      detail: `${object.kind} marker`,
      source: 'world marker',
      candidateObjectIds: [object.id],
      placeable: true,
    }))
);

export const resolveTownEditorPlacementCandidate = (
  item: TownEditorPaletteItem,
  placementCount = 0,
): string | null => {
  if (!item.placeable || item.candidateObjectIds.length === 0) {
    return null;
  }

  const index = Math.max(0, placementCount) % item.candidateObjectIds.length;
  return item.candidateObjectIds[index] ?? null;
};
