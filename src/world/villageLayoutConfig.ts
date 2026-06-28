export type VillageLayoutZoneId =
  | 'spawn-start-path'
  | 'post-office-delivery-board'
  | 'central-plaza-well'
  | 'blue-house-target'
  | 'red-house-target'
  | 'north-house-target'
  | 'forest-edge-boundary'
  | 'market-cart-dressing';

export interface VillageLayoutZone {
  id: VillageLayoutZoneId;
  label: string;
  center: readonly [number, number];
  radius: number;
  notes: string;
}

export const villageLayoutConfig = {
  coordinateSystem: {
    x: 'left/right',
    y: 'height',
    z: 'forward/back',
  },
  bounds: {
    minX: -14,
    maxX: 14,
    minZ: -12,
    maxZ: 14,
  },
  spacing: {
    mainPathMinWidth: 3,
    mainPathMaxWidth: 4,
    plazaOpenRadius: 4,
    interactableClearanceRadius: 2,
    decorativeClusterMinProps: 3,
    decorativeClusterMaxProps: 5,
  },
  densityBudget: {
    openWalkableSpace: 0.7,
    landmarkStructures: 0.2,
    decorativeClutter: 0.1,
  },
  objectBudgets: {
    decorativePropMaxCount: 28,
    crateBarrelClusterMaxCount: 2,
    crateBarrelClusterMaxObjects: 3,
  },
  zones: [
    {
      id: 'spawn-start-path',
      label: 'Spawn / Start Path',
      center: [0, 10],
      radius: 3,
      notes: 'Readable approach path from spawn toward the delivery board.',
    },
    {
      id: 'post-office-delivery-board',
      label: 'Post Office / Delivery Board',
      center: [-5, 7],
      radius: 3.5,
      notes: 'First action area with open prompt space around the board.',
    },
    {
      id: 'central-plaza-well',
      label: 'Central Plaza / Well',
      center: [0, 0],
      radius: 4,
      notes: 'Primary landmark with a clean walking ring around the well.',
    },
    {
      id: 'blue-house-target',
      label: 'Blue House Delivery Target',
      center: [-8.5, -2.5],
      radius: 3,
      notes: 'Blue mailbox destination with a clear approach from the plaza.',
    },
    {
      id: 'red-house-target',
      label: 'Red House Delivery Target',
      center: [8.5, -1.5],
      radius: 3,
      notes: 'Red mailbox destination separated from the blue route.',
    },
    {
      id: 'north-house-target',
      label: 'North House Delivery Target',
      center: [0, -8.5],
      radius: 3,
      notes: 'Third target readable from the plaza and not hidden by trees.',
    },
    {
      id: 'forest-edge-boundary',
      label: 'Forest Edge / Decorative Boundary',
      center: [0, 1],
      radius: 13,
      notes: 'Trees, rocks, and bushes frame the village outside primary paths.',
    },
    {
      id: 'market-cart-dressing',
      label: 'Market / Cart Dressing Corner',
      center: [9.5, 9.5],
      radius: 3,
      notes: 'Clustered crates, barrels, and cart dressing kept out of walk lanes.',
    },
  ] satisfies readonly VillageLayoutZone[],
} as const;
