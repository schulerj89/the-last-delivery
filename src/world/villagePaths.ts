import type * as THREE from 'three';
import {
  deliveryBoardObject,
  getWorldObjectsByGameplayRole,
  getWorldObjectsByKind,
  playerSpawnPosition,
  tryGetWorldObject,
} from './villageDefinition';

export type VillagePathKind = 'main' | 'side';

export interface VillagePathGuide {
  id: string;
  kind: VillagePathKind;
  start: THREE.Vector3Tuple;
  end: THREE.Vector3Tuple;
  width: number;
}

const getInteractablePoint = (objectId: string): THREE.Vector3Tuple => {
  const object = tryGetWorldObject(objectId);
  return object?.interactable?.position ?? object?.position ?? [0, 0, 0];
};

export const getVillagePathGuides = (): readonly VillagePathGuide[] => {
  const well = getWorldObjectsByKind('well')[0];
  const mailboxObjects = getWorldObjectsByGameplayRole('mailbox')
    .filter((object) => object.interactable);
  const centerPoint = well?.position ?? mailboxObjects[0]?.interactable?.position ?? deliveryBoardObject?.position;
  const guides: VillagePathGuide[] = [];

  if (!centerPoint) {
    return guides;
  }

  guides.push({
    id: 'village:main-path-spawn-to-plaza',
    kind: 'main',
    start: playerSpawnPosition,
    end: centerPoint,
    width: 3.4,
  });

  mailboxObjects.slice(0, 3).forEach((mailbox, index) => {
    const point = mailbox.interactable?.position ?? mailbox.position;
    guides.push({
      id: `village:path-to-${mailbox.id}`,
      kind: index === 0 ? 'main' : 'side',
      start: centerPoint,
      end: point,
      width: index === 0 ? 3.2 : 2.35,
    });
  });

  if (deliveryBoardObject) {
    guides.push({
      id: 'village:side-path-post-office-board',
      kind: 'side',
      start: playerSpawnPosition,
      end: deliveryBoardObject.interactable?.position ?? deliveryBoardObject.position,
      width: 2.2,
    });
  }

  if (mailboxObjects.length === 0) {
    [
      'mailbox',
      'mailbox-east',
      'mailbox-post-office-return',
    ].forEach((objectId, index) => {
      const object = tryGetWorldObject(objectId);

      if (!object) {
        return;
      }

      guides.push({
        id: `village:path-to-${object.id}`,
        kind: index === 0 ? 'main' : 'side',
        start: centerPoint,
        end: getInteractablePoint(object.id),
        width: index === 0 ? 3.2 : 2.35,
      });
    });
  }

  return guides;
};
