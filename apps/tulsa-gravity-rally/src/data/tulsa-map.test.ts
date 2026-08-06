import {describe, expect, test} from 'bun:test';
import {
  DOWNTOWN_BUILDINGS,
  DOWNTOWN_STREETS,
  GRADIENT_LANDMARK,
  LANDMARK_BUILDINGS,
  MAP_WORLD_BOUNDS,
  TULSA_MAP_METADATA,
} from './tulsa-map';

describe('Tulsa downtown model', () => {
  test('uses the historic OTASCO footprint as the Gradient landmark', () => {
    expect(GRADIENT_LANDMARK.sourceId).toBe('osm-259791849');
    expect(GRADIENT_LANDMARK.footprint.length).toBeGreaterThanOrEqual(4);
    expect(Math.abs(GRADIENT_LANDMARK.center[0])).toBeLessThan(1);
    expect(Math.abs(GRADIENT_LANDMARK.center[1])).toBeLessThan(1);

    const [first, second] = GRADIENT_LANDMARK.footprint;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(Math.abs((second?.[0] ?? 0) - (first?.[0] ?? 0))).toBeGreaterThan(1);
    expect(Math.abs((second?.[1] ?? 0) - (first?.[1] ?? 0))).toBeGreaterThan(1);
  });

  test('keeps real downtown footprints, streets, and recognizable labels', () => {
    expect(DOWNTOWN_BUILDINGS.length).toBeGreaterThan(100);
    expect(DOWNTOWN_STREETS.length).toBeGreaterThan(100);

    const labels = new Set(LANDMARK_BUILDINGS.map(building => building.label));
    expect(labels.has('GRADIENT')).toBe(true);
    expect(labels.has('BOK CENTER')).toBe(true);
    expect(labels.has('TULSA THEATER')).toBe(true);
    expect(labels.has('BOK TOWER')).toBe(true);
    expect(labels.has('UNION STATION')).toBe(true);
  });

  test('records source provenance and produces finite world bounds', () => {
    expect(TULSA_MAP_METADATA.sourceUrl).toContain('overpass');
    expect(TULSA_MAP_METADATA.shadowWalkRetrievalDate).toBe('2026-06-11');
    expect(TULSA_MAP_METADATA.focusedRefreshDate).toBe('2026-08-06');
    expect(TULSA_MAP_METADATA.sourceHashes.shadowWalkSha256).toHaveLength(64);
    expect(TULSA_MAP_METADATA.sourceHashes.focusedRefreshSha256).toHaveLength(
      64,
    );
    expect(MAP_WORLD_BOUNDS.minX).toBeLessThan(MAP_WORLD_BOUNDS.maxX);
    expect(MAP_WORLD_BOUNDS.minZ).toBeLessThan(MAP_WORLD_BOUNDS.maxZ);
  });
});
