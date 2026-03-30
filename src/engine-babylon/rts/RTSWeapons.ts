/**
 * RTSWeapons — Attack visual effects for RTS mode.
 * Laser (ranged) and melee slash visuals. Ported from Density Wars Laser.ts.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { distance2D } from './RTSFormations';

/** Fire a laser beam visual between two positions. Auto-disposes after duration. */
export function fireLaser(
  scene: Scene,
  from: Vector3,
  to: Vector3,
  color: Color3 = new Color3(0.3, 0.9, 0.3),
  duration = 300,
): void {
  const dist = distance2D(from, to);
  if (dist < 0.1) return;

  const beam = MeshBuilder.CreateCylinder('laser', {
    height: dist,
    diameter: 0.08,
    tessellation: 8,
  }, scene);

  // Position at midpoint
  const mid = Vector3.Center(from, to);
  mid.y = 0.8;
  beam.position = mid;

  // Rotate to point from → to
  const dir = to.subtract(from);
  dir.y = 0;
  const angle = Math.atan2(dir.x, dir.z);
  beam.rotation.y = angle;
  beam.rotation.z = Math.PI / 2; // lay horizontal

  const mat = new StandardMaterial('laserMat', scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.alpha = 0.8;
  beam.material = mat;
  beam.isPickable = false;

  // Auto dispose
  setTimeout(() => {
    beam.dispose();
    mat.dispose();
  }, duration);
}

/** Show a melee slash ring visual at a position. Auto-disposes. */
export function meleeSlash(
  scene: Scene,
  position: Vector3,
  color: Color3 = new Color3(1, 0.6, 0.2),
  duration = 250,
): void {
  const ring = MeshBuilder.CreateTorus('slash', {
    diameter: 1.5,
    thickness: 0.15,
    tessellation: 16,
  }, scene);
  ring.position = new Vector3(position.x, 0.6, position.z);

  const mat = new StandardMaterial('slashMat', scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color;
  mat.alpha = 0.6;
  ring.material = mat;
  ring.isPickable = false;

  setTimeout(() => {
    ring.dispose();
    mat.dispose();
  }, duration);
}
