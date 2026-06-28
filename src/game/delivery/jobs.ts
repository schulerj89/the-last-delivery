import type { DeliveryJob } from './types';

export const deliveryJobs: readonly DeliveryJob[] = [
  {
    id: 'west-cottage-letter',
    title: 'West Cottage Letter',
    description: 'Drop the first letter at the blue mailbox near the west cottage.',
    targetInteractableId: 'mailbox',
    targetWorldObjectId: 'mailbox',
    reward: 10,
  },
  {
    id: 'east-mailbox-parcel',
    title: 'East Mailbox Parcel',
    description: 'Take a small parcel to the mailbox beside the east cottage.',
    targetInteractableId: 'mailbox-east',
    targetWorldObjectId: 'mailbox-east',
    reward: 14,
  },
  {
    id: 'west-cottage-notice',
    title: 'West Cottage Notice',
    description: 'Return to the west cottage mailbox with the village notice.',
    targetInteractableId: 'mailbox',
    targetWorldObjectId: 'mailbox',
    reward: 8,
  },
];
