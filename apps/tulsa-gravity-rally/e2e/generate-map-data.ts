import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  transformOsmToBuildings,
  transformOsmToStreets,
  TULSA_ORIGIN,
  TULSA_SOURCE_METADATA,
} from '../src/data/transform-osm';

const appDirectory = resolve(import.meta.dir, '..');
const shadowWalkPath = resolve(appDirectory, 'src/data/shadow-walk-osm.json');
const focusedRefreshPath = resolve(appDirectory, 'src/data/raw-osm-tulsa.json');
const outputPath = resolve(appDirectory, 'src/data/tulsa-map-generated.json');

const payload = {
  schemaVersion: 1,
  generator: 'e2e/generate-map-data.ts',
  sourceHashes: {
    shadowWalkSha256: sha256(shadowWalkPath),
    focusedRefreshSha256: sha256(focusedRefreshPath),
  },
  origin: TULSA_ORIGIN,
  sources: TULSA_SOURCE_METADATA,
  buildings: transformOsmToBuildings(),
  streets: transformOsmToStreets(),
};

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Generated ${payload.buildings.length} buildings and ${payload.streets.length} street segments at ${outputPath}.`,
);

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}
