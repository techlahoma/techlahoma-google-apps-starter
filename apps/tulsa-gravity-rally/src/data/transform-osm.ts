import focusedOsmData from './raw-osm-tulsa.json';
import shadowWalkOsmData from './shadow-walk-osm.json';

const METERS_PER_DEG_LAT = 111_320;
const GRADIENT_SOURCE_ID = 'osm-259791849';
const MODEL_RADIUS_METERS = 560;
const STREET_RADIUS_METERS = MODEL_RADIUS_METERS + 90;

type Coordinate = [number, number];

interface ShadowBuilding {
  id: string;
  name: string;
  kind: string;
  heightMeters: number;
  heightSource: 'height' | 'building:levels' | 'default';
  levels: number | null;
  footprint: Coordinate[];
}

interface ShadowStreet {
  id: number;
  name: string | null;
  highway: string;
  isStreet: boolean;
  coordinates: Coordinate[];
}

interface ShadowSnapshot {
  source: string;
  sourceUrl: string;
  license: string;
  fetchedAt: string;
  osmBaseTimestamp: string | null;
  bounds: {south: number; west: number; north: number; east: number};
  buildings: ShadowBuilding[];
  ways: ShadowStreet[];
}

interface FocusedNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface FocusedWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

interface FocusedSnapshot {
  osm3s?: {timestamp_osm_base?: string};
  generator?: string;
  elements: Array<FocusedNode | FocusedWay>;
}

export type BuildingKind =
  | 'gradient'
  | 'warehouse'
  | 'office'
  | 'brick_commercial'
  | 'parking_structure'
  | 'civic'
  | 'stadium';

export interface TransformedBuilding {
  id: string;
  sourceId: string;
  name: string;
  label?: string;
  type: BuildingKind;
  center: Coordinate;
  size: Coordinate;
  footprint: Coordinate[];
  height: number;
  levels: number;
  isEstimatedHeight: boolean;
  address?: string;
  color: string;
  roofAccessible: boolean;
}

export interface TransformedStreet {
  id: string;
  name: string;
  start: Coordinate;
  end: Coordinate;
  width: number;
}

const shadowSnapshot = shadowWalkOsmData as unknown as ShadowSnapshot;
const focusedSnapshot = focusedOsmData as unknown as FocusedSnapshot;

const shadowGradient = shadowSnapshot.buildings.find(
  building => building.id === GRADIENT_SOURCE_ID,
);

if (!shadowGradient) {
  throw new Error(
    `Shadow Walk source is missing Gradient anchor ${GRADIENT_SOURCE_ID}.`,
  );
}

const gradientCentroid = polygonCentroid(shadowGradient.footprint);

export const TULSA_ORIGIN = {
  lat: gradientCentroid[1],
  lon: gradientCentroid[0],
  address: '12 N Cheyenne Ave, Tulsa, OK 74103',
  sourceBuilding: 'OTASCO Warehouse',
  sourceId: GRADIENT_SOURCE_ID,
};

const metersPerDegLon =
  METERS_PER_DEG_LAT * Math.cos((TULSA_ORIGIN.lat * Math.PI) / 180);

export const TULSA_SOURCE_METADATA = {
  shadowWalk: {
    source: shadowSnapshot.source,
    sourceUrl: shadowSnapshot.sourceUrl,
    license: shadowSnapshot.license,
    fetchedAt: shadowSnapshot.fetchedAt,
    osmBaseTimestamp: shadowSnapshot.osmBaseTimestamp,
    bounds: shadowSnapshot.bounds,
  },
  focusedRefresh: {
    fetchedAt: focusedSnapshot.osm3s?.timestamp_osm_base ?? 'unknown',
    generator: focusedSnapshot.generator ?? 'unknown',
  },
};

const LANDMARK_LABELS = new Map<string, string>([
  [GRADIENT_SOURCE_ID, 'GRADIENT'],
  ['osm-60964213', 'BOK CENTER'],
  ['osm-60964202', 'TULSA THEATER'],
  ['osm-245142481', 'BOK TOWER'],
  ['osm-324093534', 'UNION STATION'],
  ['osm-250496654', 'WOODY GUTHRIE CENTER'],
  ['osm-250496656', 'BOB DYLAN CENTER'],
  ['osm-250496655', '108 CONTEMPORARY'],
  ['osm-60964215', 'WILLIAMS CENTER'],
  ['osm-250495300', 'TRIBUNE LOFTS'],
  ['osm-251639472', 'UNIVERSAL FORD'],
  ['osm-331112131', 'FAIRFIELD INN'],
  ['osm-60965508', 'PHILTOWER'],
]);

export function latLonToLocalMeters(lat: number, lon: number): Coordinate {
  const x = (lon - TULSA_ORIGIN.lon) * metersPerDegLon;
  const z = -(lat - TULSA_ORIGIN.lat) * METERS_PER_DEG_LAT;
  return [round1(x), round1(z)];
}

export function transformOsmToBuildings(): TransformedBuilding[] {
  const merged = new Map(
    shadowSnapshot.buildings.map(building => [building.id, building]),
  );

  for (const building of focusedBuildings()) {
    merged.set(building.id, building);
  }

  return [...merged.values()]
    .map(transformBuilding)
    .filter((building): building is TransformedBuilding => building !== null)
    .sort((left, right) => {
      if (left.type === 'gradient') return -1;
      if (right.type === 'gradient') return 1;
      return left.center[1] - right.center[1];
    });
}

export function transformOsmToStreets(): TransformedStreet[] {
  const streets: TransformedStreet[] = [];

  for (const way of shadowSnapshot.ways) {
    if (!way.isStreet || way.coordinates.length < 2) continue;

    for (let index = 0; index < way.coordinates.length - 1; index++) {
      const startCoord = way.coordinates[index];
      const endCoord = way.coordinates[index + 1];
      if (!startCoord || !endCoord) continue;

      const start = latLonToLocalMeters(startCoord[1], startCoord[0]);
      const end = latLonToLocalMeters(endCoord[1], endCoord[0]);
      const midpoint = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
      ] as Coordinate;

      if (Math.hypot(midpoint[0], midpoint[1]) > STREET_RADIUS_METERS) {
        continue;
      }

      if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 1) continue;

      streets.push({
        id: `osm-street-${way.id}-${index}`,
        name: way.name ?? streetFallbackName(way.highway),
        start,
        end,
        width: streetWidth(way.highway),
      });
    }
  }

  return streets;
}

function focusedBuildings(): ShadowBuilding[] {
  const nodes = new Map<number, FocusedNode>();
  for (const element of focusedSnapshot.elements) {
    if (element.type === 'node') nodes.set(element.id, element);
  }

  const buildings: ShadowBuilding[] = [];
  for (const element of focusedSnapshot.elements) {
    if (element.type !== 'way' || !element.tags?.building) continue;

    const footprint = closeRing(
      element.nodes
        .map(nodeId => nodes.get(nodeId))
        .filter((node): node is FocusedNode => node !== undefined)
        .map(node => [node.lon, node.lat] as Coordinate),
    );
    if (footprint.length < 4) continue;

    const tags = element.tags;
    const buildingTag = tags.building ?? 'yes';
    const levels = parsePositiveNumber(tags['building:levels']);
    const parsedHeight = parseHeight(tags.height);
    const address = [tags['addr:housenumber'], tags['addr:street']]
      .filter(Boolean)
      .join(' ');

    buildings.push({
      id: `osm-${element.id}`,
      name: tags.name ?? (address || buildingTag || `Building ${element.id}`),
      kind: buildingTag,
      heightMeters: clamp(
        parsedHeight ?? (levels ? levels * 3 : defaultHeight(buildingTag)),
        3,
        220,
      ),
      heightSource: parsedHeight
        ? 'height'
        : levels
          ? 'building:levels'
          : 'default',
      levels,
      footprint,
    });
  }

  return buildings;
}

function transformBuilding(source: ShadowBuilding): TransformedBuilding | null {
  const localFootprint = withoutClosingPoint(source.footprint).map(coord =>
    latLonToLocalMeters(coord[1], coord[0]),
  );
  if (localFootprint.length < 3) return null;

  const center = polygonCentroid(localFootprint);
  if (Math.hypot(center[0], center[1]) > MODEL_RADIUS_METERS) return null;

  const minX = Math.min(...localFootprint.map(point => point[0]));
  const maxX = Math.max(...localFootprint.map(point => point[0]));
  const minZ = Math.min(...localFootprint.map(point => point[1]));
  const maxZ = Math.max(...localFootprint.map(point => point[1]));
  const isGradient = source.id === GRADIENT_SOURCE_ID;
  const type = buildingKind(source.kind, source.name, isGradient);
  const height = round1(source.heightMeters);
  const label = LANDMARK_LABELS.get(source.id);

  return {
    id: isGradient ? 'bldg-gradient-main' : `bldg-${source.id}`,
    sourceId: source.id,
    name: isGradient ? 'Gradient · historic OTASCO Warehouse' : source.name,
    ...(label ? {label} : {}),
    type,
    center: [round1(center[0]), round1(center[1])],
    size: [round1(maxX - minX), round1(maxZ - minZ)],
    footprint: localFootprint,
    height,
    levels: Math.max(1, source.levels ?? Math.round(height / 3)),
    isEstimatedHeight: source.heightSource === 'default',
    ...(isGradient ? {address: '12 N Cheyenne Ave, Tulsa, OK 74103'} : {}),
    color: buildingColor(type, source.id),
    roofAccessible: isGradient || height <= 24 || type === 'stadium',
  };
}

function buildingKind(
  kind: string,
  name: string,
  isGradient: boolean,
): BuildingKind {
  if (isGradient) return 'gradient';
  if (name === 'BOK Center' || kind === 'stadium') return 'stadium';
  if (
    kind === 'government' ||
    kind === 'civic' ||
    kind === 'train_station' ||
    kind === 'university'
  ) {
    return 'civic';
  }
  if (kind.includes('parking') || kind === 'garages') {
    return 'parking_structure';
  }
  if (kind === 'warehouse' || kind === 'industrial') return 'warehouse';
  if (
    kind === 'office' ||
    kind === 'hotel' ||
    kind === 'apartments' ||
    kind === 'commercial'
  ) {
    return 'office';
  }
  return 'brick_commercial';
}

function buildingColor(type: BuildingKind, sourceId: string): string {
  if (sourceId === GRADIENT_SOURCE_ID) return '#b94f35';
  switch (type) {
    case 'stadium':
      return '#9aa8b4';
    case 'civic':
      return '#8a8178';
    case 'parking_structure':
      return '#7b8790';
    case 'office':
      return '#536875';
    case 'warehouse':
      return '#8b5a46';
    case 'gradient':
      return '#b94f35';
    default:
      return '#965b45';
  }
}

function streetWidth(highway: string): number {
  switch (highway) {
    case 'primary':
      return 15;
    case 'secondary':
      return 13;
    case 'tertiary':
      return 11;
    case 'pedestrian':
      return 8;
    case 'residential':
    case 'unclassified':
      return 9;
    default:
      return 7;
  }
}

function streetFallbackName(highway: string): string {
  return highway === 'pedestrian' ? 'Pedestrian way' : 'Downtown street';
}

function polygonCentroid(points: Coordinate[]): Coordinate {
  const ring = withoutClosingPoint(points);
  let signedArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < ring.length; index++) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    const cross = current[0] * next[1] - next[0] * current[1];
    signedArea += cross;
    centroidX += (current[0] + next[0]) * cross;
    centroidY += (current[1] + next[1]) * cross;
  }

  if (Math.abs(signedArea) < 1e-12) {
    return ring
      .reduce<Coordinate>(
        (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
        [0, 0],
      )
      .map(value => value / Math.max(1, ring.length)) as Coordinate;
  }

  const factor = 1 / (3 * signedArea);
  return [centroidX * factor, centroidY * factor];
}

function withoutClosingPoint(points: Coordinate[]): Coordinate[] {
  if (points.length < 2) return [...points];
  const first = points[0];
  const last = points.at(-1);
  if (first && last && first[0] === last[0] && first[1] === last[1]) {
    return points.slice(0, -1);
  }
  return [...points];
}

function closeRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points.at(-1);
  if (first && last && first[0] === last[0] && first[1] === last[1]) {
    return points;
  }
  return first ? [...points, first] : points;
}

function parseHeight(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return normalized.includes('ft') || normalized.includes("'")
    ? parsed * 0.3048
    : parsed;
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.split(/[;,]/)[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function defaultHeight(kind: string): number {
  return ['office', 'commercial', 'civic', 'hotel', 'apartments'].includes(kind)
    ? 12
    : 6;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
