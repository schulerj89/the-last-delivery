import type * as THREE from 'three';

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  prompt: string;
  message: string;
}

export interface InteractionSettings {
  messageDurationSeconds: number;
}

export interface InteractionControllerOptions {
  player: THREE.Object3D;
  interactables: readonly Interactable[];
  parent: HTMLElement;
  inputTarget?: Window;
  settings?: InteractionSettings;
}

export interface InteractionState {
  currentInteractableId: string | null;
  lastMessage: string;
  promptVisible: boolean;
  messageVisible: boolean;
}

export interface InteractionController {
  update(deltaSeconds: number): void;
  getState(): InteractionState;
  dispose(): void;
}
