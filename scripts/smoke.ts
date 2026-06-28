import {
  Bone,
  Box3,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Fog,
  Group,
  AnimationClip,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  Skeleton,
  SkinnedMesh,
  Texture,
  Uint16BufferAttribute,
  VectorKeyframeTrack,
  Vector3,
} from 'three';
import {
  assetFitModes,
  assetRegistry,
  cloneGltfSourceForInstance,
  createAssetCache,
  createAssetTargetBounds,
  defaultWorldAssetVerticalAlignment,
  defaultWorldAssetFitMode,
  fitAssetObjectToBounds,
  getAssetFitScale,
  isAssetVerticalAlignment,
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
import {
  clampCameraDistance,
  getZoomedCameraDistance,
  thirdPersonCameraSettings,
} from '../src/game/camera';
import { resolvePlayerCollision } from '../src/game/collision';
import {
  createDebugUiState,
  cycleDebugDetailLevel,
  debugDetailLevels,
  debugUiConfig,
  getEffectiveDebugDetailLevel,
  isDebugDetailLevel,
  isGameplayUiSelectorIndependentOfDebug,
} from '../src/game/debug/debugUiManager';
import { createDeliveryController, deliveryJobs } from '../src/game/delivery';
import {
  createInPlacePlayerAnimationClip,
  createPlayerFallbackVisual,
  createPlayerVisual,
  fitAndAlignCharacterModel,
  getPlayerMotionAnimationState,
  getPlayerYawForDirection,
  isPlayerHipPositionTrackName,
  isPlayerRootMotionTrackName,
  playerCharacterAnimationAssetId,
  playerCharacterAssetId,
  playerCharacterVisualSettings,
  playerMovementSettings,
  resolveMovementBasis,
  resolveMovementBasisFromCameraYaw,
  resolveVisibleCharacterMeshNames,
  resolvePlayerInputDirection,
  selectPlayerIdleAnimationClip,
  selectPlayerMotionAnimationClip,
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
  createWorldEnvironment,
  defaultEnvironmentPresetName,
  environmentPresetNames,
  environmentPresets,
  getEnvironmentPreset,
  isEnvironmentPresetName,
  isValidEnvironmentConfig,
} from '../src/world/environment';
import {
  clampLayoutCloseCameraDistance,
  clampLayoutOverviewZoom,
  createVillageLayoutDebugView,
  getNextLayoutDebugCameraMode,
  getImportantLayoutObjects,
  getLayoutObjectCountsByKind,
  isLayoutDebugCameraMode,
  layoutDebugConfig,
  layoutDebugCameraModes,
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
  canUseTownEditorFilePicker,
  clonePlacementDraft,
  createLayoutOverrideDocumentFromPlacementDrafts,
  createPrimitivePlacementPreviewObject,
  createDraggedPlacementPosition,
  createEditablePlacementObjects,
  createPlacementTransformDraft,
  getEditablePlacementObjectById,
  getPlacementEditorSnapValues,
  getPlacementEditorMoveSpeed,
  isPlacementEditorHudVariant,
  isPrimitivePlacementPreviewKind,
  markPlacementDraftDeleted,
  placementEditorConfig,
  placementEditorHudVariants,
  primitivePlacementPreviewKinds,
  serializePlacementTransform,
  serializePlacementTransforms,
} from '../src/world/placementEditor';
import { createPlayground } from '../src/world/playground';
import { playgroundCompositionConfig } from '../src/world/playgroundComposition';
import { createPlaygroundCollisionWorld, playgroundCollisionWorld } from '../src/world/playgroundCollision';
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
import {
  authoredVillageWorldObjects,
  baseVillageWorldObjects,
  getWorldObjectsByGameplayRole,
  getWorldObjectsByInteractionAction,
  playerSpawnPosition,
  villageWorldObjects,
} from '../src/world/villageDefinition';
import { getVillagePathGuides } from '../src/world/villagePaths';
import {
  getDefaultActionForRole,
  getWorldObjectGameplay,
  getWorldObjectMailbox,
  isMailboxVariant,
  isWorldGameplayRole,
  isWorldInteractionAction,
} from '../src/world/worldObjectGameplay';
import {
  getTownEditorAssetPaletteItems,
  getTownEditorGeneratedPaletteItems,
  resolveTownEditorPlacementCandidate,
} from '../src/world/townEditorCatalog';

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
  readFileSync: (path: string | URL, encoding: 'utf8') => string;
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

  assert(selectedCharacterAssets.length === 2, 'Selected character assets should include one visual model and one animation source.');
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
      group.userData.animationClips = [new AnimationClip('Idle_Relaxed', -1, [])];
      group.userData.animationNames = ['Idle_Relaxed'];
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
  assert(firstEntry.animations.length === 1, 'Asset cache entries should retain animation clips from loaded GLB sources.');
  assert(firstEntry.animationNames.includes('Idle_Relaxed'), 'Asset cache entries should expose animation names.');
  assert(cache.getRuntimeStats().loadedAssetIds.includes('crate-box-001'), 'Loaded asset ids should include the cached asset.');

  const firstInstance = await cache.createInstance('crate-box-001');
  const secondInstance = await cache.createInstance('crate-box-001');

  assert(firstInstance.object !== secondInstance.object, 'Asset cache should create separate world instance objects.');
  assert(firstInstance.animations.length === 1, 'Asset instances should expose cached animation clips without cloning source assets.');
  assert(firstInstance.animationNames.includes('Idle_Relaxed'), 'Asset instances should expose cached animation names.');
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

  const skinnedSource = new Group();
  skinnedSource.name = 'smoke:skinned-source';
  const rootBone = new Bone();
  const childBone = new Bone();
  rootBone.name = 'smoke:root-bone';
  childBone.name = 'smoke:child-bone';
  childBone.position.y = 1;
  rootBone.add(childBone);

  const skinnedGeometry = new BoxGeometry(1, 1, 1);
  const vertexCount = skinnedGeometry.attributes.position.count;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  for (let index = 0; index < vertexCount; index += 1) {
    skinIndices.push(0, 0, 0, 0);
    skinWeights.push(1, 0, 0, 0);
  }
  skinnedGeometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices, 4));
  skinnedGeometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));

  const skinnedMaterial = new MeshBasicMaterial();
  const skinnedMesh = new SkinnedMesh(skinnedGeometry, skinnedMaterial);
  skinnedMesh.name = 'smoke:skinned-mesh';
  skinnedSource.add(rootBone, skinnedMesh);
  skinnedMesh.bind(new Skeleton([rootBone, childBone]));

  const skinnedClone = cloneGltfSourceForInstance(skinnedSource);
  const clonedSkinnedMesh = skinnedClone.getObjectByName('smoke:skinned-mesh');

  assert(clonedSkinnedMesh instanceof SkinnedMesh, 'GLB instance clone should preserve skinned meshes.');
  assert(clonedSkinnedMesh !== skinnedMesh, 'GLB instance clone should create a separate skinned mesh object.');
  assert(clonedSkinnedMesh.skeleton !== skinnedMesh.skeleton, 'Skinned GLB instances should not share the cached source skeleton.');
  assert(clonedSkinnedMesh.skeleton.bones[0] !== rootBone, 'Skinned GLB instance bones should be cloned from the cached source.');
  assert(
    skinnedClone.getObjectByName('smoke:root-bone') === clonedSkinnedMesh.skeleton.bones[0],
    'Skinned GLB instance skeleton should point at bones inside the instance clone.',
  );

  skinnedGeometry.dispose();
  skinnedMaterial.dispose();
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
  assert(defaultWorldAssetVerticalAlignment === 'ground', 'Asset fitting should ground-align loaded models by default.');
  assert(isAssetVerticalAlignment('ground'), 'Ground should be a valid asset vertical alignment.');
  assert(isAssetVerticalAlignment('center'), 'Center should be a valid asset vertical alignment.');

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

  const scaledGroundMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const scaledGroundResult = fitAssetObjectToBounds(scaledGroundMesh, {
    targetPosition: [0, 1, 0],
    targetDimensions: [2, 2, 2],
    fitMode: 'contain',
    scaleMultiplier: 2,
  });
  assert(
    Math.abs(scaledGroundResult.visualBox.min.y) < 0.001,
    'Scaled assets should keep their visual bottom on the target ground instead of sinking.',
  );
  disposeFitSmokeMesh(scaledGroundMesh);

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
  const debugUiState = createDebugUiState();

  assert(debugUiConfig.toggleKey === 'F3', 'Debug panel visibility should use F3.');
  assert(debugUiConfig.detailKey === 'F4', 'Debug detail level should use F4.');
  assert(debugUiConfig.performanceKey === 'F5', 'Performance details should use F5.');
  assert(debugUiConfig.collisionKey === 'F10', 'Collision boxes should use an F-key debug toggle.');
  assert(debugUiConfig.helpKey === 'F1', 'Debug help hint should use F1.');
  assert(debugUiConfig.layoutKey === 'F2', 'Debug help hint should include F2 layout mode.');
  assert(debugDetailLevels.includes('hidden'), 'Debug detail levels should include hidden.');
  assert(debugDetailLevels.includes('compact'), 'Debug detail levels should include compact.');
  assert(debugDetailLevels.includes('expanded'), 'Debug detail levels should include expanded.');
  assert(isDebugDetailLevel(debugUiState.detailLevel), 'Debug detail state should initialize to a valid level.');
  assert(getEffectiveDebugDetailLevel(debugUiState) === 'compact', 'Debug UI should initialize in compact mode.');
  assert(cycleDebugDetailLevel(debugUiState) === 'expanded', 'Debug detail should cycle from compact to expanded.');
  assert(cycleDebugDetailLevel(debugUiState) === 'hidden', 'Debug detail should cycle from expanded to hidden.');
  assert(getEffectiveDebugDetailLevel(debugUiState) === 'hidden', 'Hidden debug detail should hide developer panels.');
  assert(
    isGameplayUiSelectorIndependentOfDebug('.delivery-guidance'),
    'Objective guidance should remain independent of debug visibility.',
  );
  assert(
    isGameplayUiSelectorIndependentOfDebug('.interaction-prompt'),
    'Interaction prompt should remain independent of debug visibility.',
  );
  assert(
    isGameplayUiSelectorIndependentOfDebug('.interaction-message'),
    'Interaction message should remain independent of debug visibility.',
  );
  assert(
    isGameplayUiSelectorIndependentOfDebug('.delivery-board-overlay'),
    'Delivery board overlay should remain independent of debug visibility.',
  );
  assert(
    !isGameplayUiSelectorIndependentOfDebug('.dev-debug-panel'),
    'Developer panels should not be treated as required gameplay UI.',
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

const runAnimationHarnessSmoke = (): void => {
  const harnessHtmlUrl = new URL('../animation-harness.html', import.meta.url);
  const harnessScriptUrl = new URL('../src/animationHarness.ts', import.meta.url);
  const harnessCssUrl = new URL('../src/animationHarness.css', import.meta.url);
  const viteConfigUrl = new URL('../vite.config.mjs', import.meta.url);

  assert(nodeFileSystem.existsSync(harnessHtmlUrl), 'Animation harness HTML route should exist.');
  assert(nodeFileSystem.existsSync(harnessScriptUrl), 'Animation harness script should exist.');
  assert(nodeFileSystem.existsSync(harnessCssUrl), 'Animation harness styles should exist.');
  assert(nodeFileSystem.existsSync(viteConfigUrl), 'Vite config should exist for multi-page build input.');

  const harnessHtml = nodeFileSystem.readFileSync(harnessHtmlUrl, 'utf8');
  const harnessScript = nodeFileSystem.readFileSync(harnessScriptUrl, 'utf8');
  const viteConfig = nodeFileSystem.readFileSync(viteConfigUrl, 'utf8');

  assert(
    harnessHtml.includes('/src/animationHarness.ts'),
    'Animation harness route should load the isolated harness entry.',
  );
  assert(
    harnessScript.includes(playerCharacterAssetId) || harnessScript.includes('playerCharacterAssetId'),
    'Animation harness should use the selected courier visual asset id.',
  );
  assert(
    harnessScript.includes(playerCharacterAnimationAssetId) || harnessScript.includes('playerCharacterAnimationAssetId'),
    'Animation harness should use the selected courier animation asset id.',
  );
  assert(
    harnessScript.includes('Strip Root.position'),
    'Animation harness should expose root-motion stripping controls.',
  );
  assert(
    harnessScript.includes('lockHipXZ: true'),
    'Animation harness should default to the same hip X/Z lock as runtime playback.',
  );
  assert(
    harnessScript.includes('loopStart') && harnessScript.includes('loopEnd'),
    'Animation harness should expose loop trim values for patch notes.',
  );
  assert(
    viteConfig.includes('animation-harness.html'),
    'Vite build config should include the animation harness HTML entry.',
  );
};

const runTownEditorRouteSmoke = (): void => {
  const townEditorHtmlUrl = new URL('../town-editor.html', import.meta.url);
  const townEditorScriptUrl = new URL('../src/townEditor.ts', import.meta.url);
  const townEditorCssUrl = new URL('../src/townEditor.css', import.meta.url);
  const viteConfigUrl = new URL('../vite.config.mjs', import.meta.url);

  assert(nodeFileSystem.existsSync(townEditorHtmlUrl), 'Town editor HTML route should exist.');
  assert(nodeFileSystem.existsSync(townEditorScriptUrl), 'Town editor script should exist.');
  assert(nodeFileSystem.existsSync(townEditorCssUrl), 'Town editor styles should exist.');

  const townEditorHtml = nodeFileSystem.readFileSync(townEditorHtmlUrl, 'utf8');
  const townEditorScript = nodeFileSystem.readFileSync(townEditorScriptUrl, 'utf8');
  const viteConfig = nodeFileSystem.readFileSync(viteConfigUrl, 'utf8');
  const editableObjects = createEditablePlacementObjects();
  const generatedItems = getTownEditorGeneratedPaletteItems(editableObjects);
  const assetItems = getTownEditorAssetPaletteItems(editableObjects);
  const pavementItem = generatedItems.find((item) => item.id === 'pavement-tile-square');
  const crateItem = assetItems.find((item) => item.id === 'fantasy-box-001');

  assert(townEditorHtml.includes('/src/townEditor.ts'), 'Town editor route should load the isolated editor entry.');
  assert(townEditorScript.includes('createPlacementEditor'), 'Town editor should reuse the placement editor workflow.');
  assert(townEditorScript.includes('renderAuthoredWorldObjects: false'), 'Town editor should open on the clean playground canvas.');
  assert(townEditorScript.includes("hudVariant: 'builder'"), 'Town editor should use the save-focused builder HUD variant.');
  assert(townEditorScript.includes('getAssetThumbnailDataUrl'), 'Town editor should render asset thumbnails for palette cards.');
  assert(townEditorScript.includes('createModelInstance'), 'Town editor thumbnails should load GLB assets through the existing asset loader.');
  assert(townEditorScript.includes('group.scale.setScalar'), 'Town editor thumbnails should scale the centered wrapper, not push model pivots off-center.');
  assert(viteConfig.includes('town-editor.html'), 'Vite build config should include the town editor HTML entry.');
  assert(generatedItems.length > 0, 'Town editor generated palette should initialize.');
  assert(assetItems.length > 0, 'Town editor asset palette should initialize.');
  assert(pavementItem !== undefined && pavementItem.placeable, 'Town editor should expose draggable pavement squares.');
  assert(crateItem !== undefined && crateItem.placeable, 'Town editor should expose draggable fantasy crate assets.');
  assert(crateItem.candidateObjectIds.includes('crate-large'), 'Fantasy crate asset should map to an editable crate slot.');
  assert(
    !assetItems.some((item) => item.id === playerCharacterAssetId || item.source === 'creative-characters-free'),
    'Town editor asset palette should not offer the courier character as a placeable prop.',
  );
  assert(
    resolveTownEditorPlacementCandidate(crateItem, 0) !== null,
    'Town editor should resolve an initial placement candidate.',
  );
  assert(
    resolveTownEditorPlacementCandidate({ ...crateItem, placeable: false }, 0) === null,
    'Town editor should safely reject unplaceable palette items.',
  );
};

const runLayoutOverrideSmoke = (): void => {
  const knownObjectIds = baseVillageWorldObjects.map((object) => object.id);
  const validDocument: LayoutOverrideDocument = {
    version: layoutOverrideDocumentVersion,
    updatedAt: '2026-06-28T00:00:00.000Z',
    overrides: [
      {
        id: 'delivery-board',
        active: true,
        position: [-3.25, 0, 7.25],
        rotation: [0, Math.PI / 2, 0],
        scaleMultiplier: 1.1,
        yOffset: 0.15,
        fitMode: 'contain',
        dimensions: [1.9, 1.8, 0.5],
        collider: {
          position: [-3.25, 0.9, 7.25],
          size: [1.9, 1.8, 0.5],
        },
        updatedAt: '2026-06-28T00:00:00.000Z',
      },
      {
        id: 'crate-large',
        active: false,
        renderMode: 'asset',
        assetId: 'fantasy-box-001',
        gameplay: {
          role: 'decorative',
          action: 'none',
        },
        updatedAt: '2026-06-28T00:00:00.000Z',
      },
      {
        id: 'mailbox',
        mailbox: {
          variant: 'green',
          destinationName: 'Smoke Test Mailbox',
        },
        gameplay: {
          role: 'mailbox',
          action: 'complete-delivery',
          destinationName: 'Smoke Test Mailbox',
          mailboxVariant: 'green',
        },
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
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'delivery-board', active: 'yes' }],
    }, knownObjectIds).ok,
    'Invalid active flags should be rejected.',
  );
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'delivery-board', renderMode: 'asset' }],
    }, knownObjectIds).ok,
    'Asset render overrides should require an asset id.',
  );
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'delivery-board', assetId: 'missing-asset' }],
    }, knownObjectIds).ok,
    'Unknown asset ids should be rejected.',
  );
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'delivery-board', gameplay: { role: 'quest-giver' } }],
    }, knownObjectIds).ok,
    'Unknown gameplay roles should be rejected.',
  );
  assert(
    !validateLayoutOverrideDocument({
      ...validDocument,
      overrides: [{ id: 'mailbox', mailbox: { variant: 'purple', destinationName: 'Bad Mailbox' } }],
    }, knownObjectIds).ok,
    'Invalid mailbox variants should be rejected.',
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
  const generatedValidation = validateLayoutOverrideDocument(generatedVillageLayoutOverrides, knownObjectIds);
  const baseBoard = baseVillageWorldObjects.find((object) => object.id === 'delivery-board');
  const overriddenBoard = overriddenMerged.find((object) => object.id === 'delivery-board');
  const overriddenCrate = overriddenMerged.find((object) => object.id === 'crate-large');
  const overriddenMailbox = overriddenMerged.find((object) => object.id === 'mailbox');
  const boardDeltaX = (validDocument.overrides[0].position?.[0] ?? 0) - (baseBoard?.position[0] ?? 0);

  assert(generatedValidation.ok, 'Generated village layout overrides should validate against known object ids.');
  assert(generatedVillageLayoutOverrides.overrides.length > 0, 'Generated village layout overrides should include authored placements.');
  assert(
    generatedVillageLayoutOverrides.overrides.some((override) => override.fitMode === 'contain'),
    'Generated village layout overrides should include asset fit tuning.',
  );
  assert(emptyMerged.length === baseVillageWorldObjects.length, 'Empty generated overrides should not change object count.');
  assert(generatedMerged.length === baseVillageWorldObjects.length, 'Generated overrides should merge without changing object count.');
  assert(overriddenMerged.length === baseVillageWorldObjects.length, 'Layout overrides should merge without changing object count.');
  assert(overriddenBoard?.position[0] === -3.25, 'Merged overrides should update object position.');
  assert(overriddenBoard?.dimensions?.[0] === 1.9, 'Merged overrides should update dimensions.');
  assert(overriddenBoard?.collider?.size[0] === 1.9, 'Merged overrides should update collider data.');
  assert(overriddenCrate?.active === false, 'Merged overrides should preserve inactive state.');
  assert(overriddenCrate?.render?.mode === 'asset' && overriddenCrate.render.assetId === 'fantasy-box-001', 'Merged overrides should update asset render choices.');
  assert(
    Math.abs((overriddenBoard?.interactable?.position[0] ?? 0) - ((baseBoard?.interactable?.position[0] ?? 0) + boardDeltaX)) < 0.001,
    'Merged position overrides should move interactable anchors by delta.',
  );
  assert(overriddenBoard?.layoutTransform?.scaleMultiplier === 1.1, 'Primitive layout overrides should preserve scale multiplier.');
  assert(overriddenCrate !== undefined, 'Overridden crate should resolve.');
  assert(overriddenMailbox !== undefined, 'Overridden mailbox should resolve.');
  assert(getWorldObjectGameplay(overriddenCrate).role === 'decorative', 'Merged overrides should preserve decorative gameplay roles.');
  assert(overriddenMailbox?.mailbox?.destinationName === 'Smoke Test Mailbox', 'Merged overrides should update mailbox metadata.');
  assert(getWorldObjectGameplay(overriddenMailbox).action === 'complete-delivery', 'Merged overrides should update gameplay actions.');

  const editableObjects = createEditablePlacementObjects(baseVillageWorldObjects);
  const deliveryBoard = getEditablePlacementObjectById('delivery-board', editableObjects);

  if (!deliveryBoard) {
    throw new Error('Missing delivery board editable object.');
  }

  const draft = createPlacementTransformDraft(deliveryBoard.worldObject);
  draft.active = false;
  draft.position = [-3.25, 0, 7.25];
  draft.rotationY = Math.PI / 2;
  draft.scaleMultiplier = 1.1;
  draft.yOffset = 0.15;
  draft.assetId = 'fantasy-pointer-001';
  draft.gameplayRole = 'mailbox';
  draft.interactionAction = 'complete-delivery';
  draft.destinationName = 'Draft Mailbox';
  draft.mailboxVariant = 'blue';

  const draftDocument = createLayoutOverrideDocumentFromPlacementDrafts(
    new Map([[deliveryBoard.id, draft]]),
    editableObjects,
    '2026-06-28T00:00:00.000Z',
  );

  assert(draftDocument.overrides.length === 1, 'Placement drafts should create layout override JSON.');
  assert(draftDocument.overrides[0]?.id === 'delivery-board', 'Placement draft JSON should include object id.');
  assert(draftDocument.overrides[0]?.active === false, 'Placement draft JSON should include active state changes.');
  assert(draftDocument.overrides[0]?.assetId === 'fantasy-pointer-001', 'Placement draft JSON should include asset choices.');
  assert(draftDocument.overrides[0]?.gameplay?.role === 'mailbox', 'Placement draft JSON should include gameplay roles.');
  assert(draftDocument.overrides[0]?.gameplay?.action === 'complete-delivery', 'Placement draft JSON should include gameplay actions.');
  assert(draftDocument.overrides[0]?.mailbox?.destinationName === 'Draft Mailbox', 'Placement draft JSON should include mailbox metadata.');
  assert(
    validateLayoutOverrideDocument(draftDocument, knownObjectIds).ok,
    'Placement draft JSON should validate against known world objects.',
  );
  assert(!canUseTownEditorFilePicker({}), 'Town editor file picker detection should fail safely.');
  assert(
    canUseTownEditorFilePicker({
      showOpenFilePicker: () => Promise.resolve([]),
      showSaveFilePicker: () => Promise.reject(new Error('not used')),
    }),
    'Town editor file picker detection should accept supported browser APIs.',
  );
};

const runWorldDefinitionSmoke = (): void => {
  const ids = new Set<string>();

  villageWorldObjects.forEach((object) => {
    assert(!ids.has(object.id), `World object id should be unique: ${object.id}`);
    ids.add(object.id);
    assert(isFiniteVector3Tuple(object.position), `World object should have a valid position: ${object.id}`);

    const gameplay = getWorldObjectGameplay(object);
    assert(isWorldGameplayRole(gameplay.role), `World object gameplay role should be valid: ${object.id}`);
    assert(
      gameplay.action === undefined || isWorldInteractionAction(gameplay.action),
      `World object gameplay action should be valid: ${object.id}`,
    );

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

    const mailboxMetadata = getWorldObjectMailbox(object);

    if (mailboxMetadata) {
      assert(isMailboxVariant(mailboxMetadata.variant), `World object mailbox variant should be valid: ${object.id}`);
      assert(mailboxMetadata.destinationName.trim().length > 0, `World object mailbox destination should not be empty: ${object.id}`);
    }
  });

  const mailboxObjects = villageWorldObjects.filter((object) => object.kind === 'mailbox');
  const authoredPavementObjects = authoredVillageWorldObjects.filter((object) => object.kind === 'pavement');
  const activePavementObjects = villageWorldObjects.filter((object) => object.kind === 'pavement');
  const spawnObjects = getWorldObjectsByGameplayRole('player-spawn');
  const deliveryBoardActionObjects = getWorldObjectsByInteractionAction('open-delivery-board');
  const deliveryTargetActionObjects = getWorldObjectsByInteractionAction('complete-delivery');
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

  assert(getDefaultActionForRole('mailbox') === 'complete-delivery', 'Mailbox roles should default to complete-delivery.');
  assert(getDefaultActionForRole('delivery-board') === 'open-delivery-board', 'Delivery board roles should default to open-delivery-board.');
  assert(authoredPavementObjects.length >= 3, 'World should include generated pavement pieces in the editable authored object list.');
  assert(activePavementObjects.length === 0, 'Generated pavement pieces should start inactive so the clean canvas stays clear.');
  assert(authoredPavementObjects.every((object) => object.collider === undefined), 'Generated pavement pieces should not add collision by default.');
  assert(spawnObjects.length === 1, 'World should define exactly one player spawn role.');
  assert(deliveryBoardActionObjects.length >= 1, 'World should define a delivery board action object.');
  assert(deliveryTargetActionObjects.length >= 3, 'World should define mailbox delivery action objects.');
  assert(playerSpawnPosition[0] === spawnObjects[0]?.position[0] && playerSpawnPosition[2] === spawnObjects[0]?.position[2], 'Player spawn export should resolve from the spawn role object.');
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

    const targetInteractable = target.interactable;

    if (targetInteractable) {
      villageWorldObjects.filter((object) => object.collider && object.id !== target.id).forEach((colliderObject) => {
        const collider = colliderObject.collider;

        if (!collider) {
          return;
        }

        assert(
          getHorizontalBoxDistance(targetInteractable.position, collider.position, collider.size) >= villageLayoutConfig.spacing.interactableClearanceRadius,
          `Delivery target ${target.id} should keep a clear approach from collider ${colliderObject.id}.`,
        );
      });
    }
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
  const { bounds, densityBudget, objectBudgets, routes, scenicBounds, spacing, zones } = villageLayoutConfig;
  const densityTotal = (
    densityBudget.openMovementAndPaths
    + densityBudget.landmarkStructures
    + densityBudget.decorativeClutter
  );

  assert(villageLayoutConfig.coordinateSystem.x === 'left/right', 'Village layout should document the X axis.');
  assert(villageLayoutConfig.coordinateSystem.y === 'height', 'Village layout should document the Y axis.');
  assert(villageLayoutConfig.coordinateSystem.z === 'forward/back', 'Village layout should document the Z axis.');
  assert(bounds.minX === -45 && bounds.maxX === 45, 'First town layout should define playable X bounds.');
  assert(bounds.minZ === -45 && bounds.maxZ === 45, 'First town layout should define playable Z bounds.');
  assert(scenicBounds.minX === -65 && scenicBounds.maxX === 65, 'First town layout should define scenic X bounds.');
  assert(scenicBounds.minZ === -65 && scenicBounds.maxZ === 65, 'First town layout should define scenic Z bounds.');
  assert(spacing.mainPathMinWidth === 4, 'First town layout should define the minimum main path width.');
  assert(spacing.mainPathMaxWidth === 6, 'First town layout should define the maximum main path width.');
  assert(spacing.mainPathMinWidth < spacing.mainPathMaxWidth, 'Village layout main path width range should be ordered.');
  assert(spacing.sidePathMinWidth === 3, 'First town layout should define the minimum side path width.');
  assert(spacing.sidePathMaxWidth === 4, 'First town layout should define the maximum side path width.');
  assert(spacing.sidePathMinWidth < spacing.sidePathMaxWidth, 'Side path width range should be ordered.');
  assert(spacing.centralGreenOpenRadius === 10, 'First town layout should define the central green open radius.');
  assert(spacing.interactableClearanceRadius === 2.5, 'First town layout should define interactable clearance.');
  assert(spacing.decorativeClusterMaxCountPerDistrict === 3, 'First town layout should limit decorative clusters per district.');
  assert(spacing.decorativeClusterMaxProps === 4, 'First town layout should limit props per decorative cluster.');
  assert(objectBudgets.decorativePropMaxCount > 0, 'Village layout should define a positive decorative prop budget.');
  assert(objectBudgets.houseMaxCount === 10, 'First town layout should limit houses for now.');
  assert(objectBudgets.activeMailboxMaxCount === 6, 'First town layout should limit active mailbox targets for now.');
  assert(objectBudgets.decorativeClusterMaxCountPerDistrict === 3, 'First town layout should define decorative clusters per district.');
  assert(objectBudgets.smallPropsMaxPerCluster === 4, 'First town layout should define small props per cluster.');
  assert(objectBudgets.crateBarrelClusterMaxObjects === 4, 'Village layout should limit crate/barrel cluster size.');
  assert(Math.abs(densityTotal - 1) < 0.001, 'Village layout density budget should total 100%.');
  assert(densityBudget.openMovementAndPaths >= 0.6, 'First town should keep most playable space open.');
  assert(villageLayoutConfig.keyPositions.spawn[0] === 0 && villageLayoutConfig.keyPositions.spawn[2] === 38, 'First town should define the south entry spawn center.');
  assert(villageLayoutConfig.keyPositions.deliveryBoard[0] === -4 && villageLayoutConfig.keyPositions.deliveryBoard[2] === 26, 'First town should define the delivery board center.');
  assert(villageLayoutConfig.keyPositions.northHillOldTrailGate[2] === -36, 'First town should define the north hill gate center.');

  const zoneIds = new Set(zones.map((zone) => zone.id));
  assert(zones.length === 8, 'First town layout should define all intended districts.');
  zones.forEach((zone) => {
    assert(zone.center.length === 3 && zone.center.every((component) => Number.isFinite(component)), `Layout district should have a valid center: ${zone.id}`);
    assert(zone.center[1] === 0, `Layout district should keep Y as height: ${zone.id}`);
    assert(zone.radius > 0, `Layout zone should have a positive radius: ${zone.id}`);
  });
  assert(zoneIds.has('south-entry-spawn'), 'First town layout should include the south entry district.');
  assert(zoneIds.has('post-office-plaza'), 'First town layout should include the post office plaza district.');
  assert(zoneIds.has('market-lane'), 'First town layout should include the market lane district.');
  assert(zoneIds.has('central-green-well'), 'First town layout should include the central green district.');
  assert(zoneIds.has('west-homes'), 'First town layout should include the west homes district.');
  assert(zoneIds.has('east-river-row'), 'First town layout should include the east river row district.');
  assert(zoneIds.has('north-hill-old-trail-gate'), 'First town layout should include the north hill district.');
  assert(zoneIds.has('forest-orchard-boundary'), 'First town layout should include the forest/orchard boundary district.');

  const routeLabels = new Set(routes.map((route) => route.label));
  assert(routes.length === 7, 'First town layout should define all intended route names.');
  routes.forEach((route) => {
    assert(route.start.length === 3 && route.end.length === 3, `Town route should use 3D start/end tuples: ${route.id}`);
    assert(route.start[1] === 0 && route.end[1] === 0, `Town route should keep Y as height: ${route.id}`);
    assert(route.minWidth > 0 && route.maxWidth > route.minWidth, `Town route widths should be valid: ${route.id}`);
  });
  assert(routeLabels.has('South Road'), 'First town routes should include South Road.');
  assert(routeLabels.has('Post Office Walk'), 'First town routes should include Post Office Walk.');
  assert(routeLabels.has('Market Lane'), 'First town routes should include Market Lane.');
  assert(routeLabels.has('Green Loop'), 'First town routes should include Green Loop.');
  assert(routeLabels.has('West Home Path'), 'First town routes should include West Home Path.');
  assert(routeLabels.has('River Row'), 'First town routes should include River Row.');
  assert(routeLabels.has('North Hill Road'), 'First town routes should include North Hill Road.');
};

const runLayoutDebugSmoke = (): void => {
  assert(layoutDebugConfig.toggleKey === 'F2', 'Layout debug mode should use F2 as the toggle key.');
  assert(layoutDebugConfig.cameraModeKey === 'v', 'Layout debug camera mode should use V as the toggle key.');
  assert(layoutDebugConfig.cameraHeight > 0, 'Layout debug camera height should be positive.');
  assert(layoutDebugConfig.viewPadding >= 0, 'Layout debug view padding should not be negative.');
  assert(layoutDebugConfig.overviewMinZoom > 0, 'Layout debug overview minimum zoom should be positive.');
  assert(layoutDebugConfig.overviewMaxZoom >= layoutDebugConfig.overviewMinZoom, 'Layout debug overview zoom range should be valid.');
  assert(layoutDebugConfig.closeCameraMinDistance > 0, 'Layout debug close camera minimum distance should be positive.');
  assert(layoutDebugConfig.closeCameraMaxDistance > layoutDebugConfig.closeCameraMinDistance, 'Layout debug close camera distance range should be valid.');
  assert(layoutDebugCameraModes.includes('overview'), 'Layout debug camera modes should include overview.');
  assert(layoutDebugCameraModes.includes('close'), 'Layout debug camera modes should include close.');
  assert(isLayoutDebugCameraMode('overview'), 'Overview should be a valid layout camera mode.');
  assert(isLayoutDebugCameraMode('close'), 'Close should be a valid layout camera mode.');
  assert(!isLayoutDebugCameraMode('sideways'), 'Unknown layout camera modes should be rejected.');
  assert(getNextLayoutDebugCameraMode('overview') === 'close', 'Layout camera mode should cycle from overview to close.');
  assert(getNextLayoutDebugCameraMode('close') === 'overview', 'Layout camera mode should cycle from close to overview.');
  assert(clampLayoutOverviewZoom(0) === layoutDebugConfig.overviewMinZoom, 'Layout overview zoom should clamp to minimum.');
  assert(clampLayoutCloseCameraDistance(0) === layoutDebugConfig.closeCameraMinDistance, 'Layout close camera distance should clamp to minimum.');

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
  assert(layoutDebugView.closeCamera.isPerspectiveCamera, 'Layout debug mode should initialize a close perspective camera.');
  assert(layoutDebugView.getCameraMode() === 'overview', 'Layout debug view should start in overview camera mode.');
  assert(layoutDebugView.getCamera() === layoutDebugView.camera, 'Overview mode should use the top-down camera.');
  assert(!layoutDebugView.isActive(), 'Layout debug view should start inactive.');
  assert(layoutDebugView.object.getObjectByName('layout:bounds') !== undefined, 'Layout debug view should include village bounds.');
  assert(layoutDebugView.object.getObjectByName('layout:zone:central-green-well') !== undefined, 'Layout debug view should include zone outlines.');
  assert(layoutDebugView.object.getObjectByName('layout:path:village:main-path-spawn-to-plaza') !== undefined, 'Layout debug view should include path lane guides.');
  assert(layoutDebugView.object.getObjectByName('layout:interactable:delivery-board') !== undefined, 'Layout debug view should include interactable radius helpers.');
  assert(layoutDebugView.object.getObjectByName('layout:collider:delivery-board') !== undefined, 'Layout debug view should include collider outlines.');
  assert(layoutDebugView.object.getObjectByName('layout:objective-anchor:delivery-board') !== undefined, 'Layout debug view should include objective anchor helpers.');
  assert(layoutDebugView.object.getObjectByName('layout:label:spawn') !== undefined, 'Layout debug view should include important object labels.');
  assert(layoutDebugView.toggle(), 'Layout debug view should toggle active.');
  assert(layoutDebugView.object.visible, 'Layout debug view object should be visible while active.');
  assert(layoutDebugView.toggleCameraMode() === 'close', 'Layout debug view should toggle to close camera mode.');
  assert(layoutDebugView.getCamera() === layoutDebugView.closeCamera, 'Close mode should use the close perspective camera.');
  layoutDebugView.setCameraMode('overview');
  assert(layoutDebugView.getCamera() === layoutDebugView.camera, 'Setting overview should restore the top-down camera.');
  layoutDebugView.setActive(false);
  assert(!layoutDebugView.object.visible, 'Layout debug view object should hide when inactive.');
  layoutDebugView.dispose();
};

const runPlacementEditorSmoke = (): void => {
  const editableObjects = createEditablePlacementObjects();
  const snapValues = getPlacementEditorSnapValues();
  const deliveryBoard = getEditablePlacementObjectById('delivery-board', editableObjects);
  const playerSpawn = getEditablePlacementObjectById('player-spawn', editableObjects);
  const pavementTile = getEditablePlacementObjectById('pavement-tile-square', editableObjects);
  const missingObject = getEditablePlacementObjectById('missing-object', editableObjects);

  assert(editableObjects.length > 0, 'Placement editor editable object list should initialize.');
  assert(deliveryBoard !== null, 'Placement editor should resolve important editable objects.');
  assert(playerSpawn !== null, 'Placement editor should expose the player spawn as an editable object.');
  assert(pavementTile !== null, 'Placement editor should expose generated pavement tiles as editable objects.');
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
  assert(placementEditorHudVariants.includes('builder'), 'Placement editor should expose a standalone builder HUD variant.');
  assert(isPlacementEditorHudVariant('builder'), 'Placement editor builder HUD variant should validate.');
  assert(!isPlacementEditorHudVariant('dropdown-heavy'), 'Placement editor HUD variant validation should reject unknown values.');
  assert(primitivePlacementPreviewKinds.includes('pavement'), 'Placement editor primitive previews should support generated pavement.');
  assert(isPrimitivePlacementPreviewKind('pavement'), 'Pavement should be a primitive preview kind.');

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

  if (!pavementTile) {
    throw new Error('Missing pavement editable object.');
  }

  const draft = createPlacementTransformDraft(deliveryBoard.worldObject);
  const deletedDraft = markPlacementDraftDeleted({
    ...clonePlacementDraft(draft),
    active: true,
    assetId: 'fantasy-box-001',
  });
  assert(!deletedDraft.active, 'Placement editor delete should mark a draft inactive.');
  assert(deletedDraft.assetId === null, 'Placement editor delete should clear asset previews from a draft.');
  const pavementDraft = createPlacementTransformDraft(pavementTile.worldObject);
  pavementDraft.active = true;
  pavementDraft.scaleMultiplier = 2.5;
  const pavementPreview = createPrimitivePlacementPreviewObject(pavementTile.worldObject);
  assert(pavementPreview !== null, 'Generated pavement should create an editor primitive preview.');
  if (pavementPreview) {
    pavementPreview.scale.set(pavementDraft.scaleMultiplier, 1, pavementDraft.scaleMultiplier);
    pavementPreview.updateMatrixWorld(true);
    const pavementPreviewBox = new Box3().setFromObject(pavementPreview);
    assert(pavementPreviewBox.min.y >= -0.001, 'Generated pavement preview should stay above ground while scaled.');
    pavementPreview.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
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
  draft.gameplayRole = 'mailbox';
  draft.interactionAction = 'complete-delivery';
  draft.destinationName = 'Smoke Editor Mailbox';
  draft.mailboxVariant = 'red';

  const serialized = serializePlacementTransform(deliveryBoard.worldObject, draft);
  const serializedAgain = serializePlacementTransform(deliveryBoard.worldObject, draft);
  assert(serialized === serializedAgain, 'Placement transform serialization should remain stable after drag and nudge edits.');
  assert(serialized.includes("id: 'delivery-board'"), 'Placement transform serialization should include the object id.');
  assert(serialized.includes('position:'), 'Placement transform serialization should include position.');
  assert(serialized.includes('rotation:'), 'Placement transform serialization should include rotation.');
  assert(serialized.includes("gameplay: { role: 'mailbox'"), 'Placement transform serialization should include gameplay role metadata.');
  assert(serialized.includes("mailbox: { variant: 'red'"), 'Placement transform serialization should include mailbox metadata.');

  const draftMap = new Map([[deliveryBoard.id, draft]]);
  const serializedAll = serializePlacementTransforms(draftMap, editableObjects);
  assert(serializedAll.startsWith('{'), 'All-placement serialization should be stable layout override JSON.');
  assert(serializedAll.includes('"version": 1'), 'All-placement serialization should include the layout override version.');
  assert(serializedAll.includes('"id": "delivery-board"'), 'All-placement serialization should include edited transforms.');
  assert(serializedAll.includes('"gameplay"'), 'All-placement serialization should include gameplay metadata when edited.');
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
  const cleanCanvasInteractables = createPlaygroundInteractables(delivery);
  assert(cleanCanvasInteractables.length === 0, 'Clean editor canvas should not expose authored interactables by default.');

  const interactables = createPlaygroundInteractables(delivery, {
    enableAuthoredInteractables: true,
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

  const hiddenPanelSnapshot = createPerformanceSnapshot();
  assert(hiddenPanelSnapshot.renderCalls === 0, 'Performance snapshot should initialize when the debug panel is hidden.');
  assert(hiddenPanelSnapshot.triangles === 0, 'Hidden debug panel state should not require renderer counters.');

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

const runEnvironmentSmoke = (): void => {
  assert(defaultEnvironmentPresetName === 'goldenHour', 'Environment should default to golden hour.');
  assert(environmentPresetNames.includes('morning'), 'Environment should include a morning preset.');
  assert(environmentPresetNames.includes('goldenHour'), 'Environment should include a goldenHour preset.');
  assert(environmentPresetNames.includes('overcast'), 'Environment should include an overcast preset.');
  assert(isEnvironmentPresetName('morning'), 'Environment preset names should validate known values.');
  assert(!isEnvironmentPresetName('midnight'), 'Environment preset names should reject unknown values.');

  environmentPresetNames.forEach((presetName) => {
    const config = environmentPresets[presetName];

    assert(getEnvironmentPreset(presetName) === config, `Environment preset lookup should return config: ${presetName}.`);
    assert(isValidEnvironmentConfig(config), `Environment config should be valid: ${presetName}.`);
    assert(config.fogFar > config.fogNear, `Fog far should be beyond fog near: ${presetName}.`);
    assert(config.sunIntensity > 0, `Sun intensity should be positive: ${presetName}.`);
    assert(config.hemisphereIntensity > 0, `Hemisphere intensity should be positive: ${presetName}.`);
    assert(config.sunDirection.length === 3, `Sun direction should be a Vector3 tuple: ${presetName}.`);
    assert(config.sunDirection.some((component) => Math.abs(component) > 0), `Sun direction should not be zero: ${presetName}.`);
  });

  const scene = new Scene();
  const previousBackground = new Color(0x123456);
  const previousFog = new Fog(0x123456, 1, 2);
  scene.background = previousBackground;
  scene.fog = previousFog;

  const environment = createWorldEnvironment(scene);
  assert(environment.presetName === defaultEnvironmentPresetName, 'World environment should use the default preset.');
  assert(scene.children.includes(environment.object), 'World environment should add its root to the scene.');
  assert(environment.object.getObjectByName('environment:gradient-skydome') !== undefined, 'World environment should include a gradient skydome.');
  assert(environment.object.getObjectByName('environment:sun') !== undefined, 'World environment should include a sun light.');
  assert(environment.object.getObjectByName('environment:hemisphere') !== undefined, 'World environment should include hemisphere lighting.');
  assert(environment.object.getObjectByName('environment:ambient') !== undefined, 'World environment should include ambient fill lighting.');
  assert(scene.fog instanceof Fog, 'World environment should apply scene fog.');
  assert(scene.fog.near === environment.config.fogNear, 'World environment fog near should match config.');
  assert(scene.fog.far === environment.config.fogFar, 'World environment fog far should match config.');
  assert(scene.background instanceof Color, 'World environment should apply a fallback background color.');

  environment.dispose();
  assert(!scene.children.includes(environment.object), 'World environment should remove its root on dispose.');
  assert(scene.background === previousBackground, 'World environment should restore previous scene background on dispose.');
  assert(scene.fog === previousFog, 'World environment should restore previous scene fog on dispose.');
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

  const movementForward = new Vector3();
  const movementRight = new Vector3();
  const movementDirection = new Vector3();
  resolveMovementBasisFromCameraYaw(0, movementForward, movementRight);
  assert(movementForward.distanceTo(new Vector3(0, 0, -1)) < 0.001, 'Camera-yaw movement should use camera forward for W.');
  assert(movementRight.distanceTo(new Vector3(1, 0, 0)) < 0.001, 'Camera-yaw movement should use camera right for D.');
  resolveMovementBasis((forward, right) => {
    resolveMovementBasisFromCameraYaw(0, forward, right);
  }, movementForward, movementRight);
  resolvePlayerInputDirection(new Set(['a']), movementDirection, movementForward, movementRight);
  assert(movementDirection.distanceTo(new Vector3(-1, 0, 0)) < 0.001, 'A should move left relative to the camera.');
  resolvePlayerInputDirection(new Set(['d']), movementDirection, movementForward, movementRight);
  assert(movementDirection.distanceTo(new Vector3(1, 0, 0)) < 0.001, 'D should move right relative to the camera.');
  resolveMovementBasisFromCameraYaw(Math.PI / 2, movementForward, movementRight);
  resolvePlayerInputDirection(new Set(['w', 'a']), movementDirection, movementForward, movementRight);
  const expectedUpLeft = movementForward.clone().sub(movementRight).normalize();
  assert(Math.abs(movementDirection.length() - 1) < 0.001, 'Diagonal camera-relative movement should normalize to one.');
  assert(movementDirection.distanceTo(expectedUpLeft) < 0.001, 'W+A should move up-left relative to a rotated camera basis.');
  assert(
    new Vector3(0, 0, -1)
      .applyAxisAngle(new Vector3(0, 1, 0), getPlayerYawForDirection(new Vector3(1, 0, 0)))
      .distanceTo(new Vector3(1, 0, 0)) < 0.001,
    'Player yaw should face right when moving right.',
  );
  assert(
    new Vector3(0, 0, -1)
      .applyAxisAngle(new Vector3(0, 1, 0), getPlayerYawForDirection(new Vector3(-1, 0, 0)))
      .distanceTo(new Vector3(-1, 0, 0)) < 0.001,
    'Player yaw should face left when moving left.',
  );

  assert(playerCharacterAssetId === 'creative-courier-character', 'Player character asset id should point to the selected courier asset.');
  assert(playerCharacterAnimationAssetId === 'creative-courier-character-animations', 'Player character animation asset id should point to the selected courier animation source.');
  assert(selectedCharacterAssetIdSet.has(playerCharacterAssetId), 'Player character asset id should be part of selected character assets.');
  assert(selectedCharacterAssetIdSet.has(playerCharacterAnimationAssetId), 'Player character animation asset id should be part of selected character assets.');
  assert(isKnownAssetId(playerCharacterVisualSettings.assetId), 'Player character visual asset should be registered.');
  assert(isKnownAssetId(playerCharacterVisualSettings.animationAssetId), 'Player character animation asset should be registered.');
  assert(playerCharacterVisualSettings.scale > 0, 'Player character visual scale should be positive.');
  assert(Number.isFinite(playerCharacterVisualSettings.rotationY), 'Player character visual rotation should be finite.');
  assert(isFiniteVector3Tuple(playerCharacterVisualSettings.offset), 'Player character visual offset should be a valid vector.');
  assert(playerCharacterVisualSettings.visibleMeshNames.length > 0, 'Player character visual should select a courier-style mesh subset.');
  assert(playerCharacterVisualSettings.visibleMeshNames.includes('Outerwear_036'), 'Player character mesh filter should use the actual outerwear mesh name.');
  assert(playerCharacterVisualSettings.idleSpeedThreshold > 0, 'Player idle animation speed threshold should be positive.');
  assert(
    playerCharacterVisualSettings.runSpeedThreshold > playerCharacterVisualSettings.idleSpeedThreshold,
    'Player run animation speed threshold should be above idle.',
  );
  assert(playerCharacterVisualSettings.animationFadeDuration > 0, 'Player animation fade duration should be positive.');
  assert(playerCharacterVisualSettings.walkAnimationTimeScale > 0, 'Player walk animation time scale should be positive.');
  assert(playerCharacterVisualSettings.runAnimationTimeScale > 0, 'Player run animation time scale should be positive.');
  assert(playerCharacterVisualSettings.lockHipPositionXZ, 'Player runtime animations should lock hip X/Z by default.');

  const filterFallback = resolveVisibleCharacterMeshNames(['Body_010', 'Outerwear_036'], ['missing-mesh-name'], 'configured');
  assert(filterFallback.usedFallbackAll, 'Player mesh filtering should fall back to all meshes if the configured filter hides everything.');
  assert(filterFallback.visibleMeshCount === 2, 'Player mesh filter fallback should keep every available mesh visible.');

  const filterConfigured = resolveVisibleCharacterMeshNames(['Body_010', 'Outerwear_036'], ['Body_010'], 'configured');
  assert(!filterConfigured.usedFallbackAll, 'Player mesh filtering should not fall back when at least one mesh matches.');
  assert(filterConfigured.visibleMeshCount === 1, 'Player mesh filtering should respect configured visible mesh names.');

  const idleClip = new AnimationClip('Idle_Relaxed', -1, []);
  const aPoseClip = new AnimationClip('A-pose', -1, []);
  const walkClip = new AnimationClip('Walk_Forward', -1, []);
  const runClip = new AnimationClip('Run_Forward', -1, []);
  assert(
    selectPlayerIdleAnimationClip([aPoseClip, walkClip, idleClip]) === idleClip,
    'Player animation selection should prefer configured idle clips.',
  );
  assert(
    selectPlayerIdleAnimationClip([aPoseClip, walkClip]) === walkClip,
    'Player animation selection should avoid A-pose when a runtime clip is available.',
  );
  assert(selectPlayerMotionAnimationClip([idleClip, walkClip, runClip], 'walk') === walkClip, 'Player walk animation selection should prefer Walk_Forward.');
  assert(selectPlayerMotionAnimationClip([idleClip, walkClip, runClip], 'run') === runClip, 'Player run animation selection should prefer Run_Forward.');
  assert(isPlayerRootMotionTrackName('Root.position'), 'Player animation cleanup should detect direct Root.position tracks.');
  assert(isPlayerRootMotionTrackName('.bones[Root].position'), 'Player animation cleanup should detect bone Root.position tracks.');
  assert(!isPlayerRootMotionTrackName('Hips.position'), 'Player animation cleanup should keep local hip motion for gait readability.');
  assert(isPlayerHipPositionTrackName('Hips.position'), 'Player animation cleanup should detect direct Hips.position tracks.');
  assert(isPlayerHipPositionTrackName('.bones[Hips].position'), 'Player animation cleanup should detect bone Hips.position tracks.');
  const rootMotionClip = new AnimationClip('Run_Forward', 1, [
    new VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 0, 0, 2]),
    new VectorKeyframeTrack('Hips.position', [0, 1], [0.2, 0.7, -0.1, 0.8, 0.9, 0.4]),
  ]);
  const inPlaceClip = createInPlacePlayerAnimationClip(rootMotionClip);
  assert(
    inPlaceClip.tracks.every((track) => track.name !== 'Root.position'),
    'Player animation cleanup should remove root translation tracks.',
  );
  assert(
    inPlaceClip.tracks.some((track) => track.name === 'Hips.position'),
    'Player animation cleanup should preserve local hip translation tracks.',
  );
  const lockedHipTrack = inPlaceClip.tracks.find((track) => track.name === 'Hips.position');
  assert(lockedHipTrack !== undefined, 'Player animation cleanup should include a sanitized hip track.');
  assert(lockedHipTrack.values[0] === lockedHipTrack.values[3], 'Player animation cleanup should lock hip X motion.');
  assert(lockedHipTrack.values[2] === lockedHipTrack.values[5], 'Player animation cleanup should lock hip Z motion.');
  assert(lockedHipTrack.values[1] !== lockedHipTrack.values[4], 'Player animation cleanup should preserve hip Y motion.');
  const unlockedHipClip = createInPlacePlayerAnimationClip(rootMotionClip, { lockHipPositionXZ: false });
  const unlockedHipTrack = unlockedHipClip.tracks.find((track) => track.name === 'Hips.position');
  assert(unlockedHipTrack !== undefined, 'Player animation cleanup should keep hip track when X/Z locking is disabled.');
  assert(unlockedHipTrack.values[0] !== unlockedHipTrack.values[3], 'Player animation cleanup should allow hip X motion when disabled.');
  assert(unlockedHipTrack.values[2] !== unlockedHipTrack.values[5], 'Player animation cleanup should allow hip Z motion when disabled.');
  assert(getPlayerMotionAnimationState(0) === 'idle', 'Player animation should idle at zero speed.');
  assert(
    getPlayerMotionAnimationState(playerCharacterVisualSettings.idleSpeedThreshold + 0.01) === 'walk',
    'Player animation should walk above the idle threshold.',
  );
  assert(
    getPlayerMotionAnimationState(playerCharacterVisualSettings.runSpeedThreshold) === 'run',
    'Player animation should run at the run threshold.',
  );

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
  assert(initialVisualStatus.animationAssetId === playerCharacterAnimationAssetId, 'Player visual status should expose the selected animation asset id.');
  assert(initialVisualStatus.assetUrl.endsWith('.glb'), 'Player visual status should expose the selected asset URL.');
  assert(initialVisualStatus.animationAssetUrl.endsWith('.glb'), 'Player visual status should expose the selected animation asset URL.');
  assert(initialVisualStatus.activeAnimationState === 'idle', 'Player visual status should initialize with idle animation state.');
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
  assert(thirdPersonCameraSettings.minDistance > 0, 'Camera min distance should be positive.');
  assert(
    thirdPersonCameraSettings.maxDistance > thirdPersonCameraSettings.minDistance,
    'Camera zoom distance limits should be ordered.',
  );
  assert(thirdPersonCameraSettings.zoomSensitivity > 0, 'Camera zoom sensitivity should be positive.');
  assert(thirdPersonCameraSettings.zoomSmoothness > 0, 'Camera zoom smoothing should be positive.');
  assert(thirdPersonCameraSettings.minPitch < thirdPersonCameraSettings.maxPitch, 'Camera pitch limits should be ordered.');
  assert(
    clampCameraDistance(0) === thirdPersonCameraSettings.minDistance,
    'Camera distance should clamp to the minimum zoom.',
  );
  assert(
    clampCameraDistance(999) === thirdPersonCameraSettings.maxDistance,
    'Camera distance should clamp to the maximum zoom.',
  );
  assert(
    getZoomedCameraDistance(thirdPersonCameraSettings.distance, -100) < thirdPersonCameraSettings.distance,
    'Mouse wheel up should zoom the camera in.',
  );
  assert(
    getZoomedCameraDistance(thirdPersonCameraSettings.distance, 100) > thirdPersonCameraSettings.distance,
    'Mouse wheel down should zoom the camera out.',
  );
  assert(playgroundCompositionConfig.renderGrass, 'Clean editor canvas should keep the grass ground.');
  assert(playgroundCompositionConfig.renderFence, 'Clean editor canvas should keep the boundary fence.');
  assert(!playgroundCompositionConfig.renderAuthoredWorldObjects, 'Clean editor canvas should hide authored world objects by default.');
  assert(!playgroundCompositionConfig.enableAuthoredCollision, 'Clean editor canvas should not keep invisible authored collision.');
  assert(!playgroundCompositionConfig.showAuthoredObjectiveMarkers, 'Clean editor canvas should hide authored delivery markers.');
  assert(playgroundCollisionWorld.boxes.length === 0, 'Clean editor canvas should not initialize authored collision boxes.');

  const authoredCollisionWorld = createPlaygroundCollisionWorld(true);
  assert(authoredCollisionWorld.boxes.length >= 2, 'Authored collision boxes should still initialize on demand.');
  assert(
    authoredCollisionWorld.boxes.length === villageWorldObjects.filter((object) => object.collider).length,
    'Collision boxes should be generated from collidable world objects.',
  );
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'mailbox'), 'Mailbox collision box should initialize.');
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'mailbox-post-office-return'), 'Post office return box collision should initialize.');
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'post-office'), 'Post office collision box should initialize.');
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'cottage-west'), 'Village cottage collision should initialize.');
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'town-well'), 'Town well collision should initialize.');
  assert(authoredCollisionWorld.boxes.some((box) => box.id === 'cart-south-path'), 'Large fantasy cart collision should initialize.');

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
  assert(playground.getObjectByName('village:ground') !== undefined, 'Clean editor canvas should include grass ground.');
  assert(playground.getObjectByName('village:boundary-rail-north-low') !== undefined, 'Clean editor canvas should include boundary fence rails.');
  assert(playground.getObjectByName('village:mailbox:rounded-body') === undefined, 'Clean editor canvas should hide mailbox props.');
  assert(playground.getObjectByName('village:crate-large') === undefined, 'Clean editor canvas should hide crate props.');
  assert(playground.getObjectByName('village:main-path-spawn-to-plaza') === undefined, 'Clean editor canvas should hide authored paths.');
  assert(playground.getObjectByName('village:central-plaza-surface') === undefined, 'Clean editor canvas should hide authored plaza surfaces.');
  assert(playground.getObjectByName('village:label-post-office') === undefined, 'Clean editor canvas should hide authored labels.');

  const authoredPlayground = createPlayground({ renderAuthoredWorldObjects: true });
  assert(authoredPlayground.children.length > 20, 'Authored village square should include primitive blockout children when requested.');
  assert(authoredPlayground.getObjectByName('village:mailbox:rounded-body') !== undefined, 'Blue mailbox procedural body should initialize.');
  assert(authoredPlayground.getObjectByName('village:mailbox-east:rounded-body') !== undefined, 'Red mailbox procedural body should initialize.');
  assert(authoredPlayground.getObjectByName('village:mailbox-post-office-return:rounded-body') !== undefined, 'Green return-box procedural body should initialize.');
  assert(authoredPlayground.getObjectByName('village:mailbox:mail-symbol') !== undefined, 'Procedural mailbox mail symbol should initialize in the village.');
  assert(authoredPlayground.getObjectByName('village:crate-large') !== undefined, 'Asset-targeted crate fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:cottage-west:body') !== undefined, 'Fantasy cottage primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:post-office:body') !== undefined, 'Fantasy post office primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:barrel-north-a') !== undefined, 'Fantasy barrel primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:signpost-post-office:post') !== undefined, 'Fantasy pointer primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:cart-south-path:bed') !== undefined, 'Fantasy cart primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:tree-northwest:trunk') !== undefined, 'Tree primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:tree-northwest:canopy') !== undefined, 'Tree canopy primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:bush-side-path-a') !== undefined, 'Bush primitive fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:nature-rock-path-a') !== undefined, 'Asset-targeted nature rock fallback should initialize.');
  assert(authoredPlayground.getObjectByName('village:main-path-spawn-to-plaza') !== undefined, 'Main spawn-to-plaza path should initialize.');
  assert(authoredPlayground.getObjectByName('village:main-path-plaza-to-north-house') !== undefined, 'Main plaza-to-north-house path should initialize.');
  assert(authoredPlayground.getObjectByName('village:side-path-blue-house') !== undefined, 'Blue house side path should initialize.');
  assert(authoredPlayground.getObjectByName('village:side-path-red-house') !== undefined, 'Red house side path should initialize.');
  assert(authoredPlayground.getObjectByName('village:central-plaza-surface') !== undefined, 'Central plaza surface should initialize.');
  assert(authoredPlayground.getObjectByName('village:label-post-office') !== undefined, 'Post office label sign should initialize.');
  assert(authoredPlayground.getObjectByName('village:label-blue-house') !== undefined, 'Blue house label sign should initialize.');
  assert(authoredPlayground.getObjectByName('village:label-red-house') !== undefined, 'Red house label sign should initialize.');
  assert(authoredPlayground.getObjectByName('village:label-side-path') !== undefined, 'Side path label sign should initialize.');

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
runAnimationHarnessSmoke();
runTownEditorRouteSmoke();
runLayoutOverrideSmoke();
runWorldDefinitionSmoke();
runVillageLayoutConfigSmoke();
runLayoutDebugSmoke();
runPlacementEditorSmoke();
runDeliveryStateSmoke();
runInteractionSmoke();
runPerformanceSmoke();
runEnvironmentSmoke();
runResourceTrackerSmoke();
runModuleSmoke();

console.info('Smoke checks passed.');
