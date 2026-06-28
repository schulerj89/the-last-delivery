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
  'nature-branch01': ['tree'],
  'nature-bush-berries-blue': ['bush'],
  'nature-bush-berries-empty': ['bush'],
  'nature-bush-berries-red': ['bush'],
  'nature-dead-tree': ['tree'],
  'nature-fence': ['signpost'],
  'nature-flower-orange': ['bush'],
  'nature-flower-pink': ['bush'],
  'nature-flower-yellow': ['bush'],
  'nature-grass-array': ['bush'],
  'nature-grass01': ['bush'],
  'nature-grass03': ['bush'],
  'nature-hat-mushroom-brown': ['bush'],
  'nature-hat-mushroom-red': ['bush'],
  'nature-hills01': ['rock'],
  'nature-hills02': ['rock'],
  'nature-log': ['tree'],
  'nature-mountain01': ['rock'],
  'nature-mushroom-brown': ['bush'],
  'nature-mushroom-red': ['bush'],
  'nature-pine01': ['tree'],
  'nature-plant02': ['bush'],
  'nature-rock-fbx': ['rock'],
  'nature-rock-big01': ['rock'],
  'nature-simple-bush-fbx': ['bush'],
  'nature-stone01': ['rock'],
  'nature-tent-blue': ['cottage'],
  'nature-tent-red': ['cottage'],
  'nature-tile-flat': ['pavement'],
  'nature-tree-dead01': ['tree'],
  'nature-tree01-fbx': ['tree'],
  'fantasy-house-001': ['cottage', 'post-office'],
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
  const candidateKinds = worldAssetKindRules[asset.id] ?? [];
  const templateObjects = editableObjects.filter((object) => object.isCreated !== true);
  const kindMatches = templateObjects
    .filter((object) => candidateKinds.includes(object.kind))
    .map((object) => object.id);

  if (kindMatches.length > 0) {
    return kindMatches;
  }

  const exactMatches = templateObjects
    .filter((object) => object.worldObject.render?.mode === 'asset' && object.worldObject.render.assetId === asset.id)
    .map((object) => object.id);

  return exactMatches;
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
        detail: candidateObjectIds.length > 0 ? 'drag to place' : 'needs a template',
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
    .filter((object) => object.kind === 'pavement' && object.isCreated !== true)
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
