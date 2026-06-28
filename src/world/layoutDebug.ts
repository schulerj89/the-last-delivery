import * as THREE from 'three';
import type { PerformanceSnapshot } from '../game/performance';
import { createPlaygroundCollisionWorld } from './playgroundCollision';
import type { WorldObjectDefinition } from './types';
import { villageLayoutConfig } from './villageLayoutConfig';
import { playerSpawnPosition, villageWorldObjects } from './villageDefinition';
import { getVillagePathGuides } from './villagePaths';
import { getWorldObjectGameplay, getWorldObjectMailbox } from './worldObjectGameplay';

export const layoutDebugConfig = {
  toggleKey: 'F2',
  cameraModeKey: 'v',
  cameraHeight: 42,
  cameraNear: 0.1,
  cameraFar: 120,
  overviewMinZoom: 0.75,
  overviewMaxZoom: 4,
  overviewZoomSensitivity: 0.0015,
  closeCameraFov: 58,
  closeCameraInitialYaw: THREE.MathUtils.degToRad(42),
  closeCameraInitialPitch: THREE.MathUtils.degToRad(34),
  closeCameraMinPitch: THREE.MathUtils.degToRad(10),
  closeCameraMaxPitch: THREE.MathUtils.degToRad(72),
  closeCameraInitialDistance: 18,
  closeCameraMinDistance: 3,
  closeCameraMaxDistance: 42,
  closeCameraOrbitSensitivity: 0.006,
  closeCameraZoomSensitivity: 0.018,
  closeCameraPanSensitivity: 0.0016,
  viewPadding: 3,
  helperY: 0.08,
  importantObjectIds: [
    'player-spawn',
    'post-office',
    'delivery-board',
    'town-well',
    'cottage-west',
    'cottage-east',
    'cottage-north',
    'mailbox',
    'mailbox-east',
    'mailbox-post-office-return',
  ],
} as const;

export const layoutDebugCameraModes = ['overview', 'close'] as const;
export type LayoutDebugCameraMode = (typeof layoutDebugCameraModes)[number];
export type ImportantLayoutObjectId = (typeof layoutDebugConfig.importantObjectIds)[number];

export const isLayoutDebugCameraMode = (value: unknown): value is LayoutDebugCameraMode => (
  typeof value === 'string' && layoutDebugCameraModes.includes(value as LayoutDebugCameraMode)
);

export const getNextLayoutDebugCameraMode = (
  mode: LayoutDebugCameraMode,
): LayoutDebugCameraMode => (mode === 'overview' ? 'close' : 'overview');

export const clampLayoutOverviewZoom = (zoom: number): number => (
  THREE.MathUtils.clamp(
    Number.isFinite(zoom) ? zoom : 1,
    layoutDebugConfig.overviewMinZoom,
    layoutDebugConfig.overviewMaxZoom,
  )
);

export const clampLayoutCloseCameraDistance = (distance: number): number => (
  THREE.MathUtils.clamp(
    Number.isFinite(distance) ? distance : layoutDebugConfig.closeCameraInitialDistance,
    layoutDebugConfig.closeCameraMinDistance,
    layoutDebugConfig.closeCameraMaxDistance,
  )
);

export interface VillageLayoutDebugView {
  object: THREE.Group;
  camera: THREE.OrthographicCamera;
  closeCamera: THREE.PerspectiveCamera;
  isActive(): boolean;
  setActive(active: boolean): void;
  toggle(): boolean;
  getCamera(): THREE.Camera;
  getCameraMode(): LayoutDebugCameraMode;
  setCameraMode(mode: LayoutDebugCameraMode): void;
  toggleCameraMode(): LayoutDebugCameraMode;
  handleKeyDown(event: KeyboardEvent): boolean;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface VillageLayoutDebugViewOptions {
  domElement?: HTMLElement;
}

export interface VillageLayoutDebugHud {
  update(active: boolean, snapshot: PerformanceSnapshot): void;
  dispose(): void;
}

const colors = {
  bounds: 0xf0ca72,
  zone: 0x7cf2cf,
  label: '#f8f2dc',
  labelBackground: '#16191f',
  interactable: 0x58f0ff,
  collider: 0xff6b5f,
  objectiveAnchor: 0xffe45c,
  mainPath: 0xf0ca72,
  sidePath: 0x6f958e,
  spawn: 0xffffff,
};

const authoredLayoutCollisionWorld = createPlaygroundCollisionWorld(true);

const formatCountLabel = (id: string): string => (
  id
    .split('-')
    .map((part) => part.slice(0, 4))
    .join('')
);

export const getLayoutObjectCountsByKind = (): Record<string, number> => (
  villageWorldObjects.reduce<Record<string, number>>((counts, object) => {
    counts[object.kind] = (counts[object.kind] ?? 0) + 1;
    return counts;
  }, {})
);

export const getImportantLayoutObjects = (): readonly WorldObjectDefinition[] => (
  Array.from(layoutDebugConfig.importantObjectIds.reduce<Map<string, WorldObjectDefinition>>((objectsById, objectId) => {
    const object = villageWorldObjects.find((worldObject) => worldObject.id === objectId);

    if (object) {
      objectsById.set(object.id, object);
    }

    return objectsById;
  }, new Map()).values())
    .concat(villageWorldObjects.filter((worldObject) => {
      if (layoutDebugConfig.importantObjectIds.includes(worldObject.id as ImportantLayoutObjectId)) {
        return false;
      }

      const role = getWorldObjectGameplay(worldObject).role;
      return role === 'player-spawn'
        || role === 'post-office'
        || role === 'delivery-board'
        || role === 'mailbox';
    }))
);

const createLineMaterial = (color: number): THREE.LineBasicMaterial => (
  new THREE.LineBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.92,
  })
);

const createCirclePoints = (
  centerX: number,
  centerZ: number,
  radius: number,
  y: number = layoutDebugConfig.helperY,
  segments = 64,
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      centerX + Math.cos(angle) * radius,
      y,
      centerZ + Math.sin(angle) * radius,
    ));
  }

  return points;
};

const createLineLoop = (
  name: string,
  points: readonly THREE.Vector3[],
  color: number,
): THREE.LineLoop => {
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([...points]),
    createLineMaterial(color),
  );
  line.name = name;
  line.userData.label = name;
  line.renderOrder = 30;
  return line;
};

const createLineSegments = (
  name: string,
  points: readonly THREE.Vector3[],
  color: number,
): THREE.LineSegments => {
  const line = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([...points]),
    createLineMaterial(color),
  );
  line.name = name;
  line.userData.label = name;
  line.renderOrder = 30;
  return line;
};

const createBoundsOutline = (): THREE.LineLoop => {
  const { bounds } = villageLayoutConfig;

  return createLineLoop(
    'layout:bounds',
    [
      new THREE.Vector3(bounds.minX, layoutDebugConfig.helperY, bounds.minZ),
      new THREE.Vector3(bounds.maxX, layoutDebugConfig.helperY, bounds.minZ),
      new THREE.Vector3(bounds.maxX, layoutDebugConfig.helperY, bounds.maxZ),
      new THREE.Vector3(bounds.minX, layoutDebugConfig.helperY, bounds.maxZ),
    ],
    colors.bounds,
  );
};

const createZoneOutlines = (): THREE.Object3D[] => (
  villageLayoutConfig.zones.map((zone) => (
    createLineLoop(
      `layout:zone:${zone.id}`,
      createCirclePoints(zone.center[0], zone.center[2], zone.radius, layoutDebugConfig.helperY + 0.01),
      colors.zone,
    )
  ))
);

const createPathLaneOutline = (path: ReturnType<typeof getVillagePathGuides>[number]): THREE.LineLoop => {
  const start = new THREE.Vector2(path.start[0], path.start[2]);
  const end = new THREE.Vector2(path.end[0], path.end[2]);
  const delta = new THREE.Vector2().subVectors(end, start);
  const normal = new THREE.Vector2(-delta.y, delta.x).normalize().multiplyScalar(path.width / 2);
  const y = layoutDebugConfig.helperY + 0.02;

  return createLineLoop(
    `layout:path:${path.id}`,
    [
      new THREE.Vector3(start.x + normal.x, y, start.y + normal.y),
      new THREE.Vector3(end.x + normal.x, y, end.y + normal.y),
      new THREE.Vector3(end.x - normal.x, y, end.y - normal.y),
      new THREE.Vector3(start.x - normal.x, y, start.y - normal.y),
    ],
    path.kind === 'main' ? colors.mainPath : colors.sidePath,
  );
};

const createInteractableRadiusOutlines = (): THREE.Object3D[] => (
  villageWorldObjects
    .filter((object) => object.interactable)
    .map((object) => {
      const interactable = object.interactable;

      if (!interactable) {
        throw new Error(`Missing interactable for layout helper: ${object.id}`);
      }

      return createLineLoop(
        `layout:interactable:${object.id}`,
        createCirclePoints(
          interactable.position[0],
          interactable.position[2],
          interactable.radius,
          layoutDebugConfig.helperY + 0.03,
          40,
        ),
        colors.interactable,
      );
    })
);

const createColliderOutlines = (): THREE.Object3D[] => (
  authoredLayoutCollisionWorld.boxes.map((box) => {
    const halfX = box.size.x / 2;
    const halfZ = box.size.z / 2;
    const y = layoutDebugConfig.helperY + 0.04;

    return createLineLoop(
      `layout:collider:${box.id}`,
      [
        new THREE.Vector3(box.center.x - halfX, y, box.center.z - halfZ),
        new THREE.Vector3(box.center.x + halfX, y, box.center.z - halfZ),
        new THREE.Vector3(box.center.x + halfX, y, box.center.z + halfZ),
        new THREE.Vector3(box.center.x - halfX, y, box.center.z + halfZ),
      ],
      colors.collider,
    );
  })
);

const createObjectiveAnchorHelpers = (): THREE.Object3D[] => (
  villageWorldObjects
    .filter((object) => object.objectiveAnchor)
    .map((object) => {
      const anchor = object.objectiveAnchor;

      if (!anchor) {
        throw new Error(`Missing objective anchor for layout helper: ${object.id}`);
      }

      const x = anchor.position[0];
      const z = anchor.position[2];
      const y = layoutDebugConfig.helperY + 0.05;

      return createLineSegments(
        `layout:objective-anchor:${object.id}`,
        [
          new THREE.Vector3(x - 0.36, y, z),
          new THREE.Vector3(x + 0.36, y, z),
          new THREE.Vector3(x, y, z - 0.36),
          new THREE.Vector3(x, y, z + 0.36),
        ],
        colors.objectiveAnchor,
      );
    })
);

const createLabelMaterial = (text: string, accentColor = colors.label): THREE.Material => {
  if (typeof document === 'undefined') {
    return new THREE.MeshBasicMaterial({ color: 0xf8f2dc, side: THREE.DoubleSide });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.MeshBasicMaterial({ color: 0xf8f2dc, side: THREE.DoubleSide });
  }

  context.fillStyle = colors.labelBackground;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accentColor;
  context.lineWidth = 8;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = accentColor;
  context.font = '700 42px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
};

const createGroundLabel = (
  name: string,
  text: string,
  position: THREE.Vector3Tuple,
  color = colors.label,
): THREE.Mesh => {
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.62),
    createLabelMaterial(text, color),
  );
  label.name = name;
  label.userData.label = name;
  label.position.set(position[0], layoutDebugConfig.helperY + 0.09, position[2]);
  label.rotation.x = -Math.PI / 2;
  label.renderOrder = 40;
  return label;
};

const getObjectLabelText = (object: WorldObjectDefinition): string => {
  const mailbox = getWorldObjectMailbox(object);
  const gameplay = getWorldObjectGameplay(object);

  if (mailbox) {
    return mailbox.destinationName.replace(' Mailbox', '');
  }

  if (gameplay.role === 'player-spawn') {
    return 'Spawn';
  }

  if (gameplay.role === 'delivery-board' || object.id === 'delivery-board') {
    return 'Board';
  }

  if (object.id === 'town-well') {
    return 'Well';
  }

  if (gameplay.role === 'post-office' || object.id === 'post-office') {
    return 'Post Office';
  }

  return object.id.replace('cottage-', '');
};

const createObjectLabels = (): THREE.Object3D[] => (
  getImportantLayoutObjects().map((object) => (
    createGroundLabel(
      object.id === 'player-spawn' ? 'layout:label:spawn' : `layout:label:${object.id}`,
      getObjectLabelText(object),
      object.interactable?.position ?? (object.id === 'player-spawn' ? playerSpawnPosition : object.position),
      getWorldObjectGameplay(object).role === 'mailbox' ? '#58f0ff' : colors.label,
    )
  ))
);

const configureOverviewCamera = (
  camera: THREE.OrthographicCamera,
  width: number,
  height: number,
  zoom = 1,
): void => {
  const { bounds } = villageLayoutConfig;
  const aspect = Math.max(width / Math.max(1, height), 0.1);
  const targetWidth = bounds.maxX - bounds.minX + layoutDebugConfig.viewPadding * 2;
  const targetHeight = bounds.maxZ - bounds.minZ + layoutDebugConfig.viewPadding * 2;
  const safeZoom = clampLayoutOverviewZoom(zoom);
  const viewWidth = Math.max(targetWidth, targetHeight * aspect) / safeZoom;
  const viewHeight = viewWidth / aspect;
  const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
  const centerZ = bounds.minZ + (bounds.maxZ - bounds.minZ) / 2;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(centerX, layoutDebugConfig.cameraHeight, centerZ);
  camera.up.set(0, 0, -1);
  camera.lookAt(centerX, 0, centerZ);
  camera.updateProjectionMatrix();
};

const configureCloseCamera = (
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): void => {
  camera.aspect = Math.max(width / Math.max(1, height), 0.1);
  camera.updateProjectionMatrix();
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

export const createVillageLayoutDebugView = (
  width = 1280,
  height = 720,
  options: VillageLayoutDebugViewOptions = {},
): VillageLayoutDebugView => {
  const group = new THREE.Group();
  const overviewCamera = new THREE.OrthographicCamera(
    -10,
    10,
    10,
    -10,
    layoutDebugConfig.cameraNear,
    layoutDebugConfig.cameraFar,
  );
  const closeCamera = new THREE.PerspectiveCamera(
    layoutDebugConfig.closeCameraFov,
    Math.max(width / Math.max(1, height), 0.1),
    layoutDebugConfig.cameraNear,
    layoutDebugConfig.cameraFar,
  );
  const closeTarget = new THREE.Vector3(...villageLayoutConfig.keyPositions.centralGreenWell);
  const closePanRight = new THREE.Vector3();
  const closePanForward = new THREE.Vector3();
  let cameraMode: LayoutDebugCameraMode = 'overview';
  let overviewZoom: number = 1;
  let closeYaw: number = layoutDebugConfig.closeCameraInitialYaw;
  let closePitch: number = layoutDebugConfig.closeCameraInitialPitch;
  let closeDistance: number = layoutDebugConfig.closeCameraInitialDistance;
  let currentWidth: number = width;
  let currentHeight: number = height;
  let active = false;
  let disposed = false;
  let pointerDrag: { pointerId: number; mode: 'orbit' | 'pan' } | null = null;

  group.name = 'layout-debug:view';
  group.visible = false;
  group.add(createBoundsOutline());
  createZoneOutlines().forEach((helper) => group.add(helper));
  getVillagePathGuides().map(createPathLaneOutline).forEach((helper) => group.add(helper));
  createInteractableRadiusOutlines().forEach((helper) => group.add(helper));
  createColliderOutlines().forEach((helper) => group.add(helper));
  createObjectiveAnchorHelpers().forEach((helper) => group.add(helper));
  createObjectLabels().forEach((helper) => group.add(helper));
  configureOverviewCamera(overviewCamera, width, height, overviewZoom);
  configureCloseCamera(closeCamera, width, height);

  const updateCloseCamera = (): void => {
    closePitch = THREE.MathUtils.clamp(
      closePitch,
      layoutDebugConfig.closeCameraMinPitch,
      layoutDebugConfig.closeCameraMaxPitch,
    );
    closeDistance = clampLayoutCloseCameraDistance(closeDistance);

    const horizontalDistance = Math.cos(closePitch) * closeDistance;
    closeCamera.position.set(
      closeTarget.x + Math.sin(closeYaw) * horizontalDistance,
      closeTarget.y + Math.sin(closePitch) * closeDistance,
      closeTarget.z + Math.cos(closeYaw) * horizontalDistance,
    );
    closeCamera.lookAt(closeTarget);
    closeCamera.updateMatrixWorld();
  };

  const updateOverviewCamera = (): void => {
    overviewZoom = clampLayoutOverviewZoom(overviewZoom);
    configureOverviewCamera(overviewCamera, currentWidth, currentHeight, overviewZoom);
  };

  const stopPointerDrag = (event?: PointerEvent): void => {
    if (!pointerDrag) {
      return;
    }

    if (event && typeof options.domElement?.releasePointerCapture === 'function') {
      try {
        options.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    }

    pointerDrag = null;
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!active || cameraMode !== 'close' || (event.button !== 1 && event.button !== 2)) {
      return;
    }

    pointerDrag = {
      pointerId: event.pointerId,
      mode: event.button === 2 ? 'orbit' : 'pan',
    };

    if (typeof options.domElement?.setPointerCapture === 'function') {
      options.domElement.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!active || cameraMode !== 'close' || !pointerDrag || pointerDrag.pointerId !== event.pointerId) {
      return;
    }

    if (pointerDrag.mode === 'orbit') {
      closeYaw -= event.movementX * layoutDebugConfig.closeCameraOrbitSensitivity;
      closePitch -= event.movementY * layoutDebugConfig.closeCameraOrbitSensitivity;
    } else {
      const panScale = closeDistance * layoutDebugConfig.closeCameraPanSensitivity;
      closePanRight.set(Math.cos(closeYaw), 0, -Math.sin(closeYaw));
      closePanForward.set(Math.sin(closeYaw), 0, Math.cos(closeYaw));
      closeTarget
        .addScaledVector(closePanRight, -event.movementX * panScale)
        .addScaledVector(closePanForward, event.movementY * panScale);
    }

    updateCloseCamera();
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) {
      return;
    }

    stopPointerDrag(event);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleWheel = (event: WheelEvent): void => {
    if (!active) {
      return;
    }

    if (cameraMode === 'close') {
      closeDistance = clampLayoutCloseCameraDistance(
        closeDistance + event.deltaY * layoutDebugConfig.closeCameraZoomSensitivity,
      );
      updateCloseCamera();
    } else {
      overviewZoom = clampLayoutOverviewZoom(
        overviewZoom - event.deltaY * layoutDebugConfig.overviewZoomSensitivity,
      );
      updateOverviewCamera();
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleContextMenu = (event: MouseEvent): void => {
    if (!active || cameraMode !== 'close') {
      return;
    }

    event.preventDefault();
  };

  options.domElement?.addEventListener('pointerdown', handlePointerDown);
  options.domElement?.addEventListener('pointermove', handlePointerMove);
  options.domElement?.addEventListener('pointerup', handlePointerUp);
  options.domElement?.addEventListener('pointercancel', handlePointerUp);
  options.domElement?.addEventListener('wheel', handleWheel, { passive: false });
  options.domElement?.addEventListener('contextmenu', handleContextMenu);
  updateCloseCamera();

  return {
    object: group,
    camera: overviewCamera,
    closeCamera,
    isActive() {
      return active;
    },
    setActive(nextActive) {
      active = nextActive;
      group.visible = active;
    },
    toggle() {
      active = !active;
      group.visible = active;
      return active;
    },
    getCamera() {
      return cameraMode === 'close' ? closeCamera : overviewCamera;
    },
    getCameraMode() {
      return cameraMode;
    },
    setCameraMode(mode) {
      cameraMode = mode;
      stopPointerDrag();
      if (cameraMode === 'close') {
        updateCloseCamera();
      } else {
        updateOverviewCamera();
      }
    },
    toggleCameraMode() {
      cameraMode = getNextLayoutDebugCameraMode(cameraMode);
      stopPointerDrag();
      if (cameraMode === 'close') {
        updateCloseCamera();
      } else {
        updateOverviewCamera();
      }
      return cameraMode;
    },
    handleKeyDown(event) {
      if (!active || event.key.toLowerCase() !== layoutDebugConfig.cameraModeKey) {
        return false;
      }

      this.toggleCameraMode();
      event.preventDefault();
      return true;
    },
    resize(nextWidth, nextHeight) {
      currentWidth = nextWidth;
      currentHeight = nextHeight;
      updateOverviewCamera();
      configureCloseCamera(closeCamera, nextWidth, nextHeight);
      updateCloseCamera();
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      stopPointerDrag();
      options.domElement?.removeEventListener('pointerdown', handlePointerDown);
      options.domElement?.removeEventListener('pointermove', handlePointerMove);
      options.domElement?.removeEventListener('pointerup', handlePointerUp);
      options.domElement?.removeEventListener('pointercancel', handlePointerUp);
      options.domElement?.removeEventListener('wheel', handleWheel);
      options.domElement?.removeEventListener('contextmenu', handleContextMenu);
      group.parent?.remove(group);
      disposeObjectResources(group);
    },
  };
};

export const createVillageLayoutDebugHud = (parent: HTMLElement): VillageLayoutDebugHud => {
  const overlay = document.createElement('div');
  overlay.className = 'layout-debug-hud';
  overlay.dataset.debugOverlay = 'layout';
  parent.append(overlay);

  const objectCounts = getLayoutObjectCountsByKind();
  const objectCountText = Object.entries(objectCounts)
    .map(([kind, count]) => `${formatCountLabel(kind)}:${count}`)
    .join(' ');

  return {
    update(active, snapshot) {
      overlay.hidden = !active;

      if (!active) {
        return;
      }

      overlay.textContent = [
        `Layout F2: ${active ? 'active' : 'inactive'}`,
        `Objects ${objectCountText}`,
        `Calls ${snapshot.renderCalls}  Tri ${snapshot.triangles}`,
      ].join('\n');
    },
    dispose() {
      overlay.remove();
    },
  };
};
