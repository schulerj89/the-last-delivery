export type VillageLayoutDistrictId =
  | 'south-entry-spawn'
  | 'post-office-plaza'
  | 'market-lane'
  | 'central-green-well'
  | 'west-homes'
  | 'east-river-row'
  | 'north-hill-old-trail-gate'
  | 'forest-orchard-boundary';

export type VillageRouteId =
  | 'south-road'
  | 'post-office-walk'
  | 'market-lane'
  | 'green-loop'
  | 'west-home-path'
  | 'river-row'
  | 'north-hill-road';

export interface VillageLayoutDistrict {
  id: VillageLayoutDistrictId;
  label: string;
  center: readonly [number, number, number];
  radius: number;
  notes: string;
}

export interface VillageRoute {
  id: VillageRouteId;
  label: string;
  start: readonly [number, number, number];
  end: readonly [number, number, number];
  minWidth: number;
  maxWidth: number;
  notes: string;
}

export const villageLayoutConfig = {
  coordinateSystem: {
    x: 'left/right',
    y: 'height',
    z: 'forward/back',
  },
  bounds: {
    minX: -45,
    maxX: 45,
    minZ: -45,
    maxZ: 45,
  },
  scenicBounds: {
    minX: -65,
    maxX: 65,
    minZ: -65,
    maxZ: 65,
  },
  keyPositions: {
    spawn: [0, 0, 38],
    postOfficePlaza: [-10, 0, 24],
    deliveryBoard: [-4, 0, 26],
    marketLane: [14, 0, 20],
    centralGreenWell: [0, 0, 4],
    westHomes: [-28, 0, -4],
    eastRiverRow: [28, 0, 0],
    northHillOldTrailGate: [0, 0, -36],
  },
  spacing: {
    mainPathMinWidth: 4,
    mainPathMaxWidth: 6,
    sidePathMinWidth: 3,
    sidePathMaxWidth: 4,
    centralGreenOpenRadius: 10,
    interactableClearanceRadius: 2.5,
    decorativeClusterMaxCountPerDistrict: 3,
    decorativeClusterMaxProps: 4,
  },
  densityBudget: {
    openMovementAndPaths: 0.6,
    landmarkStructures: 0.25,
    decorativeClutter: 0.15,
  },
  objectBudgets: {
    houseMinCount: 8,
    houseMaxCount: 10,
    activeMailboxMinCount: 5,
    activeMailboxMaxCount: 6,
    decorativeClusterMaxCountPerDistrict: 3,
    smallPropsMaxPerCluster: 4,
    decorativePropMaxCount: 96,
    crateBarrelClusterMaxCount: 16,
    crateBarrelClusterMaxObjects: 4,
  },
  zones: [
    {
      id: 'south-entry-spawn',
      label: 'South Entry / Spawn',
      center: [0, 0, 38],
      radius: 9,
      notes: 'Arrival road with enough space to orient the player before the first delivery-board prompt.',
    },
    {
      id: 'post-office-plaza',
      label: 'Post Office Plaza',
      center: [-10, 0, 24],
      radius: 10,
      notes: 'First task hub with the post office, delivery board, and broad open access from the south road.',
    },
    {
      id: 'market-lane',
      label: 'Market Lane',
      center: [14, 0, 20],
      radius: 10,
      notes: 'Future shop and prop-dressing corridor kept off the main south-to-north movement lane.',
    },
    {
      id: 'central-green-well',
      label: 'Central Green / Well',
      center: [0, 0, 4],
      radius: 12,
      notes: 'Large readable green with a 10-unit open radius around the well and clear loops to every district.',
    },
    {
      id: 'west-homes',
      label: 'West Homes',
      center: [-28, 0, -4],
      radius: 12,
      notes: 'Residential edge with houses on the district perimeter and mailbox targets facing the path.',
    },
    {
      id: 'east-river-row',
      label: 'East River Row',
      center: [28, 0, 0],
      radius: 12,
      notes: 'Future river-facing home row with long sightlines and path-side mailbox access.',
    },
    {
      id: 'north-hill-old-trail-gate',
      label: 'North Hill / Old Trail Gate',
      center: [0, 0, -36],
      radius: 11,
      notes: 'Northern progression edge and future exit gate, reached by a broad uphill road.',
    },
    {
      id: 'forest-orchard-boundary',
      label: 'Forest / Orchard Boundary',
      center: [0, 0, 0],
      radius: 55,
      notes: 'Scenic framing ring outside primary routes; trees should define edges without blocking camera or paths.',
    },
  ] satisfies readonly VillageLayoutDistrict[],
  routes: [
    {
      id: 'south-road',
      label: 'South Road',
      start: [0, 0, 42],
      end: [0, 0, 4],
      minWidth: 4,
      maxWidth: 6,
      notes: 'Primary south entry route from spawn toward the central green.',
    },
    {
      id: 'post-office-walk',
      label: 'Post Office Walk',
      start: [0, 0, 34],
      end: [-10, 0, 24],
      minWidth: 4,
      maxWidth: 5,
      notes: 'Clear first-route branch that makes the delivery board visible from the spawn approach.',
    },
    {
      id: 'market-lane',
      label: 'Market Lane',
      start: [0, 0, 24],
      end: [14, 0, 20],
      minWidth: 3,
      maxWidth: 4,
      notes: 'Side corridor for future stalls, kept readable with clustered props only.',
    },
    {
      id: 'green-loop',
      label: 'Green Loop',
      start: [-10, 0, 4],
      end: [10, 0, 4],
      minWidth: 4,
      maxWidth: 6,
      notes: 'Loop route around the central green and well, preserving the 10-unit open radius.',
    },
    {
      id: 'west-home-path',
      label: 'West Home Path',
      start: [0, 0, 4],
      end: [-28, 0, -4],
      minWidth: 3,
      maxWidth: 4,
      notes: 'Residential side path with homes placed off the lane edges.',
    },
    {
      id: 'river-row',
      label: 'River Row',
      start: [0, 0, 4],
      end: [28, 0, 0],
      minWidth: 3,
      maxWidth: 4,
      notes: 'East-side route reserved for future river frontage and mailbox destinations.',
    },
    {
      id: 'north-hill-road',
      label: 'North Hill Road',
      start: [0, 0, 4],
      end: [0, 0, -36],
      minWidth: 4,
      maxWidth: 6,
      notes: 'Main route from the green to the old trail gate and future progression hook.',
    },
  ] satisfies readonly VillageRoute[],
} as const;
