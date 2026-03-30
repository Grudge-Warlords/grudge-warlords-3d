/**
 * RTSFormations — Formation helpers for RTS unit placement.
 * Ported from Density Wars Formations.ts → ES6 @babylonjs/core.
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';

const DEFAULT_Y = 0;

/** Returns positions in a circle around a center point. */
export function circularFormation(count: number, center: Vector3, spacing = 1.5): Vector3[] {
  if (count <= 0) return [];
  if (count === 1) return [center.clone()];

  const arr: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    arr.push(new Vector3(
      center.x + Math.cos(angle) * spacing,
      DEFAULT_Y,
      center.z + Math.sin(angle) * spacing,
    ));
  }
  return arr;
}

/** Returns positions in a line perpendicular to a facing direction. */
export function lineFormation(count: number, center: Vector3, spacing = 1.5, facingAngle = 0): Vector3[] {
  if (count <= 0) return [];
  const arr: Vector3[] = [];
  const perpX = Math.cos(facingAngle + Math.PI / 2);
  const perpZ = Math.sin(facingAngle + Math.PI / 2);
  const halfWidth = ((count - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const offset = i * spacing - halfWidth;
    arr.push(new Vector3(
      center.x + perpX * offset,
      DEFAULT_Y,
      center.z + perpZ * offset,
    ));
  }
  return arr;
}

/** Returns positions in a grid pattern. */
export function gridFormation(count: number, center: Vector3, spacing = 1.5): Vector3[] {
  if (count <= 0) return [];
  const cols = Math.ceil(Math.sqrt(count));
  const arr: Vector3[] = [];
  const halfW = ((cols - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    arr.push(new Vector3(
      center.x + col * spacing - halfW,
      DEFAULT_Y,
      center.z + row * spacing - ((Math.ceil(count / cols) - 1) * spacing) / 2,
    ));
  }
  return arr;
}

/** Center of mass of units (weighted by mass). */
export function getCentroid(positions: Vector3[], masses?: number[]): Vector3 {
  if (positions.length === 0) return Vector3.Zero();
  let totalMass = 0;
  let totalX = 0;
  let totalZ = 0;
  for (let i = 0; i < positions.length; i++) {
    const m = masses ? masses[i] : 1;
    totalMass += m;
    totalX += positions[i].x * m;
    totalZ += positions[i].z * m;
  }
  return new Vector3(totalX / totalMass, DEFAULT_Y, totalZ / totalMass);
}

/** 2D distance (ignoring Y). */
export function distance2D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Check if a point is inside a 2D polygon (XZ plane). */
export function isPointInPoly(polygon: Vector3[], point: Vector3): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    if ((zi > point.z) !== (zj > point.z) &&
        point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
