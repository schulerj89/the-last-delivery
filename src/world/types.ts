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
  | 'pavement'
  | 'post-office'
  | 'rock'
  | 'sack'
  | 'signpost'
  | 'spawn-point'
  | 'tree'
  | 'well';

export type MailboxVariant = 'red' | 'blue' | 'green';
export type WorldGameplayRole =
  | 'decorative'
  | 'player-spawn'
  | 'post-office'
  | 'delivery-board'
  | 'mailbox';
export type WorldInteractionAction =
  | 'none'
  | 'open-delivery-board'
  | 'complete-delivery';

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

export interface WorldGameplayDefinition {
  role: WorldGameplayRole;
  action?: WorldInteractionAction;
  destinationName?: string;
  mailboxVariant?: MailboxVariant;
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
  active?: boolean;
  position: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  dimensions?: THREE.Vector3Tuple;
  render?: WorldRenderDefinition;
  collider?: WorldColliderDefinition;
  interactable?: WorldInteractableDefinition;
  objectiveAnchor?: WorldObjectiveAnchorDefinition;
  mailbox?: WorldMailboxDefinition;
  gameplay?: WorldGameplayDefinition;
  layoutTransform?: WorldLayoutTransformDefinition;
}
