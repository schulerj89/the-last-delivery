import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Texture,
  Vector3,
} from 'three';
import {
  assetFitModes,
  assetRegistry,
  createAssetCache,
  createAssetTargetBounds,
  defaultWorldAssetFitMode,
  fitAssetObjectToBounds,
  getAssetFitScale,
  getSelectedCharacterAssets,
  getSelectedFantasyAssets,
  getSelectedNatureAssets,
  isAssetFitMode,
  isKnownAssetId,
  resolveAssetFitMode,
  selectedCharacterAssetIds,
  selectedFantasyAssetIds,
  selectedNatureAssetIds,
} from '../src/game/assets';
import { thirdPersonCameraSettings } from '../src/game/camera';
import { resolvePlayerCollision } from '../src/game/collision';
import {
  createDebugOverlayVisibilityState,
  debugOverlayVisibilityConfig,
  isGameplayUiSelectorVisibleWhenDebugCollapsed,
} from '../src/game/debug/debugOverlayVisibility';
import { createDeliveryController, deliveryJobs } from '../src/game/delivery';
import {
  createPlayerFallbackVisual,
  createPlayerVisual,
  fitAndAlignCharacterModel,
  playerCharacterAssetId,
  playerCharacterVisualSettings,
  playerMovementSettings,
  resolveVisibleCharacterMeshNames,
} from '../src/game/player';
import {
  clampFrameDelta,
  createPerformanceMonitor,
  createPerformanceSnapshot,
  getCappedPixelRatio,
  performanceBudgetConfig,
} from '../src/game/performance';
import { createResourceTracker } from '../src/game/resources';
import {
  createVillageLayoutDebugView,
  getImportantLayoutObjects,
  getLayoutObjectCountsByKind,
  layoutDebugConfig,
} from '../src/world/layoutDebug';
import {
  assetMaterialOverrideConfig,
  assetMaterialOverrideKinds,
  isAssetMaterialOverrideKind,
  isValidMaterialOverrideColor,
} from '../src/world/assetMaterialOverrides';
import {
  createEmptyLayoutOverrideDocument,
  layoutOverrideDocumentVersion,
  mergeWorldObjectOverrides,
  parseLayoutOverrideJson,
  serializeLayoutOverrideDocument,
  validateLayoutOverrideDocument,
  type LayoutOverrideDocument,
} from '../src/world/layoutOverrides';
import {
  capPlacementHistoryLength,
  createLayoutOverrideDocumentFromPlacementDrafts,
  createDraggedPlacementPosition,
  createEditablePlacementObjects,
  createPlacementTransformDraft,
  getEditablePlacementObjectById,
  getPlacementEditorSnapValues,
  getPlacementEditorMoveSpeed,
  placementEditorConfig,
  serializePlacementTransform,
  serializePlacementTransforms,
} from '../src/world/placementEditor';
import { createPlayground } from '../src/world/playground';
import { playgroundCollisionWorld } from '../src/world/playgroundCollision';
import { createPlaygroundInteractables } from '../src/world/playgroundInteractables';
import {
  createDeliveryBoardObjectiveMarker,
  createDeliveryTargetObjectiveMarker,
  objectiveMarkerSettings,
  resolveObjectiveAnchorForWorldObject,
  setObjectiveMarkerTarget,
  updateObjectiveMarker,
} from '../src/world/playgroundObjectiveMarker';
import { createPlaygroundVisualBoundsDebugView } from '../src/world/playgroundVisualBoundsDebug';
import { createMailboxProp } from '../src/world/props/createMailbox';
import { villageLayoutConfig } from '../src/world/villageLayoutConfig';
import { generatedVillageLayoutOverrides } from '../src/world/villageOverrides.generated';
import { baseVillageWorldObjects, playerSpawnPosition, villageWorldObjects } from '../src/world/villageDefinition';
import { getVillagePathGuides } from '../src/world/villagePaths';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

interface RuntimeFileStats {
  size: number;
  isFile: () => boolean;
}

interface NodeFileSystem {
  existsSync: (path: string | URL) => boolean;
  statSync: (path: string | URL) => RuntimeFileStats;
}

const importNodeModule = async <T>(specifier: string): Promise<T> => (
  await (Function('specifier', 'return import(specifier)') as (moduleSpecifier: string) => Promise<T>)(specifier)
);
const nodeFileSystem = await importNodeModule<NodeFileSystem>('node:fs');
const selectedNatureAssetIdSet = new Set<string>(selectedNatureAssetIds);
const selectedFantasyAssetIdSet = new Set<string>(selectedFantasyAssetIds);
const selectedCharacterAssetIdSet = new Set<string>(selectedCharacterAssetIds);

const isFiniteVector3Tuple = (value: readonly number[]): boolean => (
  value.length === 3 && value.every((component) => Number.isFinite(component))
);

const isInsideVillageBounds = (position: readonly number[]): boolean => (
  position[0] >= villageLayoutConfig.bounds.minX
  && position[0] <= villageLayoutConfig.bounds.maxX
  && position[2] >= villageLayoutConfig.bounds.minZ
  && position[2] <= villageLayoutConfig.bounds.maxZ
);

const getHorizontalBoxDistance = (
  point: readonly number[],
  center: readonly number[],
  size: readonly number[],
): number => {
  const dx = Math.max(Math.abs(point[0] - center[0]) - size[0] / 2, 0);
  const dz = Math.max(Math.abs(point[2] - center[2]) - size[2] / 2, 0);

  return Math.hypot(dx, dz);
};

const decorativePropKinds = new Set([
  'barrel',
  'bush',
  'cart',
  'crate',
  'rock',
  'sack',
  'signpost',
  'tree',
]);

const getRuntimeAssetFileUrl = (assetUrl: string): URL => (
  new URL(`../public${assetUrl}`, import.meta.url)
);

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
};

const runAssetRegistrySmoke = (): void => {
  const assetIds = new Set<string>();

  assetRegistry.forEach((asset) => {
    assert(!assetIds.has(asset.id), `Asset id should be unique: ${asset.id}`);
    assetIds.add(asset.id);
    assert(asset.kind === 'gltf', `Asset should use the GLTF loader path: ${asset.id}`);
    assert(asset.id.trim().length > 0, `Asset id should be a non-empty string: ${asset.id}`);
    assert(typeof asset.url === 'string' && asset.url.trim().length > 0, `Asset url should be a valid string: ${asset.id}`);
    assert(asset.url.startsWith('/assets/models/'), `Asset should load from public assets models: ${asset.id}`);
    assert(asset.url.endsWith('.glb'), `Asset should point to a GLB file: ${asset.id}`);
    assert(asset.sourcePack.trim().length > 0, `Asset should identify a source pack: ${asset.id}`);
    assert(Number.isFinite(asset.defaultScale) && asset.defaultScale > 0, `Asset should define a positive default scale: ${asset.id}`);
    assert(asset.maxRecommendedBytes > 0, `Asset should define a positive size budget: ${asset.id}`);
  });

  const selectedNatureAssets = getSelectedNatureAssets();
  const selectedNatureBytes = selectedNatureAssets.reduce((totalBytes, asset) => {
    const assetFileUrl = getRuntimeAssetFileUrl(asset.url);

    assert(asset.sourcePack === 'low-poly-nature-pack-lite', `Selected nature asset should identify the nature source pack: ${asset.id}`);
    assert(asset.url.startsWith('/assets/models/nature/'), `Selected nature asset should live in the runtime nature folder: ${asset.id}`);
    assert(nodeFileSystem.existsSync(assetFileUrl), `Selected nature asset file should exist: ${asset.url}`);

    const stats = nodeFileSystem.statSync(assetFileUrl);
    assert(stats.isFile(), `Selected nature asset should be a file: ${asset.url}`);
    assert(stats.size > 0, `Selected nature asset should not be empty: ${asset.url}`);
    assert(stats.size <= asset.maxRecommendedBytes, `Selected nature asset should stay within its size budget: ${asset.id}`);

    return totalBytes + stats.size;
  }, 0);

  assert(selectedNatureAssets.length === 3, 'Exactly three selected nature assets should be registered for this pass.');
  assert(selectedNatureBytes > 0, 'Selected nature runtime asset size should be measurable.');
  console.info(`Selected nature runtime assets: ${selectedNatureAssets.length} files, ${formatBytes(selectedNatureBytes)}.`);

  const selectedFantasyAssets = getSelectedFantasyAssets();
  const selectedFantasyBytes = selectedFantasyAssets.reduce((totalBytes, asset) => {
    const assetFileUrl = getRuntimeAssetFileUrl(asset.url);

    assert(asset.sourcePack === 'fantasy-free-low-poly', `Selected fantasy asset should identify the fantasy source pack: ${asset.id}`);
    assert(asset.url.startsWith('/assets/models/fantasy/'), `Selected fantasy asset should live in the runtime fantasy folder: ${asset.id}`);
    assert(nodeFileSystem.existsSync(assetFileUrl), `Selected fantasy asset file should exist: ${asset.url}`);

    const stats = nodeFileSystem.statSync(assetFileUrl);
    assert(stats.isFile(), `Selected fantasy asset should be a file: ${asset.url}`);
    assert(stats.size > 0, `Selected fantasy asset should not be empty: ${asset.url}`);
    assert(stats.size <= asset.maxRecommendedBytes, `Selected fantasy asset should stay within its size budget: ${asset.id}`);

    return totalBytes + stats.size;
  }, 0);

  assert(selectedFantasyAssets.length === 8, 'Exactly eight selected fantasy assets should be registered for this pass.');
  assert(selectedFantasyBytes > 0, 'Selected fantasy runtime asset size should be measurable.');
  console.info(`Selected fantasy runtime assets: ${selectedFantasyAssets.length} files, ${formatBytes(selectedFantasyBytes)}.`);

  const selectedCharacterAssets = getSelectedCharacterAssets();
  const selectedCharacterBytes = selectedCharacterAssets.reduce((totalBytes, asset) => {
    const assetFileUrl = getRuntimeAssetFileUrl(asset.url);

    assert(asset.sourcePack === 'creative-characters-free', `Selected character asset should identify the character source pack: ${asset.id}`);
    assert(asset.url.startsWith('/assets/models/characters/'), `Selected character asset should live in the runtime characters folder: ${asset.id}`);
    assert(nodeFileSystem.existsSync(assetFileUrl), `Selected character asset file should exist: ${asset.url}`);

    const stats = nodeFileSystem.statSync(assetFileUrl);
    assert(stats.isFile(), `Selected character asset should be a file: ${asset.url}`);
    assert(stats.size > 0, `Selected character asset should not be empty: ${asset.url}`);
    assert(stats.size <= asset.maxRecommendedBytes, `Selected character asset should stay within its size budget: ${asset.id}`);

    return totalBytes + stats.size;
  }, 0);

  assert(selectedCharacterAssets.length === 1, 'Exactly one selected character asset should be registered for this pass.');
  assert(selectedCharacterBytes > 0, 'Selected character runtime asset size should be measurable.');
  console.info(`Selected character runtime assets: ${selectedCharacterAssets.length} file, ${formatBytes(selectedCharacterBytes)}.`);
};

const runAssetCacheSmoke = async (): Promise<void> => {
  let loadCount = 0;
  const log = {
    info: () => undefined,
    warn: () => undefined,
  };
  const cache = createAssetCache({
    canLoad: () => true,
    log,
    loadSource: async (asset) => {
      loadCount += 1;
      const group = new Group();
      group.name = `test-source:${asset.id}`;
      return group;
    },
  });
  const firstEntryPromise = cache.loadAssetEntry('crate-box-001');
  const secondEntryPromise = cache.loadAssetEntry('crate-box-001');

  assert(firstEntryPromise === secondEntryPromise, 'Asset cache should return a stable entry promise for repeated ids.');

  const firstEntry = await firstEntryPromise;
  const secondEntry = await secondEntryPromise;

  assert(firstEntry === secondEntry, 'Repeated cache loads should resolve to the same cached asset entry.');
  assert(loadCount === 1, 'Repeated asset loads should not fetch or parse the same source twice.');
  assert(cache.getRuntimeStats().loadedAssetIds.includes('crate-box-001'), 'Loaded asset ids should include the cached asset.');

  const firstInstance = await cache.createInstance('crate-box-001');
  const secondInstance = await cache.createInstance('crate-box-001');

  assert(firstInstance.object !== secondInstance.object, 'Asset cache should create separate world instance objects.');
  assert(cache.getInstanceCount('crate-box-001') === 2, 'Asset instance count should track active scene instances.');
  assert(cache.getRuntimeStats().sceneInstanceCountsByAssetId['crate-box-001'] === 2, 'Runtime stats should expose scene instances by asset id.');
  assert(!cache.disposeCachedAsset('crate-box-001'), 'Cached source asset should not dispose while instances are active.');

  const tracker = createResourceTracker();
  const trackedRoot = tracker.trackObject3D(new Object3D());
  trackedRoot.add(firstInstance.object);
  tracker.dispose();

  assert(firstInstance.isDisposed(), 'Tracked scene-root disposal should dispose attached asset instances.');
  assert(cache.getInstanceCount('crate-box-001') === 1, 'Tracked scene-root disposal should release one asset instance count.');

  firstInstance.dispose();
  firstInstance.dispose();
  secondInstance.dispose();
  secondInstance.dispose();

  assert(cache.getInstanceCount('crate-box-001') === 0, 'Asset instance count should not go below zero.');
  assert(cache.getRuntimeStats().sceneInstanceCountsByAssetId['crate-box-001'] === 0, 'Runtime stats should keep zero count for loaded assets.');
  assert(cache.disposeCachedAsset('crate-box-001'), 'Cached source asset should dispose after all instances are gone.');
  assert(!cache.getRuntimeStats().loadedAssetIds.includes('crate-box-001'), 'Disposed cached source should leave loaded asset ids.');

  let invalidFailedSafely = false;
  try {
    await cache.loadAssetEntry('missing-asset');
  } catch {
    invalidFailedSafely = true;
  }
  assert(invalidFailedSafely, 'Invalid asset ids should fail safely.');

  const disabledCache = createAssetCache({
    canLoad: () => false,
    log,
    loadSource: async () => {
      throw new Error('Disabled cache should not load sources.');
    },
  });
  let disabledFailedSafely = false;
  try {
    await disabledCache.createInstance('crate-box-001');
  } catch {
    disabledFailedSafely = true;
  }
  assert(disabledFailedSafely, 'Disabled asset cache should reject so primitive fallback can remain.');
  assert(disabledCache.getRuntimeStats().totalSceneInstances === 0, 'Failed asset loads should not create scene instances.');
};

const disposeFitSmokeMesh = (mesh: Mesh): void => {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((material) => material.dispose());
    return;
  }

  mesh.material.dispose();
};

const runAssetFittingSmoke = (): void => {
  assert(assetFitModes.includes('none'), 'Asset fitting should support none mode.');
  assert(assetFitModes.includes('contain'), 'Asset fitting should support contain mode.');
  assert(assetFitModes.includes('cover'), 'Asset fitting should support cover mode.');
  assert(assetFitModes.includes('exact'), 'Asset fitting should support exact mode.');
  assert(isAssetFitMode('contain'), 'Valid asset fit modes should be accepted.');
  assert(!isAssetFitMode('stretch'), 'Invalid asset fit modes should be rejected.');
  assert(resolveAssetFitMode('stretch') === defaultWorldAssetFitMode, 'Invalid asset fit modes should safely fall back.');

  const noneScale = getAssetFitScale(new Vector3(1, 2, 4), new Vector3(2, 2, 2), 'none');
  assert(noneScale.x === 1 && noneScale.y === 1 && noneScale.z === 1, 'None fit mode should keep source scale.');

  const containMesh = new Mesh(new BoxGeometry(1, 2, 4), new MeshBasicMaterial());
  const containResult = fitAssetObjectToBounds(containMesh, {
    targetPosition: [0, 0, 0],
    targetDimensions: [2, 2, 2],
    fitMode: 'contain',
  });
  const containSize = containResult.visualBox.getSize(new Vector3());
  assert(containResult.fitMode === 'contain', 'Contain fit mode should be reported.');
  assert(containSize.x <= 2.001 && containSize.y <= 2.001 && containSize.z <= 2.001, 'Contain fit should stay inside target dimensions.');
  disposeFitSmokeMesh(containMesh);

  const coverMesh = new Mesh(new BoxGeometry(1, 2, 4), new MeshBasicMaterial());
  const coverResult = fitAssetObjectToBounds(coverMesh, {
    targetPosition: [0, 0, 0],
    targetDimensions: [2, 2, 2],
    fitMode: 'cover',
  });
  const coverSize = coverResult.visualBox.getSize(new Vector3());
  assert(coverResult.fitMode === 'cover', 'Cover fit mode should be reported.');
  assert(coverSize.x >= 1.999 || coverSize.y >= 1.999 || coverSize.z >= 1.999, 'Cover fit should fill at least one target dimension.');
  disposeFitSmokeMesh(coverMesh);

  const exactMesh = new Mesh(new BoxGeometry(1, 2, 4), new MeshBasicMaterial());
  const exactResult = fitAssetObjectToBounds(exactMesh, {
    targetPosition: [0, 0, 0],
    targetDimensions: [2, 2, 2],
    fitMode: 'exact',
  });
  const exactSize = exactResult.visualBox.getSize(new Vector3());
  assert(exactResult.fitMode === 'exact', 'Exact fit mode should be reported.');
  assert(Math.abs(exactSize.x - 2) < 0.001, 'Exact fit should match target X size.');
  assert(Math.abs(exactSize.y - 2) < 0.001, 'Exact fit should match target Y size.');
  assert(Math.abs(exactSize.z - 2) < 0.001, 'Exact fit should match target Z size.');
  disposeFitSmokeMesh(exactMesh);

  const zeroWidthMesh = new Mesh(new BoxGeometry(0, 1, 1), new MeshBasicMaterial());
  const zeroWidthResult = fitAssetObjectToBounds(zeroWidthMesh, {
    targetPosition: [0, 0, 0],
    targetDimensions: [1, 1, 1],
    fitMode: 'exact',
  });
  assert(Number.isFinite(zeroWidthResult.appliedScale.x), 'Fit should not divide by zero for zero-width sources.');
  assert(Number.isFinite(zeroWidthResult.appliedScale.y), 'Fit should keep finite Y scale for zero-width sources.');
  assert(Number.isFinite(zeroWidthResult.appliedScale.z), 'Fit should keep finite Z scale for zero-width sources.');
  disposeFitSmokeMesh(zeroWidthMesh);

  const targetBounds = createAssetTargetBounds([1, 2, 3], [2, 4, 6], 0.5);
  assert(targetBounds !== null, 'Positive dimensions should create asset target bounds.');
  const targetSize = targetBounds.getSize(new Vector3());
  const targetCenter = targetBounds.getCenter(new Vector3());
  assert(targetSize.x === 2 && targetSize.y === 4 && targetSize.z === 6, 'Target bounds should preserve positive dimensions.');
  assert(targetCenter.y === 2.5, 'Target bounds should apply Y offset to the center.');
  assert(createAssetTargetBounds([0, 0, 0], [0, 1, 1]) === null, 'Non-positive target dimensions should fail safely.');
};

const runVisualPolishSmoke = (): void => {
  const debugVisibilityState = createDebugOverlayVisibilityState();

  assert(debugOverlayVisibilityConfig.toggleKey === 'F3', 'Debug overlay collapse should use F3.');
  assert(debugOverlayVisibilityConfig.initialCollapsed, 'Debug overlay panels should start collapsed for normal play.');
  assert(debugVisibilityState.collapsed, 'Debug overlay collapsed state should initialize.');
  assert(debugOverlayVisibilityConfig.hiddenPanelSelector === '.debug-overlay', 'Debug overlay collapse should target debug panels only.');
  assert(
    isGameplayUiSelectorVisibleWhenDebugCollapsed('.delivery-guidance'),
    'Objective guidance should remain visible when debug panels are collapsed.',
  );
  assert(
    isGameplayUiSelectorVisibleWhenDebugCollapsed('.interaction-prompt'),
    'Interaction prompt should remain visible when debug panels are collapsed.',
  );
  assert(
    !isGameplayUiSelectorVisibleWhenDebugCollapsed(debugOverlayVisibilityConfig.hiddenPanelSelector),
    'Collapsed debug panel selector should not be treated as required gameplay UI.',
  );

  assert(isAssetMaterialOverrideKind('tree'), 'Tree assets should have material override support.');
  assert(isAssetMaterialOverrideKind('rock'), 'Rock assets should have material override support.');
  assert(isAssetMaterialOverrideKind('cottage'), 'Cottage assets should have material override support.');
  assert(!isAssetMaterialOverrideKind('mailbox'), 'Procedural mailboxes should not use GLB material overrides.');
  assert(assetMaterialOverrideKinds.length > 0, 'Material override kinds should initialize.');
  assetMaterialOverrideKinds.forEach((kind) => {
    const palette = assetMaterialOverrideConfig[kind];

    assert(isValidMaterialOverrideColor(palette.primaryColor), `Material override primary color should be valid: ${kind}`);
    assert(
      palette.secondaryColor === undefined || isValidMaterialOverrideColor(palette.secondaryColor),
      `Material override secondary color should be valid: ${kind}`,
    );
    assert(
      palette.accentColor === undefined || isValidMaterialOverrideColor(palette.accentColor),
      `Material override accent color should be valid: ${kind}`,
    );
    assert(palette.roughness >= 0 && palette.roughness <= 1, `Material override roughness should be normalized: ${kind}`);
    assert(palette.metalness >= 0 && palette.metalness <= 1, `Material override metalness should be normalized: ${kind}`);
  });
};

const runLayoutOverrideSmoke = (): void => {
  const knownObjectIds = baseVillageWorldObjects.map((object) => object.id);
  const validDocument: LayoutOverrideDocument = {
    version: layoutOverrideDocumentVersion,
    updatedAt: '2026-06-28T00:00:00.000Z',
    overrides: [
      {
        id: 'delivery-board',
        position: [-3.25, 0, 7.25],
        rotation: [0, Math.PI / 2, 0],
        scaleMultiplier: 1.1,
        yOffset: 0.15,
        updatedAt: '2026-06-28T00:00:00.000Z',
      },
    ],
  };
  const validation = validateLayoutOverrideDocument(validDocument, knownObjectIds);

  assert(validation.ok && validation.document !== null, 'Layout override JSON should validate.');
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'missing-object', position: [0, 0, 0] }],
    }, knownObjectIds).ok,
    'Unknown layout override object ids should be rejected.',
  );
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'delivery-board' }, { id: 'delivery-board' }],
    }, knownObjectIds).ok,
    'Duplicate layout override ids should be rejected.',
  );

  const serializedDocument = serializeLayoutOverrideDocument(validDocument);
  const parsedDocument = parseLayoutOverrideJson(serializedDocument, knownObjectIds);

  assert(parsedDocument.ok && parsedDocument.document !== null, 'Serialized layout override JSON should parse.');
  assert(
    serializeLayoutOverrideDocument(parsedDocument.document) === serializedDocument,
    'Layout override JSON serialization should be stable without browser APIs.',
  );

  const emptyDocument = createEmptyLayoutOverrideDocument('2026-06-28T00:00:00.000Z');
  const emptyMerged = mergeWorldObjectOverrides(baseVillageWorldObjects, emptyDocument);
  const generatedMerged = mergeWorldObjectOverrides(baseVillageWorldObjects, generatedVillageLayoutOverrides);
  const overriddenMerged = mergeWorldObjectOverrides(baseVillageWorldObjects, validDocument);
  const overriddenBoard = overriddenMerged.find((object) => object.id === 'delivery-board');

  assert(emptyMerged.length === baseVillageWorldObjects.length, 'Empty generated overrides should not change object count.');
  assert(generatedMerged.length === baseVillageWorldObjects.length, 'Generated overrides should merge without changing object count.');
  assert(overriddenMerged.length === baseVillageWorldObjects.length, 'Layout overrides should merge without changing object count.');
  assert(overriddenBoard?.position[0] === -3.25, 'Merged overrides should update object position.');
  assert(
    Math.abs((overriddenBoard?.interactable?.position[0] ?? 0) - -1.95) < 0.001,
    'Merged position overrides should move interactable anchors by delta.',
  );

  const editableObjects = createEditablePlacementObjects(baseVillageWorldObjects);
  const deliveryBoard = getEditablePlacementObjectById('delivery-board', editableObjects);

  if (!deliveryBoard) {
    throw new Error('Missing delivery board editable object.');
  }

  const draft = createPlacementTransformDraft(deliveryBoard.worldObject);
  draft.position = [-3.25, 0, 7.25];
  draft.rotationY = Math.PI / 2;
  draft.scaleMultiplier = 1.1;
  draft.yOffset = 0.15;

  const draftDocument = createLayoutOverrideDocumentFromPlacementDrafts(
    new Map([[deliveryBoard.id, draft]]),
    editableObjects,
    '2026-06-28T00:00:00.000Z',
  );

  assert(draftDocument.overrides.length === 1, 'Placement drafts should create layout override JSON.');
  assert(draftDocument.overrides[0]?.id === 'delivery-board', 'Placement draft JSON should include object id.');
  assert(
    validateLayoutOverrideDocument(draftDocument, knownObjectIds).ok,
    'Placement draft JSON should validate against known world objects.',
  );
};

const runWorldDefinitionSmoke = (): void => {
  const ids = new Set<string>();

  villageWorldObjects.forEach((object) => {
    assert(!ids.has(object.id), `World object id should be unique: ${object.id}`);
    ids.add(object.id);
    assert(isFiniteVector3Tuple(object.position), `World object should have a valid position: ${object.id}`);

    if (object.dimensions) {
      assert(
        isFiniteVector3Tuple(object.dimensions) && object.dimensions.every((component) => component > 0),
        `World object should have positive dimensions: ${object.id}`,
      );

      const targetBounds = createAssetTargetBounds(object.position, object.dimensions);
      assert(targetBounds !== null, `World object dimensions should create positive target bounds: ${object.id}`);
    }

    if (object.render?.mode === 'asset') {
      assert(isKnownAssetId(object.render.assetId), `World object assetId should reference a known asset: ${object.id}`);
      assert(
        object.render.fitMode === undefined || isAssetFitMode(object.render.fitMode),
        `World object asset fit mode should be valid: ${object.id}`,
      );
      assert(
        object.render.scaleMultiplier === undefined
          || (Number.isFinite(object.render.scaleMultiplier) && object.render.scaleMultiplier > 0),
        `World object asset scale multiplier should be positive when set: ${object.id}`,
      );
      assert(
        object.render.yOffset === undefined || Number.isFinite(object.render.yOffset),
        `World object asset Y offset should be finite when set: ${object.id}`,
      );
      assert(
        object.render.rotation === undefined || isFiniteVector3Tuple(object.render.rotation),
        `World object asset rotation should be valid when set: ${object.id}`,
      );
    }

    if (object.interactable) {
      assert(isFiniteVector3Tuple(object.interactable.position), `Interactable should have a valid position: ${object.id}`);
      assert(object.interactable.radius > 0, `Interactable should have a positive radius: ${object.id}`);
    }

    if (object.collider) {
      assert(isFiniteVector3Tuple(object.collider.position), `Collider should have a valid position: ${object.id}`);
      assert(
        object.collider.size.every((component) => component > 0),
        `Collider should have positive size components: ${object.id}`,
      );
    }
  });

  const mailboxObjects = villageWorldObjects.filter((object) => object.kind === 'mailbox');
  const cottageObjects = villageWorldObjects.filter((object) => object.kind === 'cottage');
  const treeObjects = villageWorldObjects.filter((object) => object.kind === 'tree');
  const bushObjects = villageWorldObjects.filter((object) => object.kind === 'bush');
  const signpostObjects = villageWorldObjects.filter((object) => object.kind === 'signpost');
  const cartObjects = villageWorldObjects.filter((object) => object.kind === 'cart');
  const sackObjects = villageWorldObjects.filter((object) => object.kind === 'sack');
  const crateObjects = villageWorldObjects.filter((object) => object.kind === 'crate');
  const barrelObjects = villageWorldObjects.filter((object) => object.kind === 'barrel');
  const decorativePropObjects = villageWorldObjects.filter((object) => decorativePropKinds.has(object.kind));
  const assetRenderedObjects = villageWorldObjects.filter((object) => object.render?.mode === 'asset');
  const selectedNatureObjects = assetRenderedObjects.filter((object) => (
    object.render?.mode === 'asset' && selectedNatureAssetIdSet.has(object.render.assetId)
  ));
  const selectedFantasyObjects = assetRenderedObjects.filter((object) => (
    object.render?.mode === 'asset' && selectedFantasyAssetIdSet.has(object.render.assetId)
  ));
  const decorativeNatureObjects = villageWorldObjects.filter((object) => (
    object.kind === 'tree'
    || object.kind === 'bush'
    || object.id.startsWith('nature-rock-')
  ));
  const deliveryBoard = villageWorldObjects.find((object) => object.id === 'delivery-board');
  const postOffice = villageWorldObjects.find((object) => object.id === 'post-office');
  const well = villageWorldObjects.find((object) => object.id === 'town-well');
  const deliveryTarget = villageWorldObjects.find((object) => object.id === deliveryJobs[0].targetWorldObjectId);
  const worldObjectCountsByKind = villageWorldObjects.reduce<Record<string, number>>((counts, object) => {
    counts[object.kind] = (counts[object.kind] ?? 0) + 1;
    return counts;
  }, {});

  console.info(`World object counts by kind: ${JSON.stringify(worldObjectCountsByKind)}.`);

  assert(isInsideVillageBounds(playerSpawnPosition), 'Player spawn should be inside the intended village bounds.');

  villageWorldObjects.forEach((object) => {
    assert(isInsideVillageBounds(object.position), `World object should be inside intended village bounds: ${object.id}`);

    if (object.interactable) {
      assert(isInsideVillageBounds(object.interactable.position), `Interactable should be inside intended village bounds: ${object.id}`);
    }
  });

  villageWorldObjects.filter((object) => object.interactable).forEach((interactableObject) => {
    const interactable = interactableObject.interactable;

    if (!interactable) {
      return;
    }

    villageWorldObjects.filter((object) => object.collider && object.id !== interactableObject.id).forEach((colliderObject) => {
      const collider = colliderObject.collider;

      if (!collider) {
        return;
      }

      assert(
        getHorizontalBoxDistance(interactable.position, collider.position, collider.size) >= villageLayoutConfig.spacing.interactableClearanceRadius,
        `Interactable ${interactableObject.id} should keep layout clearance from collider ${colliderObject.id}.`,
      );
    });
  });

  villageWorldObjects.filter((object) => object.collider).forEach((colliderObject) => {
    const collider = colliderObject.collider;

    if (!collider) {
      return;
    }

    assert(
      getHorizontalBoxDistance(playerSpawnPosition, collider.position, collider.size) >= villageLayoutConfig.spacing.interactableClearanceRadius,
      `Spawn should keep layout clearance from collider ${colliderObject.id}.`,
    );
  });

  deliveryJobs.forEach((job) => {
    const target = villageWorldObjects.find((object) => object.id === job.targetWorldObjectId);

    assert(target !== undefined, `Delivery job target world object should exist: ${job.id}`);
    assert(target.kind === 'mailbox', `Delivery job target should be a mailbox: ${job.id}`);
    assert(target.id === job.targetInteractableId, `Delivery job target ids should match current mailbox interactables: ${job.id}`);
    assert(target.interactable !== undefined, `Delivery job target should be interactable: ${job.id}`);
    assert(target.objectiveAnchor !== undefined, `Delivery job target should have an objective anchor: ${job.id}`);
    assert(target.mailbox !== undefined, `Delivery job target should have mailbox metadata: ${job.id}`);
    assert(job.destinationName.trim().length > 0, `Delivery job should have a destination name: ${job.id}`);
    assert(job.destinationName === target.mailbox.destinationName, `Delivery job destination should match mailbox target metadata: ${job.id}`);
    assert(job.description.trim().length > 0, `Delivery job should have a description: ${job.id}`);
    assert(Number.isFinite(job.reward) && job.reward > 0, `Delivery job reward should be positive: ${job.id}`);
  });

  const mailboxDestinations = new Set(mailboxObjects.map((mailbox) => mailbox.mailbox?.destinationName));
  const mailboxVariants = new Set(mailboxObjects.map((mailbox) => mailbox.mailbox?.variant));

  assert(deliveryJobs.length >= 3, 'Village should define at least three delivery jobs.');
  assert(mailboxDestinations.has('Blue House Mailbox'), 'Blue House Mailbox destination should exist.');
  assert(mailboxDestinations.has('Hill Path Mailbox'), 'Hill Path Mailbox destination should exist.');
  assert(mailboxDestinations.has('Post Office Return Box'), 'Post Office Return Box destination should exist.');
  assert(mailboxVariants.has('blue'), 'A blue mailbox variant should exist.');
  assert(mailboxVariants.has('red'), 'A red mailbox variant should exist.');
  assert(mailboxVariants.has('green'), 'A green mailbox variant should exist.');
  assert(assetRenderedObjects.some((object) => object.id === 'crate-large' && object.render?.mode === 'asset' && object.render.assetId === 'fantasy-box-001'), 'The large crate should use the selected fantasy box prop.');
  assert(selectedNatureObjects.length >= 10, 'Village should place selected nature assets through world definitions.');
  assert(selectedFantasyObjects.length >= 12, 'Village should place selected fantasy assets through world definitions.');
  assert(decorativeNatureObjects.every((object) => object.render?.mode === 'asset'), 'Decorative nature objects should use asset-backed render definitions.');
  assert(decorativeNatureObjects.every((object) => object.collider === undefined), 'Decorative forest and path-framing nature props should not add collision.');
  assert(decorativePropObjects.length < villageLayoutConfig.objectBudgets.decorativePropMaxCount, 'Decorative prop count should stay below the configured layout budget.');
  assert(crateObjects.length + barrelObjects.length <= villageLayoutConfig.objectBudgets.crateBarrelClusterMaxCount * villageLayoutConfig.objectBudgets.crateBarrelClusterMaxObjects, 'Crate/barrel dressing should fit within the configured cluster budget.');
  assert(['crate-large', 'crate-small-a', 'barrel-north-a'].every((id) => villageWorldObjects.some((object) => object.id === id)), 'Post office dressing cluster should stay defined.');
  assert(['crate-small-b', 'barrel-north-b', 'cart-south-path'].every((id) => villageWorldObjects.some((object) => object.id === id)), 'Market dressing cluster should stay defined.');
  assert(treeObjects.length >= 6, 'Village should include a small forest edge of tree props.');
  assert(bushObjects.length >= 4, 'Village should include foliage props around paths and boundaries.');
  assert(cottageObjects.every((object) => object.render?.mode === 'asset'), 'Every cottage should use a selected fantasy house render with primitive fallback.');
  assert(signpostObjects.length >= 4, 'Village should define fantasy pointer signpost props.');
  assert(cartObjects.length === 1, 'Village should define one fantasy cart dressing prop.');
  assert(cartObjects.every((object) => object.collider), 'Large cart dressing should keep a simple collider.');
  assert(sackObjects.length === 0, 'Clean village relayout should remove loose sack dressing for now.');
  assert(mailboxObjects.length === 3, 'Village should define exactly three procedural mailbox targets.');
  assert(mailboxObjects.every((object) => object.interactable), 'Every village mailbox should be interactable.');
  assert(mailboxObjects.every((object) => object.objectiveAnchor), 'Every village mailbox should have an objective anchor.');
  assert(mailboxObjects.every((object) => object.mailbox), 'Every village mailbox should have variant and destination metadata.');
  assert(cottageObjects.length === 3, 'Village should define exactly three cottage placeholders.');
  assert(deliveryBoard !== undefined, 'Delivery board world object should exist.');
  assert(deliveryBoard.interactable !== undefined, 'Delivery board interactable should still exist.');
  assert(postOffice !== undefined, 'Post office world object should exist.');
  assert(postOffice.render?.mode === 'asset', 'Post office should use selected fantasy house render with primitive fallback.');
  assert(well !== undefined, 'Town-square well world object should exist.');
  assert(deliveryTarget !== undefined, 'First delivery target should resolve to a world object.');
  assert(deliveryTarget.objectiveAnchor !== undefined, 'First delivery target should still expose an objective anchor.');

  const boardToPostOfficeDistanceSq = (
    (deliveryBoard.position[0] - postOffice.position[0]) ** 2
    + (deliveryBoard.position[2] - postOffice.position[2]) ** 2
  );
  assert(boardToPostOfficeDistanceSq < 12, 'Delivery board should stay near the post office placeholder.');
};

const runVillageLayoutConfigSmoke = (): void => {
  const { bounds, densityBudget, objectBudgets, spacing, zones } = villageLayoutConfig;
  const densityTotal = (
    densityBudget.openWalkableSpace
    + densityBudget.landmarkStructures
    + densityBudget.decorativeClutter
  );

  assert(villageLayoutConfig.coordinateSystem.x === 'left/right', 'Village layout should document the X axis.');
  assert(villageLayoutConfig.coordinateSystem.y === 'height', 'Village layout should document the Y axis.');
  assert(villageLayoutConfig.coordinateSystem.z === 'forward/back', 'Village layout should document the Z axis.');
  assert(bounds.minX === -14 && bounds.maxX === 14, 'Village layout should define intended X bounds.');
  assert(bounds.minZ === -12 && bounds.maxZ === 14, 'Village layout should define intended Z bounds.');
  assert(spacing.mainPathMinWidth === 3, 'Village layout should define the minimum main path width.');
  assert(spacing.mainPathMaxWidth === 4, 'Village layout should define the maximum main path width.');
  assert(spacing.mainPathMinWidth < spacing.mainPathMaxWidth, 'Village layout main path width range should be ordered.');
  assert(spacing.plazaOpenRadius === 4, 'Village layout should define the open plaza radius.');
  assert(spacing.interactableClearanceRadius === 2, 'Village layout should define interactable clearance.');
  assert(spacing.decorativeClusterMinProps === 3, 'Village layout should define minimum decorative cluster size.');
  assert(spacing.decorativeClusterMaxProps === 5, 'Village layout should define maximum decorative cluster size.');
  assert(spacing.decorativeClusterMinProps < spacing.decorativeClusterMaxProps, 'Decorative cluster range should be ordered.');
  assert(objectBudgets.decorativePropMaxCount > 0, 'Village layout should define a positive decorative prop budget.');
  assert(objectBudgets.crateBarrelClusterMaxCount === 2, 'Village layout should limit crate/barrel dressing to two clusters.');
  assert(objectBudgets.crateBarrelClusterMaxObjects === 3, 'Village layout should limit crate/barrel cluster size.');
  assert(Math.abs(densityTotal - 1) < 0.001, 'Village layout density budget should total 100%.');

  const zoneIds = new Set(zones.map((zone) => zone.id));
  assert(zones.length === 8, 'Village layout should define all intended major zones.');
  zones.forEach((zone) => {
    assert(zone.center.length === 2 && zone.center.every((component) => Number.isFinite(component)), `Layout zone should have a valid center: ${zone.id}`);
    assert(zone.radius > 0, `Layout zone should have a positive radius: ${zone.id}`);
  });
  assert(zoneIds.has('spawn-start-path'), 'Village layout should include the spawn/start path zone.');
  assert(zoneIds.has('post-office-delivery-board'), 'Village layout should include the post office and delivery board zone.');
  assert(zoneIds.has('central-plaza-well'), 'Village layout should include the central plaza and well zone.');
  assert(zoneIds.has('blue-house-target'), 'Village layout should include the blue house target zone.');
  assert(zoneIds.has('red-house-target'), 'Village layout should include the red house target zone.');
  assert(zoneIds.has('north-house-target'), 'Village layout should include the north house target zone.');
  assert(zoneIds.has('forest-edge-boundary'), 'Village layout should include the forest edge boundary zone.');
  assert(zoneIds.has('market-cart-dressing'), 'Village layout should include the market cart dressing zone.');
};

const runLayoutDebugSmoke = (): void => {
  assert(layoutDebugConfig.toggleKey === 'F2', 'Layout debug mode should use F2 as the toggle key.');
  assert(layoutDebugConfig.cameraHeight > 0, 'Layout debug camera height should be positive.');
  assert(layoutDebugConfig.viewPadding >= 0, 'Layout debug view padding should not be negative.');

  const importantObjects = getImportantLayoutObjects();
  const importantIds = new Set(importantObjects.map((object) => object.id));
  assert(importantObjects.length === layoutDebugConfig.importantObjectIds.length, 'Every important layout object id should resolve.');
  assert(importantIds.size === layoutDebugConfig.importantObjectIds.length, 'Important layout object ids should be unique.');

  const objectCounts = getLayoutObjectCountsByKind();
  assert(objectCounts.mailbox === 3, 'Layout object counts should include three mailboxes.');
  assert(objectCounts.cottage === 3, 'Layout object counts should include three cottages.');

  getVillagePathGuides().forEach((path) => {
    assert(path.id.trim().length > 0, 'Layout path guide should have an id.');
    assert(path.width > 0, `Layout path guide should have positive width: ${path.id}`);
    assert(isInsideVillageBounds(path.start), `Layout path guide start should be inside village bounds: ${path.id}`);
    assert(isInsideVillageBounds(path.end), `Layout path guide end should be inside village bounds: ${path.id}`);
  });

  const layoutDebugView = createVillageLayoutDebugView(1280, 720);
  assert(layoutDebugView.object.name === 'layout-debug:view', 'Layout debug view should initialize.');
  assert(layoutDebugView.camera.isOrthographicCamera, 'Layout debug mode should use an orthographic top-down camera.');
  assert(!layoutDebugView.isActive(), 'Layout debug view should start inactive.');
  assert(layoutDebugView.object.getObjectByName('layout:bounds') !== undefined, 'Layout debug view should include village bounds.');
  assert(layoutDebugView.object.getObjectByName('layout:zone:central-plaza-well') !== undefined, 'Layout debug view should include zone outlines.');
  assert(layoutDebugView.object.getObjectByName('layout:path:village:main-path-spawn-to-plaza') !== undefined, 'Layout debug view should include path lane guides.');
  assert(layoutDebugView.object.getObjectByName('layout:interactable:delivery-board') !== undefined, 'Layout debug view should include interactable radius helpers.');
  assert(layoutDebugView.object.getObjectByName('layout:collider:delivery-board') !== undefined, 'Layout debug view should include collider outlines.');
  assert(layoutDebugView.object.getObjectByName('layout:objective-anchor:delivery-board') !== undefined, 'Layout debug view should include objective anchor helpers.');
  assert(layoutDebugView.object.getObjectByName('layout:label:spawn') !== undefined, 'Layout debug view should include important object labels.');
  assert(layoutDebugView.toggle(), 'Layout debug view should toggle active.');
  assert(layoutDebugView.object.visible, 'Layout debug view object should be visible while active.');
  layoutDebugView.setActive(false);
  assert(!layoutDebugView.object.visible, 'Layout debug view object should hide when inactive.');
  layoutDebugView.dispose();
};

const runPlacementEditorSmoke = (): void => {
  const editableObjects = createEditablePlacementObjects();
  const snapValues = getPlacementEditorSnapValues();
  const deliveryBoard = getEditablePlacementObjectById('delivery-board', editableObjects);
  const missingObject = getEditablePlacementObjectById('missing-object', editableObjects);

  assert(editableObjects.length > 0, 'Placement editor editable object list should initialize.');
  assert(deliveryBoard !== null, 'Placement editor should resolve important editable objects.');
  assert(missingObject === null, 'Placement editor should handle missing object ids safely.');
  assert(snapValues.length === 3, 'Placement editor should expose three snap values.');
  assert(snapValues.every((value) => value > 0), 'Placement editor snap values should be positive.');
  assert(placementEditorConfig.defaultSnapIndex >= 0, 'Placement editor default snap index should be valid.');
  assert(placementEditorConfig.defaultSnapIndex < snapValues.length, 'Placement editor default snap index should be in range.');
  assert(placementEditorConfig.continuousMoveBaseSpeed > 0, 'Placement editor hold-move speed should be positive.');
  assert(placementEditorConfig.snapSpeedReference > 0, 'Placement editor snap speed reference should be positive.');
  assert(placementEditorConfig.fastMoveMultiplier > 1, 'Placement editor fast modifier should increase movement speed.');
  assert(placementEditorConfig.fineMoveMultiplier > 0 && placementEditorConfig.fineMoveMultiplier < 1, 'Placement editor fine modifier should reduce movement speed.');
  assert(placementEditorConfig.undoHistoryLimit >= 10, 'Placement editor undo history should keep a useful number of operations.');

  const baseMoveSpeed = getPlacementEditorMoveSpeed(0.25);
  const fastMoveSpeed = getPlacementEditorMoveSpeed(0.25, { shiftKey: true });
  const fineMoveSpeed = getPlacementEditorMoveSpeed(0.25, { altKey: true });

  assert(baseMoveSpeed > 0, 'Placement editor move speed should be positive.');
  assert(fastMoveSpeed > baseMoveSpeed, 'Shift movement should be faster than base movement.');
  assert(fineMoveSpeed < baseMoveSpeed, 'Alt movement should be finer than base movement.');
  assert(
    capPlacementHistoryLength(Array.from({ length: placementEditorConfig.undoHistoryLimit + 5 }, (_, index) => index)).length
      === placementEditorConfig.undoHistoryLimit,
    'Placement editor undo history should cap at the configured safe size.',
  );

  if (!deliveryBoard) {
    throw new Error('Missing delivery board editable object.');
  }

  const draft = createPlacementTransformDraft(deliveryBoard.worldObject);
  assert(
    createDraggedPlacementPosition(null, new Vector3(1, 0, 1), snapValues[0]) === null,
    'Placement editor drag math should handle missing selection safely.',
  );

  const draggedPosition = createDraggedPlacementPosition(
    draft,
    new Vector3(draft.position[0] + 0.32, 0, draft.position[2] - 0.46),
    0.25,
  );

  assert(draggedPosition !== null, 'Placement editor drag math should produce a position for selected drafts.');
  draft.position = draggedPosition;
  draft.position = [draft.position[0] + 0.25, draft.position[1], draft.position[2] - 0.25];
  draft.rotationY += Math.PI / 4;
  draft.scaleMultiplier = 1.1;
  draft.yOffset = 0.25;

  const serialized = serializePlacementTransform(deliveryBoard.worldObject, draft);
  const serializedAgain = serializePlacementTransform(deliveryBoard.worldObject, draft);
  assert(serialized === serializedAgain, 'Placement transform serialization should remain stable after drag and nudge edits.');
  assert(serialized.includes("id: 'delivery-board'"), 'Placement transform serialization should include the object id.');
  assert(serialized.includes('position:'), 'Placement transform serialization should include position.');
  assert(serialized.includes('rotation:'), 'Placement transform serialization should include rotation.');

  const draftMap = new Map([[deliveryBoard.id, draft]]);
  const serializedAll = serializePlacementTransforms(draftMap, editableObjects);
  assert(serializedAll.startsWith('{'), 'All-placement serialization should be stable layout override JSON.');
  assert(serializedAll.includes('"version": 1'), 'All-placement serialization should include the layout override version.');
  assert(serializedAll.includes('"id": "delivery-board"'), 'All-placement serialization should include edited transforms.');
};

const runDeliveryStateSmoke = (): void => {
  const delivery = createDeliveryController();
  const firstDelivery = deliveryJobs[0];
  const wrongTarget = deliveryJobs.find((job) => job.targetInteractableId !== firstDelivery.targetInteractableId);

  assert(wrongTarget !== undefined, 'Delivery jobs should include at least two mailbox targets.');

  assert(delivery.getState().status === 'idle', 'Delivery should start idle.');
  assert(delivery.getState().activeDeliveryId === null, 'Delivery should start without an active delivery.');
  assert(delivery.getState().completedCount === 0, 'Completed count should start at 0.');
  assert(delivery.getAvailableDeliveries().length === deliveryJobs.length, 'Available delivery list should initialize.');
  assert(delivery.acceptDelivery('missing-delivery') === 'Delivery job unavailable.', 'Invalid delivery ids should be handled safely.');
  assert(delivery.getState().activeDeliveryId === null, 'Invalid delivery ids should not set an active delivery.');

  assert(delivery.acceptDelivery(firstDelivery.id).includes(firstDelivery.title), 'Accepting delivery by id should return the active delivery title.');
  assert(delivery.getState().status === 'delivery-accepted', 'Accepted delivery should update status.');
  assert(delivery.getState().activeDeliveryId === firstDelivery.id, 'Accepting delivery should set the active delivery id.');
  assert(delivery.getState().activeTargetId === firstDelivery.targetInteractableId, 'Accepting delivery should set the active target id.');
  const activeDeliveryTarget = villageWorldObjects.find((object) => object.id === delivery.getState().activeTargetWorldObjectId);
  assert(activeDeliveryTarget !== undefined, 'Active delivery target should resolve to a world object.');
  assert(activeDeliveryTarget.kind === 'mailbox', 'Active delivery target should resolve to a mailbox object.');
  assert(activeDeliveryTarget.objectiveAnchor !== undefined, 'Active delivery mailbox should expose an objective anchor.');

  assert(
    delivery.completeDelivery(wrongTarget.targetInteractableId).startsWith('Wrong mailbox.'),
    'Wrong target should not complete the delivery.',
  );
  assert(delivery.getState().completedCount === 0, 'Wrong target should not increment completed count.');
  assert(delivery.getState().activeDeliveryId === firstDelivery.id, 'Wrong target should keep the active delivery.');

  assert(
    delivery.completeDelivery(firstDelivery.targetInteractableId).includes(firstDelivery.title),
    'Completing the correct target should return confirmation.',
  );
  assert(delivery.getState().status === 'delivery-completed', 'Completed delivery should update state.');
  assert(delivery.getState().completedCount === 1, 'Completing delivery should increment count.');
  assert(delivery.getState().completedDeliveryIds.includes(firstDelivery.id), 'Completing delivery should track completed ids.');
  assert(
    !delivery.getAvailableDeliveries().some((job) => job.id === firstDelivery.id),
    'Completed jobs should not stay available.',
  );

  const secondDelivery = deliveryJobs[1];
  assert(delivery.acceptDelivery(secondDelivery.id).includes(secondDelivery.title), 'Board should accept a selected available delivery.');
  assert(delivery.getState().activeDeliveryId === secondDelivery.id, 'Selected available delivery should become active.');
};

const runInteractionSmoke = (): void => {
  const delivery = createDeliveryController();
  let boardOpened = false;
  const interactables = createPlaygroundInteractables(delivery, {
    openDeliveryBoard: () => {
      boardOpened = true;
      return 'Delivery board opened.';
    },
  });
  const mailbox = interactables.find((interactable) => interactable.id === 'mailbox');
  const eastMailbox = interactables.find((interactable) => interactable.id === 'mailbox-east');
  const returnBox = interactables.find((interactable) => interactable.id === 'mailbox-post-office-return');
  const board = interactables.find((interactable) => interactable.id === 'delivery-board');

  assert(mailbox !== undefined, 'Mailbox interactable should initialize.');
  assert(eastMailbox !== undefined, 'East mailbox interactable should initialize.');
  assert(returnBox !== undefined, 'Post office return box interactable should initialize.');
  assert(board !== undefined, 'Delivery board interactable should initialize.');

  assert(typeof board.prompt === 'function' && board.prompt() === 'Open delivery board', 'Board should prompt for opening the delivery board.');
  assert(board.interact() === 'Delivery board opened.', 'Board interaction should open the delivery board.');
  assert(boardOpened, 'Board interaction should call the delivery board overlay opener.');
  assert(delivery.getState().activeDeliveryId === null, 'Opening the board should not auto-accept a delivery.');

  assert(delivery.acceptDelivery(deliveryJobs[0].id).includes(deliveryJobs[0].title), 'Selected delivery should be accepted by id.');
  assert(typeof board.prompt === 'function' && board.prompt().includes('in progress'), 'Board should report an active delivery.');

  assert(typeof mailbox.prompt === 'function' && mailbox.prompt() === 'Complete delivery', 'Mailbox should prompt for completion after acceptance.');
  assert(typeof eastMailbox.prompt === 'function' && eastMailbox.prompt() === 'Wrong mailbox', 'Wrong mailbox should prompt clearly.');
  assert(eastMailbox.interact().startsWith('Wrong mailbox.'), 'Wrong mailbox interaction should not complete delivery.');
  assert(delivery.getState().completedCount === 0, 'Wrong mailbox interaction should not increment delivery count.');
  assert(mailbox.interact().includes(deliveryJobs[0].title), 'Correct mailbox interaction should complete delivery.');
  assert(delivery.getState().completedCount === 1, 'Mailbox completion should increment delivery count.');
};

const runPerformanceSmoke = (): void => {
  assert(performanceBudgetConfig.targetFps === 60, 'Performance target FPS should be 60.');
  assert(performanceBudgetConfig.warningFps === 50, 'Performance warning FPS should be 50.');
  assert(performanceBudgetConfig.badFps === 30, 'Performance bad FPS should be 30.');
  assert(performanceBudgetConfig.targetFrameMs === 16.67, 'Performance target frame ms should be 16.67.');
  assert(performanceBudgetConfig.badFps < performanceBudgetConfig.warningFps, 'Bad FPS threshold should be below warning FPS.');
  assert(performanceBudgetConfig.warningFps < performanceBudgetConfig.targetFps, 'Warning FPS threshold should be below target FPS.');
  assert(performanceBudgetConfig.warningDrawCalls === 200, 'Draw-call warning budget should be 200.');
  assert(performanceBudgetConfig.warningTriangles === 250_000, 'Triangle warning budget should be 250000.');
  assert(performanceBudgetConfig.maxPixelRatio > 0, 'Pixel ratio cap should be positive.');
  assert(performanceBudgetConfig.maxDeltaSeconds > 0, 'Delta clamp should be positive.');
  assert(getCappedPixelRatio(4) === performanceBudgetConfig.maxPixelRatio, 'High device pixel ratio should be capped.');
  assert(clampFrameDelta(999) === performanceBudgetConfig.maxDeltaSeconds, 'Large frame delta should be clamped.');
  assert(clampFrameDelta(1 / 60) > 0, 'Normal frame delta should stay positive.');

  const rendererInfo = {
    info: {
      render: {
        calls: 12,
        triangles: 345,
      },
      memory: {
        geometries: 6,
        textures: 2,
      },
    },
  };
  const assetStats = {
    loadedAssetIds: ['crate-box-001'],
    sceneInstanceCountsByAssetId: {
      'crate-box-001': 2,
    },
    totalSceneInstances: 2,
  };
  const snapshot = createPerformanceSnapshot(16.67, rendererInfo, 17, 22, assetStats);

  assert(snapshot.currentFps > 0, 'Performance snapshot should calculate current FPS.');
  assert(snapshot.averageFps > 0, 'Performance snapshot should calculate average FPS.');
  assert(snapshot.frameTimeMs === 16.67, 'Performance snapshot should include frame time.');
  assert(snapshot.averageFrameTimeMs === 17, 'Performance snapshot should include average frame time.');
  assert(snapshot.worstFrameTimeMs === 22, 'Performance snapshot should include worst frame time.');
  assert(snapshot.renderCalls === 12, 'Performance snapshot should include render calls.');
  assert(snapshot.triangles === 345, 'Performance snapshot should include triangles.');
  assert(snapshot.geometries === 6, 'Performance snapshot should include geometry count.');
  assert(snapshot.textures === 2, 'Performance snapshot should include texture count.');
  assert(snapshot.loadedAssetIds.includes('crate-box-001'), 'Performance snapshot should include loaded asset ids.');
  assert(snapshot.sceneInstanceCountsByAssetId['crate-box-001'] === 2, 'Performance snapshot should include asset instance counts.');
  assert(snapshot.totalSceneInstances === 2, 'Performance snapshot should include total asset instances.');

  const monitor = createPerformanceMonitor();
  const monitoredSnapshot = monitor.update(1 / 60, rendererInfo, assetStats);
  assert(monitoredSnapshot.renderCalls === 12, 'Performance monitor should read renderer info.');
  assert(monitoredSnapshot.totalSceneInstances === 2, 'Performance monitor should read runtime asset stats.');
  assert(monitoredSnapshot.averageFrameTimeMs > 0, 'Performance monitor should track frame-time averages.');
  monitor.dispose();
  assert(monitor.getSnapshot().frameTimeMs === 0, 'Performance monitor should reset on dispose.');
};

const runResourceTrackerSmoke = (): void => {
  const tracker = createResourceTracker();
  const geometry = tracker.trackGeometry(new BoxGeometry(1, 1, 1));
  const materialTexture = new Texture();
  const trackedTexture = tracker.trackTexture(new Texture());
  const material = tracker.trackMaterial(new MeshBasicMaterial({ map: materialTexture }));
  const parent = new Object3D();
  const root = tracker.trackObject3D(new Object3D());
  let cleanupRan = false;
  let geometryDisposed = false;
  let materialDisposed = false;
  let materialTextureDisposed = false;
  let trackedTextureDisposed = false;

  geometry.addEventListener('dispose', () => {
    geometryDisposed = true;
  });
  material.addEventListener('dispose', () => {
    materialDisposed = true;
  });
  materialTexture.addEventListener('dispose', () => {
    materialTextureDisposed = true;
  });
  trackedTexture.addEventListener('dispose', () => {
    trackedTextureDisposed = true;
  });
  tracker.addCleanup(() => {
    cleanupRan = true;
  });
  parent.add(root);

  tracker.dispose();
  tracker.dispose();

  assert(cleanupRan, 'Resource tracker cleanup callback should run.');
  assert(root.parent === null, 'Tracked Object3D roots should be removed from their parent.');
  assert(geometryDisposed, 'Tracked BufferGeometry should be disposed.');
  assert(materialDisposed, 'Tracked Material should be disposed.');
  assert(materialTextureDisposed, 'Texture references on tracked materials should be disposed.');
  assert(trackedTextureDisposed, 'Tracked Texture should be disposed.');

  const rootOnlyTracker = createResourceTracker();
  const rootOnlyParent = new Object3D();
  const rootOnly = new Object3D();
  const sharedGeometry = new BoxGeometry(1, 1, 1);
  const sharedMaterial = new MeshBasicMaterial();
  let sharedGeometryDisposed = false;
  let sharedMaterialDisposed = false;

  sharedGeometry.addEventListener('dispose', () => {
    sharedGeometryDisposed = true;
  });
  sharedMaterial.addEventListener('dispose', () => {
    sharedMaterialDisposed = true;
  });
  rootOnly.add(new Mesh(sharedGeometry, sharedMaterial));
  rootOnlyParent.add(rootOnly);
  rootOnlyTracker.trackObject3D(rootOnly);
  rootOnlyTracker.dispose();

  assert(rootOnly.parent === null, 'Default Object3D tracking should remove roots.');
  assert(!sharedGeometryDisposed, 'Default Object3D tracking should not dispose child geometry.');
  assert(!sharedMaterialDisposed, 'Default Object3D tracking should not dispose child material.');
  sharedGeometry.dispose();
  sharedMaterial.dispose();

  const ownedRootTracker = createResourceTracker();
  const ownedRoot = new Object3D();
  const ownedGeometry = new BoxGeometry(1, 1, 1);
  const ownedMaterial = new MeshBasicMaterial();
  let ownedGeometryDisposed = false;
  let ownedMaterialDisposed = false;

  ownedGeometry.addEventListener('dispose', () => {
    ownedGeometryDisposed = true;
  });
  ownedMaterial.addEventListener('dispose', () => {
    ownedMaterialDisposed = true;
  });
  ownedRoot.add(new Mesh(ownedGeometry, ownedMaterial));
  ownedRootTracker.trackObject3D(ownedRoot, { disposeResources: true });
  ownedRootTracker.dispose();

  assert(ownedGeometryDisposed, 'Owned Object3D tracking should optionally dispose child geometry.');
  assert(ownedMaterialDisposed, 'Owned Object3D tracking should optionally dispose child material.');
};

const runModuleSmoke = (): void => {
  assert(playerMovementSettings.maxSpeed > 0, 'Player max speed should be positive.');
  assert(playerMovementSettings.radius > 0, 'Player collision radius should be positive.');
  assert(playerCharacterAssetId === 'creative-courier-character', 'Player character asset id should point to the selected courier asset.');
  assert(selectedCharacterAssetIdSet.has(playerCharacterAssetId), 'Player character asset id should be part of selected character assets.');
  assert(isKnownAssetId(playerCharacterVisualSettings.assetId), 'Player character visual asset should be registered.');
  assert(playerCharacterVisualSettings.scale > 0, 'Player character visual scale should be positive.');
  assert(Number.isFinite(playerCharacterVisualSettings.rotationY), 'Player character visual rotation should be finite.');
  assert(isFiniteVector3Tuple(playerCharacterVisualSettings.offset), 'Player character visual offset should be a valid vector.');
  assert(playerCharacterVisualSettings.visibleMeshNames.length > 0, 'Player character visual should select a courier-style mesh subset.');
  assert(playerCharacterVisualSettings.visibleMeshNames.includes('Outerwear_036'), 'Player character mesh filter should use the actual outerwear mesh name.');

  const filterFallback = resolveVisibleCharacterMeshNames(['Body_010', 'Outerwear_036'], ['missing-mesh-name'], 'configured');
  assert(filterFallback.usedFallbackAll, 'Player mesh filtering should fall back to all meshes if the configured filter hides everything.');
  assert(filterFallback.visibleMeshCount === 2, 'Player mesh filter fallback should keep every available mesh visible.');

  const filterConfigured = resolveVisibleCharacterMeshNames(['Body_010', 'Outerwear_036'], ['Body_010'], 'configured');
  assert(!filterConfigured.usedFallbackAll, 'Player mesh filtering should not fall back when at least one mesh matches.');
  assert(filterConfigured.visibleMeshCount === 1, 'Player mesh filtering should respect configured visible mesh names.');

  const emptyAlignment = fitAndAlignCharacterModel(new Group(), playerMovementSettings.radius);
  assert(!emptyAlignment.validBounds, 'Player character alignment should handle empty bounds safely.');
  assert(emptyAlignment.boundingBoxSize.every((component) => Number.isFinite(component)), 'Empty player character alignment should return finite bounds.');

  const alignmentMesh = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
  const alignmentResult = fitAndAlignCharacterModel(alignmentMesh, playerMovementSettings.radius);
  assert(alignmentResult.validBounds, 'Player character alignment should fit valid model bounds.');
  assert(Math.abs(alignmentResult.boundingBoxMin[1]) < 0.001, 'Player character alignment should place feet on the ground.');
  assert(alignmentResult.appliedScale > 0, 'Player character alignment should apply a positive scale.');
  disposeFitSmokeMesh(alignmentMesh);

  const fallbackVisual = createPlayerFallbackVisual();
  assert(fallbackVisual.name === 'player:placeholder', 'Player fallback visual should initialize.');
  assert(fallbackVisual.getObjectByName('player:placeholder-body') !== undefined, 'Player fallback body should initialize.');
  assert(fallbackVisual.getObjectByName('player:facing-marker') !== undefined, 'Player fallback facing marker should initialize.');

  const playerVisual = createPlayerVisual({
    info: () => undefined,
    warn: () => undefined,
  });
  assert(playerVisual.object.name === 'player', 'Player visual root should initialize.');
  assert(playerVisual.fallback.visible, 'Player fallback should start visible until the character model loads.');
  assert(playerVisual.fallback.parent === playerVisual.object, 'Player fallback should stay attached to the single moving player root.');
  assert(playerVisual.object.getObjectByName('player:placeholder-body') !== undefined, 'Player visual should contain primitive fallback geometry.');
  const initialVisualStatus = playerVisual.getStatus();
  assert(initialVisualStatus.mode === 'fallback' || initialVisualStatus.mode === 'loading', 'Player visual status should initialize safely.');
  assert(initialVisualStatus.assetId === playerCharacterAssetId, 'Player visual status should expose the selected asset id.');
  assert(initialVisualStatus.assetUrl.endsWith('.glb'), 'Player visual status should expose the selected asset URL.');
  assert(initialVisualStatus.fallbackVisible, 'Player fallback should remain available if the GLB cannot load.');
  assert(initialVisualStatus.totalMeshCount >= initialVisualStatus.visibleMeshCount, 'Player visual mesh counts should be ordered.');
  playerVisual.forceFallbackVisual();
  assert(playerVisual.getStatus().mode === 'fallback', 'Player visual debug control should force fallback mode.');
  playerVisual.forceCharacterVisual();
  playerVisual.showAllCharacterMeshes();
  playerVisual.showConfiguredCharacterMeshes();
  assert(playerVisual.object.children.includes(playerVisual.fallback), 'Player object should remain the single visual root after debug toggles.');
  playerVisual.dispose();

  assert(thirdPersonCameraSettings.distance > 0, 'Camera distance should be positive.');
  assert(thirdPersonCameraSettings.minPitch < thirdPersonCameraSettings.maxPitch, 'Camera pitch limits should be ordered.');
  assert(playgroundCollisionWorld.boxes.length >= 2, 'Playground collision boxes should initialize.');
  assert(
    playgroundCollisionWorld.boxes.length === villageWorldObjects.filter((object) => object.collider).length,
    'Collision boxes should be generated from collidable world objects.',
  );
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'mailbox'), 'Mailbox collision box should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'mailbox-post-office-return'), 'Post office return box collision should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'post-office'), 'Post office collision box should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'cottage-west'), 'Village cottage collision should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'town-well'), 'Town well collision should initialize.');
  assert(playgroundCollisionWorld.boxes.some((box) => box.id === 'cart-south-path'), 'Large fantasy cart collision should initialize.');

  const mailboxProp = createMailboxProp({
    id: 'smoke-mailbox',
    position: [0, 0, 0],
    variant: 'green',
  });
  assert(mailboxProp.name === 'village:smoke-mailbox', 'Procedural mailbox prop should initialize.');
  assert(mailboxProp.getObjectByName('village:smoke-mailbox:post') !== undefined, 'Procedural mailbox should include a wooden post.');
  assert(mailboxProp.getObjectByName('village:smoke-mailbox:rounded-body') !== undefined, 'Procedural mailbox should include a rounded body.');
  assert(mailboxProp.getObjectByName('village:smoke-mailbox:front-door') !== undefined, 'Procedural mailbox should include a front door.');
  assert(mailboxProp.getObjectByName('village:smoke-mailbox:flag') !== undefined, 'Procedural mailbox should include a flag.');
  assert(mailboxProp.getObjectByName('village:smoke-mailbox:mail-symbol') !== undefined, 'Procedural mailbox should include a mail symbol.');

  const playground = createPlayground();
  assert(playground.name === 'village:square-blockout', 'Village square blockout should initialize.');
  assert(playground.children.length > 20, 'Village square should include primitive blockout children.');
  assert(playground.getObjectByName('village:mailbox:rounded-body') !== undefined, 'Blue mailbox procedural body should initialize.');
  assert(playground.getObjectByName('village:mailbox-east:rounded-body') !== undefined, 'Red mailbox procedural body should initialize.');
  assert(playground.getObjectByName('village:mailbox-post-office-return:rounded-body') !== undefined, 'Green return-box procedural body should initialize.');
  assert(playground.getObjectByName('village:mailbox:mail-symbol') !== undefined, 'Procedural mailbox mail symbol should initialize in the village.');
  assert(playground.getObjectByName('village:crate-large') !== undefined, 'Asset-targeted crate fallback should initialize.');
  assert(playground.getObjectByName('village:cottage-west:body') !== undefined, 'Fantasy cottage primitive fallback should initialize.');
  assert(playground.getObjectByName('village:post-office:body') !== undefined, 'Fantasy post office primitive fallback should initialize.');
  assert(playground.getObjectByName('village:barrel-north-a') !== undefined, 'Fantasy barrel primitive fallback should initialize.');
  assert(playground.getObjectByName('village:signpost-post-office:post') !== undefined, 'Fantasy pointer primitive fallback should initialize.');
  assert(playground.getObjectByName('village:cart-south-path:bed') !== undefined, 'Fantasy cart primitive fallback should initialize.');
  assert(playground.getObjectByName('village:tree-northwest:trunk') !== undefined, 'Tree primitive fallback should initialize.');
  assert(playground.getObjectByName('village:tree-northwest:canopy') !== undefined, 'Tree canopy primitive fallback should initialize.');
  assert(playground.getObjectByName('village:bush-side-path-a') !== undefined, 'Bush primitive fallback should initialize.');
  assert(playground.getObjectByName('village:nature-rock-path-a') !== undefined, 'Asset-targeted nature rock fallback should initialize.');
  assert(playground.getObjectByName('village:main-path-spawn-to-plaza') !== undefined, 'Main spawn-to-plaza path should initialize.');
  assert(playground.getObjectByName('village:main-path-plaza-to-north-house') !== undefined, 'Main plaza-to-north-house path should initialize.');
  assert(playground.getObjectByName('village:side-path-blue-house') !== undefined, 'Blue house side path should initialize.');
  assert(playground.getObjectByName('village:side-path-red-house') !== undefined, 'Red house side path should initialize.');
  assert(playground.getObjectByName('village:central-plaza-surface') !== undefined, 'Central plaza surface should initialize.');
  assert(playground.getObjectByName('village:label-post-office') !== undefined, 'Post office label sign should initialize.');
  assert(playground.getObjectByName('village:label-blue-house') !== undefined, 'Blue house label sign should initialize.');
  assert(playground.getObjectByName('village:label-red-house') !== undefined, 'Red house label sign should initialize.');
  assert(playground.getObjectByName('village:label-side-path') !== undefined, 'Side path label sign should initialize.');

  const visualBoundsDebugView = createPlaygroundVisualBoundsDebugView();
  const visualTargetBounds = createAssetTargetBounds([0, 1, 0], [1, 2, 1]);
  assert(visualTargetBounds !== null, 'Visual bounds debug smoke target should initialize.');
  visualBoundsDebugView.setObjectBounds('smoke-asset', visualTargetBounds);
  assert(visualBoundsDebugView.object.getObjectByName('debug:visual-asset-bounds:smoke-asset') !== undefined, 'Visual asset bounds helper should initialize.');
  assert(visualBoundsDebugView.toggle(), 'Visual asset bounds debug view should toggle visible.');
  visualBoundsDebugView.dispose();

  const resolved = resolvePlayerCollision(
    new Vector3(99, 0, 99),
    playgroundCollisionWorld,
    playerMovementSettings.radius,
  );
  assert(resolved.hitBounds, 'Collision should report bounds hit for out-of-bounds position.');
  assert(resolved.position.x <= playgroundCollisionWorld.bounds.maxX, 'Collision should clamp X inside bounds.');
  assert(resolved.position.z <= playgroundCollisionWorld.bounds.maxZ, 'Collision should clamp Z inside bounds.');

  const marker = createDeliveryTargetObjectiveMarker();
  assert(marker.name === 'objective:delivery-target', 'Delivery target objective marker should initialize.');
  assert(marker.visible === false, 'Delivery target objective marker should start hidden.');
  assert(marker.getObjectByName('objective:delivery-target:halo') !== undefined, 'Delivery target objective marker should include a readable halo.');
  assert(objectiveMarkerSettings.bobAmplitude >= 0.1, 'Objective marker bob should be readable from distance.');
  assert(resolveObjectiveAnchorForWorldObject(deliveryJobs[0].targetWorldObjectId).length === 3, 'Objective marker should resolve active target anchors.');
  assert(setObjectiveMarkerTarget(marker, deliveryJobs[0].targetWorldObjectId), 'Objective marker should accept an active target.');
  assert(marker.userData.targetWorldObjectId === deliveryJobs[0].targetWorldObjectId, 'Objective marker should track target object id.');

  const boardMarker = createDeliveryBoardObjectiveMarker();
  assert(boardMarker.name === 'objective:delivery-board', 'Delivery board objective marker should initialize.');
  updateObjectiveMarker(boardMarker, 1);
  assert(boardMarker.position.y > 0, 'Objective marker animation should keep marker above the ground.');
};

runAssetRegistrySmoke();
await runAssetCacheSmoke();
runAssetFittingSmoke();
runVisualPolishSmoke();
runLayoutOverrideSmoke();
runWorldDefinitionSmoke();
runVillageLayoutConfigSmoke();
runLayoutDebugSmoke();
runPlacementEditorSmoke();
runDeliveryStateSmoke();
runInteractionSmoke();
runPerformanceSmoke();
runResourceTrackerSmoke();
runModuleSmoke();

console.info('Smoke checks passed.');
