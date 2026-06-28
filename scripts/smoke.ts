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
  assetRegistry,
  createAssetCache,
  getSelectedCharacterAssets,
  getSelectedFantasyAssets,
  getSelectedNatureAssets,
  isKnownAssetId,
  selectedCharacterAssetIds,
  selectedFantasyAssetIds,
  selectedNatureAssetIds,
} from '../src/game/assets';
import { thirdPersonCameraSettings } from '../src/game/camera';
import { resolvePlayerCollision } from '../src/game/collision';
import { createDeliveryController, deliveryJobs } from '../src/game/delivery';
import {
  createPlayerFallbackVisual,
  createPlayerVisual,
  playerCharacterAssetId,
  playerCharacterVisualSettings,
  playerMovementSettings,
} from '../src/game/player';
import {
  clampFrameDelta,
  createPerformanceMonitor,
  createPerformanceSnapshot,
  getCappedPixelRatio,
  performanceBudgetConfig,
} from '../src/game/performance';
import { createResourceTracker } from '../src/game/resources';
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
import { createMailboxProp } from '../src/world/props/createMailbox';
import { villageWorldObjects } from '../src/world/villageDefinition';

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
    }

    if (object.render?.mode === 'asset') {
      assert(isKnownAssetId(object.render.assetId), `World object assetId should reference a known asset: ${object.id}`);
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
  assert(treeObjects.length >= 6, 'Village should include a small forest edge of tree props.');
  assert(bushObjects.length >= 4, 'Village should include foliage props around paths and boundaries.');
  assert(cottageObjects.every((object) => object.render?.mode === 'asset'), 'Every cottage should use a selected fantasy house render with primitive fallback.');
  assert(signpostObjects.length >= 4, 'Village should define fantasy pointer signpost props.');
  assert(cartObjects.length === 1, 'Village should define one fantasy cart dressing prop.');
  assert(cartObjects.every((object) => object.collider), 'Large cart dressing should keep a simple collider.');
  assert(sackObjects.length >= 2, 'Village should define fantasy sack dressing props.');
  assert(sackObjects.every((object) => object.collider === undefined), 'Small sack dressing should stay non-collidable.');
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
  assert(boardToPostOfficeDistanceSq < 8, 'Delivery board should stay near the post office placeholder.');
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
  assert(playerVisual.object.getObjectByName('player:placeholder-body') !== undefined, 'Player visual should contain primitive fallback geometry.');
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
  assert(playground.getObjectByName('village:sack-post-office-a') !== undefined, 'Fantasy sack primitive fallback should initialize.');
  assert(playground.getObjectByName('village:tree-northwest:trunk') !== undefined, 'Tree primitive fallback should initialize.');
  assert(playground.getObjectByName('village:tree-northwest:canopy') !== undefined, 'Tree canopy primitive fallback should initialize.');
  assert(playground.getObjectByName('village:bush-side-path-a') !== undefined, 'Bush primitive fallback should initialize.');
  assert(playground.getObjectByName('village:nature-rock-path-a') !== undefined, 'Asset-targeted nature rock fallback should initialize.');
  assert(playground.getObjectByName('village:label-post-office') !== undefined, 'Post office label sign should initialize.');
  assert(playground.getObjectByName('village:label-blue-house') !== undefined, 'Blue house label sign should initialize.');
  assert(playground.getObjectByName('village:label-red-house') !== undefined, 'Red house label sign should initialize.');
  assert(playground.getObjectByName('village:label-side-path') !== undefined, 'Side path label sign should initialize.');

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
runWorldDefinitionSmoke();
runDeliveryStateSmoke();
runInteractionSmoke();
runPerformanceSmoke();
runResourceTrackerSmoke();
runModuleSmoke();

console.info('Smoke checks passed.');
