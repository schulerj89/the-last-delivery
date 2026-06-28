import * as THREE from 'three';

export const assetFitModes = ['none', 'contain', 'cover', 'exact'] as const;
export type AssetFitMode = (typeof assetFitModes)[number];
export const assetVerticalAlignments = ['ground', 'center'] as const;
export type AssetVerticalAlignment = (typeof assetVerticalAlignments)[number];

export const defaultWorldAssetFitMode: AssetFitMode = 'contain';
export const defaultWorldAssetVerticalAlignment: AssetVerticalAlignment = 'ground';

export interface AssetFitOptions {
  targetPosition?: THREE.Vector3Tuple;
  targetDimensions?: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  scaleMultiplier?: number;
  yOffset?: number;
  fitMode?: AssetFitMode | string | null;
  verticalAlign?: AssetVerticalAlignment;
}

export interface AssetFitResult {
  fitMode: AssetFitMode;
  sourceBox: THREE.Box3;
  sourceSize: THREE.Vector3;
  targetBox: THREE.Box3 | null;
  visualBox: THREE.Box3;
  appliedScale: THREE.Vector3;
}

const minFitDimension = 0.0001;

const isPositiveFinite = (value: number): boolean => (
  Number.isFinite(value) && value > minFitDimension
);

const hasPositiveSize = (size: THREE.Vector3): boolean => (
  isPositiveFinite(size.x) && isPositiveFinite(size.y) && isPositiveFinite(size.z)
);

const toVector3 = (value: THREE.Vector3Tuple): THREE.Vector3 => new THREE.Vector3(...value);

const getSafeScaleRatio = (targetDimension: number, sourceDimension: number): number => {
  if (!isPositiveFinite(targetDimension) || !isPositiveFinite(sourceDimension)) {
    return 1;
  }

  return targetDimension / sourceDimension;
};

const getPositiveScaleMultiplier = (scaleMultiplier: number | undefined): number => {
  if (scaleMultiplier === undefined) {
    return 1;
  }

  return isPositiveFinite(scaleMultiplier) ? scaleMultiplier : 1;
};

export const isAssetFitMode = (value: unknown): value is AssetFitMode => (
  typeof value === 'string' && assetFitModes.includes(value as AssetFitMode)
);

export const resolveAssetFitMode = (
  value: AssetFitMode | string | null | undefined,
  fallback: AssetFitMode = defaultWorldAssetFitMode,
): AssetFitMode => (
  isAssetFitMode(value) ? value : fallback
);

export const isAssetVerticalAlignment = (value: unknown): value is AssetVerticalAlignment => (
  typeof value === 'string' && assetVerticalAlignments.includes(value as AssetVerticalAlignment)
);

export const createAssetTargetBounds = (
  position: THREE.Vector3Tuple,
  dimensions: THREE.Vector3Tuple,
  yOffset = 0,
): THREE.Box3 | null => {
  const size = toVector3(dimensions);

  if (!hasPositiveSize(size)) {
    return null;
  }

  const center = toVector3(position);
  center.y += yOffset;

  return new THREE.Box3().setFromCenterAndSize(center, size);
};

export const getAssetFitScale = (
  sourceSize: THREE.Vector3,
  targetSize: THREE.Vector3,
  fitMode: AssetFitMode,
): THREE.Vector3 => {
  if (fitMode === 'none' || !hasPositiveSize(sourceSize) || !hasPositiveSize(targetSize)) {
    return new THREE.Vector3(1, 1, 1);
  }

  const ratios = new THREE.Vector3(
    getSafeScaleRatio(targetSize.x, sourceSize.x),
    getSafeScaleRatio(targetSize.y, sourceSize.y),
    getSafeScaleRatio(targetSize.z, sourceSize.z),
  );

  if (fitMode === 'exact') {
    return ratios;
  }

  const uniformScale = fitMode === 'cover'
    ? Math.max(ratios.x, ratios.y, ratios.z)
    : Math.min(ratios.x, ratios.y, ratios.z);

  return new THREE.Vector3(uniformScale, uniformScale, uniformScale);
};

export const fitAssetObjectToBounds = (
  object: THREE.Object3D,
  options: AssetFitOptions = {},
): AssetFitResult => {
  const fitMode = resolveAssetFitMode(options.fitMode);
  const verticalAlign = options.verticalAlign ?? defaultWorldAssetVerticalAlignment;
  const scaleMultiplier = getPositiveScaleMultiplier(options.scaleMultiplier);
  const targetBox = options.targetPosition && options.targetDimensions
    ? createAssetTargetBounds(options.targetPosition, options.targetDimensions, options.yOffset ?? 0)
    : null;

  if (options.rotation) {
    object.rotation.set(...options.rotation);
  }

  object.updateMatrixWorld(true);

  const sourceBox = new THREE.Box3().setFromObject(object).clone();
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const targetSize = targetBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
  const fitScale = getAssetFitScale(sourceSize, targetSize, fitMode);
  const appliedScale = fitScale.clone().multiplyScalar(scaleMultiplier);

  object.scale.multiply(appliedScale);
  object.updateMatrixWorld(true);

  if (options.targetPosition) {
    const visualBoxBeforeCentering = new THREE.Box3().setFromObject(object);
    const visualCenter = visualBoxBeforeCentering.getCenter(new THREE.Vector3());
    const targetCenter = targetBox
      ? targetBox.getCenter(new THREE.Vector3())
      : toVector3(options.targetPosition);

    if (!targetBox) {
      targetCenter.y += options.yOffset ?? 0;
    }

    const offset = new THREE.Vector3(
      targetCenter.x - visualCenter.x,
      verticalAlign === 'center'
        ? targetCenter.y - visualCenter.y
        : (targetBox?.min.y ?? targetCenter.y) - visualBoxBeforeCentering.min.y,
      targetCenter.z - visualCenter.z,
    );

    object.position.add(offset);
    object.updateMatrixWorld(true);
  }

  const visualBox = new THREE.Box3().setFromObject(object).clone();

  return {
    fitMode,
    sourceBox,
    sourceSize,
    targetBox,
    visualBox,
    appliedScale,
  };
};
