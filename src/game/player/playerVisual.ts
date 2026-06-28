import * as THREE from 'three';
import {
  canLoadGltfAssets,
  createModelInstance,
  getAssetDefinition,
  loadGltfAssetEntry,
  type AssetInstanceHandle,
} from '../assets';

export const playerCharacterAssetId = 'creative-courier-character';
export const playerCharacterAnimationAssetId = 'creative-courier-character-animations';

export type PlayerVisualMode = 'fallback' | 'loading' | 'loaded' | 'error';
export type PlayerMeshFilterMode = 'configured' | 'all';
export type PlayerMotionAnimationState = 'idle' | 'walk' | 'run';

export const playerCharacterVisualSettings = {
  assetId: playerCharacterAssetId,
  animationAssetId: playerCharacterAnimationAssetId,
  scale: 1,
  rotationY: Math.PI,
  offset: [0, 0, 0] as THREE.Vector3Tuple,
  targetHeightFromCollisionRadius: 4.2,
  preferredIdleAnimationNames: [
    'Idle_Relaxed',
    'Idle_Breathing',
    'Idle_Look_Around',
  ],
  preferredWalkAnimationNames: [
    'Walk_Forward',
  ],
  preferredRunAnimationNames: [
    'Run_Forward',
  ],
  idleSpeedThreshold: 0.08,
  runSpeedThreshold: 2.2,
  animationFadeDuration: 0.18,
  walkAnimationTimeScale: 1,
  runAnimationTimeScale: 1.05,
  lockHipPositionXZ: true,
  visibleMeshNames: [
    'Body_010',
    'Male_emotion_usual_001',
    'Hairstyle_male_010',
    'Hat_049',
    'Outerwear_036',
    'Pants_010',
    'Shoe_Sneakers_009',
    'Gloves_006',
  ],
} as const;

export interface PlayerVisualStatus {
  mode: PlayerVisualMode;
  assetId: string;
  assetUrl: string;
  animationAssetId: string;
  animationAssetUrl: string;
  errorMessage?: string;
  totalMeshCount: number;
  visibleMeshCount: number;
  animationNames: readonly string[];
  activeAnimationState: PlayerMotionAnimationState;
  activeAnimationName?: string;
  boundingBoxSize: THREE.Vector3Tuple;
  boundingBoxMin: THREE.Vector3Tuple;
  boundingBoxMax: THREE.Vector3Tuple;
  currentScale: THREE.Vector3Tuple;
  currentRotation: THREE.Vector3Tuple;
  currentOffset: THREE.Vector3Tuple;
  characterRootPosition: THREE.Vector3Tuple;
  characterRootScale: THREE.Vector3Tuple;
  characterRootRotation: THREE.Vector3Tuple;
  fallbackVisible: boolean;
}

export interface CharacterAlignmentResult {
  validBounds: boolean;
  boundingBoxSize: THREE.Vector3Tuple;
  boundingBoxMin: THREE.Vector3Tuple;
  boundingBoxMax: THREE.Vector3Tuple;
  appliedScale: number;
  appliedOffset: THREE.Vector3Tuple;
}

export interface MeshVisibilityResult {
  visibleMeshNames: readonly string[];
  totalMeshCount: number;
  visibleMeshCount: number;
  usedFallbackAll: boolean;
}

export interface PlayerVisual {
  object: THREE.Group;
  fallback: THREE.Group;
  update(deltaSeconds: number, movementSpeed?: number): void;
  getStatus(): PlayerVisualStatus;
  forceFallbackVisual(): void;
  forceCharacterVisual(): void;
  showAllCharacterMeshes(): void;
  showConfiguredCharacterMeshes(): void;
  dispose(): void;
}

interface PlayerVisualOptions {
  collisionRadius?: number;
  debugEnabled?: boolean;
}

type PlayerVisualDisplayMode = 'auto' | 'force-fallback' | 'force-character';

const motionAnimationStates = ['idle', 'walk', 'run'] as const;
const fallbackCollisionRadius = 0.38;
const emptyTuple: THREE.Vector3Tuple = [0, 0, 0];
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.55 });
const facingMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5f8f, roughness: 0.55 });

const getMotionAnimationTimeScale = (state: PlayerMotionAnimationState): number => {
  if (state === 'run') {
    return playerCharacterVisualSettings.runAnimationTimeScale;
  }

  if (state === 'walk') {
    return playerCharacterVisualSettings.walkAnimationTimeScale;
  }

  return 1;
};

export const createPlayerFallbackVisual = (): THREE.Group => {
  const player = new THREE.Group();
  player.name = 'player:placeholder';
  player.userData.label = 'player:placeholder';

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.9, 12),
    playerMaterial,
  );
  body.name = 'player:placeholder-body';
  body.userData.label = body.name;
  body.position.y = 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);

  const facingMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.5),
    facingMaterial,
  );
  facingMarker.name = 'player:facing-marker';
  facingMarker.userData.label = facingMarker.name;
  facingMarker.position.set(0, 0.55, -0.38);
  facingMarker.castShadow = true;
  player.add(facingMarker);

  return player;
};

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

const getAnimationNames = (model: THREE.Object3D): readonly string[] => (
  Array.isArray(model.userData.animationNames) ? model.userData.animationNames : []
);

const toVector3Tuple = (vector: THREE.Vector3): THREE.Vector3Tuple => [vector.x, vector.y, vector.z];

const toEulerTuple = (euler: THREE.Euler): THREE.Vector3Tuple => [euler.x, euler.y, euler.z];

const collectCharacterMeshes = (model: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = [];

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  return meshes;
};

const getClipName = (clip: THREE.AnimationClip, index: number): string => (
  clip.name || `animation-${index + 1}`
);

export const selectPlayerIdleAnimationClip = (
  clips: readonly THREE.AnimationClip[],
  preferredNames: readonly string[] = playerCharacterVisualSettings.preferredIdleAnimationNames,
): THREE.AnimationClip | null => {
  if (clips.length === 0) {
    return null;
  }

  const normalizedPreferredNames = preferredNames.map((name) => name.toLowerCase());
  const exactPreferredClip = clips.find((clip, index) => (
    normalizedPreferredNames.includes(getClipName(clip, index).toLowerCase())
  ));

  if (exactPreferredClip) {
    return exactPreferredClip;
  }

  const idleClip = clips.find((clip, index) => getClipName(clip, index).toLowerCase().includes('idle'));
  if (idleClip) {
    return idleClip;
  }

  return clips.find((clip, index) => getClipName(clip, index).toLowerCase() !== 'a-pose') ?? clips[0] ?? null;
};

const selectPreferredAnimationClip = (
  clips: readonly THREE.AnimationClip[],
  preferredNames: readonly string[],
): THREE.AnimationClip | null => {
  const normalizedPreferredNames = preferredNames.map((name) => name.toLowerCase());

  return clips.find((clip, index) => (
    normalizedPreferredNames.includes(getClipName(clip, index).toLowerCase())
  )) ?? null;
};

export const selectPlayerMotionAnimationClip = (
  clips: readonly THREE.AnimationClip[],
  state: PlayerMotionAnimationState,
): THREE.AnimationClip | null => {
  if (state === 'idle') {
    return selectPlayerIdleAnimationClip(clips);
  }

  const preferredNames = state === 'run'
    ? playerCharacterVisualSettings.preferredRunAnimationNames
    : playerCharacterVisualSettings.preferredWalkAnimationNames;
  const preferredClip = selectPreferredAnimationClip(clips, preferredNames);

  if (preferredClip) {
    return preferredClip;
  }

  const stateName = state.toLowerCase();
  return clips.find((clip, index) => getClipName(clip, index).toLowerCase().includes(stateName)) ?? null;
};

export const getPlayerMotionAnimationState = (movementSpeed: number): PlayerMotionAnimationState => {
  if (!Number.isFinite(movementSpeed) || movementSpeed < playerCharacterVisualSettings.idleSpeedThreshold) {
    return 'idle';
  }

  return movementSpeed >= playerCharacterVisualSettings.runSpeedThreshold ? 'run' : 'walk';
};

export const isPlayerRootMotionTrackName = (trackName: string): boolean => (
  trackName === 'Root.position'
  || trackName.endsWith('/Root.position')
  || trackName.endsWith('.Root.position')
  || trackName.includes('bones[Root].position')
);

export const isPlayerHipPositionTrackName = (trackName: string): boolean => (
  trackName === 'Hips.position'
  || trackName.endsWith('/Hips.position')
  || trackName.endsWith('.Hips.position')
  || trackName.includes('bones[Hips].position')
);

export interface PlayerAnimationClipSanitizeOptions {
  stripRootMotion?: boolean;
  lockHipPositionXZ?: boolean;
}

const lockVectorTrackXZ = (track: THREE.KeyframeTrack): THREE.KeyframeTrack => {
  const clone = track.clone();

  if (clone.getValueSize() !== 3) {
    return clone;
  }

  const values = clone.values as ArrayLike<number> & { [index: number]: number };
  const baseX = values[0] ?? 0;
  const baseZ = values[2] ?? 0;

  for (let index = 0; index < values.length; index += 3) {
    values[index] = baseX;
    values[index + 2] = baseZ;
  }

  return clone;
};

export const createInPlacePlayerAnimationClip = (
  clip: THREE.AnimationClip,
  options: PlayerAnimationClipSanitizeOptions = {},
): THREE.AnimationClip => {
  const stripRootMotion = options.stripRootMotion ?? true;
  const lockHipPositionXZ = options.lockHipPositionXZ ?? playerCharacterVisualSettings.lockHipPositionXZ;
  const tracks = clip.tracks.flatMap((track) => {
    if (stripRootMotion && isPlayerRootMotionTrackName(track.name)) {
      return [];
    }

    if (lockHipPositionXZ && isPlayerHipPositionTrackName(track.name)) {
      return [lockVectorTrackXZ(track)];
    }

    return [track.clone()];
  });
  const inPlaceClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  inPlaceClip.blendMode = clip.blendMode;
  return inPlaceClip;
};

export const resolveVisibleCharacterMeshNames = (
  availableMeshNames: readonly string[],
  configuredVisibleMeshNames: readonly string[] = playerCharacterVisualSettings.visibleMeshNames,
  filterMode: PlayerMeshFilterMode = 'configured',
): MeshVisibilityResult => {
  const uniqueAvailableNames = [...new Set(availableMeshNames)];

  if (filterMode === 'all' || configuredVisibleMeshNames.length === 0) {
    return {
      visibleMeshNames: uniqueAvailableNames,
      totalMeshCount: availableMeshNames.length,
      visibleMeshCount: availableMeshNames.length,
      usedFallbackAll: false,
    };
  }

  const configuredNameSet = new Set(configuredVisibleMeshNames);
  const visibleMeshNames = uniqueAvailableNames.filter((name) => configuredNameSet.has(name));
  const visibleMeshNameSet = new Set(visibleMeshNames);
  const visibleMeshCount = availableMeshNames.filter((name) => visibleMeshNameSet.has(name)).length;

  if (availableMeshNames.length > 0 && visibleMeshCount === 0) {
    return {
      visibleMeshNames: uniqueAvailableNames,
      totalMeshCount: availableMeshNames.length,
      visibleMeshCount: availableMeshNames.length,
      usedFallbackAll: true,
    };
  }

  return {
    visibleMeshNames,
    totalMeshCount: availableMeshNames.length,
    visibleMeshCount,
    usedFallbackAll: false,
  };
};

const getSafeObjectBounds = (object: THREE.Object3D): THREE.Box3 | null => {
  object.updateWorldMatrix(true, true);

  const bounds = new THREE.Box3().setFromObject(object);

  if (
    !Number.isFinite(bounds.min.x)
    || !Number.isFinite(bounds.min.y)
    || !Number.isFinite(bounds.min.z)
    || !Number.isFinite(bounds.max.x)
    || !Number.isFinite(bounds.max.y)
    || !Number.isFinite(bounds.max.z)
    || bounds.isEmpty()
  ) {
    return null;
  }

  return bounds;
};

const createAlignmentResult = (
  model: THREE.Object3D,
  validBounds: boolean,
  appliedScale: number,
): CharacterAlignmentResult => {
  const bounds = getSafeObjectBounds(model);
  const size = bounds?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();

  return {
    validBounds,
    boundingBoxSize: toVector3Tuple(size),
    boundingBoxMin: bounds ? toVector3Tuple(bounds.min) : [...emptyTuple],
    boundingBoxMax: bounds ? toVector3Tuple(bounds.max) : [...emptyTuple],
    appliedScale,
    appliedOffset: toVector3Tuple(model.position),
  };
};

export const fitAndAlignCharacterModel = (
  model: THREE.Object3D,
  collisionRadius = fallbackCollisionRadius,
): CharacterAlignmentResult => {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.setScalar(1);

  const sourceBounds = getSafeObjectBounds(model);

  if (!sourceBounds) {
    model.rotation.y = playerCharacterVisualSettings.rotationY;
    model.scale.setScalar(playerCharacterVisualSettings.scale);
    model.position.set(...playerCharacterVisualSettings.offset);
    return createAlignmentResult(model, false, playerCharacterVisualSettings.scale);
  }

  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const targetHeight = Math.max(
    collisionRadius * playerCharacterVisualSettings.targetHeightFromCollisionRadius,
    0.1,
  );
  const fitScale = sourceSize.y > 0.0001 ? targetHeight / sourceSize.y : 1;
  const appliedScale = fitScale * playerCharacterVisualSettings.scale;

  model.scale.setScalar(appliedScale);
  model.rotation.y = playerCharacterVisualSettings.rotationY;
  model.position.set(0, 0, 0);

  const scaledBounds = getSafeObjectBounds(model);

  if (!scaledBounds) {
    model.position.set(...playerCharacterVisualSettings.offset);
    return createAlignmentResult(model, false, appliedScale);
  }

  const center = scaledBounds.getCenter(new THREE.Vector3());
  model.position.set(
    playerCharacterVisualSettings.offset[0] - center.x,
    playerCharacterVisualSettings.offset[1] - scaledBounds.min.y,
    playerCharacterVisualSettings.offset[2] - center.z,
  );

  return createAlignmentResult(model, true, appliedScale);
};

const createStatus = (
  mode: PlayerVisualMode,
  fallbackVisible: boolean,
  errorMessage?: string,
): PlayerVisualStatus => {
  const asset = getAssetDefinition(playerCharacterVisualSettings.assetId);
  const animationAsset = getAssetDefinition(playerCharacterVisualSettings.animationAssetId);

  return {
    mode,
    assetId: playerCharacterVisualSettings.assetId,
    assetUrl: asset?.url ?? '',
    animationAssetId: playerCharacterVisualSettings.animationAssetId,
    animationAssetUrl: animationAsset?.url ?? '',
    errorMessage,
    totalMeshCount: 0,
    visibleMeshCount: 0,
    animationNames: [],
    activeAnimationState: 'idle',
    activeAnimationName: undefined,
    boundingBoxSize: [...emptyTuple],
    boundingBoxMin: [...emptyTuple],
    boundingBoxMax: [...emptyTuple],
    currentScale: [playerCharacterVisualSettings.scale, playerCharacterVisualSettings.scale, playerCharacterVisualSettings.scale],
    currentRotation: [0, playerCharacterVisualSettings.rotationY, 0],
    currentOffset: [...playerCharacterVisualSettings.offset],
    characterRootPosition: [...emptyTuple],
    characterRootScale: [1, 1, 1],
    characterRootRotation: [...emptyTuple],
    fallbackVisible,
  };
};

export const createPlayerVisual = (
  log: Pick<Console, 'info' | 'warn'> = console,
  options: PlayerVisualOptions = {},
): PlayerVisual => {
  const object = new THREE.Group();
  object.name = 'player';
  object.userData.label = 'player';

  const fallback = createPlayerFallbackVisual();
  object.add(fallback);

  let characterInstance: AssetInstanceHandle | null = null;
  let characterObject: THREE.Object3D | null = null;
  let disposed = false;
  let loadMode: PlayerVisualMode = canLoadGltfAssets() ? 'loading' : 'fallback';
  let displayMode: PlayerVisualDisplayMode = 'auto';
  let meshFilterMode: PlayerMeshFilterMode = 'configured';
  let errorMessage: string | undefined;
  let alignmentResult: CharacterAlignmentResult | null = null;
  let meshFilterWarningShown = false;
  let availableMeshNamesLogged = false;
  let animationMixer: THREE.AnimationMixer | null = null;
  let activeAnimationAction: THREE.AnimationAction | null = null;
  let animationActions = new Map<PlayerMotionAnimationState, THREE.AnimationAction>();
  let animationNames: readonly string[] = [];
  let activeAnimationState: PlayerMotionAnimationState = 'idle';
  let activeAnimationName: string | undefined;
  let status = createStatus(loadMode, true);

  const stopCharacterAnimation = (): void => {
    animationActions.forEach((action) => action.stop());

    if (animationMixer && characterObject) {
      animationMixer.uncacheRoot(characterObject);
    }

    animationMixer = null;
    activeAnimationAction = null;
    animationActions = new Map<PlayerMotionAnimationState, THREE.AnimationAction>();
    activeAnimationState = 'idle';
    activeAnimationName = undefined;
  };

  const getFallbackMotionState = (
    state: PlayerMotionAnimationState,
  ): PlayerMotionAnimationState | null => {
    if (animationActions.has(state)) {
      return state;
    }

    if (state === 'run' && animationActions.has('walk')) {
      return 'walk';
    }

    if (state === 'walk' && animationActions.has('run')) {
      return 'run';
    }

    return animationActions.has('idle') ? 'idle' : null;
  };

  const playCharacterAnimationState = (
    state: PlayerMotionAnimationState,
    immediate = false,
  ): void => {
    const fallbackState = getFallbackMotionState(state);

    if (!fallbackState) {
      activeAnimationState = state;
      activeAnimationName = undefined;
      return;
    }

    const nextAction = animationActions.get(fallbackState);
    if (!nextAction) {
      return;
    }

    if (activeAnimationAction === nextAction) {
      activeAnimationState = state;
      activeAnimationName = nextAction.getClip().name || fallbackState;
      return;
    }

    nextAction.enabled = true;
    nextAction.reset();
    nextAction.setEffectiveTimeScale(getMotionAnimationTimeScale(fallbackState));
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (activeAnimationAction && !immediate) {
      activeAnimationAction.crossFadeTo(nextAction, playerCharacterVisualSettings.animationFadeDuration, false);
    } else {
      activeAnimationAction?.stop();
    }

    activeAnimationAction = nextAction;
    activeAnimationState = state;
    activeAnimationName = nextAction.getClip().name || fallbackState;
    refreshStatus();
  };

  const configureCharacterAnimations = (clips: readonly THREE.AnimationClip[]): void => {
    if (!characterObject || clips.length === 0) {
      activeAnimationName = undefined;
      return;
    }

    stopCharacterAnimation();
    animationMixer = new THREE.AnimationMixer(characterObject);
    motionAnimationStates.forEach((state) => {
      const clip = selectPlayerMotionAnimationClip(clips, state);

      if (!clip || !animationMixer) {
        return;
      }

      const action = animationMixer.clipAction(createInPlacePlayerAnimationClip(clip));
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      animationActions.set(state, action);
    });

    if (animationActions.size === 0) {
      activeAnimationName = undefined;
      return;
    }

    log.info(`[player] Character motion animations ready: ${[...animationActions.keys()].join(', ')}.`);
    playCharacterAnimationState('idle', true);
  };

  const loadCharacterAnimations = (): void => {
    void loadGltfAssetEntry(playerCharacterVisualSettings.animationAssetId)
      .then((entry) => {
        if (disposed || !characterObject) {
          return;
        }

        animationNames = entry.animationNames;
        if (animationNames.length > 0) {
          log.info(`[player] Character animation source ${entry.asset.id}: ${animationNames.join(', ')}.`);
        } else {
          log.warn(`[player] Character animation source ${entry.asset.id} has no animation clips.`);
        }

        configureCharacterAnimations(entry.animations);
        refreshStatus();
      })
      .catch((error: unknown) => {
        if (!disposed) {
          log.warn(`[player] Character animations unavailable; keeping static visual. ${getErrorMessage(error)}`);
          refreshStatus();
        }
      });
  };

  const refreshStatus = (): void => {
    const fallbackVisible = fallback.visible;
    const mode: PlayerVisualMode = displayMode === 'force-fallback'
      ? 'fallback'
      : loadMode;
    const nextStatus = createStatus(mode, fallbackVisible, errorMessage);

    if (characterObject) {
      const meshes = collectCharacterMeshes(characterObject);
      const bounds = getSafeObjectBounds(characterObject);
      const size = bounds?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();

      nextStatus.totalMeshCount = meshes.length;
      nextStatus.visibleMeshCount = meshes.filter((mesh) => mesh.visible).length;
      nextStatus.animationNames = animationNames.length > 0
        ? animationNames
        : getAnimationNames(characterObject);
      nextStatus.activeAnimationState = activeAnimationState;
      nextStatus.activeAnimationName = activeAnimationName;
      nextStatus.boundingBoxSize = bounds ? toVector3Tuple(size) : alignmentResult?.boundingBoxSize ?? [...emptyTuple];
      nextStatus.boundingBoxMin = bounds ? toVector3Tuple(bounds.min) : alignmentResult?.boundingBoxMin ?? [...emptyTuple];
      nextStatus.boundingBoxMax = bounds ? toVector3Tuple(bounds.max) : alignmentResult?.boundingBoxMax ?? [...emptyTuple];
      nextStatus.currentScale = toVector3Tuple(characterObject.scale);
      nextStatus.currentRotation = toEulerTuple(characterObject.rotation);
      nextStatus.currentOffset = toVector3Tuple(characterObject.position);
      nextStatus.characterRootPosition = toVector3Tuple(characterObject.position);
      nextStatus.characterRootScale = toVector3Tuple(characterObject.scale);
      nextStatus.characterRootRotation = toEulerTuple(characterObject.rotation);
    }

    status = nextStatus;
  };

  const applyDisplayMode = (): void => {
    const hasCharacter = characterObject !== null && loadMode === 'loaded';
    const showCharacter = hasCharacter && displayMode !== 'force-fallback';

    if (characterObject) {
      characterObject.visible = showCharacter;
    }

    fallback.visible = !showCharacter;
    refreshStatus();
  };

  const applyMeshVisibility = (): void => {
    if (!characterObject) {
      refreshStatus();
      return;
    }

    const meshes = collectCharacterMeshes(characterObject);
    const availableMeshNames = meshes.map((mesh) => mesh.name);
    const visibility = resolveVisibleCharacterMeshNames(
      availableMeshNames,
      playerCharacterVisualSettings.visibleMeshNames,
      meshFilterMode,
    );
    const visibleNameSet = new Set(visibility.visibleMeshNames);

    if (options.debugEnabled && !availableMeshNamesLogged) {
      availableMeshNamesLogged = true;
      log.info(`[player] Character mesh names: ${availableMeshNames.join(', ') || 'none'}.`);
    }

    if (visibility.usedFallbackAll && !meshFilterWarningShown) {
      meshFilterWarningShown = true;
      log.warn('[player] Character mesh filter hid every mesh; showing all character meshes.');
    }

    meshes.forEach((mesh) => {
      mesh.visible = meshFilterMode === 'all'
        || visibility.usedFallbackAll
        || visibleNameSet.has(mesh.name);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.label = mesh.name || 'player:character-mesh';
    });

    refreshStatus();
  };

  const configureCharacterModel = (model: THREE.Object3D): void => {
    model.name = 'player:character-model';
    model.userData.label = model.name;
    model.traverse((child) => {
      child.userData.label = child.name || model.name;
    });

    alignmentResult = fitAndAlignCharacterModel(model, options.collisionRadius ?? fallbackCollisionRadius);
    applyMeshVisibility();
  };

  if (canLoadGltfAssets()) {
    void createModelInstance(playerCharacterVisualSettings.assetId)
      .then((instance) => {
        if (disposed) {
          instance.dispose();
          return;
        }

        characterInstance = instance;
        characterObject = instance.object;
        configureCharacterModel(instance.object);
        object.add(instance.object);
        loadMode = 'loaded';
        errorMessage = undefined;

        animationNames = instance.animationNames.length > 0
          ? instance.animationNames
          : getAnimationNames(instance.object);
        if (animationNames.length > 0) {
          log.info(`[player] Character visual asset animations available: ${animationNames.join(', ')}.`);
          configureCharacterAnimations(instance.animations);
        }

        applyDisplayMode();
        loadCharacterAnimations();
      })
      .catch((error: unknown) => {
        if (!disposed) {
          loadMode = 'error';
          errorMessage = getErrorMessage(error);
          fallback.visible = true;
          refreshStatus();
          log.warn(`[player] Character model unavailable; keeping primitive fallback. ${errorMessage}`);
        }
      });
  } else {
    refreshStatus();
  }

  return {
    object,
    fallback,
    update(deltaSeconds, movementSpeed = 0) {
      if (animationMixer) {
        playCharacterAnimationState(getPlayerMotionAnimationState(movementSpeed));
      }

      animationMixer?.update(deltaSeconds);
    },
    getStatus() {
      refreshStatus();
      return {
        ...status,
        animationNames: [...status.animationNames],
        boundingBoxSize: [...status.boundingBoxSize],
        boundingBoxMin: [...status.boundingBoxMin],
        boundingBoxMax: [...status.boundingBoxMax],
        currentScale: [...status.currentScale],
        currentRotation: [...status.currentRotation],
        currentOffset: [...status.currentOffset],
        characterRootPosition: [...status.characterRootPosition],
        characterRootScale: [...status.characterRootScale],
        characterRootRotation: [...status.characterRootRotation],
      };
    },
    forceFallbackVisual() {
      displayMode = 'force-fallback';
      applyDisplayMode();
    },
    forceCharacterVisual() {
      displayMode = 'force-character';
      applyDisplayMode();
    },
    showAllCharacterMeshes() {
      meshFilterMode = 'all';
      applyMeshVisibility();
    },
    showConfiguredCharacterMeshes() {
      meshFilterMode = 'configured';
      applyMeshVisibility();
    },
    dispose() {
      disposed = true;
      stopCharacterAnimation();
      characterInstance?.dispose();
      characterInstance = null;
      characterObject = null;
    },
  };
};
