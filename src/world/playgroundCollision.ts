import * as THREE from 'three';
import type { CollisionWorld, WalkableSurface } from '../game/collision';
import type { WorldObjectDefinition, WorldObjectKind } from './types';
import { villageLayoutConfig } from './villageLayoutConfig';
import { collidableWorldObjects, getWorldObjectsByKind } from './villageDefinition';
import { playgroundCompositionConfig } from './playgroundComposition';
import { pavementTileDetailConfig } from './props/createPavementTile';

export const playgroundCollisionFootprintScale: Partial<Record<WorldObjectKind, number>> = {
  cottage: 0.72,
  'post-office': 0.78,
};

const getCollisionFootprintScale = (object: WorldObjectDefinition): number => (
  playgroundCollisionFootprintScale[object.kind] ?? 1
);

const createWorldObjectCollisionBox = (object: WorldObjectDefinition) => {
  if (!object.collider) {
    throw new Error(`Missing collider for world object: ${object.id}`);
  }

  const footprintScale = getCollisionFootprintScale(object);

  return {
    id: object.id,
    center: new THREE.Vector3(...object.collider.position),
    size: new THREE.Vector3(
      object.collider.size[0] * footprintScale,
      object.collider.size[1],
      object.collider.size[2] * footprintScale,
    ),
  };
};

const getPrimitiveSurfaceTransform = (object: WorldObjectDefinition): {
  rotationY: number;
  scaleMultiplier: number;
  yOffset: number;
} => {
  const renderSettings = object.render?.mode === 'asset' ? object.render : undefined;

  return {
    rotationY: renderSettings?.rotation?.[1] ?? object.rotation?.[1] ?? 0,
    scaleMultiplier: renderSettings?.scaleMultiplier ?? object.layoutTransform?.scaleMultiplier ?? 1,
    yOffset: renderSettings?.yOffset ?? object.layoutTransform?.yOffset ?? 0,
  };
};

const createPavementWalkableSurface = (object: WorldObjectDefinition): WalkableSurface | null => {
  if (!object.dimensions) {
    return null;
  }

  const [width, height, depth] = object.dimensions;

  if (width <= 0 || height <= 0 || depth <= 0) {
    return null;
  }

  const transform = getPrimitiveSurfaceTransform(object);
  const scaleMultiplier = Math.max(transform.scaleMultiplier, 0.001);
  const groundY = Math.max(0, object.position[1] - height / 2 + transform.yOffset);

  return {
    id: object.id,
    center: new THREE.Vector3(object.position[0], groundY, object.position[2]),
    size: new THREE.Vector3(width * scaleMultiplier, height, depth * scaleMultiplier),
    rotationY: transform.rotationY,
    height: groundY + height + pavementTileDetailConfig.relief,
  };
};

const createPavementWalkableSurfaces = (): WalkableSurface[] => (
  getWorldObjectsByKind('pavement')
    .map(createPavementWalkableSurface)
    .filter((surface): surface is WalkableSurface => surface !== null)
);

export const createPlaygroundCollisionWorld = (
  includeAuthoredColliders: boolean = playgroundCompositionConfig.enableAuthoredCollision,
): CollisionWorld => ({
  bounds: {
    minX: villageLayoutConfig.bounds.minX,
    maxX: villageLayoutConfig.bounds.maxX,
    minZ: villageLayoutConfig.bounds.minZ,
    maxZ: villageLayoutConfig.bounds.maxZ,
  },
  boxes: includeAuthoredColliders ? collidableWorldObjects.map(createWorldObjectCollisionBox) : [],
  walkableSurfaces: includeAuthoredColliders ? createPavementWalkableSurfaces() : [],
});

export const playgroundCollisionWorld: CollisionWorld = createPlaygroundCollisionWorld();
