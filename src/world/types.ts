import type * as THREE from 'three';
import type { AssetFitMode } from '../game/assets';

export type WorldObjectKind =
  | 'barrel'
  | 'bush'
  | 'cart'
  | 'cottage'
  | 'crate'
  | 'delivery-board'
  | 'mailbox'
  | 'post-office'
  | 'rock'
  | 'sack'
  | 'signpost'
  | 'tree'
  | 'well';

export type MailboxVariant = 'red' | 'blue' | 'green';

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

export interface WorldMailboxDefinition {
  variant: MailboxVariant;
  destinationName: string;
}

export interface WorldLayoutTransformDefinition {
  scaleMultiplier?: number;
  yOffset?: number;
}

export type WorldRenderDefinition =
  | { mode: 'primitive' }
  | {
    mode: 'asset';
    assetId: string;
    scaleMultiplier?: number;
    yOffset?: number;
    rotation?: THREE.Vector3Tuple;
    fitMode?: AssetFitMode;
  };

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
  mailbox?: WorldMailboxDefinition;
  layoutTransform?: WorldLayoutTransformDefinition;
}
