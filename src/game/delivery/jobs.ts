import type { DeliveryJob } from './types';

export const deliveryJobs: readonly DeliveryJob[] = [
  {
    id: 'west-cottage-letter',
    title: 'West Cottage Letter',
    destinationName: 'Blue House Mailbox',
    description: 'Drop the first letter at the blue house mailbox.',
    targetInteractableId: 'mailbox',
    targetWorldObjectId: 'mailbox',
    reward: 10,
  },
  {
    id: 'east-mailbox-parcel',
    title: 'East Mailbox Parcel',
    destinationName: 'Red House Mailbox',
    description: 'Take a small parcel to the red house mailbox.',
    targetInteractableId: 'mailbox-east',
    targetWorldObjectId: 'mailbox-east',
    reward: 14,
  },
  {
    id: 'west-cottage-notice',
    title: 'West Cottage Notice',
    destinationName: 'Blue House Mailbox',
    description: 'Return to the blue house mailbox with the village notice.',
    targetInteractableId: 'mailbox',
    targetWorldObjectId: 'mailbox',
    reward: 8,
  },
];
