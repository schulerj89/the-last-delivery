import * as THREE from 'three';
import type { CollisionBox, CollisionWorld } from '../game/collision';

export interface CollisionDebugView {
  object: THREE.Group;
  isVisible(): boolean;
  setVisible(visible: boolean): void;
  toggle(): boolean;
}

const boxMaterial = new THREE.MeshBasicMaterial({
  color: 0x58f0ff,
  depthTest: false,
  opacity: 0.72,
  transparent: true,
  wireframe: true,
});

const boundsMaterial = new THREE.MeshBasicMaterial({
  color: 0xffdc5c,
  depthTest: false,
  opacity: 0.78,
  transparent: true,
  wireframe: true,
});

const createDebugBox = (box: CollisionBox): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z),
    boxMaterial,
  );
  mesh.name = `debug:collision:${box.id}`;
  mesh.userData.label = mesh.name;
  mesh.position.copy(box.center);
  mesh.renderOrder = 10;
  return mesh;
};

export const createPlaygroundCollisionDebugView = (world: CollisionWorld): CollisionDebugView => {
  const group = new THREE.Group();
  group.name = 'debug:playground-collision';
  group.visible = false;

  const boundsWidth = world.bounds.maxX - world.bounds.minX;
  const boundsDepth = world.bounds.maxZ - world.bounds.minZ;
  const bounds = new THREE.Mesh(
    new THREE.BoxGeometry(boundsWidth, 1.1, boundsDepth),
    boundsMaterial,
  );
  bounds.name = 'debug:collision:playground-bounds';
  bounds.userData.label = bounds.name;
  bounds.position.set(
    world.bounds.minX + boundsWidth / 2,
    0.55,
    world.bounds.minZ + boundsDepth / 2,
  );
  bounds.renderOrder = 10;
  group.add(bounds);

  world.boxes.forEach((box) => {
    group.add(createDebugBox(box));
  });

  return {
    object: group,
    isVisible() {
      return group.visible;
    },
    setVisible(visible) {
      group.visible = visible;
    },
    toggle() {
      group.visible = !group.visible;
      return group.visible;
    },
  };
};
