import * as THREE from 'three';
import type { CollisionBox, CollisionResolution, CollisionWorld, WalkableSurface } from './types';

export const defaultGroundHeight = 0;

const getBoxEdges = (box: CollisionBox) => ({
  minX: box.center.x - box.size.x / 2,
  maxX: box.center.x + box.size.x / 2,
  minZ: box.center.z - box.size.z / 2,
  maxZ: box.center.z + box.size.z / 2,
});

const resolveBounds = (
  position: THREE.Vector3,
  world: CollisionWorld,
  radius: number,
  correction: THREE.Vector3,
): boolean => {
  const nextX = THREE.MathUtils.clamp(
    position.x,
    world.bounds.minX + radius,
    world.bounds.maxX - radius,
  );
  const nextZ = THREE.MathUtils.clamp(
    position.z,
    world.bounds.minZ + radius,
    world.bounds.maxZ - radius,
  );
  const hitBounds = nextX !== position.x || nextZ !== position.z;

  if (hitBounds) {
    correction.x += nextX - position.x;
    correction.z += nextZ - position.z;
    position.x = nextX;
    position.z = nextZ;
  }

  return hitBounds;
};

const resolveBox = (
  position: THREE.Vector3,
  box: CollisionBox,
  radius: number,
  correction: THREE.Vector3,
): boolean => {
  const edges = getBoxEdges(box);
  const minX = edges.minX - radius;
  const maxX = edges.maxX + radius;
  const minZ = edges.minZ - radius;
  const maxZ = edges.maxZ + radius;

  if (position.x <= minX || position.x >= maxX || position.z <= minZ || position.z >= maxZ) {
    return false;
  }

  const distancesToEdges = [
    { axis: 'x', value: minX, distance: position.x - minX },
    { axis: 'x', value: maxX, distance: maxX - position.x },
    { axis: 'z', value: minZ, distance: position.z - minZ },
    { axis: 'z', value: maxZ, distance: maxZ - position.z },
  ] as const;
  const nearestEdge = distancesToEdges.reduce((nearest, edge) => (
    edge.distance < nearest.distance ? edge : nearest
  ));

  if (nearestEdge.axis === 'x') {
    correction.x += nearestEdge.value - position.x;
    position.x = nearestEdge.value;
  } else {
    correction.z += nearestEdge.value - position.z;
    position.z = nearestEdge.value;
  }

  return true;
};

const isPositionOnWalkableSurface = (
  position: THREE.Vector3,
  surface: WalkableSurface,
  supportRadius: number,
): boolean => {
  const dx = position.x - surface.center.x;
  const dz = position.z - surface.center.z;
  const cos = Math.cos(surface.rotationY);
  const sin = Math.sin(surface.rotationY);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const radius = Math.max(0, supportRadius);

  return (
    Math.abs(localX) <= surface.size.x / 2 + radius
    && Math.abs(localZ) <= surface.size.z / 2 + radius
  );
};

export const resolveGroundHeightAtPosition = (
  position: THREE.Vector3,
  world?: CollisionWorld,
  supportRadius = 0,
): number => {
  let groundHeight = defaultGroundHeight;

  world?.walkableSurfaces?.forEach((surface) => {
    if (
      Number.isFinite(surface.height)
      && surface.height > groundHeight
      && isPositionOnWalkableSurface(position, surface, supportRadius)
    ) {
      groundHeight = surface.height;
    }
  });

  return groundHeight;
};

export const resolvePlayerCollision = (
  position: THREE.Vector3,
  world: CollisionWorld,
  radius: number,
): CollisionResolution => {
  const resolvedPosition = position.clone();
  const correction = new THREE.Vector3();
  const hitIds = new Set<string>();
  let hitBounds = resolveBounds(resolvedPosition, world, radius, correction);

  for (let pass = 0; pass < 3; pass += 1) {
    let hitThisPass = false;

    world.boxes.forEach((box) => {
      if (resolveBox(resolvedPosition, box, radius, correction)) {
        hitIds.add(box.id);
        hitThisPass = true;
      }
    });

    hitBounds = resolveBounds(resolvedPosition, world, radius, correction) || hitBounds;

    if (!hitThisPass) {
      break;
    }
  }

  return {
    position: resolvedPosition,
    correction,
    hitBounds,
    hitIds: [...hitIds],
  };
};
