import type * as THREE from 'three';
import { deliveryBoardObject, getWorldObject, getWorldObjectsByKind, playerSpawnPosition } from './villageDefinition';

export type VillagePathKind = 'main' | 'side';

export interface VillagePathGuide {
  id: string;
  kind: VillagePathKind;
  start: THREE.Vector3Tuple;
  end: THREE.Vector3Tuple;
  width: number;
}

const getInteractablePoint = (objectId: string): THREE.Vector3Tuple => {
  const object = getWorldObject(objectId);
  return object.interactable?.position ?? object.position;
};

export const getVillagePathGuides = (): readonly VillagePathGuide[] => {
  const well = getWorldObjectsByKind('well')[0];
  const wellPoint = well.position;
  const boardPoint = deliveryBoardObject.interactable?.position ?? deliveryBoardObject.position;
  const blueMailboxPoint = getInteractablePoint('mailbox');
  const redMailboxPoint = getInteractablePoint('mailbox-east');
  const northMailboxPoint = getInteractablePoint('mailbox-post-office-return');

  return [
    {
      id: 'village:main-path-spawn-to-plaza',
      kind: 'main',
      start: playerSpawnPosition,
      end: wellPoint,
      width: 3.4,
    },
    {
      id: 'village:main-path-plaza-to-north-house',
      kind: 'main',
      start: wellPoint,
      end: northMailboxPoint,
      width: 3.2,
    },
    {
      id: 'village:side-path-blue-house',
      kind: 'side',
      start: wellPoint,
      end: blueMailboxPoint,
      width: 2.35,
    },
    {
      id: 'village:side-path-red-house',
      kind: 'side',
      start: wellPoint,
      end: redMailboxPoint,
      width: 2.35,
    },
    {
      id: 'village:side-path-post-office-board',
      kind: 'side',
      start: playerSpawnPosition,
      end: boardPoint,
      width: 2.2,
    },
  ];
};
