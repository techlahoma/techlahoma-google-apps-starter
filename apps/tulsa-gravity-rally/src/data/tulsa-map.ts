import generatedMapData from './tulsa-map-generated.json';
import type {TransformedBuilding, TransformedStreet} from './transform-osm';

const METERS_PER_DEG_LAT = 111_320;

interface GeneratedTulsaMapData {
  schemaVersion: number;
  generator: string;
  sourceHashes: {
    shadowWalkSha256: string;
    focusedRefreshSha256: string;
  };
  origin: {
    lat: number;
    lon: number;
    address: string;
    sourceBuilding: string;
    sourceId: string;
  };
  sources: {
    shadowWalk: {
      source: string;
      sourceUrl: string;
      license: string;
      fetchedAt: string;
      osmBaseTimestamp: string | null;
      bounds: {south: number; north: number; west: number; east: number};
    };
    focusedRefresh: {
      fetchedAt: string;
      generator: string;
    };
  };
  buildings: TransformedBuilding[];
  streets: TransformedStreet[];
}

const GENERATED_MAP = generatedMapData as unknown as GeneratedTulsaMapData;
const TULSA_ORIGIN = GENERATED_MAP.origin;
const TULSA_SOURCE_METADATA = GENERATED_MAP.sources;
const metersPerDegLon =
  METERS_PER_DEG_LAT * Math.cos((TULSA_ORIGIN.lat * Math.PI) / 180);

export interface MapMetadata {
  retrievalDate: string;
  shadowWalkRetrievalDate: string;
  focusedRefreshDate: string;
  centerAddress: string;
  centerCoordinates: {lat: number; lon: number};
  boundingBox: {south: number; north: number; west: number; east: number};
  sourceUrl: string;
  attribution: string;
  licenseUrl: string;
  limitations: string;
  disclaimer: string;
  sourceHashes: {
    shadowWalkSha256: string;
    focusedRefreshSha256: string;
  };
}

export type BuildingFootprint = TransformedBuilding;
export type StreetSegment = TransformedStreet;

export interface RampDefinition {
  id: string;
  name: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
}

export interface CheckpointLocation {
  id: string;
  name: string;
  position: [number, number, number];
  radius: number;
  isRooftop: boolean;
  reachabilityTag: 'street' | 'ramped_roof' | 'boost_jump' | 'gradient_beacon';
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const TULSA_MAP_METADATA: MapMetadata = {
  retrievalDate: '2026-08-06',
  shadowWalkRetrievalDate: TULSA_SOURCE_METADATA.shadowWalk.fetchedAt.slice(
    0,
    10,
  ),
  focusedRefreshDate: TULSA_SOURCE_METADATA.focusedRefresh.fetchedAt.slice(
    0,
    10,
  ),
  centerAddress: TULSA_ORIGIN.address,
  centerCoordinates: {lat: TULSA_ORIGIN.lat, lon: TULSA_ORIGIN.lon},
  boundingBox: TULSA_SOURCE_METADATA.shadowWalk.bounds,
  sourceUrl: TULSA_SOURCE_METADATA.shadowWalk.sourceUrl,
  attribution: 'Map data © OpenStreetMap contributors',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
  limitations:
    'Footprints and streets reuse the Tulsa Shadow Walk OSM snapshot, overlaid with a focused 2026-08-06 building refresh. Untagged heights remain deterministic estimates.',
  disclaimer:
    'Gradient is anchored to the OSM OTASCO Warehouse footprint; its game lighting, signs, ramps, and roof access are artistic demo treatments rather than an architectural reproduction.',
  sourceHashes: GENERATED_MAP.sourceHashes,
};

export const DOWNTOWN_BUILDINGS: BuildingFootprint[] = GENERATED_MAP.buildings;

export const DOWNTOWN_STREETS: StreetSegment[] = GENERATED_MAP.streets;

export const GRADIENT_LANDMARK = requiredBuilding('osm-259791849');

export const LANDMARK_BUILDINGS = DOWNTOWN_BUILDINGS.filter(
  building => building.label !== undefined,
);

export const MAP_WORLD_BOUNDS: WorldBounds = buildingWorldBounds(
  DOWNTOWN_BUILDINGS,
  55,
);

export const ROOFTOP_RAMPS: RampDefinition[] = [
  rampToRoof(
    'ramp-gradient-east',
    'Gradient Cheyenne climb',
    GRADIENT_LANDMARK,
    'east',
    11,
  ),
  rampToRoof(
    'ramp-tulsa-theater-south',
    'Tulsa Theater roof run',
    requiredBuilding('osm-60964202'),
    'south',
    12,
  ),
  rampToRoof(
    'ramp-bok-center-east',
    'BOK Center stadium climb',
    requiredBuilding('osm-60964213'),
    'east',
    14,
  ),
  rampToRoof(
    'ramp-union-station-west',
    'Union Station platform ramp',
    requiredBuilding('osm-324093534'),
    'west',
    12,
  ),
];

const centerOfUniverse = latLonToLocalMeters(36.1568177, -95.9914961);
const guthrieGreen = latLonToLocalMeters(36.1597, -95.9913);
const bokCenter = requiredBuilding('osm-60964213');
const tulsaTheater = requiredBuilding('osm-60964202');
const unionStation = requiredBuilding('osm-324093534');
const bokTower = requiredBuilding('osm-245142481');

export const ALL_CHECKPOINTS: CheckpointLocation[] = [
  {
    id: 'cp-gradient-street',
    name: 'Gradient Cheyenne Start',
    position: [...ROOFTOP_RAMPS[0]!.start],
    radius: 8,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-gradient-beacon',
    name: 'Gradient Rooftop Beacon',
    position: [
      GRADIENT_LANDMARK.center[0],
      GRADIENT_LANDMARK.height + 2,
      GRADIENT_LANDMARK.center[1],
    ],
    radius: 8,
    isRooftop: true,
    reachabilityTag: 'gradient_beacon',
  },
  roofCheckpoint('cp-tulsa-theater', 'Tulsa Theater Roof', tulsaTheater),
  roofCheckpoint('cp-bok-center', 'BOK Center Roof Loop', bokCenter, 12),
  roofCheckpoint('cp-union-station', 'Union Station Roof', unionStation, 9),
  {
    id: 'cp-center-universe',
    name: 'Center of the Universe',
    position: [centerOfUniverse[0], 1.5, centerOfUniverse[1]],
    radius: 9,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-guthrie-green',
    name: 'Guthrie Green',
    position: [guthrieGreen[0], 1.5, guthrieGreen[1]],
    radius: 10,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-bok-tower-plaza',
    name: 'BOK Tower Plaza',
    position: [bokTower.center[0] - 30, 1.5, bokTower.center[1] + 35],
    radius: 10,
    isRooftop: false,
    reachabilityTag: 'street',
  },
  {
    id: 'cp-gradient-boost-gap',
    name: 'Gradient Neon Boost Gap',
    position: [
      GRADIENT_LANDMARK.center[0] - 28,
      GRADIENT_LANDMARK.height + 8,
      GRADIENT_LANDMARK.center[1] - 18,
    ],
    radius: 9,
    isRooftop: true,
    reachabilityTag: 'boost_jump',
  },
];

function latLonToLocalMeters(lat: number, lon: number): [number, number] {
  return [
    round1((lon - TULSA_ORIGIN.lon) * metersPerDegLon),
    round1(-(lat - TULSA_ORIGIN.lat) * METERS_PER_DEG_LAT),
  ];
}

function requiredBuilding(sourceId: string): BuildingFootprint {
  const building = DOWNTOWN_BUILDINGS.find(
    candidate => candidate.sourceId === sourceId,
  );
  if (!building) {
    throw new Error(`Tulsa model is missing required building ${sourceId}.`);
  }
  return building;
}

function buildingWorldBounds(
  buildings: BuildingFootprint[],
  padding: number,
): WorldBounds {
  const points = buildings.flatMap(building => building.footprint);
  return {
    minX: Math.min(...points.map(point => point[0])) - padding,
    maxX: Math.max(...points.map(point => point[0])) + padding,
    minZ: Math.min(...points.map(point => point[1])) - padding,
    maxZ: Math.max(...points.map(point => point[1])) + padding,
  };
}

function rampToRoof(
  id: string,
  name: string,
  building: BuildingFootprint,
  side: 'north' | 'south' | 'east' | 'west',
  width: number,
): RampDefinition {
  const minX = Math.min(...building.footprint.map(point => point[0]));
  const maxX = Math.max(...building.footprint.map(point => point[0]));
  const minZ = Math.min(...building.footprint.map(point => point[1]));
  const maxZ = Math.max(...building.footprint.map(point => point[1]));
  const approach = Math.max(28, building.height * 1.9);
  const roofY = building.height + 0.6;

  switch (side) {
    case 'north':
      return {
        id,
        name,
        start: [building.center[0], 0.4, minZ - approach],
        end: [building.center[0], roofY, minZ + 4],
        width,
      };
    case 'south':
      return {
        id,
        name,
        start: [building.center[0], 0.4, maxZ + approach],
        end: [building.center[0], roofY, maxZ - 4],
        width,
      };
    case 'west':
      return {
        id,
        name,
        start: [minX - approach, 0.4, building.center[1]],
        end: [minX + 4, roofY, building.center[1]],
        width,
      };
    case 'east':
      return {
        id,
        name,
        start: [maxX + approach, 0.4, building.center[1]],
        end: [maxX - 4, roofY, building.center[1]],
        width,
      };
  }
}

function roofCheckpoint(
  id: string,
  name: string,
  building: BuildingFootprint,
  radius = 8,
): CheckpointLocation {
  return {
    id,
    name,
    position: [building.center[0], building.height + 2, building.center[1]],
    radius,
    isRooftop: true,
    reachabilityTag: 'ramped_roof',
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
