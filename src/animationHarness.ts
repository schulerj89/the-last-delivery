import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './animationHarness.css';
import {
  createModelInstance,
  disposeAssetCache,
  loadGltfAssetEntry,
  type AssetInstanceHandle,
} from './game/assets';
import { getCappedPixelRatio } from './game/performance';
import {
  createInPlacePlayerAnimationClip,
  fitAndAlignCharacterModel,
  isPlayerHipPositionTrackName,
  isPlayerRootMotionTrackName,
  playerCharacterAnimationAssetId,
  playerCharacterAssetId,
  playerCharacterVisualSettings,
  resolveVisibleCharacterMeshNames,
} from './game/player';

interface HarnessState {
  clipName: string;
  playhead: number;
  loopStart: number;
  loopEnd: number;
  playbackSpeed: number;
  playing: boolean;
  stripRootMotion: boolean;
  lockHipXZ: boolean;
  showSkeleton: boolean;
  showAllMeshes: boolean;
}

const root = document.querySelector<HTMLDivElement>('#animation-harness');

if (!root) {
  throw new Error('Missing animation harness root.');
}

const state: HarnessState = {
  clipName: 'Run_Forward',
  playhead: 0,
  loopStart: 0,
  loopEnd: 1,
  playbackSpeed: 1,
  playing: true,
  stripRootMotion: true,
  lockHipXZ: true,
  showSkeleton: false,
  showAllMeshes: false,
};

root.innerHTML = `
  <main class="animation-harness">
    <section class="animation-harness__viewport" data-viewport></section>
    <aside class="animation-harness__panel">
      <h1 class="animation-harness__title">Courier Animation Harness</h1>
      <pre class="animation-harness__status" data-status>Loading courier assets...</pre>

      <fieldset class="animation-harness__group">
        <legend>Clip</legend>
        <div class="animation-harness__row">
          <label for="clip-select">Animation</label>
          <select id="clip-select" data-clip></select>
          <button type="button" data-play>Pause</button>
        </div>
        <div class="animation-harness__row animation-harness__row--two">
          <button type="button" class="secondary" data-step-back>-1 frame</button>
          <button type="button" class="secondary" data-step-forward>+1 frame</button>
        </div>
        <div class="animation-harness__row animation-harness__row--two">
          <button type="button" class="secondary" data-reset>Reset loop</button>
          <button type="button" class="secondary" data-copy>Copy patch note</button>
        </div>
      </fieldset>

      <fieldset class="animation-harness__group">
        <legend>Timeline</legend>
        <div class="animation-harness__row">
          <label for="time-range">Time</label>
          <input id="time-range" type="range" min="0" max="1" step="0.001" data-time />
          <input type="number" min="0" step="0.001" data-time-number />
        </div>
        <div class="animation-harness__row">
          <label for="loop-start">Loop start</label>
          <input id="loop-start" type="range" min="0" max="1" step="0.001" data-start />
          <input type="number" min="0" step="0.001" data-start-number />
        </div>
        <div class="animation-harness__row">
          <label for="loop-end">Loop end</label>
          <input id="loop-end" type="range" min="0" max="1" step="0.001" data-end />
          <input type="number" min="0" step="0.001" data-end-number />
        </div>
        <div class="animation-harness__row">
          <label for="speed-range">Speed</label>
          <input id="speed-range" type="range" min="0.1" max="2" step="0.05" data-speed />
          <input type="number" min="0.1" max="2" step="0.05" data-speed-number />
        </div>
      </fieldset>

      <fieldset class="animation-harness__group">
        <legend>Filters</legend>
        <label class="animation-harness__check"><input type="checkbox" data-strip-root /> Strip Root.position</label>
        <label class="animation-harness__check"><input type="checkbox" data-lock-hip /> Lock Hips X/Z</label>
        <label class="animation-harness__check"><input type="checkbox" data-skeleton /> Show skeleton</label>
        <label class="animation-harness__check"><input type="checkbox" data-all-meshes /> Show all meshes</label>
      </fieldset>

      <fieldset class="animation-harness__group">
        <legend>Patch note</legend>
        <textarea class="animation-harness__patch" data-patch readonly></textarea>
      </fieldset>
    </aside>
  </main>
`;

const viewport = root.querySelector<HTMLElement>('[data-viewport]');
const statusElement = root.querySelector<HTMLElement>('[data-status]');
const clipSelect = root.querySelector<HTMLSelectElement>('[data-clip]');
const playButton = root.querySelector<HTMLButtonElement>('[data-play]');
const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
const copyButton = root.querySelector<HTMLButtonElement>('[data-copy]');
const stepBackButton = root.querySelector<HTMLButtonElement>('[data-step-back]');
const stepForwardButton = root.querySelector<HTMLButtonElement>('[data-step-forward]');
const timeRange = root.querySelector<HTMLInputElement>('[data-time]');
const timeNumber = root.querySelector<HTMLInputElement>('[data-time-number]');
const startRange = root.querySelector<HTMLInputElement>('[data-start]');
const startNumber = root.querySelector<HTMLInputElement>('[data-start-number]');
const endRange = root.querySelector<HTMLInputElement>('[data-end]');
const endNumber = root.querySelector<HTMLInputElement>('[data-end-number]');
const speedRange = root.querySelector<HTMLInputElement>('[data-speed]');
const speedNumber = root.querySelector<HTMLInputElement>('[data-speed-number]');
const stripRootCheckbox = root.querySelector<HTMLInputElement>('[data-strip-root]');
const lockHipCheckbox = root.querySelector<HTMLInputElement>('[data-lock-hip]');
const skeletonCheckbox = root.querySelector<HTMLInputElement>('[data-skeleton]');
const allMeshesCheckbox = root.querySelector<HTMLInputElement>('[data-all-meshes]');
const patchNote = root.querySelector<HTMLTextAreaElement>('[data-patch]');

if (
  !viewport
  || !statusElement
  || !clipSelect
  || !playButton
  || !resetButton
  || !copyButton
  || !stepBackButton
  || !stepForwardButton
  || !timeRange
  || !timeNumber
  || !startRange
  || !startNumber
  || !endRange
  || !endNumber
  || !speedRange
  || !speedNumber
  || !stripRootCheckbox
  || !lockHipCheckbox
  || !skeletonCheckbox
  || !allMeshesCheckbox
  || !patchNote
) {
  throw new Error('Animation harness controls failed to initialize.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151b20);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
camera.position.set(3.2, 2.2, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
renderer.shadowMap.enabled = true;
viewport.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.85, 0);

const hemiLight = new THREE.HemisphereLight(0xf7efd8, 0x33433a, 2.3);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffd08a, 3.2);
sun.position.set(4, 7, 5);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.6, 48),
  new THREE.MeshStandardMaterial({ color: 0x2d3a34, roughness: 0.92 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
scene.add(new THREE.GridHelper(5.2, 12, 0xf0ca72, 0x405047));

let visualHandle: AssetInstanceHandle | null = null;
let characterObject: THREE.Object3D | null = null;
let skeletonHelper: THREE.SkeletonHelper | null = null;
let mixer: THREE.AnimationMixer | null = null;
let action: THREE.AnimationAction | null = null;
let sourceClips: readonly THREE.AnimationClip[] = [];
let sourceClip: THREE.AnimationClip | null = null;
let workingClip: THREE.AnimationClip | null = null;
let animationFrameId: number | null = null;
let lastTimestamp = performance.now();
let disposed = false;

const clamp = (value: number, min: number, max: number): number => (
  Math.min(Math.max(value, min), max)
);

const formatSeconds = (value: number): string => value.toFixed(3);

const createHarnessClip = (clip: THREE.AnimationClip): THREE.AnimationClip => (
  createInPlacePlayerAnimationClip(clip, {
    stripRootMotion: state.stripRootMotion,
    lockHipPositionXZ: state.lockHipXZ,
  })
);

const getClipByName = (clipName: string): THREE.AnimationClip => {
  const clip = sourceClips.find((candidate) => candidate.name === clipName) ?? sourceClips[0];

  if (!clip) {
    throw new Error('No animation clips are available.');
  }

  return clip;
};

const setTimelineControlBounds = (duration: number): void => {
  [timeRange, startRange, endRange].forEach((input) => {
    input.min = '0';
    input.max = String(duration);
    input.step = '0.001';
  });
  [timeNumber, startNumber, endNumber].forEach((input) => {
    input.min = '0';
    input.max = String(duration);
    input.step = '0.001';
  });
};

const setPoseTime = (time: number): void => {
  if (!mixer || !action || !workingClip) {
    return;
  }

  state.playhead = clamp(time, state.loopStart, state.loopEnd);
  action.paused = false;
  mixer.setTime(state.playhead);
  action.paused = true;
};

const ensureLoopWindow = (): void => {
  if (!sourceClip) {
    return;
  }

  const minRange = Math.min(0.05, sourceClip.duration);
  state.loopStart = clamp(state.loopStart, 0, Math.max(0, sourceClip.duration - minRange));
  state.loopEnd = clamp(state.loopEnd, state.loopStart + minRange, sourceClip.duration);
  state.playhead = clamp(state.playhead, state.loopStart, state.loopEnd);
};

const applyMeshVisibility = (): void => {
  if (!characterObject) {
    return;
  }

  const meshes: THREE.Mesh[] = [];
  characterObject.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  const visibility = resolveVisibleCharacterMeshNames(
    meshes.map((mesh) => mesh.name),
    playerCharacterVisualSettings.visibleMeshNames,
    state.showAllMeshes ? 'all' : 'configured',
  );
  const visibleNames = new Set(visibility.visibleMeshNames);

  meshes.forEach((mesh) => {
    mesh.visible = state.showAllMeshes || visibility.usedFallbackAll || visibleNames.has(mesh.name);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
};

const getTrackDelta = (clip: THREE.AnimationClip | null, predicate: (trackName: string) => boolean): THREE.Vector3 | null => {
  const track = clip?.tracks.find((candidate) => predicate(candidate.name));

  if (!track || track.getValueSize() !== 3 || track.values.length < 6) {
    return null;
  }

  const values = track.values;
  const lastIndex = values.length - 3;
  return new THREE.Vector3(
    values[lastIndex] - values[0],
    values[lastIndex + 1] - values[1],
    values[lastIndex + 2] - values[2],
  );
};

const getPatchPayload = (): Record<string, unknown> => ({
  clipName: state.clipName,
  loopStart: Number(state.loopStart.toFixed(3)),
  loopEnd: Number(state.loopEnd.toFixed(3)),
  playbackSpeed: Number(state.playbackSpeed.toFixed(2)),
  stripRootMotion: state.stripRootMotion,
  lockHipXZ: state.lockHipXZ,
});

const updateControls = (): void => {
  if (!sourceClip) {
    return;
  }

  timeRange.value = String(state.playhead);
  timeNumber.value = formatSeconds(state.playhead);
  startRange.value = String(state.loopStart);
  startNumber.value = formatSeconds(state.loopStart);
  endRange.value = String(state.loopEnd);
  endNumber.value = formatSeconds(state.loopEnd);
  speedRange.value = String(state.playbackSpeed);
  speedNumber.value = String(state.playbackSpeed);
  stripRootCheckbox.checked = state.stripRootMotion;
  lockHipCheckbox.checked = state.lockHipXZ;
  skeletonCheckbox.checked = state.showSkeleton;
  allMeshesCheckbox.checked = state.showAllMeshes;
  playButton.textContent = state.playing ? 'Pause' : 'Play';

  const rootDelta = getTrackDelta(sourceClip, isPlayerRootMotionTrackName);
  const hipDelta = getTrackDelta(sourceClip, isPlayerHipPositionTrackName);
  const rootTracks = sourceClip.tracks.filter((track) => isPlayerRootMotionTrackName(track.name));
  const hipTracks = sourceClip.tracks.filter((track) => isPlayerHipPositionTrackName(track.name));
  const renderInfo = renderer.info.render;
  const memoryInfo = renderer.info.memory;

  statusElement.textContent = [
    `Visual asset: ${playerCharacterAssetId}`,
    `Animation asset: ${playerCharacterAnimationAssetId}`,
    `Clip: ${sourceClip.name || '(unnamed)'}`,
    `Duration: ${formatSeconds(sourceClip.duration)}s`,
    `Playhead: ${formatSeconds(state.playhead)}s`,
    `Loop: ${formatSeconds(state.loopStart)}s -> ${formatSeconds(state.loopEnd)}s`,
    `Root.position tracks: ${rootTracks.length}`,
    `Hips.position tracks: ${hipTracks.length}`,
    `Root delta: ${rootDelta ? rootDelta.toArray().map((value) => value.toFixed(3)).join(', ') : 'none'}`,
    `Hips delta: ${hipDelta ? hipDelta.toArray().map((value) => value.toFixed(3)).join(', ') : 'none'}`,
    `Render calls: ${renderInfo.calls}  Triangles: ${renderInfo.triangles}`,
    `GPU objects: G ${memoryInfo.geometries}  T ${memoryInfo.textures}`,
  ].join('\n');

  patchNote.value = JSON.stringify(getPatchPayload(), null, 2);
};

const rebuildAction = (): void => {
  if (!mixer || !sourceClips.length) {
    return;
  }

  mixer.stopAllAction();
  if (workingClip) {
    mixer.uncacheClip(workingClip);
  }

  sourceClip = getClipByName(state.clipName);
  workingClip = createHarnessClip(sourceClip);
  action = mixer.clipAction(workingClip);
  action.setLoop(THREE.LoopOnce, 0);
  action.clampWhenFinished = true;
  action.enabled = true;
  action.setEffectiveWeight(1);
  action.play();
  action.paused = true;

  setTimelineControlBounds(sourceClip.duration);
  state.loopStart = clamp(state.loopStart, 0, sourceClip.duration);
  state.loopEnd = state.loopEnd > state.loopStart
    ? clamp(state.loopEnd, state.loopStart + 0.001, sourceClip.duration)
    : sourceClip.duration;
  ensureLoopWindow();
  setPoseTime(state.playhead);
  updateControls();
};

const loadHarness = async (): Promise<void> => {
  visualHandle = await createModelInstance(playerCharacterAssetId);
  characterObject = visualHandle.object;
  fitAndAlignCharacterModel(characterObject, 0.38);
  scene.add(characterObject);
  applyMeshVisibility();

  skeletonHelper = new THREE.SkeletonHelper(characterObject);
  skeletonHelper.visible = state.showSkeleton;
  scene.add(skeletonHelper);

  mixer = new THREE.AnimationMixer(characterObject);
  const animationEntry = await loadGltfAssetEntry(playerCharacterAnimationAssetId);
  sourceClips = animationEntry.animations;

  clipSelect.replaceChildren(
    ...sourceClips.map((clip) => {
      const option = document.createElement('option');
      option.value = clip.name;
      option.textContent = `${clip.name || '(unnamed)'} (${formatSeconds(clip.duration)}s)`;
      return option;
    }),
  );
  state.clipName = sourceClips.some((clip) => clip.name === state.clipName)
    ? state.clipName
    : sourceClips[0]?.name ?? '';
  clipSelect.value = state.clipName;
  state.loopStart = 0;
  state.loopEnd = getClipByName(state.clipName).duration;
  rebuildAction();
};

const resize = (): void => {
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(getCappedPixelRatio(window.devicePixelRatio));
  renderer.setSize(width, height, false);
};

const stepFrame = (direction: -1 | 1): void => {
  state.playing = false;
  setPoseTime(state.playhead + direction * (1 / 30));
  updateControls();
};

const bindControls = (): void => {
  clipSelect.addEventListener('change', () => {
    state.clipName = clipSelect.value;
    state.playhead = 0;
    state.loopStart = 0;
    state.loopEnd = getClipByName(state.clipName).duration;
    rebuildAction();
  });

  playButton.addEventListener('click', () => {
    state.playing = !state.playing;
    updateControls();
  });

  resetButton.addEventListener('click', () => {
    if (!sourceClip) {
      return;
    }

    state.playhead = 0;
    state.loopStart = 0;
    state.loopEnd = sourceClip.duration;
    rebuildAction();
  });

  copyButton.addEventListener('click', () => {
    const text = JSON.stringify(getPatchPayload(), null, 2);
    patchNote.value = text;
    void navigator.clipboard?.writeText(text);
  });

  stepBackButton.addEventListener('click', () => stepFrame(-1));
  stepForwardButton.addEventListener('click', () => stepFrame(1));

  const syncTimeInput = (input: HTMLInputElement): void => {
    state.playing = false;
    setPoseTime(Number(input.value));
    updateControls();
  };

  timeRange.addEventListener('input', () => syncTimeInput(timeRange));
  timeNumber.addEventListener('change', () => syncTimeInput(timeNumber));

  const syncLoopStart = (input: HTMLInputElement): void => {
    state.loopStart = Number(input.value);
    ensureLoopWindow();
    setPoseTime(state.playhead);
    updateControls();
  };
  const syncLoopEnd = (input: HTMLInputElement): void => {
    state.loopEnd = Number(input.value);
    ensureLoopWindow();
    setPoseTime(state.playhead);
    updateControls();
  };

  startRange.addEventListener('input', () => syncLoopStart(startRange));
  startNumber.addEventListener('change', () => syncLoopStart(startNumber));
  endRange.addEventListener('input', () => syncLoopEnd(endRange));
  endNumber.addEventListener('change', () => syncLoopEnd(endNumber));

  const syncSpeed = (input: HTMLInputElement): void => {
    state.playbackSpeed = clamp(Number(input.value), 0.1, 2);
    updateControls();
  };
  speedRange.addEventListener('input', () => syncSpeed(speedRange));
  speedNumber.addEventListener('change', () => syncSpeed(speedNumber));

  stripRootCheckbox.addEventListener('change', () => {
    state.stripRootMotion = stripRootCheckbox.checked;
    rebuildAction();
  });
  lockHipCheckbox.addEventListener('change', () => {
    state.lockHipXZ = lockHipCheckbox.checked;
    rebuildAction();
  });
  skeletonCheckbox.addEventListener('change', () => {
    state.showSkeleton = skeletonCheckbox.checked;
    if (skeletonHelper) {
      skeletonHelper.visible = state.showSkeleton;
    }
    updateControls();
  });
  allMeshesCheckbox.addEventListener('change', () => {
    state.showAllMeshes = allMeshesCheckbox.checked;
    applyMeshVisibility();
    updateControls();
  });
};

const animate = (timestamp: number): void => {
  if (disposed) {
    return;
  }

  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (state.playing && action && sourceClip) {
    state.playhead += deltaSeconds * state.playbackSpeed;

    if (state.playhead > state.loopEnd) {
      const range = Math.max(state.loopEnd - state.loopStart, 0.001);
      state.playhead = state.loopStart + ((state.playhead - state.loopStart) % range);
    }

    setPoseTime(state.playhead);
  }

  controls.update();
  renderer.render(scene, camera);
  updateControls();
  animationFrameId = window.requestAnimationFrame(animate);
};

const dispose = (): void => {
  disposed = true;

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  window.removeEventListener('resize', resize);
  controls.dispose();
  visualHandle?.dispose();
  skeletonHelper?.parent?.remove(skeletonHelper);
  mixer?.stopAllAction();
  disposeAssetCache();
  renderer.dispose();
  renderer.domElement.remove();
};

bindControls();
window.addEventListener('resize', resize);
resize();

void loadHarness()
  .then(() => {
    lastTimestamp = performance.now();
    animationFrameId = window.requestAnimationFrame(animate);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    viewport.insertAdjacentHTML('beforeend', `<div class="animation-harness__error">${message}</div>`);
    statusElement.textContent = `Failed to load animation harness:\n${message}`;
  });

window.addEventListener('beforeunload', dispose);
import.meta.hot?.dispose(dispose);
