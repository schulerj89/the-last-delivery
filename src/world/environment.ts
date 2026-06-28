import * as THREE from 'three';

export const environmentPresetNames = ['morning', 'goldenHour', 'overcast'] as const;
export type EnvironmentPresetName = (typeof environmentPresetNames)[number];

export interface EnvironmentConfig {
  presetName: EnvironmentPresetName;
  skyTopColor: number;
  skyHorizonColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  sunDirection: THREE.Vector3Tuple;
  sunColor: number;
  sunIntensity: number;
  hemisphereSkyColor: number;
  hemisphereGroundColor: number;
  hemisphereIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  skyRadius: number;
}

export interface WorldEnvironment {
  object: THREE.Group;
  presetName: EnvironmentPresetName;
  config: EnvironmentConfig;
  dispose(): void;
}

export const defaultEnvironmentPresetName: EnvironmentPresetName = 'goldenHour';

export const environmentPresets: Record<EnvironmentPresetName, EnvironmentConfig> = {
  morning: {
    presetName: 'morning',
    skyTopColor: 0x8fc8ff,
    skyHorizonColor: 0xffdfaf,
    fogColor: 0xf4d6a9,
    fogNear: 24,
    fogFar: 70,
    sunDirection: [-0.45, 0.72, 0.38],
    sunColor: 0xffd89a,
    sunIntensity: 2.4,
    hemisphereSkyColor: 0xc8e5ff,
    hemisphereGroundColor: 0x6a7252,
    hemisphereIntensity: 1.45,
    ambientColor: 0xffefd5,
    ambientIntensity: 0.34,
    skyRadius: 90,
  },
  goldenHour: {
    presetName: 'goldenHour',
    skyTopColor: 0x7fb4ff,
    skyHorizonColor: 0xffc77a,
    fogColor: 0xffd1a1,
    fogNear: 22,
    fogFar: 64,
    sunDirection: [-0.52, 0.62, 0.32],
    sunColor: 0xffc36f,
    sunIntensity: 2.75,
    hemisphereSkyColor: 0xcfe7ff,
    hemisphereGroundColor: 0x6d7250,
    hemisphereIntensity: 1.55,
    ambientColor: 0xffedd2,
    ambientIntensity: 0.38,
    skyRadius: 90,
  },
  overcast: {
    presetName: 'overcast',
    skyTopColor: 0xaebdca,
    skyHorizonColor: 0xd6d5c5,
    fogColor: 0xd0d1c4,
    fogNear: 18,
    fogFar: 58,
    sunDirection: [-0.25, 0.85, 0.22],
    sunColor: 0xfff2d4,
    sunIntensity: 1.65,
    hemisphereSkyColor: 0xd5dde6,
    hemisphereGroundColor: 0x777c67,
    hemisphereIntensity: 1.8,
    ambientColor: 0xf2f0df,
    ambientIntensity: 0.5,
    skyRadius: 90,
  },
};

export const getEnvironmentPreset = (
  presetName: EnvironmentPresetName = defaultEnvironmentPresetName,
): EnvironmentConfig => environmentPresets[presetName];

export const isEnvironmentPresetName = (value: string): value is EnvironmentPresetName => (
  environmentPresetNames.includes(value as EnvironmentPresetName)
);

export const isValidEnvironmentConfig = (config: EnvironmentConfig): boolean => (
  isEnvironmentPresetName(config.presetName)
  && Number.isFinite(config.fogNear)
  && Number.isFinite(config.fogFar)
  && config.fogNear >= 0
  && config.fogFar > config.fogNear
  && config.sunDirection.length === 3
  && config.sunDirection.every((component) => Number.isFinite(component))
  && config.sunIntensity > 0
  && config.hemisphereIntensity > 0
  && config.skyRadius > 0
);

const createGradientSkyDome = (config: EnvironmentConfig): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(config.skyRadius, 32, 16);
  const material = new THREE.ShaderMaterial({
    name: 'environment:gradient-sky-material',
    uniforms: {
      topColor: { value: new THREE.Color(config.skyTopColor) },
      horizonColor: { value: new THREE.Color(config.skyHorizonColor) },
    },
    vertexShader: `
      varying vec3 vLocalPosition;

      void main() {
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vLocalPosition;

      void main() {
        float height = normalize(vLocalPosition).y * 0.5 + 0.5;
        float blend = smoothstep(0.0, 1.0, pow(height, 0.72));
        gl_FragColor = vec4(mix(horizonColor, topColor, blend), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'environment:gradient-skydome';
  sky.renderOrder = -100;
  return sky;
};

const createSunLight = (config: EnvironmentConfig): THREE.DirectionalLight => {
  const sun = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
  const direction = new THREE.Vector3(...config.sunDirection);

  if (direction.lengthSq() === 0) {
    direction.set(-0.5, 0.7, 0.3);
  }

  direction.normalize();
  sun.name = 'environment:sun';
  sun.position.copy(direction.multiplyScalar(22));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.target.name = 'environment:sun-target';
  sun.target.position.set(0, 0, 0);
  return sun;
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

export const createWorldEnvironment = (
  scene: THREE.Scene,
  presetName: EnvironmentPresetName = defaultEnvironmentPresetName,
): WorldEnvironment => {
  const config = getEnvironmentPreset(presetName);
  const previousBackground = scene.background;
  const previousFog = scene.fog;
  const root = new THREE.Group();
  const sky = createGradientSkyDome(config);
  const sun = createSunLight(config);
  const hemisphere = new THREE.HemisphereLight(
    config.hemisphereSkyColor,
    config.hemisphereGroundColor,
    config.hemisphereIntensity,
  );
  const ambient = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
  let disposed = false;

  root.name = `environment:${config.presetName}`;
  hemisphere.name = 'environment:hemisphere';
  ambient.name = 'environment:ambient';
  root.add(sky, sun, sun.target, hemisphere, ambient);

  scene.background = new THREE.Color(config.skyHorizonColor);
  scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
  scene.add(root);

  return {
    object: root,
    presetName: config.presetName,
    config,
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      root.parent?.remove(root);
      disposeObjectResources(root);
      scene.background = previousBackground;
      scene.fog = previousFog;
    },
  };
};
