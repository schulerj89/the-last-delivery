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
    id: 'hill-path-parcel',
    title: 'Hill Path Parcel',
    destinationName: 'Hill Path Mailbox',
    description: 'Take a small parcel to the red mailbox by the hill path.',
    targetInteractableId: 'mailbox-east',
    targetWorldObjectId: 'mailbox-east',
    reward: 14,
  },
  {
    id: 'post-office-return',
    title: 'Post Office Return',
    destinationName: 'Post Office Return Box',
    description: 'Bring the stamped notice back to the green return box.',
    targetInteractableId: 'mailbox-post-office-return',
    targetWorldObjectId: 'mailbox-post-office-return',
    reward: 8,
  },
];
