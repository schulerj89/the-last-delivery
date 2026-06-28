import type { DeliveryJob } from './types';

interface DeliveryJobWorldObject {
  id: string;
  kind: string;
  interactable?: unknown;
  active?: boolean;
  mailbox?: {
    destinationName: string;
  };
  gameplay?: {
    role?: string;
    action?: string;
    destinationName?: string;
  };
}

const defaultDeliveryJobs: readonly DeliveryJob[] = [
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

const sanitizeDeliveryIdPart = (value: string): string => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'mailbox'
);

const createFallbackDeliveryJob = (
  object: DeliveryJobWorldObject,
  destinationName: string,
  index: number,
): DeliveryJob => ({
  id: `editor-delivery-${sanitizeDeliveryIdPart(object.id) || index + 1}`,
  title: `${destinationName} Delivery`,
  destinationName,
  description: `Deliver mail to ${destinationName}.`,
  targetInteractableId: object.id,
  targetWorldObjectId: object.id,
  reward: 10,
});

const uniquifyDeliveryJobId = (
  job: DeliveryJob,
  usedIds: Set<string>,
): DeliveryJob => {
  if (!usedIds.has(job.id)) {
    usedIds.add(job.id);
    return job;
  }

  let suffix = 2;
  let id = `${job.id}-${suffix}`;

  while (usedIds.has(id)) {
    suffix += 1;
    id = `${job.id}-${suffix}`;
  }

  usedIds.add(id);
  return { ...job, id };
};

export const createDeliveryJobsFromWorldObjects = (
  worldObjects: readonly DeliveryJobWorldObject[],
): readonly DeliveryJob[] => {
  const usedIds = new Set<string>();

  return worldObjects
    .filter((object) => object.active !== false)
    .filter((object) => object.kind === 'mailbox' || object.gameplay?.role === 'mailbox')
    .filter((object) => object.interactable !== undefined)
    .map((object, index) => {
      const destinationName = object.mailbox?.destinationName
        ?? object.gameplay?.destinationName
        ?? object.id.replaceAll('-', ' ');
      const template = defaultDeliveryJobs.find((job) => (
        job.targetWorldObjectId === object.id
        || job.targetInteractableId === object.id
        || job.destinationName === destinationName
      ));
      const job = template
        ? {
          ...template,
          destinationName,
          targetInteractableId: object.id,
          targetWorldObjectId: object.id,
        }
        : createFallbackDeliveryJob(object, destinationName, index);

      return uniquifyDeliveryJobId(job, usedIds);
    });
};

export const deliveryJobs: readonly DeliveryJob[] = defaultDeliveryJobs;
