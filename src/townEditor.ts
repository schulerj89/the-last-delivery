import * as THREE from 'three';
import './style.css';
import './townEditor.css';
import { createModelInstance } from './game/assets';
import { getCappedPixelRatio, clampFrameDelta } from './game/performance';
import { createResourceTracker } from './game/resources';
import { createWorldEnvironment } from './world/environment';
import { createPlayground } from './world/playground';
import { createPlacementEditor } from './world/placementEditor';
import { createVillageLayoutDebugView } from './world/layoutDebug';
import {
  getTownEditorAssetPaletteItems,
  getTownEditorGeneratedPaletteItems,
  getTownEditorMarkerPaletteItems,
  resolveTownEditorPlacementCandidate,
  type TownEditorPaletteItem,
} from './world/townEditorCatalog';

const root = document.querySelector<HTMLDivElement>('#town-editor');

if (!root) {
  throw new Error('Missing town editor root.');
}

root.className = 'town-editor town-editor--loading';
root.innerHTML = `
  <div class="town-editor-loading" role="status" aria-live="polite" aria-busy="true">
    <div class="town-editor-loading__panel">
      <p class="town-editor-loading__eyebrow">Town Editor</p>
      <h1>Preparing builder</h1>
      <div class="town-editor-loading__bar" aria-hidden="true">
        <span></span>
      </div>
      <p class="town-editor-loading__detail">Loading editor assets...</p>
    </div>
  </div>
  <aside class="town-editor__palette" aria-label="Town editor asset palette">
    <div class="town-editor__header">
      <h1>Town Editor</h1>
      <p>Drag an asset square into the world. Save or export from the right panel.</p>
    </div>
    <input class="town-editor__search" type="search" placeholder="Filter assets" aria-label="Filter assets" />
    <div class="town-editor__section">
      <h2>Generated Ground</h2>
      <div class="town-editor__grid" data-palette-section="generated"></div>
    </div>
    <div class="town-editor__section">
      <h2>World Markers</h2>
      <div class="town-editor__grid" data-palette-section="marker"></div>
    </div>
    <div class="town-editor__section">
      <h2>Runtime Assets</h2>
      <div class="town-editor__grid" data-palette-section="asset"></div>
    </div>
  </aside>
  <main class="town-editor__stage">
    <div class="town-editor__toolbar">
      <span>Drop assets on grass</span>
      <span>F1 help</span>
      <span>V view</span>
      <span>Wheel zoom</span>
      <span>Right-drag orbit</span>
      <span>Middle-drag pan</span>
      <span>Ctrl+D duplicate</span>
      <span>Click empty deselect</span>
      <span>Delete selected</span>
    </div>
    <div class="town-editor__viewport"></div>
    <div class="town-editor__status" role="status">Ready.</div>
  </main>
`;

const viewport = root.querySelector<HTMLDivElement>('.town-editor__viewport');
const generatedGrid = root.querySelector<HTMLDivElement>('[data-palette-section="generated"]');
const markerGrid = root.querySelector<HTMLDivElement>('[data-palette-section="marker"]');
const assetGrid = root.querySelector<HTMLDivElement>('[data-palette-section="asset"]');
const searchInput = root.querySelector<HTMLInputElement>('.town-editor__search');
const statusText = root.querySelector<HTMLDivElement>('.town-editor__status');
const loadingOverlay = root.querySelector<HTMLDivElement>('.town-editor-loading');
const loadingDetail = root.querySelector<HTMLParagraphElement>('.town-editor-loading__detail');
const loadingBar = root.querySelector<HTMLSpanElement>('.town-editor-loading__bar span');

if (!viewport || !generatedGrid || !markerGrid || !assetGrid || !searchInput || !statusText || !loadingOverlay || !loadingDetail || !loadingBar) {
  throw new Error('Missing town editor UI element.');
}

const scene = new THREE.Scene();
const resources = createResourceTracker();
const environment = createWorldEnvironment(scene);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.shadowMap.enabled = true;
viewport.append(renderer.domElement);

const playground = resources.trackObject3D(createPlayground({ renderAuthoredWorldObjects: false }));
scene.add(playground);

const layoutDebugView = createVillageLayoutDebugView(viewport.clientWidth, viewport.clientHeight, {
  domElement: renderer.domElement,
});
layoutDebugView.setCameraMode('close');
layoutDebugView.setActive(true);

const placementEditor = createPlacementEditor({
  sceneRoot: playground,
  camera: layoutDebugView.getCamera,
  domElement: renderer.domElement,
  parent: root,
  isLayoutModeActive: layoutDebugView.isActive,
  draftPersistenceEnabled: import.meta.env.DEV,
  hudVariant: 'builder',
});
placementEditor.setActive(true);
scene.add(placementEditor.object);

const thumbnailSize = 144;
const thumbnailScene = new THREE.Scene();
const thumbnailCamera = new THREE.OrthographicCamera(-2.25, 2.25, 2.25, -2.25, 0.1, 40);
const thumbnailRenderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
const thumbnailCacheByAssetId = new Map<string, string>();
const thumbnailPromisesByAssetId = new Map<string, Promise<string>>();
thumbnailCamera.position.set(3.2, 2.4, 3.6);
thumbnailCamera.lookAt(0, 0, 0);
thumbnailRenderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
thumbnailRenderer.setSize(thumbnailSize, thumbnailSize, false);
thumbnailRenderer.setClearColor(0x000000, 0);
thumbnailScene.add(
  new THREE.HemisphereLight(0xffffff, 0x26352c, 2.2),
  new THREE.DirectionalLight(0xfff1c4, 2.8),
);
const thumbnailSun = thumbnailScene.children.find((child) => child instanceof THREE.DirectionalLight);

if (thumbnailSun instanceof THREE.DirectionalLight) {
  thumbnailSun.position.set(2.8, 4, 3.2);
}

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dropPoint = new THREE.Vector3();
const placementCountsByItemId = new Map<string, number>();
let animationFrameId: number | null = null;
let disposed = false;

const townEditorLoadingConfig = {
  maxInitialWaitMs: 8000,
  fadeOutMs: 420,
} as const;

const paletteItems = [
  ...getTownEditorGeneratedPaletteItems(),
  ...getTownEditorMarkerPaletteItems(),
  ...getTownEditorAssetPaletteItems(),
];
const paletteItemsByKey = new Map(paletteItems.map((item) => [`${item.type}:${item.id}`, item]));

const setStatus = (message: string): void => {
  statusText.textContent = message;
};

const setLoadingState = (message: string, progress: number): void => {
  const safeProgress = THREE.MathUtils.clamp(progress, 0, 1);
  loadingDetail.textContent = message;
  loadingBar.style.transform = `scaleX(${safeProgress})`;
};

const finishLoadingScreen = (): void => {
  if (disposed) {
    return;
  }

  setLoadingState('Ready.', 1);
  root.classList.remove('town-editor--loading');
  root.classList.add('town-editor--ready');
  loadingOverlay.setAttribute('aria-busy', 'false');
  window.setTimeout(() => {
    if (!disposed) {
      loadingOverlay.hidden = true;
    }
  }, townEditorLoadingConfig.fadeOutMs);
};

const waitForLoadingTimeout = (): Promise<'timeout'> => (
  new Promise((resolve) => {
    window.setTimeout(() => resolve('timeout'), townEditorLoadingConfig.maxInitialWaitMs);
  })
);

const getPaletteDragPayload = (item: TownEditorPaletteItem): string => (
  JSON.stringify({ type: item.type, id: item.id })
);

const sanitizeObjectIdPart = (value: string): string => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'object'
);

const getNextGeneratedObjectId = (
  item: TownEditorPaletteItem,
  placementCount: number,
): { objectId: string; nextCount: number } => {
  const existingObjectIds = new Set(placementEditor.getEditableObjects().map((object) => object.id));
  let nextCount = Math.max(0, placementCount);
  let objectId = '';

  do {
    nextCount += 1;
    objectId = `editor-${sanitizeObjectIdPart(item.id)}-${nextCount}`;
  } while (existingObjectIds.has(objectId));

  return { objectId, nextCount };
};

const getAssetThumbnailDataUrl = (assetId: string): Promise<string> => {
  const cachedThumbnail = thumbnailCacheByAssetId.get(assetId);

  if (cachedThumbnail) {
    return Promise.resolve(cachedThumbnail);
  }

  const pendingThumbnail = thumbnailPromisesByAssetId.get(assetId);

  if (pendingThumbnail) {
    return pendingThumbnail;
  }

  const thumbnailPromise = createModelInstance(assetId)
    .then((instance) => {
      const group = new THREE.Group();
      group.add(instance.object);
      thumbnailScene.add(group);

      try {
        instance.object.position.set(0, 0, 0);
        instance.object.rotation.set(0, 0, 0);
        instance.object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(instance.object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);

        if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
          throw new Error(`Cannot thumbnail zero-sized asset: ${assetId}`);
        }

        instance.object.position.sub(center);
        group.scale.setScalar(2.55 / maxDimension);
        group.rotation.y = -Math.PI / 5;
        group.rotation.x = THREE.MathUtils.degToRad(4);
        group.updateMatrixWorld(true);
        thumbnailRenderer.render(thumbnailScene, thumbnailCamera);

        const dataUrl = thumbnailRenderer.domElement.toDataURL('image/png');
        thumbnailCacheByAssetId.set(assetId, dataUrl);
        return dataUrl;
      } finally {
        thumbnailScene.remove(group);
        instance.dispose();
      }
    })
    .finally(() => {
      thumbnailPromisesByAssetId.delete(assetId);
    });

  thumbnailPromisesByAssetId.set(assetId, thumbnailPromise);
  return thumbnailPromise;
};

const applyAssetThumbnail = (
  item: TownEditorPaletteItem,
  image: HTMLImageElement,
  fallback: HTMLElement,
): void => {
  if (item.type !== 'asset') {
    return;
  }

  const cachedThumbnail = thumbnailCacheByAssetId.get(item.id);

  if (cachedThumbnail) {
    image.src = cachedThumbnail;
    image.hidden = false;
    fallback.hidden = true;
    return;
  }

  void getAssetThumbnailDataUrl(item.id)
    .then((dataUrl) => {
      if (disposed || !image.isConnected) {
        return;
      }

      image.src = dataUrl;
      image.hidden = false;
      fallback.hidden = true;
    })
    .catch((error: unknown) => {
      if (!disposed && image.isConnected) {
        fallback.title = `Preview unavailable: ${error instanceof Error ? error.message : String(error)}`;
      }
    });
};

const createPaletteCard = (item: TownEditorPaletteItem): HTMLButtonElement => {
  const card = document.createElement('button');
  const preview = document.createElement('span');
  const previewImage = document.createElement('img');
  const previewFallback = document.createElement('span');
  const label = document.createElement('span');
  const detail = document.createElement('span');
  const source = document.createElement('span');

  card.type = 'button';
  card.className = `town-editor-card town-editor-card--${item.type}`;
  card.draggable = item.placeable;
  card.disabled = !item.placeable;
  card.dataset.paletteKey = `${item.type}:${item.id}`;
  preview.className = `town-editor-card__preview town-editor-card__preview--${item.type}`;
  previewImage.className = 'town-editor-card__image';
  previewImage.alt = '';
  previewImage.draggable = false;
  previewImage.hidden = true;
  previewFallback.className = 'town-editor-card__fallback';
  previewFallback.textContent = item.label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  preview.append(previewImage, previewFallback);
  label.className = 'town-editor-card__label';
  label.textContent = item.label;
  detail.className = 'town-editor-card__detail';
  detail.textContent = item.detail;
  source.className = 'town-editor-card__source';
  source.textContent = item.source;
  card.append(preview, label, detail, source);

  applyAssetThumbnail(item, previewImage, previewFallback);

  card.addEventListener('dragstart', (event) => {
    if (!item.placeable || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-town-editor-item', getPaletteDragPayload(item));
    event.dataTransfer.setData('text/plain', item.id);
    setStatus(`Dragging ${item.label}. Drop it on the grass.`);
  });

  card.addEventListener('click', () => {
    setStatus(item.placeable
      ? `Drag ${item.label} into the world.`
      : `${item.label} needs an editable template before it can be placed.`);
  });

  return card;
};

const renderPalette = (): void => {
  const filter = searchInput.value.trim().toLowerCase();
  generatedGrid.replaceChildren();
  assetGrid.replaceChildren();

  paletteItems.forEach((item) => {
    const haystack = `${item.id} ${item.label} ${item.detail} ${item.source}`.toLowerCase();

    if (filter && !haystack.includes(filter)) {
      return;
    }

    const card = createPaletteCard(item);
    const target = item.type === 'generated'
      ? generatedGrid
      : item.type === 'marker'
        ? markerGrid
        : assetGrid;
    target.append(card);
  });
};

const waitForInitialThumbnails = async (): Promise<void> => {
  const assetPreviewItems = paletteItems.filter((item) => item.type === 'asset');

  if (assetPreviewItems.length === 0) {
    setLoadingState('Preparing editor canvas...', 0.82);
    return;
  }

  let completedCount = 0;
  setLoadingState(`Loading asset previews 0/${assetPreviewItems.length}...`, 0.12);

  await Promise.all(assetPreviewItems.map(async (item) => {
    try {
      await getAssetThumbnailDataUrl(item.id);
    } catch {
      // Palette cards keep their text fallback when an optional preview fails.
    } finally {
      completedCount += 1;
      setLoadingState(
        `Loading asset previews ${completedCount}/${assetPreviewItems.length}...`,
        0.12 + (completedCount / assetPreviewItems.length) * 0.76,
      );
    }
  }));
};

const updateDropPointFromEvent = (event: DragEvent): boolean => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, layoutDebugView.getCamera());
  return raycaster.ray.intersectPlane(groundPlane, dropPoint) !== null;
};

const parseDraggedPaletteItem = (event: DragEvent): TownEditorPaletteItem | null => {
  const rawPayload = event.dataTransfer?.getData('application/x-town-editor-item');

  if (!rawPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPayload) as { type?: string; id?: string };
    return paletteItemsByKey.get(`${parsed.type}:${parsed.id}`) ?? null;
  } catch {
    return null;
  }
};

const placePaletteItem = (item: TownEditorPaletteItem): void => {
  const placementCount = placementCountsByItemId.get(item.id) ?? 0;
  const templateId = resolveTownEditorPlacementCandidate(item, placementCount);

  if (!templateId) {
    setStatus(`${item.label} needs an editable template before it can be placed.`);
    return;
  }

  const { objectId, nextCount } = getNextGeneratedObjectId(item, placementCount);
  const placed = placementEditor.createObjectFromTemplate(
    templateId,
    objectId,
    [dropPoint.x, 0, dropPoint.z],
    item.type === 'asset'
      ? { assetId: item.id, select: true }
      : { select: true },
  );

  if (!placed) {
    setStatus(`Could not place ${item.label}.`);
    return;
  }

  placementCountsByItemId.set(item.id, nextCount);
  setStatus(`Placed ${item.label} as ${objectId}. Save/export from the right panel.`);
};

const handleDragOver = (event: DragEvent): void => {
  if (!event.dataTransfer || !updateDropPointFromEvent(event)) {
    return;
  }

  event.dataTransfer.dropEffect = 'copy';
  event.preventDefault();
};

const handleDrop = (event: DragEvent): void => {
  const item = parseDraggedPaletteItem(event);

  if (!item || !updateDropPointFromEvent(event)) {
    setStatus('Drop ignored.');
    return;
  }

  event.preventDefault();
  placePaletteItem(item);
};

const resize = (): void => {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
  renderer.setSize(width, height);
  layoutDebugView.resize(width, height);
};

const handleKeyDown = (event: KeyboardEvent): void => {
  if (layoutDebugView.handleKeyDown(event)) {
    return;
  }

  placementEditor.handleKeyDown(event);
};

const handleKeyUp = (event: KeyboardEvent): void => {
  placementEditor.handleKeyUp(event);
};

const animate = (): void => {
  if (disposed) {
    return;
  }

  const deltaSeconds = clampFrameDelta(clock.getDelta());
  placementEditor.update(deltaSeconds);
  renderer.render(scene, layoutDebugView.getCamera());
  animationFrameId = window.requestAnimationFrame(animate);
};

const dispose = (): void => {
  if (disposed) {
    return;
  }

  disposed = true;

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  renderer.domElement.removeEventListener('dragover', handleDragOver);
  renderer.domElement.removeEventListener('drop', handleDrop);
  searchInput.removeEventListener('input', renderPalette);
  placementEditor.dispose();
  layoutDebugView.dispose();
  environment.dispose();
  resources.dispose();
  thumbnailRenderer.dispose();
  renderer.dispose();
  renderer.domElement.remove();
};

searchInput.addEventListener('input', renderPalette);
renderer.domElement.addEventListener('dragover', handleDragOver);
renderer.domElement.addEventListener('drop', handleDrop);
window.addEventListener('resize', resize);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

const bootTownEditor = async (): Promise<void> => {
  setLoadingState('Building editor canvas...', 0.04);
  renderPalette();
  resize();
  animate();

  const initialThumbnailLoad = waitForInitialThumbnails().then(() => 'loaded' as const);
  const loadingResult = await Promise.race([
    initialThumbnailLoad,
    waitForLoadingTimeout(),
  ]);

  if (loadingResult === 'timeout') {
    setStatus('Editor opened while some previews continue loading.');
  }

  setLoadingState('Drawing editor view...', 0.96);

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

  finishLoadingScreen();
};

void bootTownEditor();

import.meta.hot?.dispose(dispose);
