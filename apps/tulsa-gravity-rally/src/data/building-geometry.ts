import {ShapeUtils, Vector2} from 'three';

export interface ExtrudedFootprintMesh {
  vertices: Float32Array;
  indices: Uint32Array;
}

type Point2 = [number, number];

export function createExtrudedFootprintMesh(
  footprint: Point2[],
  height: number,
): ExtrudedFootprintMesh {
  const sourceRing = removeClosingPoint(footprint);
  if (sourceRing.length < 3) {
    throw new Error('A building footprint needs at least three unique points.');
  }
  const sourceContour = sourceRing.map(
    point => new Vector2(point[0], point[1]),
  );
  const ring = ShapeUtils.isClockWise(sourceContour)
    ? sourceRing
    : [...sourceRing].reverse();
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('A building extrusion needs a positive finite height.');
  }

  const contour = ring.map(point => new Vector2(point[0], point[1]));
  const roofTriangles = ShapeUtils.triangulateShape(contour, []);
  const vertices = new Float32Array(ring.length * 2 * 3);

  for (let index = 0; index < ring.length; index++) {
    const point = ring[index]!;
    const bottomOffset = index * 3;
    const topOffset = (index + ring.length) * 3;
    vertices.set([point[0], 0, point[1]], bottomOffset);
    vertices.set([point[0], height, point[1]], topOffset);
  }

  const indices: number[] = [];
  for (const triangle of roofTriangles) {
    const [a, b, c] = triangle;
    if (a === undefined || b === undefined || c === undefined) continue;
    // A counterclockwise X/Z triangle points down in Three's Y-up space.
    indices.push(c + ring.length, b + ring.length, a + ring.length);
    indices.push(a, b, c);
  }

  for (let index = 0; index < ring.length; index++) {
    const next = (index + 1) % ring.length;
    indices.push(index, next, next + ring.length);
    indices.push(index, next + ring.length, index + ring.length);
  }

  return {vertices, indices: new Uint32Array(indices)};
}

function removeClosingPoint(footprint: Point2[]): Point2[] {
  const first = footprint[0];
  const last = footprint.at(-1);
  if (
    first &&
    last &&
    footprint.length > 1 &&
    first[0] === last[0] &&
    first[1] === last[1]
  ) {
    return footprint.slice(0, -1);
  }
  return [...footprint];
}
