import * as THREE from 'three';
import type { MailboxVariant } from '../types';

export interface CreateMailboxPropOptions {
  id: string;
  position: THREE.Vector3Tuple;
  rotationY?: number;
  variant?: MailboxVariant;
}

const geometries = {
  post: new THREE.BoxGeometry(0.16, 0.84, 0.16),
  supportArm: new THREE.BoxGeometry(0.58, 0.12, 0.14),
  bodyBase: new THREE.BoxGeometry(0.88, 0.32, 0.52),
  bodyTop: new THREE.CylinderGeometry(0.27, 0.27, 0.88, 18),
  door: new THREE.BoxGeometry(0.04, 0.44, 0.42),
  doorHandle: new THREE.SphereGeometry(0.04, 8, 6),
  flagPost: new THREE.BoxGeometry(0.05, 0.46, 0.05),
  flagPanel: new THREE.BoxGeometry(0.06, 0.24, 0.34),
  envelopePaper: new THREE.BoxGeometry(0.018, 0.18, 0.3),
  envelopeLine: new THREE.BoxGeometry(0.022, 0.018, 0.25),
};

const materials = {
  wood: new THREE.MeshStandardMaterial({ color: 0x7a5234, roughness: 0.82 }),
  door: new THREE.MeshStandardMaterial({ color: 0xf0e4c4, roughness: 0.62 }),
  handle: new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.5 }),
  envelopePaper: new THREE.MeshStandardMaterial({ color: 0xf8f2dc, roughness: 0.72 }),
  envelopeLine: new THREE.MeshStandardMaterial({ color: 0x36506b, roughness: 0.5 }),
  body: {
    blue: new THREE.MeshStandardMaterial({ color: 0x2f7fc7, roughness: 0.48 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc94f45, roughness: 0.48 }),
    green: new THREE.MeshStandardMaterial({ color: 0x3f9d65, roughness: 0.52 }),
  } satisfies Record<MailboxVariant, THREE.MeshStandardMaterial>,
  flag: {
    blue: new THREE.MeshStandardMaterial({ color: 0xef5d45, roughness: 0.46 }),
    red: new THREE.MeshStandardMaterial({ color: 0xf0ca72, roughness: 0.46 }),
    green: new THREE.MeshStandardMaterial({ color: 0xf2f0e5, roughness: 0.46 }),
  } satisfies Record<MailboxVariant, THREE.MeshStandardMaterial>,
};

const nameObject = <T extends THREE.Object3D>(object: T, name: string): T => {
  object.name = name;
  object.userData.label = name;
  return object;
};

const addMailboxPart = (
  group: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: THREE.Vector3Tuple,
  rotation: THREE.Euler = new THREE.Euler(),
): THREE.Mesh => {
  const mesh = nameObject(new THREE.Mesh(geometry, material), name);
  mesh.position.set(...position);
  mesh.rotation.copy(rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
};

export const createMailboxProp = ({
  id,
  position,
  rotationY = 0,
  variant = 'blue',
}: CreateMailboxPropOptions): THREE.Group => {
  const baseName = `village:${id}`;
  const mailbox = nameObject(new THREE.Group(), baseName);
  const bodyMaterial = materials.body[variant];
  const flagMaterial = materials.flag[variant];

  mailbox.position.set(...position);
  mailbox.rotation.y = rotationY;

  addMailboxPart(mailbox, `${baseName}:post`, geometries.post, materials.wood, [0, 0.42, 0]);
  addMailboxPart(mailbox, `${baseName}:support-arm`, geometries.supportArm, materials.wood, [0.22, 0.85, 0]);
  addMailboxPart(mailbox, `${baseName}:body-base`, geometries.bodyBase, bodyMaterial, [0.24, 1.02, 0]);
  addMailboxPart(
    mailbox,
    `${baseName}:rounded-body`,
    geometries.bodyTop,
    bodyMaterial,
    [0.24, 1.18, 0],
    new THREE.Euler(0, 0, Math.PI / 2),
  );
  addMailboxPart(mailbox, `${baseName}:front-door`, geometries.door, materials.door, [-0.22, 1.09, 0]);
  addMailboxPart(mailbox, `${baseName}:door-handle`, geometries.doorHandle, materials.handle, [-0.26, 1.08, -0.17]);
  addMailboxPart(mailbox, `${baseName}:flag-post`, geometries.flagPost, materials.wood, [0.22, 1.28, -0.32]);
  addMailboxPart(mailbox, `${baseName}:flag`, geometries.flagPanel, flagMaterial, [0.22, 1.43, -0.48]);
  addMailboxPart(mailbox, `${baseName}:mail-symbol`, geometries.envelopePaper, materials.envelopePaper, [-0.252, 1.09, 0]);
  addMailboxPart(mailbox, `${baseName}:mail-symbol-line-a`, geometries.envelopeLine, materials.envelopeLine, [-0.265, 1.1, 0], new THREE.Euler(0.56, 0, 0));
  addMailboxPart(mailbox, `${baseName}:mail-symbol-line-b`, geometries.envelopeLine, materials.envelopeLine, [-0.266, 1.1, 0], new THREE.Euler(-0.56, 0, 0));

  return mailbox;
};
