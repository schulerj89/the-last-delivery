import { deliveryJobs } from './jobs';
import type { DeliveryController, DeliveryJob, DeliveryState, DeliveryStatus } from './types';

const getNextAvailableDelivery = (
  jobs: readonly DeliveryJob[],
  completedDeliveryIds: readonly string[],
): DeliveryJob | null => (
  jobs.find((job) => !completedDeliveryIds.includes(job.id)) ?? null
);

export const createDeliveryController = (
  jobs: readonly DeliveryJob[] = deliveryJobs,
): DeliveryController => {
  let status: DeliveryStatus = 'idle';
  let activeDelivery: DeliveryJob | null = null;
  const completedDeliveryIds: string[] = [];

  return {
    acceptDelivery() {
      if (status === 'delivery-accepted') {
        return activeDelivery
          ? `Delivery already accepted: ${activeDelivery.title}.`
          : 'Delivery already accepted.';
      }

      const nextDelivery = getNextAvailableDelivery(jobs, completedDeliveryIds);

      if (!nextDelivery) {
        return 'All deliveries complete.';
      }

      activeDelivery = nextDelivery;
      status = 'delivery-accepted';
      return `Delivery accepted: ${nextDelivery.title}.`;
    },
    completeDelivery(targetInteractableId) {
      if (status !== 'delivery-accepted' || !activeDelivery) {
        return 'No delivery to complete.';
      }

      if (activeDelivery.targetInteractableId !== targetInteractableId) {
        return `Wrong mailbox. Deliver "${activeDelivery.title}" to ${activeDelivery.targetWorldObjectId}.`;
      }

      const completedDelivery = activeDelivery;
      if (!completedDeliveryIds.includes(completedDelivery.id)) {
        completedDeliveryIds.push(completedDelivery.id);
      }

      activeDelivery = null;
      status = 'delivery-completed';
      return `Delivery completed: ${completedDelivery.title}.`;
    },
    getState(): DeliveryState {
      return {
        status,
        activeDeliveryId: activeDelivery?.id ?? null,
        activeTargetId: activeDelivery?.targetInteractableId ?? null,
        activeTargetWorldObjectId: activeDelivery?.targetWorldObjectId ?? null,
        activeDelivery,
        completedCount: completedDeliveryIds.length,
        completedDeliveryIds: [...completedDeliveryIds],
      };
    },
  };
};
