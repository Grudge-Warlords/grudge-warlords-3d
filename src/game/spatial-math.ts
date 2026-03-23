/**
 * Spatial Math Utilities
 * Robust math functions for collision detection, raycasting, angle calculation,
 * and projectile intersection used throughout the game engine.
 */

// ── Vector Types ───────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

// ── Distance & Angle ───────────────────────────────────────────

/** Euclidean distance between two points */
export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (faster, avoids sqrt — use for comparisons) */
export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Angle from a to b in radians */
export function angleTo(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Normalize angle to [0, 2π) */
export function normalizeAngle(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

/** Shortest signed angle difference between two angles */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Check if angle `test` is within `halfArc` radians of `center` */
export function isInCone(center: number, halfArc: number, test: number): boolean {
  return Math.abs(angleDiff(center, test)) <= halfArc;
}

// ── Line Segment Math ──────────────────────────────────────────

/** Closest point on line segment AB to point P */
export function closestPointOnSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): Vec2 {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Distance from point P to line segment AB */
export function pointToSegmentDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const closest = closestPointOnSegment(ax, ay, bx, by, px, py);
  return dist(closest, { x: px, y: py });
}

// ── Circle Collision ───────────────────────────────────────────

/** Circle-circle overlap check */
export function circlesOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
  const dx = x2 - x1, dy = y2 - y1;
  const minDist = r1 + r2;
  return dx * dx + dy * dy < minDist * minDist;
}

/** Circle-line segment intersection. Returns true if circle (cx,cy,r) intersects segment AB */
export function circleIntersectsSegment(
  cx: number, cy: number, r: number,
  ax: number, ay: number, bx: number, by: number,
): boolean {
  return pointToSegmentDist(ax, ay, bx, by, cx, cy) < r;
}

// ── Raycast ────────────────────────────────────────────────────

export interface RaycastHit {
  hit: boolean;
  /** Hit point */
  x: number;
  y: number;
  /** Distance from ray origin */
  distance: number;
  /** Normal at hit point */
  nx: number;
  ny: number;
}

/**
 * Cast a ray from origin in direction angle, check intersection with a circle.
 * Returns the nearest intersection point or null.
 */
export function raycastCircle(
  ox: number, oy: number,
  angle: number,
  maxDist: number,
  cx: number, cy: number, cr: number,
): RaycastHit | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Vector from ray origin to circle center
  const fx = ox - cx;
  const fy = oy - cy;

  const a = dx * dx + dy * dy; // always 1 for unit direction
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - cr * cr;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtDisc = Math.sqrt(discriminant);
  let t = (-b - sqrtDisc) / (2 * a);
  if (t < 0) t = (-b + sqrtDisc) / (2 * a);
  if (t < 0 || t > maxDist) return null;

  const hx = ox + dx * t;
  const hy = oy + dy * t;
  const len = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2);

  return {
    hit: true,
    x: hx, y: hy,
    distance: t,
    nx: len > 0 ? (hx - cx) / len : 0,
    ny: len > 0 ? (hy - cy) / len : 0,
  };
}

/**
 * Cast a ray and check against a line segment (wall).
 * Returns intersection point or null.
 */
export function raycastSegment(
  ox: number, oy: number,
  angle: number,
  maxDist: number,
  ax: number, ay: number, bx: number, by: number,
): RaycastHit | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const sx = bx - ax, sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((ax - ox) * sy - (ay - oy) * sx) / denom;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;

  if (t < 0 || t > maxDist || u < 0 || u > 1) return null;

  const hx = ox + dx * t;
  const hy = oy + dy * t;

  // Normal perpendicular to segment
  const segLen = Math.sqrt(sx * sx + sy * sy);
  const nx = -sy / segLen;
  const ny = sx / segLen;

  return { hit: true, x: hx, y: hy, distance: t, nx, ny };
}

// ── Projectile vs Entity ───────────────────────────────────────

/**
 * Check if a moving projectile (from prev to curr position) hits a circle entity.
 * Uses swept circle test for fast-moving projectiles that might skip over targets.
 */
export function projectileHitsCircle(
  prevX: number, prevY: number,
  currX: number, currY: number,
  projRadius: number,
  targetX: number, targetY: number,
  targetRadius: number,
): boolean {
  // Simple: check if current position overlaps
  if (circlesOverlap(currX, currY, projRadius, targetX, targetY, targetRadius)) return true;

  // Swept: check if the line segment from prev to curr passes near target
  const combinedRadius = projRadius + targetRadius;
  return pointToSegmentDist(prevX, prevY, currX, currY, targetX, targetY) < combinedRadius;
}

// ── Cone Attack ────────────────────────────────────────────────

/**
 * Get all entities within a cone-shaped area.
 * @param origin   Cone origin point
 * @param facing   Center angle of the cone (radians)
 * @param halfArc  Half-angle of the cone (radians)
 * @param range    Max distance from origin
 * @param entities Array of entities to test
 * @returns Array of entities within the cone
 */
export function entitiesInCone<T extends Vec2>(
  origin: Vec2,
  facing: number,
  halfArc: number,
  range: number,
  entities: T[],
): T[] {
  const rangeSq = range * range;
  return entities.filter(e => {
    const dSq = distSq(origin, e);
    if (dSq > rangeSq) return false;
    const angle = angleTo(origin, e);
    return isInCone(facing, halfArc, angle);
  });
}

// ── AABB (Axis-Aligned Bounding Box) ───────────────────────────

export interface AABB {
  x: number; y: number; w: number; h: number;
}

/** Check if point is inside AABB */
export function pointInAABB(px: number, py: number, box: AABB): boolean {
  return px >= box.x && px < box.x + box.w && py >= box.y && py < box.y + box.h;
}

/** Check if two AABBs overlap */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Check if circle overlaps AABB */
export function circleAABBOverlap(cx: number, cy: number, r: number, box: AABB): boolean {
  const nearestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const nearestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - nearestX, dy = cy - nearestY;
  return dx * dx + dy * dy < r * r;
}

// ── Grid Spatial Hash ──────────────────────────────────────────

/**
 * Simple spatial hash for fast neighbor queries.
 * Insert entities, then query by position + radius.
 */
export class SpatialHash<T extends Vec2 & { id: number }> {
  private cellSize: number;
  private cells = new Map<string, T[]>();

  constructor(cellSize: number = 200) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: T): void {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const k = this.key(cx, cy);
    let cell = this.cells.get(k);
    if (!cell) { cell = []; this.cells.set(k, cell); }
    cell.push(entity);
  }

  /** Query all entities within radius of point */
  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const rSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (!cell) continue;
        for (const e of cell) {
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= rSq) results.push(e);
        }
      }
    }
    return results;
  }

  /** Query entities within a cone */
  queryCone(origin: Vec2, facing: number, halfArc: number, range: number): T[] {
    const all = this.query(origin.x, origin.y, range);
    return all.filter(e => {
      const angle = angleTo(origin, e);
      return isInCone(facing, halfArc, angle);
    });
  }
}

// ── Interpolation ──────────────────────────────────────────────

/** Lerp between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lerp between two Vec2 */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Clamp value between min and max */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Smooth step (Hermite interpolation) */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
