import type * as THREE from 'three';

export type WorldObjectKind =
  | 'barrel'
  | 'bush'
  | 'cottage'
  | 'crate'
  | 'delivery-board'
  | 'mailbox'
  | 'post-office'
  | 'rock'
  | 'tree'
  | 'well';

export interface WorldColliderDefinition {
  position: THREE.Vector3Tuple;
  size: THREE.Vector3Tuple;
}

export interface WorldInteractableDefinition {
  position: THREE.Vector3Tuple;
  radius: number;
}

export interface WorldObjectiveAnchorDefinition {
  position: THREE.Vector3Tuple;
}

export type WorldRenderDefinition =
  | { mode: 'primitive' }
  | { mode: 'asset'; assetId: string };

export interface WorldObjectDefinition {
  id: string;
  kind: WorldObjectKind;
  position: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  dimensions?: THREE.Vector3Tuple;
  render?: WorldRenderDefinition;
  collider?: WorldColliderDefinition;
  interactable?: WorldInteractableDefinition;
  objectiveAnchor?: WorldObjectiveAnchorDefinition;
}
