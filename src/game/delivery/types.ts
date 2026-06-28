export type DeliveryStatus = 'idle' | 'delivery-accepted' | 'delivery-completed';

export interface DeliveryState {
  status: DeliveryStatus;
  completedCount: number;
}

export interface DeliveryController {
  acceptDelivery(): string;
  completeDelivery(): string;
  getState(): DeliveryState;
}
