export type DeliveryStatus = 'idle' | 'delivery-accepted' | 'delivery-completed';

export interface DeliveryJob {
  id: string;
  title: string;
  destinationName: string;
  description: string;
  targetInteractableId: string;
  targetWorldObjectId: string;
  reward: number;
}

export interface DeliveryState {
  status: DeliveryStatus;
  activeDeliveryId: string | null;
  activeTargetId: string | null;
  activeTargetWorldObjectId: string | null;
  activeDelivery: DeliveryJob | null;
  completedCount: number;
  completedDeliveryIds: readonly string[];
}

export interface DeliveryController {
  acceptDelivery(deliveryId?: string): string;
  completeDelivery(targetInteractableId: string): string;
  getAvailableDeliveries(): readonly DeliveryJob[];
  getState(): DeliveryState;
}
