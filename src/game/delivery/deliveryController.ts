import type { DeliveryController, DeliveryState, DeliveryStatus } from './types';

export const createDeliveryController = (): DeliveryController => {
  let status: DeliveryStatus = 'idle';
  let completedCount = 0;

  return {
    acceptDelivery() {
      if (status === 'delivery-accepted') {
        return 'Delivery already accepted.';
      }

      status = 'delivery-accepted';
      return 'Delivery accepted.';
    },
    completeDelivery() {
      if (status !== 'delivery-accepted') {
        return 'No delivery to complete.';
      }

      status = 'delivery-completed';
      completedCount += 1;
      return 'Delivery completed.';
    },
    getState(): DeliveryState {
      return {
        status,
        completedCount,
      };
    },
  };
};
