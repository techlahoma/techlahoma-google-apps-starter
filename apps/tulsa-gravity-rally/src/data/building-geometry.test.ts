import {describe, expect, test} from 'bun:test';
import {createExtrudedFootprintMesh} from './building-geometry';

describe('building footprint extrusion', () => {
  test('preserves a rotated footprint instead of replacing it with a box', () => {
    const footprint: [number, number][] = [
      [-2, -1],
      [2, -3],
      [4, 1],
      [0, 3],
    ];
    const mesh = createExtrudedFootprintMesh(footprint, 12);

    expect(mesh.vertices.length).toBe(footprint.length * 2 * 3);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect([...mesh.vertices]).toContain(-3);
    expect([...mesh.vertices]).toContain(12);
    expect(triangleNormalY(mesh, 0)).toBeGreaterThan(0);
    expect(triangleNormalY(mesh, 1)).toBeLessThan(0);
  });

  test('rejects degenerate footprints', () => {
    expect(() =>
      createExtrudedFootprintMesh(
        [
          [0, 0],
          [1, 1],
        ],
        4,
      ),
    ).toThrow();
  });
});

function triangleNormalY(
  mesh: ReturnType<typeof createExtrudedFootprintMesh>,
  triangleIndex: number,
): number {
  const indexOffset = triangleIndex * 3;
  const a = vertex(mesh, mesh.indices[indexOffset]!);
  const b = vertex(mesh, mesh.indices[indexOffset + 1]!);
  const c = vertex(mesh, mesh.indices[indexOffset + 2]!);
  const abX = b[0] - a[0];
  const abZ = b[2] - a[2];
  const acX = c[0] - a[0];
  const acZ = c[2] - a[2];
  return abZ * acX - abX * acZ;
}

function vertex(
  mesh: ReturnType<typeof createExtrudedFootprintMesh>,
  index: number,
): [number, number, number] {
  const offset = index * 3;
  return [
    mesh.vertices[offset]!,
    mesh.vertices[offset + 1]!,
    mesh.vertices[offset + 2]!,
  ];
}
