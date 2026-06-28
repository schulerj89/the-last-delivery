import type * as THREE from 'three';

export interface CollisionBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CollisionBox {
  id: string;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

export interface CollisionWorld {
  bounds: CollisionBounds;
  boxes: readonly CollisionBox[];
}

export interface CollisionResolution {
  position: THREE.Vector3;
  correction: THREE.Vector3;
  hitBounds: boolean;
  hitIds: string[];
}
