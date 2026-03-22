/**
 * A* Pathfinding on Heightmap Grid
 * Operates on 40px cells from WorldHeightmap.
 * Used by enemy AI, NPC patrols, boat autopilot.
 */

import { WorldHeightmap, HM_CELL } from './terrain-heightmap';

// ── Types ──────────────────────────────────────────────────────

export interface PathNode {
  tx: number;
  ty: number;
  g: number;     // cost from start
  h: number;     // heuristic to goal
  f: number;     // g + h
  parent: PathNode | null;
}

export interface PathResult {
  found: boolean;
  path: { x: number; y: number }[];   // world coordinates
  nodesExplored: number;
}

// ── Constants ──────────────────────────────────────────────────

const MAX_NODES = 2000;
const SQRT2 = Math.SQRT2;

// 8-directional neighbors (dx, dy, cost multiplier)
const DIRS: [number, number, number][] = [
  [ 0, -1, 1], [ 0,  1, 1], [-1,  0, 1], [ 1,  0, 1], // cardinal
  [-1, -1, SQRT2], [-1,  1, SQRT2], [ 1, -1, SQRT2], [ 1,  1, SQRT2], // diagonal
];

// ── Heuristic ──────────────────────────────────────────────────

function octileDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
}

// ── Min-Heap (for open set) ────────────────────────────────────

class MinHeap {
  private data: PathNode[] = [];

  get length(): number { return this.data.length; }

  push(node: PathNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): PathNode | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f >= this.data[parent].f) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

// ── A* Search ──────────────────────────────────────────────────

/**
 * Find a path from (startX, startY) to (goalX, goalY) in world coordinates.
 * Returns path as world-space waypoints.
 */
export function findPath(
  startX: number, startY: number,
  goalX: number, goalY: number,
  heightmap: WorldHeightmap,
  hasBoat = false,
): PathResult {
  const stx = Math.floor(startX / HM_CELL);
  const sty = Math.floor(startY / HM_CELL);
  const gtx = Math.floor(goalX / HM_CELL);
  const gty = Math.floor(goalY / HM_CELL);

  // Quick reject: goal not walkable
  if (!heightmap.isGridWalkable(gtx, gty, hasBoat)) {
    return { found: false, path: [], nodesExplored: 0 };
  }

  // Same cell
  if (stx === gtx && sty === gty) {
    return { found: true, path: [{ x: goalX, y: goalY }], nodesExplored: 0 };
  }

  const open = new MinHeap();
  const closed = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: PathNode = {
    tx: stx, ty: sty,
    g: 0, h: octileDistance(stx, sty, gtx, gty),
    f: octileDistance(stx, sty, gtx, gty),
    parent: null,
  };
  open.push(startNode);
  gScores.set(`${stx},${sty}`, 0);

  let explored = 0;

  while (open.length > 0 && explored < MAX_NODES) {
    const current = open.pop()!;
    const key = `${current.tx},${current.ty}`;

    if (current.tx === gtx && current.ty === gty) {
      // Reconstruct path
      const gridPath: { tx: number; ty: number }[] = [];
      let node: PathNode | null = current;
      while (node) {
        gridPath.push({ tx: node.tx, ty: node.ty });
        node = node.parent;
      }
      gridPath.reverse();
      const smoothed = smoothPath(gridPath, heightmap, hasBoat);
      const worldPath = smoothed.map(p => ({
        x: p.tx * HM_CELL + HM_CELL / 2,
        y: p.ty * HM_CELL + HM_CELL / 2,
      }));
      return { found: true, path: worldPath, nodesExplored: explored };
    }

    if (closed.has(key)) continue;
    closed.add(key);
    explored++;

    for (const [dx, dy, baseCost] of DIRS) {
      const nx = current.tx + dx;
      const ny = current.ty + dy;
      const nkey = `${nx},${ny}`;

      if (closed.has(nkey)) continue;
      if (!heightmap.isGridWalkable(nx, ny, hasBoat)) continue;

      // Diagonal movement: check both adjacent cells are walkable (no corner cutting)
      if (dx !== 0 && dy !== 0) {
        if (!heightmap.isGridWalkable(current.tx + dx, current.ty, hasBoat)) continue;
        if (!heightmap.isGridWalkable(current.tx, current.ty + dy, hasBoat)) continue;
      }

      const terrainCost = heightmap.getGridCost(nx, ny, hasBoat);
      if (terrainCost >= Infinity) continue;

      const newG = current.g + baseCost * terrainCost;
      const prevG = gScores.get(nkey) ?? Infinity;

      if (newG < prevG) {
        const h = octileDistance(nx, ny, gtx, gty);
        const neighbor: PathNode = {
          tx: nx, ty: ny,
          g: newG, h, f: newG + h,
          parent: current,
        };
        gScores.set(nkey, newG);
        open.push(neighbor);
      }
    }
  }

  // Path not found (or exceeded node limit)
  return { found: false, path: [], nodesExplored: explored };
}

// ── Path Smoothing ─────────────────────────────────────────────

/** Remove redundant waypoints on straight lines */
function smoothPath(
  path: { tx: number; ty: number }[],
  heightmap: WorldHeightmap,
  hasBoat: boolean,
): { tx: number; ty: number }[] {
  if (path.length <= 2) return path;

  const result: { tx: number; ty: number }[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1];
    const next = path[i + 1];

    // Check if we can skip this waypoint (direct line is walkable)
    if (!isLineWalkable(prev.tx, prev.ty, next.tx, next.ty, heightmap, hasBoat)) {
      result.push(path[i]);
    }
  }

  result.push(path[path.length - 1]);
  return result;
}

/** Bresenham-style line check: are all cells on the line walkable? */
function isLineWalkable(
  x0: number, y0: number, x1: number, y1: number,
  heightmap: WorldHeightmap, hasBoat: boolean,
): boolean {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0, cy = y0;
  const maxSteps = dx + dy + 2;

  for (let step = 0; step < maxSteps; step++) {
    if (!heightmap.isGridWalkable(cx, cy, hasBoat)) return false;
    if (cx === x1 && cy === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return true;
}

// ── Line of Sight ──────────────────────────────────────────────

/** Check if there's a clear line of sight between two world positions */
export function hasLineOfSight(
  x1: number, y1: number,
  x2: number, y2: number,
  heightmap: WorldHeightmap,
  hasBoat = false,
): boolean {
  const tx1 = Math.floor(x1 / HM_CELL);
  const ty1 = Math.floor(y1 / HM_CELL);
  const tx2 = Math.floor(x2 / HM_CELL);
  const ty2 = Math.floor(y2 / HM_CELL);
  return isLineWalkable(tx1, ty1, tx2, ty2, heightmap, hasBoat);
}

// ── Patrol Route Generation ────────────────────────────────────

/**
 * Generate a patrol loop around a center point.
 * Returns waypoints forming a rough polygon.
 */
export function generatePatrolRoute(
  centerX: number, centerY: number,
  radius: number,
  pointCount: number,
  heightmap: WorldHeightmap,
): { x: number; y: number }[] {
  const waypoints: { x: number; y: number }[] = [];

  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2;
    const px = centerX + Math.cos(angle) * radius;
    const py = centerY + Math.sin(angle) * radius;

    // Snap to nearest walkable cell
    const tx = Math.floor(px / HM_CELL);
    const ty = Math.floor(py / HM_CELL);

    if (heightmap.isGridWalkable(tx, ty, false)) {
      waypoints.push({ x: px, y: py });
    } else {
      // Try to find walkable cell nearby (shrink radius)
      for (let r = 1; r <= 5; r++) {
        const ntx = Math.floor((centerX + Math.cos(angle) * (radius - r * HM_CELL)) / HM_CELL);
        const nty = Math.floor((centerY + Math.sin(angle) * (radius - r * HM_CELL)) / HM_CELL);
        if (heightmap.isGridWalkable(ntx, nty, false)) {
          waypoints.push({
            x: ntx * HM_CELL + HM_CELL / 2,
            y: nty * HM_CELL + HM_CELL / 2,
          });
          break;
        }
      }
    }
  }

  return waypoints;
}

/**
 * Generate a linear patrol path between two points.
 * Uses A* to find walkable route.
 */
export function generateLinearPatrol(
  x1: number, y1: number,
  x2: number, y2: number,
  heightmap: WorldHeightmap,
): { x: number; y: number }[] {
  const result = findPath(x1, y1, x2, y2, heightmap);
  if (result.found) {
    // Add return path
    const returnResult = findPath(x2, y2, x1, y1, heightmap);
    if (returnResult.found) {
      return [...result.path, ...returnResult.path.slice(1)]; // loop
    }
    return result.path;
  }
  // Fallback: just the two endpoints
  return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
}

// ── Dungeon Pathfinding Adapter ────────────────────────────────
// Uses DungeonGrid instead of WorldHeightmap. Same A* algorithm.

import type { DungeonGrid } from './dungeon-grid';

const DUNGEON_CELL = 40; // matches TILE_SIZE in dungeon-grid.ts

/**
 * Find a path on a DungeonGrid. Returns world-space waypoints.
 * Same A* as findPath but uses DungeonGrid's walkable/cost interface.
 */
export function findDungeonPath(
  startX: number, startY: number,
  goalX: number, goalY: number,
  grid: DungeonGrid,
): PathResult {
  const stx = Math.floor(startX / DUNGEON_CELL);
  const sty = Math.floor(startY / DUNGEON_CELL);
  const gtx = Math.floor(goalX / DUNGEON_CELL);
  const gty = Math.floor(goalY / DUNGEON_CELL);

  if (!grid.isGridWalkable(gtx, gty)) {
    return { found: false, path: [], nodesExplored: 0 };
  }
  if (stx === gtx && sty === gty) {
    return { found: true, path: [{ x: goalX, y: goalY }], nodesExplored: 0 };
  }

  const open = new MinHeap();
  const closed = new Set<string>();
  const gScores = new Map<string, number>();

  const startNode: PathNode = {
    tx: stx, ty: sty,
    g: 0, h: octileDistance(stx, sty, gtx, gty),
    f: octileDistance(stx, sty, gtx, gty),
    parent: null,
  };
  open.push(startNode);
  gScores.set(`${stx},${sty}`, 0);

  let explored = 0;

  while (open.length > 0 && explored < MAX_NODES) {
    const current = open.pop()!;
    const key = `${current.tx},${current.ty}`;

    if (current.tx === gtx && current.ty === gty) {
      const gridPath: { tx: number; ty: number }[] = [];
      let node: PathNode | null = current;
      while (node) {
        gridPath.push({ tx: node.tx, ty: node.ty });
        node = node.parent;
      }
      gridPath.reverse();
      // Smooth path using dungeon grid LOS
      const smoothed = smoothDungeonPath(gridPath, grid);
      const worldPath = smoothed.map(p => ({
        x: p.tx * DUNGEON_CELL + DUNGEON_CELL / 2,
        y: p.ty * DUNGEON_CELL + DUNGEON_CELL / 2,
      }));
      return { found: true, path: worldPath, nodesExplored: explored };
    }

    if (closed.has(key)) continue;
    closed.add(key);
    explored++;

    for (const [dx, dy, baseCost] of DIRS) {
      const nx = current.tx + dx;
      const ny = current.ty + dy;
      const nkey = `${nx},${ny}`;

      if (closed.has(nkey)) continue;
      if (!grid.isGridWalkable(nx, ny)) continue;

      // No corner cutting on diagonals
      if (dx !== 0 && dy !== 0) {
        if (!grid.isGridWalkable(current.tx + dx, current.ty)) continue;
        if (!grid.isGridWalkable(current.tx, current.ty + dy)) continue;
      }

      const terrainCost = grid.getGridCost(nx, ny);
      if (terrainCost >= Infinity) continue;

      const newG = current.g + baseCost * terrainCost;
      const prevG = gScores.get(nkey) ?? Infinity;

      if (newG < prevG) {
        const h = octileDistance(nx, ny, gtx, gty);
        const neighbor: PathNode = {
          tx: nx, ty: ny,
          g: newG, h, f: newG + h,
          parent: current,
        };
        gScores.set(nkey, newG);
        open.push(neighbor);
      }
    }
  }

  return { found: false, path: [], nodesExplored: explored };
}

/** Smooth dungeon path by removing redundant waypoints */
function smoothDungeonPath(
  path: { tx: number; ty: number }[],
  grid: DungeonGrid,
): { tx: number; ty: number }[] {
  if (path.length <= 2) return path;
  const result: { tx: number; ty: number }[] = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1];
    const next = path[i + 1];
    if (!grid.hasLineOfSight(prev.tx, prev.ty, next.tx, next.ty)) {
      result.push(path[i]);
    }
  }
  result.push(path[path.length - 1]);
  return result;
}
