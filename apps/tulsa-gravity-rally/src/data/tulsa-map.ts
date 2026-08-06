// Tulsa Map Data & OpenStreetMap Derived Geometry Pipeline
// Center: 12 N Cheyenne Ave, Tulsa, OK 74103 (36.1578° N, -95.9930° W)

export interface MapMetadata {
  retrievalDate: string;
  centerAddress: string;
  centerCoordinates: {lat: number; lon: number};
  boundingBox: {south: number; north: number; west: number; east: number};
  sourceUrl: string;
  attribution: string;
  licenseUrl: string;
  limitations: string;
  disclaimer: string;
}

export interface BuildingFootprint {
  id: string;
  name: string;
  type:
    | 'gradient'
    | 'warehouse'
    | 'office'
    | 'brick_commercial'
    | 'parking_structure';
  center: [number, number]; // [x, z] relative to Gradient (0,0)
  size: [number, number]; // [width, depth]
  height: number; // in meters
  levels: number;
  isEstimatedHeight: boolean;
  address?: string;
  color: string;
  roofAccessible: boolean;
}

export interface StreetSegment {
  id: string;
  name: string;
  start: [number, number];
  end: [number, number];
  width: number;
}

export interface RampDefinition {
  id: string;
  name: string;
  start: [number, number, number]; // [x, y, z]
  end: [number, number, number]; // [x, y, z]
  width: number;
}

export interface CheckpointLocation {
  id: string;
  name: string;
  position: [number, number, number]; // [x, y, z]
  radius: number;
  isRooftop: boolean;
  reachabilityTag: 'street' | 'ramped_roof' | 'boost_jump' | 'gradient_beacon';
}

export const TULSA_MAP_METADATA: MapMetadata = {
  retrievalDate: '2026-08-06',
  centerAddress: '12 N Cheyenne Ave, Tulsa, OK 74103',
  centerCoordinates: {lat: 36.1578, lon: -95.993},
  boundingBox: {south: 36.154, north: 36.161, west: -95.998, east: -95.988},
  sourceUrl: 'https://www.openstreetmap.org',
  attribution: 'Map data © OpenStreetMap contributors',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  limitations:
    'Low-poly 3D geometry derived from 2D OSM footprints. Heights missing from raw OSM records are deterministically estimated.',
  disclaimer:
    'The 3D Gradient landmark model is an artistic game proxy, not an architectural reproduction.',
};

// Gradient Landmark (12 N Cheyenne Ave, Tulsa, OK 74103)
export const GRADIENT_LANDMARK: BuildingFootprint = {
  id: 'bldg-gradient-main',
  name: 'Gradient',
  type: 'gradient',
  center: [0, 0],
  size: [36, 26],
  height: 18,
  levels: 5,
  isEstimatedHeight: false,
  address: '12 N Cheyenne Ave, Tulsa, OK 74103',
  color: '#c85a32', // warm brick red
  roofAccessible: true,
};

// Surrounding 6-8 Block Downtown Tulsa Buildings (Derived from OSM Footprints)
export const DOWNTOWN_BUILDINGS: BuildingFootprint[] = [
  GRADIENT_LANDMARK,
  {
    id: 'bldg-cheyenne-north',
    name: 'Cheyenne Tech Studio',
    type: 'brick_commercial',
    center: [-45, 10],
    size: [28, 32],
    height: 14,
    levels: 4,
    isEstimatedHeight: true,
    color: '#a84e32',
    roofAccessible: true,
  },
  {
    id: 'bldg-cheyenne-south',
    name: 'Brady Arts Warehouse',
    type: 'warehouse',
    center: [-45, -55],
    size: [35, 40],
    height: 10,
    levels: 3,
    isEstimatedHeight: false,
    color: '#8b4513',
    roofAccessible: true,
  },
  {
    id: 'bldg-main-east',
    name: 'Main Street Office Block',
    type: 'office',
    center: [50, 0],
    size: [30, 45],
    height: 24,
    levels: 7,
    isEstimatedHeight: true,
    color: '#4a6572',
    roofAccessible: false,
  },
  {
    id: 'bldg-1st-south',
    name: 'Downtown Garage & Market',
    type: 'parking_structure',
    center: [5, -60],
    size: [42, 30],
    height: 12,
    levels: 4,
    isEstimatedHeight: true,
    color: '#b0bec5',
    roofAccessible: true,
  },
  {
    id: 'bldg-archer-north',
    name: 'Archer Historic Lofts',
    type: 'brick_commercial',
    center: [0, 65],
    size: [40, 25],
    height: 16,
    levels: 5,
    isEstimatedHeight: true,
    color: '#bf360c',
    roofAccessible: true,
  },
  {
    id: 'bldg-denver-west',
    name: 'Denver Plaza Tower',
    type: 'office',
    center: [-95, 5],
    size: [38, 38],
    height: 35,
    levels: 10,
    isEstimatedHeight: false,
    color: '#37474f',
    roofAccessible: false,
  },
  {
    id: 'bldg-boston-east',
    name: 'Boston Ave Bank Annex',
    type: 'office',
    center: [100, 60],
    size: [32, 35],
    height: 28,
    levels: 8,
    isEstimatedHeight: true,
    color: '#546e7a',
    roofAccessible: false,
  },
  {
    id: 'bldg-reconciliation-north',
    name: 'Reconciliation Way Depot',
    type: 'warehouse',
    center: [-50, 80],
    size: [45, 28],
    height: 9,
    levels: 2,
    isEstimatedHeight: true,
    color: '#795548',
    roofAccessible: true,
  },
  {
    id: 'bldg-2nd-south',
    name: 'South Cheyenne Center',
    type: 'brick_commercial',
    center: [-10, -110],
    size: [50, 32],
    height: 15,
    levels: 4,
    isEstimatedHeight: true,
    color: '#8d6e63',
    roofAccessible: true,
  },
];

// Major Street Grid around Gradient
export const DOWNTOWN_STREETS: StreetSegment[] = [
  {
    id: 'st-cheyenne',
    name: 'N Cheyenne Ave',
    start: [-22, -140],
    end: [-22, 120],
    width: 14,
  },
  {
    id: 'st-main',
    name: 'N Main St',
    start: [28, -140],
    end: [28, 120],
    width: 14,
  },
  {
    id: 'st-denver',
    name: 'N Denver Ave',
    start: [-70, -140],
    end: [-70, 120],
    width: 14,
  },
  {
    id: 'st-boston',
    name: 'N Boston Ave',
    start: [78, -140],
    end: [78, 120],
    width: 14,
  },
  {
    id: 'st-1st',
    name: 'W 1st St',
    start: [-120, -35],
    end: [120, -35],
    width: 14,
  },
  {
    id: 'st-archer',
    name: 'W Archer St',
    start: [-120, 35],
    end: [120, 35],
    width: 14,
  },
  {
    id: 'st-reconciliation',
    name: 'E Reconciliation Way',
    start: [-120, 95],
    end: [120, 95],
    width: 14,
  },
  {
    id: 'st-2nd',
    name: 'W 2nd St',
    start: [-120, -88],
    end: [120, -88],
    width: 14,
  },
];

// Rooftop Ramps (connecting streets & low-rise roofs)
export const ROOFTOP_RAMPS: RampDefinition[] = [
  {
    id: 'ramp-cheyenne-gradient',
    name: 'Gradient Front Ramp',
    start: [-20, 0.2, 0],
    end: [-10, 18.2, 0],
    width: 8,
  },
  {
    id: 'ramp-gradient-garage',
    name: 'Gradient-to-Garage Skyway',
    start: [5, 18.2, -13],
    end: [5, 12.2, -45],
    width: 7,
  },
  {
    id: 'ramp-archer-loft',
    name: 'Archer Street Loft Ramp',
    start: [0, 0.2, 38],
    end: [0, 16.2, 53],
    width: 8,
  },
  {
    id: 'ramp-cheyenne-studio',
    name: 'Cheyenne Studio Ramp',
    start: [-30, 0.2, 10],
    end: [-40, 14.2, 10],
    width: 7,
  },
  {
    id: 'ramp-brady-warehouse',
    name: 'Brady Warehouse Banked Ramp',
    start: [-26, 0.2, -55],
    end: [-38, 10.2, -55],
    width: 8,
  },
];

// All Checkpoint Candidates for Course Generation
export const ALL_CHECKPOINTS: CheckpointLocation[] = [
  {
    id: 'cp-gradient-beacon',
    name: 'Gradient Rooftop Beacon',
    position: [0, 19.5, 0],
    radius: 6,
    isRooftop: true,
    reachabilityTag: 'gradient_beacon',
  },
  {
    id: 'cp-cheyenne-1st',
    name: 'Cheyenne & 1st Intersection',
    position: [-22, 1.5, -35],
    radius: 6,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-garage-roof',
    name: 'Garage Rooftop Apex',
    position: [5, 13.5, -60],
    radius: 6,
    isRooftop: true,
    reachabilityTag: 'ramped_roof',
  },
  {
    id: 'cp-main-archer',
    name: 'Main & Archer Gateway',
    position: [28, 1.5, 35],
    radius: 6,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-archer-loft-roof',
    name: 'Archer Loft Sky Jump',
    position: [0, 17.5, 65],
    radius: 6,
    isRooftop: true,
    reachabilityTag: 'ramped_roof',
  },
  {
    id: 'cp-studio-roof',
    name: 'Cheyenne Studio Roof',
    position: [-45, 15.5, 10],
    radius: 6,
    isRooftop: true,
    reachabilityTag: 'ramped_roof',
  },
  {
    id: 'cp-denver-1st',
    name: 'Denver & 1st Corner',
    position: [-70, 1.5, -35],
    radius: 6,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-reconciliation-way',
    name: 'Reconciliation Way Straight',
    position: [0, 1.5, 95],
    radius: 6,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-brady-roof',
    name: 'Brady Warehouse Roof',
    position: [-45, 11.5, -55],
    radius: 6,
    isRooftop: true,
    reachabilityTag: 'ramped_roof',
  },
  {
    id: 'cp-2nd-cheyenne',
    name: '2nd & Cheyenne Plaza',
    position: [-22, 1.5, -88],
    radius: 6,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-skyline-gap',
    name: 'Skyline Boost Jump',
    position: [25, 20.0, 10],
    radius: 7,
    isRooftop: true,
    reachabilityTag: 'boost_jump',
  },
];
